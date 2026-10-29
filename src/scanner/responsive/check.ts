import type { Page } from "playwright";
import type { PageReport, Scan } from "../../shared/schemas.js";
import type { Storage } from "../../reports/storage.js";
import {
  captureScene,
  installEvidence,
  elementAt,
} from "../evidence/capture.js";
import { inspectAccessibleNames } from "../checks/names.js";
import { addIssue } from "../issues.js";

export async function inspectResponsive(
  page: Page,
  scan: Scan,
  report: PageReport,
  storage: Storage,
  signal: AbortSignal,
) {
  for (const width of [1440, 768, 390]) {
    signal.throwIfAborted();
    await page.setViewportSize({ width, height: 960 });
    await page.waitForTimeout(120);
    await installEvidence(page);
    if (width === 390)
      await inspectAccessibleNames(
        page,
        scan,
        report,
        (report.resources || []).some(
          (r) =>
            [
              "blocked",
              "unsupported",
              "failed",
              "timeout",
              "browser-restriction",
            ].includes(r.status) &&
            ["image", "font", "stylesheet", "script"].includes(r.type) &&
            (r.type !== "image" || r.provenance === "buggd"),
        ),
      );
    const result = await page.evaluate(() => {
      const root = document.documentElement;
      const overflow = Math.max(0, root.scrollWidth - innerWidth);
      const elements = Array.from(document.querySelectorAll("body *"))
        .slice(0, 5000)
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < innerHeight &&
            (rect.right > innerWidth + 3 || rect.left < -3) &&
            style.position !== "fixed"
          );
        })
        .slice(0, 12)
        .map((el) => window.BuggdEvidence.locate(el));
      const clipped = Array.from(
        document.querySelectorAll("button, h1, h2, label"),
      )
        .slice(0, 100)
        .filter((el) => {
          const style = getComputedStyle(el);
          return (
            style.overflow === "hidden" &&
            style.textOverflow !== "ellipsis" &&
            el.scrollWidth > el.clientWidth + 4 &&
            el.clientWidth > 0
          );
        })
        .slice(0, 4)
        .map((el) => window.BuggdEvidence.locate(el));
      const obscured = Array.from(
        document.querySelectorAll(
          'button, a[href], input:not([type="hidden"]), select',
        ),
      )
        .slice(0, 150)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (
            r.width < 4 ||
            r.height < 4 ||
            r.top < 0 ||
            r.bottom > innerHeight ||
            r.left < 0 ||
            r.right > innerWidth ||
            style.visibility === "hidden" ||
            style.pointerEvents === "none"
          )
            return false;
          const hit = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return !!hit && hit !== el && !el.contains(hit) && !hit.contains(el);
        })
        .slice(0, 6)
        .map((el) => window.BuggdEvidence.locate(el));
      return { overflow, elements, clipped, obscured };
    });
    for (const [kind, locators] of [
      ["overflow", result.overflow > 3 ? result.elements : []],
      ["clip", result.clipped],
      ["overlap", result.obscured],
    ] as const) {
      const targets = locators.length
        ? locators
        : kind === "overflow" && result.overflow > 3
          ? ["html"]
          : [];
      for (const locator of targets) {
        const element = await elementAt(page, locator);
        addIssue(scan, report.url, {
          category: "responsive",
          severity: kind === "overflow" ? "medium" : "low",
          confidence: kind === "overflow" ? "confirmed" : "potential",
          title:
            kind === "overflow"
              ? `Horizontal overflow at ${width}px`
              : kind === "clip"
                ? `Possibly clipped text at ${width}px`
                : `Potentially obscured controls at ${width}px`,
          description:
            kind === "overflow"
              ? "The document is wider than the tested viewport."
              : "Geometry suggests a possibly clipped or overlapping element; intentional layouts can explain this.",
          evidence: `${width}px viewport. ${result.overflow}px document overflow. Observed element: ${locator}.`,
          element: locator,
          elementEvidence: element,
          viewportWidth: width,
          suggestion:
            "Review this exact element at the affected width and adjust its layout if needed.",
          checkId: `responsive.${kind}.${width}`,
        });
      }
    }
    const screenshot = await captureScene(page, scan, report, storage);
    report.responsive.push({
      width,
      overflow: result.overflow,
      elements: result.elements,
      screenshotId: screenshot?.id,
    });
    report.coverage ??= [];
    for (const kind of ["overflow", "clip", "overlap"])
      report.coverage.push({
        checkId: `responsive.${kind}.${width}`,
        status: "completed",
        viewportWidth: width,
      });
    scan.checksExecuted += 3;
  }
  await page.setViewportSize({ width: 1440, height: 960 });
}
