import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { startFixture } from "../../fixtures/server.js";
import { Storage } from "../../src/reports/storage.js";
import { crawl, scanLimitations } from "../../src/scanner/crawler.js";
import { scanInputSchema } from "../../src/shared/schemas.js";
import type { Scan } from "../../src/shared/schemas.js";
import { htmlReport } from "../../src/reports/html.js";
import { ScanManager } from "../../src/scanner/manager.js";

describe("real Chromium scanner", () => {
  let fixture: Awaited<ReturnType<typeof startFixture>>;
  let directory: string;
  let storage: Storage;
  beforeAll(async () => {
    fixture = await startFixture();
    directory = await mkdtemp(join(tmpdir(), "buggd-scan-"));
    storage = new Storage(directory);
  });
  afterAll(async () => {
    await fixture?.close();
    await rm(directory, { recursive: true, force: true });
  });
  const makeScan = (url: string): Scan => ({
    id: randomUUID(),
    url,
    settings: scanInputSchema.parse({
      url,
      maxPages: 6,
      timeout: 2500,
      maxInteractions: 6,
    }),
    status: "starting",
    createdAt: new Date().toISOString(),
    activity: "",
    checksExecuted: 0,
    pages: [],
    issues: [],
    limitations: [...scanLimitations],
    evidenceBytes: 0,
  });
  it("discovers defects, captures evidence, exercises safe UI and never sends writes", async () => {
    const scan = makeScan(fixture.url + "/");
    await crawl(scan, storage, new AbortController().signal, [], () => {});
    expect(
      scan.pages.some(
        (page) => page.url.endsWith("/clean") && page.status === "completed",
      ),
    ).toBe(true);
    for (const category of [
      "links",
      "images",
      "javascript",
      "content",
      "metadata",
      "responsive",
      "interactions",
      "forms",
    ])
      expect(scan.issues.some((issue) => issue.category === category)).toBe(
        true,
      );
    expect(scan.issues.some((issue) => issue.title.includes("404"))).toBe(true);
    const root = scan.pages[0];
    expect(root.screenshots.map((item) => item.width)).toEqual([
      1440, 768, 390,
    ]);
    expect(
      (await storage.evidence(scan.id, root.screenshots[0].id)).length,
    ).toBeGreaterThan(100);
    expect(
      root.interactions.find((item) => item.element === "#tab")?.outcome,
    ).toBe("changed");
    expect(
      root.interactions.find((item) => item.element === "#noop")?.outcome,
    ).toBe("no-response");
    expect(
      root.interactions.find((item) => item.element === "#delete")?.outcome,
    ).toBe("not-tested");
    expect(
      root.interactions.find((item) => item.element === "#guarded-get")
        ?.outcome,
    ).toBe("blocked");
    expect(
      root.forms[0].checks.some(
        (check) => check.scenario === "Invalid email format" && !check.valid,
      ),
    ).toBe(true);
    expect(
      root.forms[0].checks.some(
        (check) => check.field === "#agree" && !check.valid,
      ),
    ).toBe(true);
    expect(fixture.counts).toEqual({ writes: 0, unsafeGets: 0, external: 0 });
    scan.status = "completed";
    await storage.save(scan);
    expect(
      (await storage.list()).find((item) => item.id === scan.id)?.issues.length,
    ).toBe(scan.issues.length);
    const html = await htmlReport(scan, storage);
    expect(html).toContain("data:image/png;base64,");
    expect(html).toContain("Coverage and limitations");
    scan.issues[0].title = '<script>alert("bad")</script>';
    expect(await htmlReport(scan, storage)).not.toContain("<script>");
  });
  it("has no findings on the deliberately clean isolated fixture", async () => {
    const scan = makeScan(fixture.url + "/clean");
    scan.settings.maxPages = 1;
    await crawl(scan, storage, new AbortController().signal, [], () => {});
    expect(scan.issues).toEqual([]);
  });
  it("bounds slow navigation and records the observation as potential", async () => {
    const scan = makeScan(fixture.url + "/slow");
    scan.settings.timeout = 1000;
    await crawl(scan, storage, new AbortController().signal, [], () => {});
    expect(scan.pages[0].status).toBe("failed");
    expect(
      scan.issues.some(
        (issue) =>
          issue.checkId === "links.navigation" &&
          issue.confidence === "potential",
      ),
    ).toBe(true);
  });
  it("cancels a live scan and persists its terminal status", async () => {
    const manager = new ScanManager(storage, () => []);
    await manager.init();
    const scan = await manager.create(
      scanInputSchema.parse({ url: fixture.url + "/slow", timeout: 20000 }),
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    await manager.cancel(scan.id);
    expect(scan.status).toBe("cancelled");
    expect(scan.finishedAt).toBeTruthy();
    expect(
      (await storage.list()).find((item) => item.id === scan.id)?.status,
    ).toBe("cancelled");
    await manager.close();
  });
});
