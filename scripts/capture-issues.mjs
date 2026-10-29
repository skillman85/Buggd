/* global document, window */
// Capture the running local application; never substitute report data.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const [base, scanId, directory] = process.argv.slice(2);
if (!base || !scanId || !directory)
  throw new Error(
    "Pass a local preview URL, an existing scan ID and an output folder.",
  );
const url = new URL(base);
if (!["127.0.0.1", "localhost"].includes(url.hostname))
  throw new Error("Use the local Buggd preview.");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${base}/#scan/${scanId}/issues`);
  await page.locator(".report-summary").waitFor();
  await page
    .getByRole("combobox", { name: "Report display mode" })
    .selectOption("simple");
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ["light", "dark"]) {
    await page
      .getByRole("radio", {
        name: theme === "light" ? "Light" : "Dark",
        exact: true,
      })
      .check();
    for (const group of await page.locator(".problem-group[open]").all())
      await group.locator("> summary").click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: join(directory, `issues-simple-${theme}.png`),
      fullPage: true,
    });
    const group = page.locator(".problem-group:not(.not-tested)").first();
    await group.locator("> summary").click();
    const cluster = group.locator(".similar-elements").first();
    if (await cluster.count()) await cluster.locator("> summary").click();
    await group.evaluate((el) =>
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 85),
    );
    await page.screenshot({
      path: join(directory, `issues-elements-${theme}.png`),
      fullPage: false,
    });
    for (const open of await page.locator(".similar-elements[open]").all())
      await open.locator("> summary").click();
  }
  console.log(
    JSON.stringify({
      scanId,
      counts: await page.locator(".report-summary").innerText(),
      screenshots: directory,
    }),
  );
} finally {
  await browser.close();
}
