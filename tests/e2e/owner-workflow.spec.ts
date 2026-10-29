import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { startFixture } from "../../fixtures/server";
import { startV11Fixture } from "../../fixtures/v11";
import type { Scan } from "../../src/shared/schemas";
for (const theme of ["light", "dark"] as const) {
  test(`owner inspects, resumes guidance and verifies a real fix in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const fixture = await startV11Fixture();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await mkdir("docs/screenshots/v1.1", { recursive: true });
      await page.setViewportSize({ width: 1440, height: 1050 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      await expect(
        page.getByRole("combobox", { name: "Report display mode" }),
      ).toHaveValue("simple");
      await page.getByLabel("Website URL", { exact: true }).fill(fixture.url);
      await page
        .getByLabel("Website platform", { exact: true })
        .selectOption("wordpress");
      await page.getByText("Scan settings", { exact: true }).click();
      await page.getByLabel("Maximum pages").fill("2");
      await page.getByLabel("Inspect safe interactions").uncheck();
      await page
        .getByRole("button", { name: "Start scan", exact: true })
        .click();
      await expect(page.locator(".results-heading .scan-status")).toHaveText(
        "completed",
        { timeout: 60000 },
      );
      const id = new URL(page.url()).hash.split("/")[1];
      const original: Scan = await (
        await page.request.get(`/api/scans/${id}`)
      ).json();
      const badNav = original.issues.find(
        (i) =>
          i.checkId === "metadata.control-name" &&
          i.occurrenceList?.some((o) => o.element?.locator === "#bad-nav"),
      )!;
      expect(badNav).toBeTruthy();
      const dismiss = page.getByRole("button", {
        name: "Dismiss notification",
      });
      if (await dismiss.count()) await dismiss.click();
      await expect(page.locator(".report-summary")).toContainText(
        "Checks not performed",
      );
      await page.screenshot({
        path: `docs/screenshots/v1.1/overview-${theme}.png`,
        fullPage: true,
      });
      await page
        .locator('.result-buckets a[href*="confidence=confirmed"]')
        .click();
      await expect(page).toHaveURL(
        new RegExp(`scan/${id}/issues\\?confidence=confirmed`),
      );
      await page
        .locator(
          '[data-problem-group="confirmed:metadata.control-name"] > summary',
        )
        .click();
      await page
        .getByRole("button", {
          name: /A navigation link is missing a description/,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Exact affected element" }),
      ).toBeVisible();
      await expect(page.getByTestId("element-highlight")).toBeVisible();
      const occurrence = badNav.occurrenceList!.find(
        (o) => o.element?.alignment === "reliable",
      )!;
      const actual = await page
        .getByTestId("element-highlight")
        .evaluate((el) => ({
          left: parseFloat((el as HTMLElement).style.left),
          top: parseFloat((el as HTMLElement).style.top),
        }));
      expect(actual.left).toBeCloseTo(
        (occurrence.element!.rect.x / occurrence.element!.viewport.width) * 100,
        3,
      );
      expect(actual.top).toBeCloseTo(
        (occurrence.element!.rect.y / occurrence.element!.viewport.height) *
          100,
        3,
      );
      const toggle = dialog.getByRole("button", {
        name: "Highlight affected element",
      });
      await toggle.click();
      await expect(page.getByTestId("element-highlight")).toHaveCount(0);
      await toggle.click();
      await dialog.getByRole("button", { name: "Next occurrence" }).click();
      await expect(dialog.getByText(/Place 2 of/)).toBeVisible();
      await dialog.getByRole("button", { name: "Previous occurrence" }).click();
      await page.screenshot({
        path: `docs/screenshots/v1.1/element-${theme}.png`,
        fullPage: true,
      });
      await dialog.getByRole("button", { name: "View affected page" }).click();
      await expect(page.getByRole("dialog")).toContainText("Home fixture");
      await page.keyboard.press("Escape");
      await page
        .getByRole("combobox", { name: "Report display mode" })
        .selectOption("technical");
      await page.reload();
      await expect(
        page.getByRole("combobox", { name: "Report display mode" }),
      ).toHaveValue("technical");
      await page
        .locator(".finding-button")
        .filter({
          hasText: "Interactive control has no observed accessible name",
        })
        .first()
        .click();
      await expect(page.locator(".technical-details")).toHaveAttribute(
        "open",
        "",
      );
      await expect(page.locator(".technical-details")).toContainText(
        "metadata.control-name",
      );
      await page.screenshot({
        path: `docs/screenshots/v1.1/technical-${theme}.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      expect(
        (await (await page.request.get(`/api/scans/${id}`)).json()).issues,
      ).toEqual(original.issues);
      await page
        .getByRole("combobox", { name: "Report display mode" })
        .selectOption("simple");
      await page.goto(`/#scan/${id}/guide`);
      await page
        .getByRole("combobox", { name: "Choose guided issue" })
        .selectOption(badNav.id);
      await page
        .getByRole("button", { name: /2See where it is|2 See where it is/ })
        .press("Enter");
      await expect(page.getByTestId("element-highlight")).toBeVisible();
      await page
        .getByRole("button", {
          name: /3Understand the impact|3 Understand the impact/,
        })
        .click();
      await expect(
        page.getByRole("heading", { name: "Why this matters to visitors" }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: /4Follow the guidance|4 Follow the guidance/,
        })
        .click();
      await page
        .getByLabel("Website platform", { exact: true })
        .selectOption("framer");
      await expect(page.locator(".fix-steps")).toContainText("Framer");
      await page
        .getByRole("button", {
          name: /5Mark your progress|5 Mark your progress/,
        })
        .click();
      await page.getByLabel("Review status").selectOption("dismissed");
      await page.getByRole("button", { name: "Save review progress" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Add a reason" }),
      ).toBeVisible();
      await page.getByLabel("Review status").selectOption("fix-attempted");
      await page.getByRole("button", { name: "Save review progress" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Review progress saved" }),
      ).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Review status")).toHaveValue(
        "fix-attempted",
      );
      const workspace = await (
        await page.request.get(`/api/scans/${id}/workspace`)
      ).json();
      expect(workspace.platform).toBe("framer");
      expect(workspace.guidedStep).toBe(4);
      await page
        .getByRole("button", {
          name: /4Follow the guidance|4 Follow the guidance/,
        })
        .click();
      await page.screenshot({
        path: `docs/screenshots/v1.1/guided-${theme}.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `docs/screenshots/v1.1/guided-mobile-${theme}.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1050 });
      fixture.state.fixed = true;
      fixture.state.keepButton = true;
      fixture.state.newProblem = true;
      await page
        .getByRole("button", { name: /6Rescan and verify|6 Rescan and verify/ })
        .click();
      await page
        .getByRole("button", { name: "Rescan website", exact: true })
        .click();
      await page.waitForURL(
        (url) => url.hash.startsWith("#scan/") && url.hash.split("/")[1] !== id,
      );
      await expect(page.locator(".results-heading .scan-status")).toHaveText(
        "completed",
        { timeout: 60000 },
      );
      await expect(
        page.getByRole("heading", { name: "See what changed" }),
      ).toBeVisible();
      const currentId = new URL(page.url()).hash.split("/")[1];
      expect(currentId).not.toBe(id);
      await expect(
        page.locator(".comparison-status.resolved").first(),
      ).toBeVisible();
      const comparison = await (
        await page.request.get(`/api/scans/${currentId}/compare?previous=${id}`)
      ).json();
      expect(
        comparison.items.find(
          (item: { previousIssueId: string }) =>
            item.previousIssueId === badNav.id,
        ).status,
      ).toBe("resolved");
      expect(
        comparison.items.some(
          (item: { status: string }) => item.status === "remaining",
        ),
      ).toBe(true);
      expect(
        comparison.items.some(
          (item: { status: string }) => item.status === "new",
        ),
      ).toBe(true);
      await expect(page.locator(".comparison-metrics")).toContainText(
        "Unable to verify",
      );
      await page.screenshot({
        path: `docs/screenshots/v1.1/comparison-${theme}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Inspect previous evidence" })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await page.locator(".export-menu summary").click();
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Print-friendly PDF report" })
        .click();
      expect((await download).suggestedFilename()).toBe(
        `buggd-${currentId}.pdf`,
      );
      expect(errors).toEqual([]);
    } finally {
      await fixture.close();
    }
  });
}

test("clean scan has useful empty states and a failed PDF download explains recovery", async ({
  page,
}) => {
  const fixture = await startFixture();
  try {
    await page.goto("/");
    await page
      .getByLabel("Website URL", { exact: true })
      .fill(`${fixture.url}/clean`);
    await page.getByText("Scan settings", { exact: true }).click();
    await page.getByLabel("Maximum pages").fill("1");
    await page.getByRole("button", { name: "Start scan", exact: true }).click();
    await expect(page.locator(".results-heading .scan-status")).toHaveText(
      "completed",
      { timeout: 30000 },
    );
    const id = new URL(page.url()).hash.split("/")[1];
    await expect(page.locator(".report-summary")).toContainText(
      "No problems found in the checks completed.",
    );
    await expect(page.locator(".report-summary")).toContainText(
      "does not guarantee",
    );
    await page
      .getByRole("link", { name: "Help me fix my website", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "No guided tasks remaining." }),
    ).toBeVisible();
    await page.goto(`/#scan/${id}/compare`);
    await expect(
      page.getByRole("heading", { name: "Choose two scans to compare." }),
    ).toBeVisible();
    await page.route(`**/api/scans/${id}/export?format=pdf*`, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "Local Chromium is unavailable. Download HTML or install the browser.",
        }),
      }),
    );
    await page.locator(".export-menu summary").press("Enter");
    await page
      .getByRole("button", { name: "Print-friendly PDF report" })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Download HTML or install the browser",
    );
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Website Report (HTML)" }).click();
    expect((await download).suggestedFilename()).toBe(`buggd-${id}.html`);
  } finally {
    await fixture.close();
  }
});
