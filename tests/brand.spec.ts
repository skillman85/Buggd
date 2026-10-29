import { test, expect } from "@playwright/test";

test("manual preference persists and overrides system changes", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("radio", { name: "Light", exact: true }),
  ).toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: "System", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("head bootstrap applies saved preference before React, without storage failures", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: true,
    colorScheme: "light",
  });
  await context.addInitScript(() =>
    localStorage.setItem("buggd.theme", "dark"),
  );
  const page = await context.newPage();
  await page.route("**/assets/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#root")).toBeEmpty();
  await context.close();
});

test("invalid and unavailable storage fall back to system", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() =>
    localStorage.setItem("buggd.theme", "invalid"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("radio", { name: "System", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value() {
        throw new Error("blocked");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value() {
        throw new Error("blocked");
      },
    });
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("preference changes sync between tabs", async ({ context, page }) => {
  await page.goto("/");
  const other = await context.newPage();
  await other.goto("/");
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    other.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
});

for (const mode of ["light", "dark"] as const) {
  for (const width of [320, 390, 768, 1440]) {
    test(`${mode} at ${width}px has accessible vector marks, local fonts and no overflow`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      const remoteRequests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (!request.url().startsWith("http://127.0.0.1:4173"))
          remoteRequests.push(request.url());
      });
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: mode, reducedMotion: "reduce" });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
      await expect(
        page.getByRole("heading", { name: "New scan", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Start scan", exact: true }),
      ).toBeVisible();
      expect(
        await page
          .locator(".sidebar-logo svg image, .sidebar-logo svg text")
          .count(),
      ).toBe(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () =>
            document.fonts.check('800 16px "Plus Jakarta Sans"') &&
            document.fonts.check('400 16px "Google Sans Code"'),
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
      expect(remoteRequests).toEqual([]);
      if (width === 1440 || width === 390) {
        await page.screenshot({
          path: testInfo.outputPath(`${mode}-${width}.png`),
          fullPage: true,
        });
      }
    });
  }
}

test("downloadable SVGs are vectors and PNG output has the declared dimensions", async ({
  request,
}) => {
  for (const name of [
    "buggd-logo-light",
    "buggd-logo-dark",
    "buggd-logo-lime",
    "buggd-icon",
    "favicon",
    "buggd-app-icon",
    "buggd-social",
  ]) {
    const response = await request.get(`/brand/${name}.svg`);
    expect(response.ok()).toBe(true);
    const svg = await response.text();
    expect(svg).toContain("<path");
    expect(svg).not.toMatch(/<(image|text)\b|data:image/);
  }
  for (const [name, size] of [
    ["favicon-16", 16],
    ["favicon-32", 32],
    ["favicon-48", 48],
    ["apple-touch-icon", 180],
    ["buggd-app-icon-192", 192],
    ["buggd-app-icon-512", 512],
  ] as const) {
    const response = await request.get(`/brand/${name}.png`);
    expect(response.ok()).toBe(true);
    const png = await response.body();
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  }
});
