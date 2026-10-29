import type { Issue, Scan, Confidence } from "../shared/schemas.js";
import type { Occurrence } from "../shared/evidence.js";
import {
  detectorKey,
  elementKind,
  elementRegion,
  explain,
  occurrences,
  prioritised,
} from "./explanations.js";

/** Presentation folders only. Scanner findings, fingerprints and confidence never change. */
export type ElementFolder = {
  key: string;
  issues: Issue[];
  occurrenceCount: number;
  pages: string[];
  example?: Occurrence;
};
export type ProblemGroup = {
  key: string;
  confidence: Confidence;
  title: string;
  impact: string;
  fix: string;
  issues: Issue[];
  elements: ElementFolder[];
  occurrenceCount: number;
  pages: string[];
};
export function occurrenceCount(issue: Issue) {
  return issue.occurrenceList?.length ?? issue.occurrences;
}
export function resultCounts(scan: Scan) {
  const actionable = scan.issues.filter((i) => i.confidence !== "not-tested");
  return {
    confirmed: actionable.filter((i) => i.confidence === "confirmed").length,
    potential: actionable.filter((i) => i.confidence === "potential").length,
    occurrences: actionable.reduce((sum, i) => sum + occurrenceCount(i), 0),
    completedChecks: scan.checksExecuted,
    untested: scan.issues.filter((i) => i.confidence === "not-tested").length,
  };
}
export const regionName = elementRegion;
function destinationLabel(destination: string) {
  try {
    const u = new URL(destination);
    return ["http:", "https:"].includes(u.protocol)
      ? `${u.host}${u.pathname}${u.search}`
      : destination;
  } catch {
    return destination;
  }
}
export function elementDescription(
  occurrence?: Occurrence,
  issue?: Issue,
): string {
  const el = occurrence?.element;
  if (!el)
    return issue?.resource
      ? `${issue.category === "links" ? "Page" : "Resource"}: ${destinationLabel(issue.resource)}`
      : "Exact element was not captured";
  const kind = elementKind(el),
    noun = kind[0].toUpperCase() + kind.slice(1);
  if (el.text?.trim()) return `${noun} “${el.text.trim()}”`;
  if (el.accessibleName?.trim()) return `${noun} “${el.accessibleName.trim()}”`;
  if (el.destination) return `${noun} to ${destinationLabel(el.destination)}`;
  if (el.nearbyText?.trim()) return `${noun} near “${el.nearbyText.trim()}”`;
  return `${noun} without a recorded description`;
}
export function pageTitle(scan: Scan, url: string) {
  const page = scan.pages.find((p) => p.url === url);
  if (page?.title) return page.title;
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}
export function captureLabel(occurrence?: Occurrence) {
  const width =
    occurrence?.viewportWidth || occurrence?.element?.viewport.width;
  return width
    ? `${width <= 500 ? "Mobile" : width <= 1000 ? "Tablet" : "Desktop"} · ${width}px`
    : "Screen size not recorded";
}
function folderKey(issue: Issue) {
  const list = occurrences(issue),
    el = list[0]?.element;
  // Generic selectors or a common detector alone never establish similarity.
  if (
    !el ||
    !el.html ||
    (!el.destination && !el.nearbyText && !el.text && !el.accessibleName)
  )
    return `finding:${issue.id}`;
  // IDs/attributes, exact captured fragment, region and destination distinguish independent controls.
  // Outer ancestor paths may vary between responsive layouts; those remain separate original records.
  return JSON.stringify([
    detectorKey(issue.checkId),
    issue.confidence,
    el.tag,
    el.role,
    el.landmark,
    el.destination,
    el.text,
    el.accessibleName,
    el.attributes,
    el.html,
    el.destination ? undefined : el.nearbyText,
  ]);
}
export function problemGroups(issues: Issue[]): ProblemGroup[] {
  const groups = new Map<string, ProblemGroup>();
  for (const issue of prioritised(issues)) {
    const explanation = explain(issue),
      key = `${issue.confidence}:${detectorKey(issue.checkId)}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        confidence: issue.confidence,
        title: explanation.groupTitle,
        impact: explanation.impact,
        fix: explanation.fix,
        issues: [],
        elements: [],
        occurrenceCount: 0,
        pages: [],
      };
      groups.set(key, group);
    }
    group.issues.push(issue);
    group.occurrenceCount += occurrenceCount(issue);
    for (const page of issue.affectedPages)
      if (!group.pages.includes(page)) group.pages.push(page);
    const elementKey = folderKey(issue);
    let folder = group.elements.find((e) => e.key === elementKey);
    if (!folder) {
      folder = {
        key: elementKey,
        issues: [],
        occurrenceCount: 0,
        pages: [],
        example: occurrences(issue)[0],
      };
      group.elements.push(folder);
    }
    folder.issues.push(issue);
    folder.occurrenceCount += occurrenceCount(issue);
    for (const page of issue.affectedPages)
      if (!folder.pages.includes(page)) folder.pages.push(page);
  }
  return [...groups.values()];
}
/** Show limitations relevant to the particular finding, not an unsupported claim of a broken site. */
export function namingCaution(scan: Scan, issues: Issue[]) {
  if (
    !issues.some((i) =>
      ["metadata.control-name", "forms.label"].includes(detectorKey(i.checkId)),
    )
  )
    return undefined;
  const affected = new Set(issues.flatMap((i) => i.affectedPages));
  const incomplete = scan.pages
    .filter((p) => affected.has(p.url))
    .some((p) =>
      (p.resources || []).some(
        (r) =>
          [
            "blocked",
            "unsupported",
            "failed",
            "timeout",
            "browser-restriction",
          ].includes(r.status) &&
          ["image", "font", "script", "stylesheet"].includes(r.type),
      ),
    );
  return incomplete
    ? "Some page resources were blocked or incomplete. Buggd could not find descriptions in the captured page, but this may differ from the fully loaded website. Check these elements in a normal browser before changing them."
    : undefined;
}
