import { test, expect } from "@playwright/test";

function luminance(channels: number[]) {
  const linear = channels.map((value) => {
    const x = value / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function rgb(value: string) {
  if (value.startsWith("#"))
    return [1, 3, 5].map((index) =>
      parseInt(value.slice(index, index + 2), 16),
    );
  return (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
}
function contrast(foreground: string, background: string) {
  const a = luminance(rgb(foreground));
  const b = luminance(rgb(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme} text tokens and primary buttons meet normal-text contrast`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    const pairs = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const token = (name: string) => style.getPropertyValue(name).trim();
      return [
        ["--foreground", "--background"],
        ["--muted-foreground", "--surface"],
        ["--accent", "--background"],
        ["--danger", "--danger-surface"],
        ["--warning", "--warning-surface"],
        ["--info", "--info-surface"],
        ["--success", "--success-surface"],
      ].map(([a, b]) => ({ label: a, fg: token(a), bg: token(b) }));
    });
    for (const pair of pairs)
      expect(contrast(pair.fg, pair.bg), pair.label).toBeGreaterThanOrEqual(
        4.5,
      );
    for (const selector of [".sidebar-new", ".start-button"]) {
      const colors = await page.locator(selector).evaluate((element) => ({
        fg: getComputedStyle(element).color,
        bg: getComputedStyle(element).backgroundColor,
      }));
      expect(contrast(colors.fg, colors.bg), selector).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
}

test("mobile navigation supports Escape and settings theme controls stay synchronized", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const groups = page.getByRole("group", { name: "Colour theme" });
  await expect(groups).toHaveCount(2);
  await groups.last().getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(
    groups.first().getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await expect(
    groups.last().getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
