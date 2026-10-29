import { createHash } from "node:crypto";
import type { Issue, Scan } from "../shared/schemas.js";
import type { ElementEvidence, Occurrence } from "../shared/evidence.js";
import { safeUrl } from "./url.js";
export type Finding = Pick<
  Issue,
  | "category"
  | "severity"
  | "confidence"
  | "title"
  | "description"
  | "evidence"
  | "suggestion"
  | "checkId"
> &
  Partial<Pick<Issue, "resource" | "element" | "screenshotId">> & {
    elementEvidence?: ElementEvidence;
    viewportWidth?: number;
    occurrencePageUrl?: string;
  };
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
export function addIssue(
  scan: Scan,
  pageUrl: string,
  finding: Finding,
): Issue | undefined {
  if (scan.issues.length >= 1000) {
    const note =
      "Findings were limited to 1,000 groups. Narrow the scan to investigate further.";
    if (!scan.limitations.includes(note)) scan.limitations.push(note);
    return;
  }
  const element = finding.elementEvidence;
  const resource = finding.resource ? safeUrl(finding.resource) : undefined;
  // Full structural identity retains sibling positions: two generic links never merge on tag alone.
  const subject = element
    ? [
        element.identity,
        element.tag,
        element.role,
        element.landmark,
        element.destination || resource || "",
      ]
    : [resource || finding.evidence, finding.element || "", finding.title];
  const groupSubject =
    resource && ["links", "images", "network"].includes(finding.category)
      ? [resource, finding.title]
      : subject;
  const fingerprint = hash([finding.checkId, finding.confidence, groupSubject]);
  const url = safeUrl(finding.occurrencePageUrl || pageUrl);
  const occurrence: Occurrence = {
    id: hash([
      url,
      finding.checkId,
      subject,
      finding.viewportWidth || element?.viewport.width || 0,
    ]),
    pageUrl: url,
    timestamp: new Date().toISOString(),
    evidence: finding.evidence.slice(0, 4000),
    element,
    screenshotId: finding.screenshotId,
    viewportWidth: finding.viewportWidth,
    repeatCount: 1,
    note: element
      ? undefined
      : "Exact element evidence was not available for this observation.",
  };
  const existing = scan.issues.find((issue) => issue.id === fingerprint);
  if (existing) {
    existing.occurrences++;
    if (!existing.affectedPages.includes(url)) existing.affectedPages.push(url);
    existing.occurrenceList ??= [];
    const placeholder =
      resource && element
        ? existing.occurrenceList.find(
            (item) => item.pageUrl === url && !item.element,
          )
        : undefined;
    if (placeholder) {
      // Attach a located element to the original resource event instead of showing two places for one image.
      Object.assign(placeholder, {
        ...occurrence,
        evidence: placeholder.evidence,
        repeatCount: (placeholder.repeatCount || 1) + 1,
      });
      return existing;
    }
    const repeated = existing.occurrenceList.find(
      (item) => item.id === occurrence.id,
    );
    if (repeated) repeated.repeatCount = (repeated.repeatCount || 1) + 1;
    else if (existing.occurrenceList.length < 1000)
      existing.occurrenceList.push(occurrence);
    if (
      existing.grouping &&
      existing.affectedPages.length > 1 &&
      /navigation|banner|contentinfo|header|footer/i.test(
        existing.grouping.region,
      )
    ) {
      existing.grouping.shared = true;
      existing.grouping.reason =
        "Equivalent element identity, destination and page region recur across pages. This may be a shared component; review each place before changing it.";
    }
    return existing;
  }
  const raw = {
    category: finding.category,
    severity: finding.severity,
    confidence: finding.confidence,
    title: finding.title,
    description: finding.description,
    evidence: finding.evidence,
    suggestion: finding.suggestion,
    checkId: finding.checkId,
    element: finding.element,
    screenshotId: finding.screenshotId,
  };
  const issue: Issue = {
    ...raw,
    id: fingerprint,
    scanId: scan.id,
    pageUrl: url,
    affectedPages: [url],
    timestamp: occurrence.timestamp,
    occurrences: 1,
    title: finding.title.slice(0, 180),
    description: finding.description.slice(0, 2000),
    evidence: finding.evidence.slice(0, 4000),
    suggestion: finding.suggestion.slice(0, 1500),
    resource,
    element: element?.locator || finding.element,
    occurrenceList: [occurrence],
    grouping: {
      key: fingerprint,
      shared: false,
      region: element?.landmark || "Page",
      reason:
        "Grouped by the detector and equivalent observed evidence, with individual places retained.",
    },
  };
  scan.issues.push(issue);
  return issue;
}
