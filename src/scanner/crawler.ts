import { randomUUID } from "node:crypto";
import type { Scan, PageReport } from "../shared/schemas.js";
import type { Storage } from "../reports/storage.js";
import { NetworkPolicy } from "./network.js";
import { closePublicAssets } from "./public-assets.js";
import { launchBrowser, guardedContext } from "./browser.js";
import { addIssue } from "./issues.js";
import { inspectDocument } from "./checks/document.js";
import { observePage } from "./checks/observers.js";
import { inspectResponsive } from "./responsive/check.js";
import { inspectInteractions } from "./interactions/check.js";
import { inspectForms } from "./forms/check.js";
import { captureOffscreen } from "./evidence/capture.js";
import { displayError, isHtmlLink, normalizeUrl } from "./url.js";

export const scanLimitations = [
  "Only same-origin pages are crawled. External assets are blocked by default; an optional anonymous public-assets policy allows bounded image/font/style/script GETs only. Navigation, credentials, private networks and writes remain excluded. Screenshots may be incomplete.",
  "All non-idempotent requests, form submissions, WebSockets, service workers, popups and downloads are blocked. Blocked requests are coverage limits, not confirmed website failures.",
  "Only recognised local UI controls are clicked, in isolated contexts with all network requests locked during the action. Unknown controls are not tested. Even loading a GET page can have side effects on an incorrectly designed website.",
  "Form checks inspect native constraint properties with synthetic values. Custom validation and backend processing are not tested.",
  "Responsive checks detect horizontal overflow, some clipped text and potentially obscured controls at 390, 768 and 1440px. Geometry heuristics can flag intentional overlays; visual design correctness requires manual review.",
  "Screenshots capture the initial viewport and may contain sensitive visible website content. Reports stay local; review them before sharing.",
  "The guarded proxy validates and pins destination IPs for HTTP(S). Browser/network isolation is defence in depth, not a complete sandbox. Test only sites you own or are authorised to test.",
  "Link recording is bounded to 150 internal and 50 external links per page, 3,000 links per scan, 500 requests per browser context and 96 MiB of proxied socket traffic. Large resources or sites may exceed these limits.",
];

