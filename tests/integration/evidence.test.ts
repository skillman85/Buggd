import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { chromium } from "playwright";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startV11Fixture } from "../../fixtures/v11.js";
import { report, finding } from "../helpers.js";
import type { PageReport } from "../../src/shared/schemas.js";
import { Storage } from "../../src/reports/storage.js";
import { inspectDocument } from "../../src/scanner/checks/document.js";
import {
  captureScene,
  elementAt,
  inventory,
} from "../../src/scanner/evidence/capture.js";
import { highlightBounds } from "../../src/reporting/geometry.js";
let fixture: Awaited<ReturnType<typeof startV11Fixture>>;
let directory: string;
beforeAll(async () => {
  fixture = await startV11Fixture();
  directory = await mkdtemp(join(tmpdir(), "buggd-evidence-"));
});
afterAll(async () => {
  await fixture.close();
  await rm(directory, { recursive: true, force: true });
});
it("computes representative accessible names, identifies real controls and supports open shadow roots", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(fixture.url);
    const scan = report();
    scan.url = fixture.url;
    const p: PageReport = {
      id: "p",
      url: fixture.url,
      title: "",
      status: "scanning" as const,
      duration: 0,
      links: [],
      externalLinks: [],
      screenshots: [],
      consoleErrors: [],
      failedResources: [],
      interactions: [],
      forms: [],
      responsive: [],
    };
    scan.pages = [p];
    await inspectDocument(page, scan, p);
    const unnamed = scan.issues
      .filter((issue) => issue.checkId === "metadata.control-name")
      .flatMap(
        (issue) =>
          issue.occurrenceList?.map((occ) => occ.element?.locator) || [],
      );
    expect(unnamed).toContain("#bad-nav");
    expect(
      scan.issues.some((issue) => issue.checkId === "metadata.duplicates"),
    ).toBe(false);
    expect(unnamed).toContain("#bad-button");
    expect(unnamed.some((locator) => locator?.includes("shadow-bad"))).toBe(
      true,
    );
    for (const id of [
      "named-icon",
      "svg-title",
      "labelled-by",
      "hidden-text",
      "image-link",
      "nested-name",
      "decorative",
    ])
      expect(
        unnamed.some((locator) => locator?.includes(`#${id}`)),
        id,
      ).toBe(false);
    const exact = await elementAt(page, "#bad-nav");
    expect(exact?.tag).toBe("a");
    expect(exact?.destination).toBe(new URL("/about", fixture.url).href);
    expect(exact?.landmark).toContain("navigation");
  } finally {
    await browser.close();
  }
});
it("captures an offscreen element with scroll/DPR metadata and aligns the PNG without guessing", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 600 },
      deviceScaleFactor: 2,
    });
    await page.goto(fixture.url);
    await inventory(page);
    await page.locator("#far-target").scrollIntoViewIfNeeded();
    const el = await elementAt(page, "#far-target");
    expect(el?.viewport.scrollY).toBeGreaterThan(0);
    const scan = report();
    scan.url = fixture.url;
    const p: PageReport = {
      id: "p",
      url: fixture.url,
      title: "Home",
      status: "completed" as const,
      duration: 0,
      links: [],
      externalLinks: [],
      screenshots: [],
      consoleErrors: [],
      failedResources: [],
      interactions: [],
      forms: [],
      responsive: [],
    };
    scan.pages = [p];
    const issue = finding(scan, "metadata.control-name", "confirmed", el);
    await captureScene(page, scan, p, new Storage(directory));
    const occurrence = issue.occurrenceList![0];
    expect(occurrence.element?.alignment).toBe("reliable");
    const screenshot = p.screenshots[0];
    expect(screenshot.dpr).toBe(2);
    expect(screenshot.pixelWidth).toBe(390);
    expect(highlightBounds(occurrence, screenshot)?.top).toBeCloseTo(
      (el!.rect.y / 600) * 100,
      1,
    );
    const data = await new Storage(directory).evidence(scan.id, screenshot.id);
    expect(data.readUInt32BE(16)).toBe(390);
    expect(await elementAt(page, "a")).toBeUndefined();
  } finally {
    await browser.close();
  }
});

it("withholds highlights when an element moves during the actual screenshot and excludes form values", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 600 },
    });
    await page.setContent(
      '<title>Moving evidence</title><button id="moving">Open menu</button><form id="private"><label for="message">Message</label><textarea id="message">private-customer-message</textarea><input value="private-contact"></form>',
    );
    const el = await elementAt(page, "#moving");
    const scan = report();
    const p: PageReport = {
      id: "p",
      url: scan.url,
      title: "",
      status: "completed",
      duration: 0,
      links: [],
      externalLinks: [],
      screenshots: [],
      consoleErrors: [],
      failedResources: [],
      interactions: [],
      forms: [],
      responsive: [],
    };
    scan.pages = [p];
    const issue = finding(scan, "interactions.response", "potential", el);
    const screenshot = page.screenshot.bind(page);
    vi.spyOn(page, "screenshot").mockImplementationOnce(async (options) => {
      await page.locator("#moving").evaluate((el) => {
        (el as HTMLElement).style.marginLeft = "200px";
      });
      return screenshot(options);
    });
    await captureScene(page, scan, p, new Storage(directory));
    expect(issue.occurrenceList![0].element?.alignment).toBe("moved");
    expect(
      highlightBounds(issue.occurrenceList![0], p.screenshots[0]),
    ).toBeUndefined();
    for (const locator of ["#private", "#message"]) {
      const captured = JSON.stringify(await elementAt(page, locator));
      expect(captured).not.toContain("private-customer-message");
      expect(captured).not.toContain("private-contact");
    }
  } finally {
    await browser.close();
  }
});

it("reproduces captured empty-alt image links and icon-only FAQ buttons independently of image loading", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const loaded of [false, true]) {
      await page.setContent(
        `<title>Captured shapes</title><style>a,button{display:inline-block;width:40px;height:40px}</style><nav><a id="captured-link" href="/about"><div><img alt="" src="${loaded ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJp8AAAAASUVORK5CYII=" : "data:image/png;base64,invalid"}"></div></a></nav><p>Do I own the logo rights?<button id="captured-faq"><div></div><div></div></button></p><a id="named-image-link" href="/about"><img alt="Meet our team"></a><button id="labelled-faq" aria-label="Expand logo rights answer"><div></div></button>`,
      );
      await page.evaluate(() =>
        Promise.all(
          [...document.images].map((img) => img.decode().catch(() => {})),
        ),
      );
      expect(
        await page
          .locator("#captured-link img")
          .evaluate((el) => (el as HTMLImageElement).naturalWidth > 0),
      ).toBe(loaded);
      const s = report(),
        p = {
          id: "p",
          url: s.url,
          title: "Home",
          status: "completed" as const,
          duration: 0,
          links: [],
          externalLinks: [],
          screenshots: [],
          consoleErrors: [],
          failedResources: [],
          interactions: [],
          forms: [],
          responsive: [],
        };
      s.pages = [p];
      await inspectDocument(page, s, p, new Set());
      const names = s.issues.filter(
        (i) => i.checkId === "metadata.control-name",
      );
      expect(
        names.flatMap(
          (i) => i.occurrenceList?.map((o) => o.element?.locator) || [],
        ),
      ).toEqual(expect.arrayContaining(["#captured-link", "#captured-faq"]));
      expect(
        names.some((i) =>
          i.occurrenceList?.some((o) =>
            ["#named-image-link", "#labelled-faq"].includes(
              o.element?.locator || "",
            ),
          ),
        ),
      ).toBe(false);
    }
  } finally {
    await browser.close();
  }
});
