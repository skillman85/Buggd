import { randomUUID } from "node:crypto";
import type { Page } from "playwright";
import type {
  ElementEvidence,
  ScreenshotEvidence,
} from "../../shared/evidence.js";
import type { Scan, PageReport } from "../../shared/schemas.js";
import type { Storage } from "../../reports/storage.js";
import { evidenceScript } from "./browser-source.js";
import { safeUrl } from "../url.js";

export async function installEvidence(page: Page) {
  if (!(await page.evaluate(() => typeof window.BuggdEvidence !== "undefined")))
    await page.evaluate(
      `${evidenceScript}\nwindow.BuggdEvidence = BuggdEvidence;`,
    );
}
export async function inventory(page: Page): Promise<ElementEvidence[]> {
  await installEvidence(page);
  return (await page.evaluate(() => window.BuggdEvidence.inventory())).map(
    (element) => ({
      ...element,
      destination: element.destination
        ? safeUrl(element.destination)
        : undefined,
    }),
  );
}
export async function elementAt(
  page: Page,
  locator: string,
): Promise<ElementEvidence | undefined> {
  await installEvidence(page);
  return page.evaluate((selector) => {
    try {
      const el = window.BuggdEvidence.resolve(selector);
      return el ? window.BuggdEvidence.capture(el) : undefined;
    } catch {
      return undefined;
    }
  }, locator);
}
export function visibleBounds(element: ElementEvidence) {
  const { rect: r, viewport: v } = element;
  return (
    r.width > 0 &&
    r.height > 0 &&
    r.x < v.width &&
    r.y < v.height &&
    r.x + r.width > 0 &&
    r.y + r.height > 0
  );
}
export async function captureScene(
  page: Page,
  scan: Scan,
  report: PageReport,
  storage: Storage,
  onlyLocator?: string,
): Promise<ScreenshotEvidence | undefined> {
  if (scan.evidenceBytes >= 60 * 1024 * 1024) return;
  await installEvidence(page);
  const occurrences = scan.issues
    .flatMap((issue) => issue.occurrenceList || [])
    .filter(
      (occ) =>
        occ.pageUrl === report.url &&
        occ.element &&
        !occ.screenshotId &&
        (!occ.viewportWidth ||
          occ.viewportWidth === page.viewportSize()?.width) &&
        (!onlyLocator || occ.element?.locator === onlyLocator),
    );
  const beforeInventory = await inventory(page);
  const measured = new Map<string, ElementEvidence>();
  for (const occ of occurrences) {
    const el =
      beforeInventory.find((item) => item.locator === occ.element!.locator) ||
      (await elementAt(page, occ.element!.locator));
    if (el && visibleBounds(el)) measured.set(occ.id, el);
  }
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    dpr: devicePixelRatio,
    scrollX,
    scrollY,
  }));
  const png = await page
    .screenshot({
      type: "png",
      fullPage: false,
      scale: "css",
      animations: "disabled",
      timeout: Math.min(scan.settings.timeout, 10000),
    })
    .catch(() => undefined);
  if (!png || png.length >= 4 * 1024 * 1024) return;
  const limited = (report.resources || []).filter((resource) =>
    [
      "blocked",
      "unsupported",
      "failed",
      "timeout",
      "browser-restriction",
    ].includes(resource.status),
  );
  const screenshot: ScreenshotEvidence = {
    id: randomUUID(),
    width: viewport.width,
    height: viewport.height,
    pixelWidth: png.readUInt32BE(16),
    pixelHeight: png.readUInt32BE(20),
    dpr: viewport.dpr,
    scrollX: viewport.scrollX,
    scrollY: viewport.scrollY,
    fullPage: false,
    completeness: limited.length ? "limited" : "complete",
    note: limited.length
      ? limited.some((resource) => resource.provenance === "buggd")
        ? "Some resources or requests were blocked during this scan. This screenshot may look different from the website visitors see."
        : "Some resources did not finish loading. Review their failure or timeout details before drawing conclusions from this screenshot."
      : undefined,
  };
  await storage.saveEvidence(scan.id, screenshot.id, png);
  scan.evidenceBytes += png.length;
  (onlyLocator ? (report.detailScreenshots ??= []) : report.screenshots).push(
    screenshot,
  );
  const afterInventory = await inventory(page);
  for (const element of beforeInventory) {
    const after = afterInventory.find(
      (item) => item.locator === element.locator,
    );
    if (
      !after ||
      !visibleBounds(element) ||
      after.identity !== element.identity ||
      after.state !== element.state ||
      after.viewport.scrollX !== viewport.scrollX ||
      after.viewport.scrollY !== viewport.scrollY ||
      !["x", "y", "width", "height"].every(
        (key) =>
          Math.abs(
            element.rect[key as keyof typeof element.rect] -
              after.rect[key as keyof typeof after.rect],
          ) < 1,
      )
    )
      continue;
    const aligned = {
      ...element,
      alignment: "reliable" as const,
      alignmentNote: undefined,
      screenshotId: screenshot.id,
    };
    report.elements ??= [];
    const index = report.elements.findIndex(
      (item) =>
        item.identity === element.identity &&
        item.viewport.width === element.viewport.width,
    );
    if (index >= 0) report.elements[index] = aligned;
    else if (report.elements.length < 400) report.elements.push(aligned);
  }
  for (const occ of occurrences) {
    const before = measured.get(occ.id);
    if (!before) continue;
    const after =
      afterInventory.find((item) => item.locator === before.locator) ||
      (await elementAt(page, before.locator));
    const stable =
      after &&
      ["x", "y", "width", "height"].every(
        (key) =>
          Math.abs(
            before.rect[key as keyof typeof before.rect] -
              after.rect[key as keyof typeof after.rect],
          ) < 1,
      ) &&
      before.identity === after.identity &&
      before.state === after.state &&
      after.viewport.scrollY === viewport.scrollY &&
      after.viewport.scrollX === viewport.scrollX;
    occ.element = {
      ...before,
      alignment: stable ? "reliable" : "moved",
      alignmentNote: stable
        ? undefined
        : "The element moved or changed while the screenshot was captured. No precise highlight is shown.",
    };
    occ.screenshotId = screenshot.id;
  }
  return screenshot;
}
export async function captureOffscreen(
  page: Page,
  scan: Scan,
  report: PageReport,
  storage: Storage,
) {
  const pending = scan.issues
    .flatMap((issue) => issue.occurrenceList || [])
    .filter(
      (occ) =>
        occ.pageUrl === report.url &&
        occ.element &&
        !occ.screenshotId &&
        (!occ.viewportWidth || occ.viewportWidth === 1440),
    );
  for (const occ of pending.slice(0, 8)) {
    try {
      const locator = occ.element!.locator;
      const el = page.locator(locator.replaceAll(" >>> ", " "));
      if ((await el.count()) !== 1) continue;
      await el.scrollIntoViewIfNeeded({ timeout: 1500 });
      await captureScene(page, scan, report, storage, locator);
    } catch {
      /* Leave the explicit unlocated fallback. */
    }
  }
  await page.evaluate(() => scrollTo(0, 0));
}
