import { it, expect } from "vitest";
import { report, element, finding } from "../helpers.js";
import {
  problemGroups,
  resultCounts,
  elementDescription,
  namingCaution,
} from "../../src/reporting/issue-presentation.js";
import { explanations, explain } from "../../src/reporting/explanations.js";
it("organises repeated records without mutating, merging or reclassifying underlying evidence", () => {
  const s = report();
  const link = {
    ...element(),
    identity: "path:desktop",
    identityStrength: "structural" as const,
    role: "link",
    tag: "a",
    text: "",
    landmark: "navigation",
    nearbyText: "",
    destination: "https://example.com/",
    attributes: {},
    html: '<a class="site-home"><img alt=""></a>',
  };
  const a = finding(s, "metadata.control-name", "potential", link);
  const b = finding(s, "metadata.control-name", "potential", {
    ...link,
    identity: "path:mobile",
    locator: "main > nav > a",
  });
  const other = finding(s, "metadata.control-name", "potential", {
    ...link,
    identity: "other-link",
    destination: "https://another.example/",
  });
  finding(s, "forms.coverage", "not-tested");
  const before = JSON.stringify(s),
    groups = problemGroups(s.issues);
  const names = groups.find((g) => g.confidence === "potential")!;
  expect(names.title).toBe("Some buttons or links may need descriptions");
  expect(names.issues).toHaveLength(3);
  expect(names.elements).toHaveLength(2);
  expect(names.elements[0].issues.map((i) => i.id)).toEqual(
    expect.arrayContaining([a.id, b.id]),
  );
  expect(names.elements[1].issues[0].id).toBe(other.id);
  expect(new Set(groups.flatMap((g) => g.issues.map((i) => i.id))).size).toBe(
    s.issues.length,
  );
  expect(JSON.stringify(s)).toBe(before);
  expect(resultCounts(s)).toEqual({
    confirmed: 0,
    potential: 3,
    untested: 1,
    occurrences: 3,
    completedChecks: 1,
  });
});
it("keeps different unnamed buttons and uncertain legacy selectors separate", () => {
  const s = report();
  finding(s, "metadata.control-name", "potential", {
    ...element("#a"),
    nearbyText: "Pricing",
    html: "<button></button>",
  });
  finding(s, "metadata.control-name", "potential", {
    ...element("#b"),
    nearbyText: "Services",
    html: "<button></button>",
  });
  const old = finding(s, "metadata.control-name", "potential");
  delete old.occurrenceList;
  old.occurrences = 45;
  old.element = "a";
  const groups = problemGroups(s.issues);
  expect(groups).toHaveLength(1);
  expect(groups[0].elements).toHaveLength(3);
  expect(resultCounts(s).occurrences).toBe(47);
  expect(elementDescription(undefined)).toBe("Exact element was not captured");
});
it("identifies unnamed controls from destination/nearby text without inventing an action name", () => {
  const el = {
    ...element(),
    tag: "a",
    role: "link",
    destination: "https://linkedin.example/company/team",
    nearbyText: "",
  };
  expect(
    elementDescription({
      id: "o",
      pageUrl: "https://example.com",
      timestamp: "now",
      evidence: "",
      element: el,
    }),
  ).toBe("Link to linkedin.example/company/team");
  expect(
    elementDescription({
      id: "p",
      pageUrl: "https://example.com",
      timestamp: "now",
      evidence: "",
      element: { ...element(), nearbyText: "Do I own the logo rights?" },
    }),
  ).toContain("near “Do I own the logo rights?”");
});
it("keeps rendering interference visible and provides registry-based topic titles for every rule", () => {
  const s = report();
  const i = finding(s, "metadata.control-name", "potential");
  s.pages = [
    {
      id: "p",
      url: s.url,
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
      resources: [
        {
          url: "https://cdn.example/app.js",
          type: "script",
          status: "blocked",
          provenance: "buggd",
          detail: "Excluded",
        },
      ],
    },
  ];
  expect(namingCaution(s, [i])).toContain("normal browser");
  for (const id of Object.keys(explanations)) {
    const f = { ...i, checkId: id };
    expect(explain(f).groupTitle.length).toBeGreaterThan(15);
  }
});
