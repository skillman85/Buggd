import { test, expect } from "@playwright/test";
import { startV11Fixture } from "../../fixtures/v11";
import { resultCounts } from "../../src/reporting/issue-presentation";
import type { Scan } from "../../src/shared/schemas";
const rawTerms =
  /Interactive control has no observed accessible name|metadata\.control-name|CSS \/ DOM selector|Issues and checks/i;
for (const theme of ["light", "dark"] as const) {
  test(`Simple issues are grouped and identifiable; Technical retains raw evidence in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const fixture = await startV11Fixture();
    fixture.state.externalAssets = true;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1440, height: 1050 });
      await page.goto("/");
      await expect(
        page.getByRole("combobox", { name: "Report display mode" }),
      ).toHaveValue("simple");
      await page.getByLabel("Website URL", { exact: true }).fill(fixture.url);
      await page.getByText("Scan settings", { exact: true }).click();
      await page.getByLabel("Maximum pages").fill("2");
      await page.getByLabel("Inspect safe interactions").uncheck();
      await page
        .getByRole("button", { name: "Start scan", exact: true })
        .click();
      await expect(page.locator(".results-heading .scan-status")).toHaveText(
        "completed",
        { timeout: 45000 },
      );
      const id = new URL(page.url()).hash.split("/")[1];
      const original: Scan = await (
        await page.request.get(`/api/scans/${id}`)
      ).json();
      const counts = resultCounts(original);
      expect(counts.potential).toBeGreaterThan(0);
      expect(counts.untested).toBeGreaterThan(0);
      await expect(page.locator("main")).not.toContainText(rawTerms);
      await expect(page.locator(".issues-table")).toHaveCount(0);
      await page.goto(`/#scan/${id}/issues`);
      await expect(page.locator(".report-summary")).toBeVisible();
      await expect(page.locator("main")).not.toContainText(rawTerms);
      await expect(
        page.locator('.result-buckets a[href*="confidence=confirmed"] strong'),
      ).toHaveText(String(counts.confirmed));
      await expect(
        page.locator('.result-buckets a[href*="confidence=potential"] strong'),
      ).toHaveText(String(counts.potential));
      await expect(
        page.locator('.result-buckets a[href*="confidence=not-tested"] strong'),
      ).toHaveText(String(counts.untested));
      await expect(page.locator(".observation-counts")).toContainText(
        "Recorded occurrences",
      );
      await expect(page.locator(".observation-counts")).toContainText(
        String(counts.occurrences),
      );
      await expect(page.locator(".observation-counts")).toContainText(
        String(counts.completedChecks),
      );
      await expect(
        page.getByRole("combobox", { name: "Filter severity" }),
      ).toHaveCount(0);
      const names = page.locator(
        '[data-problem-group="potential:metadata.control-name"]',
      );
      await expect(names).not.toHaveAttribute("open");
      await expect(names.locator(".problem-preview")).toContainText("Link to");
      await expect(names.locator(".problem-impact")).toContainText(
        "screen readers",
      );
      await expect(names.locator(".problem-action")).toContainText(
        "meaningful name",
      );
      await names.locator("> summary").press("Enter");
      await expect(names).toHaveAttribute("open", "");
      await expect(names.getByRole("note")).toContainText(
        "blocked or incomplete",
      );
      const originals = original.issues.filter(
        (i) =>
          i.checkId === "metadata.control-name" && i.confidence === "potential",
      );
      await expect(names.locator("[data-finding-id]")).toHaveCount(
        originals.length,
      );
      for (const issue of originals)
        await expect(
          names.locator(`[data-finding-id="${issue.id}"]`),
        ).toBeAttached();
      await expect(names.locator(".element-facts").first()).toContainText(
        "Navigation",
      );
      await expect(page.locator("main")).not.toContainText(rawTerms);
      const nav = originals.find((i) =>
        i.occurrenceList?.some((o) => o.element?.locator === "#bad-nav"),
      )!;
      const finding = names.locator(`[data-finding-id="${nav.id}"]`);
      await finding.locator(".finding-occurrences > summary").click();
      await finding
        .getByRole("button", { name: "Inspect this occurrence" })
        .last()
        .click();
      const dialog = page.getByRole("dialog");
      const last = nav.occurrenceList![nav.occurrenceList!.length - 1];
      await expect(dialog).toContainText(
        `Place ${nav.occurrenceList!.length} of`,
      );
      await expect(dialog.locator(".affected-element .break-url")).toHaveText(
        last.pageUrl,
      );
      await expect(dialog).not.toContainText(rawTerms);
      await page.keyboard.press("Escape");
      await page
        .getByRole("combobox", { name: "Report display mode" })
        .selectOption("technical");
      await expect(page.locator(".issues-table")).toBeVisible();
      await page
        .getByRole("combobox", { name: "Filter confidence" })
        .selectOption("potential");
      await page
        .locator(".finding-button")
        .filter({
          hasText: "Interactive control has no observed accessible name",
        })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toContainText(
        "metadata.control-name",
      );
      await expect(page.getByRole("dialog")).toContainText(
        "Escaped HTML fragment",
      );
      await page.keyboard.press("Escape");
      await page
        .getByRole("combobox", { name: "Report display mode" })
        .selectOption("simple");
      await page.reload();
      await expect(
        page.getByRole("combobox", { name: "Report display mode" }),
      ).toHaveValue("simple");
      await expect(page.locator("main")).not.toContainText(rawTerms);
      await page.goto(`/#scan/${id}/network`);
      await expect(
        page.getByRole("heading", { name: "Detailed browser records" }),
      ).toBeVisible();
      await expect(page.locator("main pre")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Switch to Technical view" })
        .click();
      await expect(
        page.getByRole("combobox", { name: "Report display mode" }),
      ).toHaveValue("technical");
      await page
        .getByRole("combobox", { name: "Report display mode" })
        .selectOption("simple");
      await page.goto(`/#scan/${id}/guide`);
      for (let step = 1; step <= 6; step++) {
        await page
          .getByRole("navigation", { name: "Guided fixing steps" })
          .getByRole("button")
          .nth(step - 1)
          .click();
        await expect(
          page
            .getByRole("navigation", { name: "Guided fixing steps" })
            .getByRole("button")
            .nth(step - 1),
        ).toHaveAttribute("aria-current", "step");
        await expect(page.locator("main")).not.toContainText(rawTerms);
      }
      await page.goto(`/#scan/${id}/issues`);
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .locator(
          '[data-problem-group="potential:metadata.control-name"] > summary',
        )
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (await (await page.request.get(`/api/scans/${id}`)).json()).issues,
      ).toEqual(original.issues);
      expect(errors).toEqual([]);
    } finally {
      await fixture.close();
    }
  });
}
