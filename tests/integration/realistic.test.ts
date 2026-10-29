import { it, expect } from "vitest";
import { chromium } from "playwright";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startRealisticFixture } from "../../fixtures/realistic.js";
import { crawl } from "../../src/scanner/crawler.js";
import { Storage } from "../../src/reports/storage.js";
import { report } from "../helpers.js";
import { scanInputSchema } from "../../src/shared/schemas.js";
it("scans React routes, delayed controls and builder-style forms/panels with real evidence", async () => {
  const fixture = await startRealisticFixture(),
    dir = await mkdtemp(join(tmpdir(), "buggd-realistic-"));
  try {
    const browser = await chromium.launch();
    try {
      const p = await browser.newPage();
      await p.goto(fixture.url);
      await p.getByRole("link", { name: "Client route" }).click();
      await expect.poll(() => p.locator("h1").textContent()).toBe("/client");
    } finally {
      await browser.close();
    }
    const s = report();
    s.url = fixture.url + "/";
    s.settings = scanInputSchema.parse({
      url: s.url,
      maxPages: 4,
      maxInteractions: 3,
    });
    await crawl(
      s,
      new Storage(dir),
      new AbortController().signal,
      [],
      () => {},
    );
    for (const path of ["/client", "/late", "/wordpress"])
      expect(
        s.pages.some((p) => new URL(p.url).pathname === path),
        path,
      ).toBe(true);
    const wp = s.pages.find((p) => p.url.endsWith("/wordpress"))!;
    expect(wp.forms.length).toBe(1);
    expect(
      wp.interactions.find((i) => i.element === "#modal-toggle")?.outcome,
    ).toBe("changed");
    expect(wp.screenshots).toHaveLength(3);
    expect(
      s.issues.some(
        (i) =>
          i.resource?.endsWith("/missing.png") && i.confidence === "confirmed",
      ),
    ).toBe(true);
    expect(
      s.issues.some(
        (i) =>
          i.checkId === "metadata.control-name" &&
          i.occurrenceList?.some((o) => o.element?.locator === "#late-control"),
      ),
    ).toBe(false);
    expect(fixture.counts.writes).toBe(0);
  } finally {
    await fixture.close();
    await rm(dir, { recursive: true, force: true });
  }
});
