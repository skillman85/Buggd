import type { Browser, Page } from "playwright";
import type { Interaction, PageReport, Scan } from "../../shared/schemas.js";
import { guardedContext } from "../browser.js";
import type { NetworkPolicy } from "../network.js";
import { addIssue } from "../issues.js";
import {
  elementAt,
  captureScene,
  installEvidence,
} from "../evidence/capture.js";
import type { Storage } from "../../reports/storage.js";
import { displayError } from "../url.js";

export type Candidate = {
  label: string;
  element: string;
  tag: string;
  role: string;
  type: string;
  inForm: boolean;
  disabled: boolean;
  download: boolean;
  href: string;
  controlsExisting: boolean;
  hasExpanded: boolean;
};
export function classifyControl(
  candidate: Candidate,
): Interaction["classification"] {
  if (
    candidate.disabled ||
    candidate.download ||
    candidate.inForm ||
    candidate.type === "submit" ||
    candidate.type === "file" ||
    candidate.href ||
    /\b(delete|remove|purchase|buy|checkout|pay|payment|logout|log out|sign out|send|publish|save|upload|confirm|subscribe|reset|submit|login|sign in|download)\b/i.test(
      candidate.label,
    )
  )
    return "excluded";
  if (
    candidate.tag === "summary" ||
    candidate.tag === "select" ||
    (candidate.controlsExisting &&
      (candidate.role === "tab" || candidate.hasExpanded))
  )
    return "safe";
  return "unknown";
}

async function candidates(page: Page): Promise<Candidate[]> {
  return page.evaluate(() => {
    const selector = (el: Element) => window.BuggdEvidence.locate(el);
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, summary, select, [role="button"], [role="tab"], [role="switch"], a[aria-expanded]',
      ),
    )
      .slice(0, 80)
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((el) => ({
        label: (
          el.getAttribute("aria-label") ||
          el.textContent ||
          el.getAttribute("title") ||
          "Unnamed control"
        )
          .trim()
          .slice(0, 120),
        element: selector(el),
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role") || "",
        type:
          el.getAttribute("type") ||
          (el.tagName === "BUTTON" && el.closest("form") ? "submit" : ""),
        inForm: !!el.closest("form"),
        disabled:
          el.hasAttribute("disabled") ||
          el.getAttribute("aria-disabled") === "true",
        download: el.hasAttribute("download"),
        href: el.getAttribute("href") || "",
        controlsExisting: !!document.getElementById(
          el.getAttribute("aria-controls") || "",
        ),
        hasExpanded: el.hasAttribute("aria-expanded"),
      }));
  });
}

async function controlState(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const target =
        document.getElementById(element.getAttribute("aria-controls") || "") ||
        element.closest("details") ||
        element;
      return JSON.stringify({
        value: element instanceof HTMLSelectElement ? element.value : undefined,
        expanded: element.getAttribute("aria-expanded"),
        selected: element.getAttribute("aria-selected"),
        open: target.hasAttribute("open"),
        hidden: target.hasAttribute("hidden"),
        target: target.outerHTML.slice(0, 16000),
        text: (document.body?.innerText || "").slice(0, 40000),
      });
    });
}

