import { describe, it, expect } from "vitest";
import {
  explanations,
  explain,
  counts,
  priority,
  platformGuidance,
  aiFixPrompt,
} from "../../src/reporting/explanations.js";
import { addIssue } from "../../src/scanner/issues.js";
import type { Scan } from "../../src/shared/schemas.js";
import { compareScans } from "../../src/reporting/comparison.js";
import { highlightBounds } from "../../src/reporting/geometry.js";
import { redactExport } from "../../src/reporting/redact.js";
import { report, element, finding } from "../helpers.js";
describe("deterministic explanations and buckets", () => {
  for (const id of Object.keys(explanations))
    it(`has useful visitor/fix guidance for ${id}`, () => {
      const issue = finding(report(), id);
      const explanation = explain(issue);
      expect(explanation.title.length).toBeGreaterThan(12);
      expect(explanation.impact.length).toBeGreaterThan(30);
      expect(explanation.fix.length).toBeGreaterThan(25);
      expect(explanation.developer.length).toBeGreaterThan(20);
    });
  it("keeps confidence and raw observations unchanged across display modes", () => {
    const scan = report();
    finding(scan, "metadata.control-name", "potential");
    finding(scan, "forms.coverage", "not-tested");
    const before = JSON.stringify(scan);
    expect(counts(scan)).toEqual({ confirmed: 0, potential: 1, untested: 1 });
    expect(explain(scan.issues[0]).title).toContain("may");
    expect(priority(scan.issues[0])).toBe("Worth checking");
    expect(priority(scan.issues[1])).toBe("Check yourself");
    expect(JSON.stringify(scan)).toBe(before);
  });
  it("gives platform-aware instructions and an evidence-only assistant prompt", () => {
    const issue = finding();
    for (const platform of [
      "wordpress",
      "webflow",
      "framer",
      "squarespace",
      "html",
      "react",
      "unsure",
    ] as const) {
      expect(
        platformGuidance(issue, platform).join(" ").length,
      ).toBeGreaterThan(80);
    }
    expect(platformGuidance(issue, "wordpress")[0]).toContain("WordPress");
    const prompt = aiFixPrompt(issue);
    expect(prompt).toContain("https://example.com/");
    expect(prompt).toContain("#control");
    expect(prompt).toContain("Do not assume a source file");
    expect(prompt).not.toMatch(/src\/.*\.tsx/);
  });
  it("groups equivalent navigation across pages but retains distinct sibling controls", () => {
    const scan = report();
    const a = finding(scan);
    const b = finding(
      scan,
      "metadata.control-name",
      "confirmed",
      element("#other"),
    );
    expect(a.id).not.toBe(b.id);
    addIssue(scan, "https://example.com/about", {
      ...a,
      elementEvidence: element(),
    });
    expect(scan.issues).toHaveLength(2);
    expect(a.occurrenceList).toHaveLength(2);
    expect(a.grouping?.shared).toBe(true);
  });
});
describe("alignment and safe comparison", () => {
  it("projects real CSS bounds with DPR and scroll recorded, and rejects mismatched scenes", () => {
    const occ = {
      id: "o",
      pageUrl: "https://example.com/",
      timestamp: "now",
      evidence: "",
      element: element(),
      screenshotId: "s",
    };
    const shot = {
      id: "s",
      width: 390,
      height: 600,
      pixelWidth: 390,
      pixelHeight: 600,
      dpr: 2,
      scrollX: 0,
      scrollY: 500,
      fullPage: false,
    };
    expect(highlightBounds(occ, shot)).toEqual({
      left: (20 / 390) * 100,
      top: 5,
      width: (80 / 390) * 100,
      height: (40 / 600) * 100,
    });
    expect(highlightBounds(occ, { ...shot, scrollY: 0 })).toBeUndefined();
    expect(
      highlightBounds(
        { ...occ, element: { ...element(), alignment: "moved" } },
        shot,
      ),
    ).toBeUndefined();
  });
  function newer(previous: Scan) {
    const scan = report();
    scan.createdAt = "2026-10-29T00:01:00Z";
    scan.pages = [
      {
        id: "p",
        url: previous.url,
        title: "Home",
        status: "completed",
        duration: 1,
        links: [],
        externalLinks: [],
        screenshots: [],
        consoleErrors: [],
        failedResources: [],
        interactions: [],
        forms: [],
        responsive: [],
        elements: [{ ...element(), accessibleName: "Open menu" }],
        coverage: [{ checkId: "metadata.control-name", status: "completed" }],
      },
    ];
    return scan;
  }
  it("verifies absence only with completed page, actual check coverage and matched identity", () => {
    const old = report();
    finding(old);
    const next = newer(old);
    expect(compareScans(old, next).items[0].status).toBe("resolved");
    next.pages[0].coverage = [];
    expect(compareScans(old, next).items[0].status).toBe("unable");
    next.pages = [];
    expect(compareScans(old, next).items[0].status).toBe("unable");
  });
  it("does not call changed or blocked DOM fixed and reports retained/new observations", () => {
    const old = report();
    finding(old);
    const next = newer(old);
    next.pages[0].elements = [];
    expect(compareScans(old, next).items[0].status).toBe("unable");
    next.pages[0].elements = [element()];
    finding(next);
    expect(compareScans(old, next).items[0].status).toBe("remaining");
    finding(next, "metadata.title", "confirmed", undefined);
    expect(
      compareScans(old, next).items.some((item) => item.status === "new"),
    ).toBe(true);
  });
  it("keeps cancelled/failed scans and render interference unable to verify", () => {
    const old = report();
    finding(old);
    const next = newer(old);
    for (const status of ["cancelled", "failed", "running"] as const)
      expect(compareScans(old, { ...next, status }).items[0].status).toBe(
        "unable",
      );
    for (const status of [
      "blocked",
      "failed",
      "browser-restriction",
      "timeout",
      "unsupported",
    ] as const) {
      next.pages[0].resources = [
        {
          url: "https://cdn.example/font",
          type: "font",
          status,
          provenance: "third-party",
          detail: "not available",
        },
      ];
      expect(compareScans(old, next).items[0].status).toBe("unable");
    }
    next.pages[0].resources = [];
    next.pages[0].coverage = [
      { checkId: "metadata.control-name", status: "not-tested" },
    ];
    expect(compareScans(old, next).items[0].status).toBe("unable");
  });
  it("requires the corresponding interaction or form check, not another element's coverage", () => {
    for (const checkId of ["interactions.response", "forms.required"]) {
      const old = report();
      finding(old, checkId);
      const next = newer(old);
      next.pages[0].coverage = [
        { checkId, status: "completed", elementIdentity: "button|#another" },
      ];
      expect(compareScans(old, next).items[0].status).toBe("unable");
      next.pages[0].coverage[0].elementIdentity = element().identity;
      expect(compareScans(old, next).items[0].status).toBe("resolved");
    }
  });
  it("never counts untested checks as resolved website problems", () => {
    const old = report();
    finding(old, "forms.coverage", "not-tested");
    const next = newer(old);
    expect(compareScans(old, next).items).toEqual([]);
    expect(() =>
      compareScans(old, { ...next, url: "https://another.example/" }),
    ).toThrow();
  });
  it("redacts known credentials and local paths without changing the source", () => {
    const input = {
      evidence:
        "Bearer secret-token password=hunter2 https://example.com/?token=private /Users/name/private/file.ts",
    };
    const copy = redactExport(input);
    expect(copy.evidence).not.toContain("hunter2");
    expect(copy.evidence).not.toContain("secret-token");
    expect(copy.evidence).not.toContain("/Users/");
    expect(input.evidence).toContain("hunter2");
  });
});
