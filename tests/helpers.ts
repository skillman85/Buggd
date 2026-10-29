import { randomUUID } from "node:crypto";
import { addIssue } from "../src/scanner/issues.js";
import { scanInputSchema } from "../src/shared/schemas.js";
import type { Scan, Issue } from "../src/shared/schemas.js";
import type { ElementEvidence } from "../src/shared/evidence.js";
export function report(): Scan {
  return {
    id: randomUUID(),
    url: "https://example.com/",
    settings: scanInputSchema.parse({ url: "https://example.com/" }),
    status: "completed",
    createdAt: "2026-10-29T00:00:00Z",
    activity: "",
    checksExecuted: 1,
    pages: [],
    issues: [],
    limitations: [],
    evidenceBytes: 0,
  };
}
export function element(locator = "#control"): ElementEvidence {
  return {
    locator,
    identity: `button|${locator}`,
    identityStrength: "id",
    tag: "button",
    role: "button",
    text: "",
    accessibleName: "",
    attributes: { id: locator.slice(1) },
    nearbyText: "Main menu",
    landmark: "navigation: Main",
    html: '<button id="control"></button>',
    rect: { x: 20, y: 30, width: 80, height: 40 },
    viewport: { width: 390, height: 600, dpr: 2, scrollX: 0, scrollY: 500 },
    alignment: "reliable",
  };
}
export function finding(
  scan = report(),
  id = "metadata.control-name",
  confidence: Issue["confidence"] = "confirmed",
  el: ElementEvidence | undefined = element(),
) {
  return addIssue(scan, scan.url, {
    checkId: id,
    category: "metadata",
    severity: "medium",
    confidence,
    title: "Raw detector title",
    description: "Raw observation",
    evidence: "Computed name is empty",
    suggestion: "Review the control",
    elementEvidence: el,
  })!;
}