export async function inspectInteractions(
  browser: Browser,
  sourcePage: Page,
  scan: Scan,
  report: PageReport,
  policy: NetworkPolicy,
  signal: AbortSignal,
  storage: Storage,
) {
  await installEvidence(sourcePage);
  const controls = await candidates(sourcePage);
  let attempts = 0;
  for (const candidate of controls) {
    signal.throwIfAborted();
    const classification = classifyControl(candidate);
    if (
      classification !== "safe" ||
      !scan.settings.interactions ||
      attempts >= scan.settings.maxInteractions
    ) {
      report.interactions.push({
        label: candidate.label,
        element: candidate.element,
        classification,
        outcome: "not-tested",
        detail:
          classification === "excluded"
            ? "Excluded because the control may navigate, submit data, download a file or perform a state-changing action."
            : classification === "unknown"
              ? "The control has no recognised safe UI contract. Its handler was not executed."
              : "Interaction testing is disabled or this page reached its attempt limit.",
      });
      addIssue(scan, report.url, {
        category: "interactions",
        severity: "informational",
        confidence: "not-tested",
        title: "Control excluded from automatic interaction",
        description:
          "This action was not executed because its behaviour could not be safely verified.",
        evidence: report.interactions[report.interactions.length - 1].detail,
        element: candidate.element,
        elementEvidence: await elementAt(sourcePage, candidate.element),
        suggestion:
          "Try this control manually in an authorised test environment, using safe test data.",
        checkId: "interactions.excluded",
      });
      continue;
    }
    attempts++;
    const { context, guard } = await guardedContext(browser, scan, policy);
    const abort = () => {
      void context.close().catch(() => {});
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      const page = await context.newPage();
      await page.goto(report.finalUrl || report.url, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(150);
      guard.locked = true; // All requests, including GET, are blocked during actual interactions.
      const testedElement = await elementAt(page, candidate.element);
      const fresh = (await candidates(page)).find(
        (control) => control.element === candidate.element,
      );
      if (
        !testedElement ||
        !fresh ||
        classifyControl(fresh) !== "safe" ||
        fresh.tag !== candidate.tag ||
        fresh.label !== candidate.label
      )
        throw new Error(
          "The original safe control could not be matched in this isolated page. It was not clicked.",
        );
      const before = await controlState(page, candidate.element);
      const blockedBefore = guard.blocked;
      const control = page.locator(candidate.element).first();
      if (candidate.tag === "select") {
        const values = await control
          .locator("option:not([disabled])")
          .evaluateAll((options) =>
            options.map((option) => (option as HTMLOptionElement).value),
          );
        const current = await control.inputValue();
        const next = values.find((value) => value !== current);
        if (next === undefined)
          throw new Error("No alternative select option was available.");
        await control.selectOption(next);
      } else await control.click({ timeout: 2000, noWaitAfter: true });
      await page.waitForTimeout(300);
      const after = await controlState(page, candidate.element);
      const outcome =
        guard.blocked > blockedBefore
          ? "blocked"
          : before !== after
            ? "changed"
            : "no-response";
      const detail =
        outcome === "blocked"
          ? "The interaction attempted network activity. All network requests were blocked during this action; the full result was not tested."
          : outcome === "changed"
            ? "A relevant DOM, text or accessibility state change was observed in an isolated context."
            : "No observable DOM or accessibility state change within 300ms. Clipboard, browser UI and delayed effects are outside this observation.";
      report.interactions.push({
        label: candidate.label,
        element: candidate.element,
        classification,
        outcome,
        detail,
      });
      if (outcome === "no-response")
        addIssue(scan, report.url, {
          category: "interactions",
          severity: "low",
          confidence: "potential",
          title: "No observable response",
          description: `“${candidate.label}” showed no observable response during a bounded safe interaction check. This does not prove the control is broken.`,
          evidence: detail,
          element: candidate.element,
          elementEvidence: await elementAt(page, candidate.element),
          suggestion:
            "Test the control manually and inspect its event handler, target and expected effects.",
          checkId: "interactions.response",
        });
      if (outcome === "blocked")
        addIssue(scan, report.url, {
          category: "interactions",
          severity: "informational",
          confidence: "not-tested",
          title: "Interaction requires network activity",
          description: `“${candidate.label}” attempted a request while network activity was locked.`,
          evidence: detail,
          element: candidate.element,
          elementEvidence: await elementAt(page, candidate.element),
          suggestion:
            "Verify this interaction manually in an authorised test environment.",
          checkId: "interactions.blocked",
        });
      if (outcome !== "changed")
        await captureScene(page, scan, report, storage, candidate.element);
      report.coverage ??= [];
      report.coverage.push({
        checkId: "interactions.response",
        elementIdentity: testedElement?.identity,
        status: outcome === "blocked" ? "blocked" : "completed",
      });
      scan.checksExecuted++;
    } catch (error) {
      if (signal.aborted) throw error;
      report.interactions.push({
        label: candidate.label,
        element: candidate.element,
        classification,
        outcome: "not-tested",
        detail: displayError(error),
      });
      const element = await elementAt(sourcePage, candidate.element).catch(
        () => undefined,
      );
      report.coverage ??= [];
      report.coverage.push({
        checkId: "interactions.response",
        elementIdentity: element?.identity,
        status: "not-tested",
        note: displayError(error),
      });
      addIssue(scan, report.url, {
        category: "interactions",
        severity: "informational",
        confidence: "not-tested",
        title: "Control could not be checked",
        description: "Buggd could not complete this safe interaction check.",
        evidence: displayError(error),
        element: candidate.element,
        elementEvidence: element,
        suggestion:
          "Try the affected control manually before deciding whether it works.",
        checkId: "interactions.excluded",
      });
    } finally {
      signal.removeEventListener("abort", abort);
      await context.close().catch(() => {});
    }
  }
}
