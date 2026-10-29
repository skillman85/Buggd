import type { Scan, Issue, PageReport } from "../shared/schemas.js";
import type { Comparison, Occurrence } from "../shared/evidence.js";
import { occurrences } from "./explanations.js";
const samePage = (a: string, b: string) => {
  try {
    const x = new URL(a);
    const y = new URL(b);
    x.hash = "";
    y.hash = "";
    return x.href === y.href;
  } catch {
    return a === b;
  }
};
function matches(a: Issue, b: Issue) {
  if (a.checkId !== b.checkId) return false;
  if (a.resource || b.resource)
    return a.resource === b.resource && a.title === b.title;
  return occurrences(a).some((old) =>
    occurrences(b).some(
      (now) =>
        samePage(old.pageUrl, now.pageUrl) &&
        (old.element && now.element
          ? old.element.identity === now.element.identity
          : old.evidence === now.evidence && a.title === b.title),
    ),
  );
}
function covered(
  issue: Issue,
  occ: Occurrence,
  page: PageReport | undefined,
): string | undefined {
  if (!page || page.status !== "completed")
    return "The affected page was not fully checked in the new scan.";
  const check = (page.coverage || []).find(
    (check) =>
      check.checkId === issue.checkId &&
      check.status === "completed" &&
      (!["interactions.response", "forms.required"].includes(issue.checkId) ||
        (!!occ.element && check.elementIdentity === occ.element.identity)) &&
      (!occ.viewportWidth ||
        check.viewportWidth === occ.viewportWidth ||
        !check.viewportWidth),
  );
  if (!check)
    return "There is no reliable record that the relevant check ran at the affected screen size.";
  if (
    (page.resources || []).some(
      (r) =>
        [
          "blocked",
          "unsupported",
          "timeout",
          "failed",
          "browser-restriction",
        ].includes(r.status) &&
        ["script", "stylesheet", "font", "image"].includes(r.type),
    )
  )
    return "Blocked or incomplete resources may have changed the page, so absence is not proof of a fix.";
  if (occ.element) {
    const current = (page.elements || []).find(
      (el) =>
        el.identity === occ.element!.identity &&
        el.viewport.width === occ.element!.viewport.width,
    );
    if (!current)
      return "The previous element could not be matched reliably. It may have moved, disappeared or changed structure.";
    if (
      current.tag !== occ.element.tag ||
      current.role !== occ.element.role ||
      (occ.element.identityStrength === "structural" &&
        (current.text !== occ.element.text ||
          current.landmark !== occ.element.landmark))
    )
      return "The element structure changed, so a direct comparison is uncertain.";
  } else if (issue.resource) {
    const loaded = (page.resources || []).some(
      (resource) =>
        resource.url === issue.resource &&
        resource.status === "loaded" &&
        (resource.httpStatus || 0) < 400,
    );
    if (
      !loaded &&
      !(
        samePage(page.url, issue.resource) &&
        (page.httpStatus || 0) >= 200 &&
        (page.httpStatus || 0) < 400
      )
    )
      return "The previous resource was not observed loading successfully.";
  } else if (
    ![
      "metadata.title",
      "metadata.duplicates",
      "content.placeholder",
      "javascript.error",
      "responsive.overflow.1440",
      "responsive.overflow.768",
      "responsive.overflow.390",
    ].includes(issue.checkId)
  )
    return "This older observation lacks enough element or resource identity to verify its disappearance.";
  return;
}
export function compareScans(previous: Scan, current: Scan): Comparison {
  if (
    previous.id === current.id ||
    new URL(previous.url).origin !== new URL(current.url).origin
  )
    throw new Error("Choose two different scans of the same website origin.");
  if (current.createdAt < previous.createdAt)
    throw new Error(
      "The comparison scan must be the same age or newer than the previous scan.",
    );
  const items: Comparison["items"] = [];
  const matched = new Set<string>();
  for (const issue of previous.issues.filter(
    (i) => i.confidence !== "not-tested",
  )) {
    const still = current.issues.find(
      (now) => now.confidence !== "not-tested" && matches(issue, now),
    );
    if (still) {
      matched.add(still.id);
      items.push({
        previousIssueId: issue.id,
        currentIssueId: still.id,
        status: "remaining",
        reason:
          "Buggd still detects the corresponding observation in the newer scan. Review the current evidence.",
        pageUrls: issue.affectedPages,
      });
      continue;
    }
    const reasons = occurrences(issue)
      .map((occ) =>
        covered(
          issue,
          occ,
          current.pages.find((page) => samePage(page.url, occ.pageUrl)),
        ),
      )
      .filter((reason): reason is string => !!reason);
    if (!occurrences(issue).length)
      reasons.push(
        "The older observation has no affected-page evidence to verify.",
      );
    if (!["completed"].includes(current.status))
      reasons.push("The newer scan did not finish successfully.");
    items.push({
      previousIssueId: issue.id,
      status: reasons.length ? "unable" : "resolved",
      reason:
        reasons[0] ||
        "The affected page and check ran, the element/resource could be matched, and this observation was no longer detected. This verifies only the checks completed.",
      pageUrls: issue.affectedPages,
    });
  }
  for (const issue of current.issues.filter(
    (i) => i.confidence !== "not-tested" && !matched.has(i.id),
  ))
    items.push({
      currentIssueId: issue.id,
      status: "new",
      reason:
        "This observation was not matched in the previous scan. Different coverage can reveal previously unseen issues.",
      pageUrls: issue.affectedPages,
    });
  return {
    previousScanId: previous.id,
    currentScanId: current.id,
    createdAt: new Date().toISOString(),
    items,
  };
}
