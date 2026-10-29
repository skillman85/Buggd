import type { Page } from "playwright";
import type { Scan, PageReport } from "../../shared/schemas.js";
import { inventory } from "../evidence/capture.js";
import { addIssue } from "../issues.js";
export async function inspectAccessibleNames(
  page: Page,
  scan: Scan,
  report: PageReport,
  interference: boolean,
) {
  const elements = await inventory(page);
  const width = page.viewportSize()?.width || 1440;
  for (const element of elements) {
    if (
      element.accessibleName ||
      ![
        "button",
        "link",
        "textbox",
        "checkbox",
        "radio",
        "combobox",
        "switch",
        "tab",
        "searchbox",
        "spinbutton",
      ].includes(element.role)
    )
      continue;
    const isField = ["input", "select", "textarea"].includes(element.tag);
    const unsupported = ![
      "button",
      "a",
      "input",
      "select",
      "textarea",
    ].includes(element.tag);
    addIssue(scan, report.url, {
      category: isField ? "forms" : "metadata",
      severity: "medium",
      confidence: interference || unsupported ? "potential" : "confirmed",
      title: isField
        ? "Form control may be missing a label"
        : "Interactive control has no observed accessible name",
      description:
        "The recognised accessible-name computation returned an empty name for this visible control.",
      evidence: `Computed accessible name: empty. Role: ${element.role}. ${interference ? "Some rendering resources were incomplete or blocked; this may affect the result." : "Computed using dom-accessibility-api rather than visible text alone."}`,
      element: element.locator,
      elementEvidence: element,
      viewportWidth: width,
      suggestion:
        "Give this control an appropriate visible label or accessible description, then check it with assistive technology.",
      checkId: isField ? "forms.label" : "metadata.control-name",
    });
  }
  report.coverage ??= [];
  for (const checkId of ["metadata.control-name", "forms.label"])
    report.coverage.push({
      checkId,
      status: interference ? "blocked" : "completed",
      viewportWidth: width,
      note: interference
        ? "Incomplete or blocked resources may affect accessible names."
        : undefined,
    });
}