export async function crawl(
  scan: Scan,
  storage: Storage,
  signal: AbortSignal,
  forbiddenPorts: number[],
  progress: () => void,
) {
  const policy = new NetworkPolicy(new URL(scan.url), forbiddenPorts);
  await policy.resolve(new URL(scan.url));
  signal.throwIfAborted();
  const runtime = await launchBrowser(policy);
  // Cancellation can arrive while Chromium starts, before its abort listener exists.
  if (signal.aborted) {
    await runtime.close();
    signal.throwIfAborted();
  }
  const abort = () => {
    closePublicAssets(policy);
    void runtime.close().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  let cursor = 0;
  const seen = new Set<string>();
  const variants = new Map<string, number>();
  const discover = (url: string, sourceUrl?: string) => {
    if (seen.has(url) || scan.pages.length >= scan.settings.maxPages) return;
    const key = new URL(url).pathname;
    if ((variants.get(key) || 0) >= 5) return;
    seen.add(url);
    variants.set(key, (variants.get(key) || 0) + 1);
    scan.pages.push({
      id: randomUUID(),
      url,
      sourceUrl,
      title: "",
      status: "discovered",
      duration: 0,
      links: [],
      externalLinks: [],
      screenshots: [],
      consoleErrors: [],
      failedResources: [],
      interactions: [],
      forms: [],
      responsive: [],
    });
  };
  discover(scan.url);
  scan.status = "running";
  progress();
  const inspect = async (report: PageReport) => {
    signal.throwIfAborted();
    const start = Date.now();
    report.status = "scanning";
    scan.currentPage = report.url;
    scan.activity = "Inspecting page and resources";
    progress();
    const { context, guard } = await guardedContext(
      runtime.browser,
      scan,
      policy,
      report,
    );
    let contentType = "";
    try {
      const page = await context.newPage();
      page.on("response", (response) => {
        if (
          response.request().isNavigationRequest() &&
          response.frame() === page.mainFrame()
        )
          contentType = response.headers()["content-type"] || "";
      });
      observePage(page, scan, report, guard);
      const response = await page.goto(report.url, {
        waitUntil: "domcontentloaded",
      });
      if (response?.headers()["x-buggd-policy-blocked"])
        throw new Error("Navigation was blocked by the network scope policy.");
      report.finalUrl = normalizeUrl(page.url());
      report.httpStatus = response?.status();
      if (
        !response ||
        !/text\/html|application\/xhtml/i.test(
          response.headers()["content-type"] || "",
        )
      ) {
        report.status = "skipped";
        report.title = "Non-HTML resource";
        return;
      }
      await page.waitForTimeout(250);
      // Trigger common lazy loading with a bounded scroll, then capture from the top.
      for (const top of [800, 1600, 2400]) {
        signal.throwIfAborted();
        const height = await page.evaluate(
          () => document.documentElement.scrollHeight,
        );
        if (top > height) break;
        await page.evaluate((y) => window.scrollTo(0, y), top);
        await page.waitForTimeout(100);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const links = await inspectDocument(
        page,
        scan,
        report,
        guard.blockedUrls,
      );
      for (const link of links)
        if (isHtmlLink(link)) discover(link, report.url);
      progress();
      await inspectForms(page, scan, report);
      await inspectResponsive(page, scan, report, storage, signal);
      await inspectInteractions(
        runtime.browser,
        page,
        scan,
        report,
        policy,
        signal,
        storage,
      );
      await captureOffscreen(page, scan, report, storage);
      report.coverage ??= [];
      for (const checkId of [
        "links.http",
        "links.navigation",
        "images.dimensions",
        "network.http",
        "network.failure",
        "javascript.error",
      ])
        report.coverage.push({ checkId, status: "completed" });
      if (runtime.limited())
        throw new Error(
          "The scan network transfer limit (96 MiB) was reached. Narrow the scan.",
        );
      for (const resource of (report.resources || [])
        .filter((resource) =>
          ["blocked", "unsupported"].includes(resource.status),
        )
        .slice(0, 20))
        addIssue(scan, report.url, {
          category: "network",
          severity: "informational",
          confidence: "not-tested",
          title: "Resource excluded by scanner policy",
          description:
            "Buggd prevented this resource or request from loading. This is a coverage limit, not proof of a broken website.",
          evidence: resource.detail,
          resource: resource.url,
          suggestion:
            "Review this resource manually or choose the bounded public-assets policy for eligible public static assets.",
          checkId: "coverage.resource",
        });
      for (const resource of (report.resources || []).filter(
        (resource) =>
          resource.provenance === "third-party" &&
          ["failed", "timeout"].includes(resource.status),
      ))
        addIssue(scan, report.url, {
          category: "network",
          severity: "low",
          confidence: "potential",
          title: "External resource request failed",
          description:
            "An anonymous public asset request did not complete. This may be a third-party or connection problem.",
          evidence: resource.detail,
          resource: resource.url,
          suggestion:
            "Review this public resource in a normal browser and check whether it is required.",
          checkId: "network.failure",
        });
      if (guard.blocked) {
        const note =
          "Some requests were blocked by Buggd safety or resource limits; affected functionality may not have been fully inspected.";
        if (!scan.limitations.includes(note)) scan.limitations.push(note);
      }
      const screenshotId = report.screenshots.find(
        (item) => item.width === 1440,
      )?.id;
      for (const issue of scan.issues)
        if (issue.pageUrl === report.url && !issue.screenshotId)
          issue.screenshotId = screenshotId;
      for (const issue of scan.issues)
        for (const occ of issue.occurrenceList || [])
          if (occ.pageUrl === report.url && !occ.screenshotId) {
            occ.screenshotId = screenshotId;
            occ.note = occ.element
              ? "The element could not be aligned within the captured evidence budget. No highlight is shown."
              : "Page screenshot only; no precise affected element was identified.";
          }
      report.status = "completed";
    } catch (error) {
      if (signal.aborted) throw error;
      if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
        report.status = "skipped";
        report.title = "Non-HTML resource";
        return;
      }
      report.status = "failed";
      const message = displayError(error);
      const blocked = guard.blocked > 0 && !guard.redirectLoop;
      addIssue(scan, report.url, {
        category: "links",
        severity: blocked ? "informational" : "high",
        confidence: guard.redirectLoop
          ? "confirmed"
          : blocked
            ? "not-tested"
            : "potential",
        title: guard.redirectLoop
          ? "Redirect loop detected"
          : blocked
            ? "Page inspection blocked by safety limits"
            : "Page could not be inspected",
        description:
          "The browser could not complete the page inspection within the configured network and time limits.",
        evidence: `${guard.redirectLoop ? "A destination repeated in the redirect chain.\n" : ""}${message}\nSource: ${report.sourceUrl || report.url}`,
        resource: report.url,
        suggestion:
          "Check the URL, redirect chain, server availability and Buggd coverage limits.",
        checkId: "links.navigation",
      });
    } finally {
      report.duration = Date.now() - start;
      await context.close().catch(() => {});
      progress();
    }
  };
  try {
    // Batches bound concurrency while allowing each completed page to extend the queue.
    while (cursor < scan.pages.length) {
      signal.throwIfAborted();
      const batch = scan.pages.slice(
        cursor,
        cursor + scan.settings.concurrency,
      );
      cursor += batch.length;
      const results = await Promise.allSettled(batch.map(inspect));
      signal.throwIfAborted();
      if (runtime.limited())
        throw new Error(
          "The scan network transfer limit (96 MiB) was reached. Narrow the scan.",
        );
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
    }
    for (const source of scan.pages)
      for (const issue of scan.issues) {
        if (
          issue.category === "links" &&
          issue.resource &&
          source.links.includes(issue.resource) &&
          !issue.affectedPages.includes(source.url)
        )
          issue.affectedPages.push(source.url);
      }
    for (const issue of scan.issues.filter(
      (issue) => issue.category === "links" && issue.resource,
    )) {
      for (const source of scan.pages)
        for (const element of (source.elements || []).filter(
          (el) => el.tag === "a" && el.destination === issue.resource,
        )) {
          if (
            issue.occurrenceList?.some(
              (occ) =>
                occ.pageUrl === source.url &&
                occ.element?.identity === element.identity,
            )
          )
            continue;
          const scene = [
            ...source.screenshots,
            ...(source.detailScreenshots || []),
          ].find((image) => image.id === element.screenshotId);
          addIssue(scan, source.url, {
            category: issue.category,
            severity: issue.severity,
            confidence: issue.confidence,
            title: issue.title,
            description: issue.description,
            evidence: issue.evidence,
            resource: issue.resource,
            suggestion: issue.suggestion,
            checkId: issue.checkId,
            elementEvidence: element,
            screenshotId: scene?.id,
          });
        }
    }
    if (scan.pages.length >= scan.settings.maxPages)
      scan.limitations.push(
        "The page limit was reached. Additional linked pages may remain unscanned.",
      );
  } finally {
    signal.removeEventListener("abort", abort);
    await runtime.close();
  }
}
