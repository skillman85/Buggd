import { test, expect } from "@playwright/test";
import { startFixture } from "../../fixtures/server";

test.describe("real dashboard workflow", () => {
  let fixture: Awaited<ReturnType<typeof startFixture>>;
  test.beforeAll(async () => {
    fixture = await startFixture();
  });
  test.afterAll(async () => {
    await fixture.close();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`scan, inspect, map, export and delete in ${theme}`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(90000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width: 1440, height: 1050 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      await page
        .getByRole("combobox", { name: "Report display mode" })
        .selectOption("technical");
      await expect(
        page.getByRole("heading", { name: "New scan", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`home-${theme}.png`),
        fullPage: true,
      });
      await page.getByLabel("Website URL", { exact: true }).fill(fixture.url);
      await page.getByText("Scan settings", { exact: true }).click();
      await page.getByLabel("Maximum pages").fill("5");
      await page.getByLabel("Page timeout (seconds)").fill("3");
      await page
        .getByRole("button", { name: "Start scan", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Scan in progress", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Live scan progress" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Scan results", exact: true }),
      ).toBeVisible({ timeout: 60000 });
      await expect(page.locator(".results-heading .scan-status")).toHaveText(
        "completed",
      );
      await expect(page.locator(".toast-message")).toContainText(
        "Scan completed",
      );
      await page.getByRole("button", { name: "Dismiss notification" }).click();
      await page.screenshot({
        path: testInfo.outputPath(`results-${theme}.png`),
        fullPage: true,
      });
      const id = new URL(page.url()).hash.split("/")[1];
      const nav = page.getByRole("navigation", { name: "Scan result views" });
      await nav.getByRole("link", { name: /^Issues/ }).click();
      await page
        .getByRole("combobox", { name: "Filter category" })
        .selectOption("images");
      await expect(
        page.getByRole("button", { name: /Image/ }).first(),
      ).toBeVisible();
      await page
        .getByRole("combobox", { name: "Filter confidence" })
        .selectOption("confirmed");
      await page.locator(".finding-button").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "What Buggd observed" }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: /Page screenshot associated/ }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await nav.getByRole("link", { name: "Pages", exact: false }).click();
      await page.locator(".page-list > button").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Interaction checks" }),
      ).toBeVisible();
      await page.getByRole("button", { name: /Mobile · 390px/ }).click();
      await expect(
        page.getByRole("img", { name: /390px viewport screenshot/ }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await nav.getByRole("link", { name: "Website map", exact: true }).click();
      await expect(
        page.getByRole("group", {
          name: "Interactive map of discovered website pages",
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      await page.getByRole("button", { name: "Fit map", exact: true }).click();
      await page.locator(".map-node").first().press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close", exact: true }).click();
      const json = await page.request.get(
        `/api/scans/${id}/export?format=json`,
      );
      expect(json.ok()).toBe(true);
      expect((await json.json()).pages.length).toBeGreaterThan(1);
      const html = await page.request.get(
        `/api/scans/${id}/export?format=html`,
      );
      expect(await html.text()).toContain("data:image/png;base64,");
      await page.locator(".export-menu summary").click();
      const download = page.waitForEvent("download");
      await page.getByRole("link", { name: "Standalone HTML report" }).click();
      expect((await download).suggestedFilename()).toBe(`buggd-${id}.html`);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`map-mobile-${theme}.png`),
        fullPage: true,
      });
      await page.goto("/#history");
      await expect(
        page.locator(`a[href="#scan/${id}/overview"]`).first(),
      ).toBeVisible();
      const row = page
        .locator(".history-list article")
        .filter({ has: page.locator(`a[href="#scan/${id}/overview"]`) });
      await row.getByRole("button", { name: /^Delete scan/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page
        .getByRole("button", { name: "Delete scan", exact: true })
        .click();
      await expect(page.locator(`a[href="#scan/${id}/overview"]`)).toHaveCount(
        0,
      );
      expect(errors).toEqual([]);
      expect(fixture.counts.writes).toBe(0);
      expect(fixture.counts.unsafeGets).toBe(0);
      expect(fixture.counts.external).toBe(0);
    });
  }
  test("cancels from live dashboard", async ({ page }) => {
    await page.goto("/");
    await page
      .getByLabel("Website URL", { exact: true })
      .fill(`${fixture.url}/slow`);
    await page.getByRole("button", { name: "Start scan", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Cancel scan", exact: true }),
    ).toBeVisible();
    const request = page.waitForRequest(
      (request) =>
        request.url().endsWith("/cancel") && request.method() === "POST",
      { timeout: 5000 },
    );
    const response = page.waitForResponse(
      (response) => response.url().endsWith("/cancel"),
      { timeout: 10000 },
    );
    await page
      .getByRole("button", { name: "Cancel scan", exact: true })
      .click();
    await request;
    expect((await response).ok()).toBe(true);
    await expect(page.locator(".results-heading .scan-status")).toHaveText(
      "cancelled",
      { timeout: 10000 },
    );
  });
});
