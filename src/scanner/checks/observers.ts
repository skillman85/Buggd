import type { Page } from "playwright";
import type { PageReport, Scan } from "../../shared/schemas.js";
import { addIssue } from "../issues.js";
import type { GuardState } from "../browser.js";
import { safeUrl } from "../url.js";

export function observePage(
  page: Page,
  scan: Scan,
  report: PageReport,
  guard: GuardState,
) {
  let errors = 0;
  const javascript = (message: string, evidence: string) => {
    if (++errors > 30) return;
    const clipped = message.slice(0, 1000);
    if (
      report.consoleErrors.length < 30 &&
      !report.consoleErrors.includes(clipped)
    )
      report.consoleErrors.push(clipped);
    addIssue(scan, report.url, {
      category: "javascript",
      severity: "medium",
      confidence: guard.resources.some(
        (resource) =>
          [
            "blocked",
            "unsupported",
            "failed",
            "timeout",
            "browser-restriction",
          ].includes(resource.status) &&
          ["script", "stylesheet", "image", "font"].includes(resource.type) &&
          (resource.type !== "image" || resource.provenance === "buggd"),
      )
        ? "potential"
        : "confirmed",
      title: "JavaScript error observed",
      description: clipped,
      evidence: evidence.slice(0, 4000),
      suggestion:
        "Reproduce the error in browser developer tools and inspect the stack or source location.",
      checkId: "javascript.error",
    });
  };
  page.on("pageerror", (error) =>
    javascript(error.message, error.stack || error.message),
  );
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !/Failed to load resource|ERR_BLOCKED_BY_CLIENT/.test(message.text())
    )
      javascript(
        message.text(),
        `${message.text()}\n${JSON.stringify(message.location())}`,
      );
  });
  page.on("response", (response) => {
    const provenance =
      new URL(response.url()).origin === new URL(scan.url).origin
        ? "target"
        : "third-party";
    if (response.headers()["x-buggd-policy-blocked"]) {
      guard.blocked++;
      guard.blockedUrls.add(safeUrl(response.url()));
      if (guard.resources.length < 250)
        guard.resources.push({
          url: safeUrl(response.url()),
          type: response.request().resourceType(),
          status: "blocked",
          provenance: "buggd",
          detail: "The scan proxy blocked this destination.",
        });
      return;
    }
    if (guard.resources.length < 250)
      guard.resources.push({
        url: safeUrl(response.url()),
        type: response.request().resourceType(),
        status: response.status() >= 400 ? "failed" : "loaded",
        provenance,
        httpStatus: response.status(),
        detail: `HTTP ${response.status()}`,
      });
    if (response.status() < 400 || report.failedResources.length >= 80) return;
    const url = safeUrl(response.url());
    report.failedResources.push({ url, detail: `HTTP ${response.status()}` });
    const type = response.request().resourceType();
    const document = type === "document";
    addIssue(scan, report.url, {
      category: document ? "links" : type === "image" ? "images" : "network",
      severity: document || type === "image" ? "high" : "medium",
      confidence:
        provenance === "target" &&
        (document || ["image", "script", "stylesheet"].includes(type))
          ? "confirmed"
          : "potential",
      title: `${document ? "Page" : type === "image" ? "Image" : "Resource"} returned HTTP ${response.status()}`,
      description: document
        ? "An internal destination returned an unsuccessful HTTP response."
        : "The browser observed an unsuccessful resource response. Review whether it affects the application.",
      evidence: `${response.status()} ${response.statusText()} (${type})\nSource page: ${report.sourceUrl || report.url}`,
      resource: url,
      suggestion:
        "Check the destination URL and server response. Update the source link or restore the resource.",
      checkId: document ? "links.http" : "network.http",
    });
  });
  page.on("requestfailed", (request) => {
    const url = safeUrl(request.url());
    const failure = request.failure()?.errorText || "Request failed";
    if (
      guard.blockedUrls.has(url) ||
      /ERR_BLOCKED_BY_CLIENT|ERR_ABORTED/.test(failure) ||
      report.failedResources.length >= 80
    )
      return;
    report.failedResources.push({ url, detail: failure.slice(0, 300) });
    if (guard.resources.length < 250)
      guard.resources.push({
        url,
        type: request.resourceType(),
        status: /TIMED_OUT|timeout/i.test(failure)
          ? "timeout"
          : /BLOCKED|CORS/i.test(failure)
            ? "browser-restriction"
            : "failed",
        provenance:
          new URL(request.url()).origin === new URL(scan.url).origin
            ? "target"
            : "third-party",
        detail: failure.slice(0, 400),
      });
    addIssue(scan, report.url, {
      category: "network",
      severity: "low",
      confidence: "potential",
      title: "Network request failed",
      description:
        "A browser request failed. Browser policy, blockers or an unavailable service may be responsible.",
      evidence: `${failure}\n${request.resourceType()}`,
      resource: url,
      suggestion:
        "Check the failed request and determine whether the application requires this service.",
      checkId: "network.failure",
    });
  });
}
