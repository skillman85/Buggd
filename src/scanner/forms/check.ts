import type { Page } from "playwright";
import type { FormReport, PageReport, Scan } from "../../shared/schemas.js";
import { elementAt, installEvidence } from "../evidence/capture.js";
import { addIssue } from "../issues.js";

/** Native validity properties are inspected without submit/checkValidity events.
 * Values are synthetic, never dispatched to app handlers and restored immediately.
 */
export async function inspectForms(page: Page, scan: Scan, report: PageReport) {
  await installEvidence(page);
  const forms: (FormReport & { suspicious: string[] })[] = await page.evaluate(
    () => {
      return Array.from(document.forms)
        .slice(0, 20)
        .map((form) => {
          const checks: {
            field: string;
            scenario: string;
            valid: boolean;
            detail: string;
          }[] = [];
          const suspicious: string[] = [];
          const fields = Array.from(form.elements)
            .filter(
              (
                element,
              ): element is
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
                element instanceof HTMLInputElement ||
                element instanceof HTMLSelectElement ||
                element instanceof HTMLTextAreaElement,
            )
            .slice(0, 100);
          for (const field of fields) {
            const name = window.BuggdEvidence.locate(field);
            if (
              field.disabled ||
              (field instanceof HTMLInputElement &&
                ["hidden", "file", "password"].includes(field.type))
            )
              continue;
            const value = field.value;
            const checked =
              field instanceof HTMLInputElement ? field.checked : false;
            if (field.required) {
              field.value = "";
              if (
                field instanceof HTMLInputElement &&
                ["checkbox", "radio"].includes(field.type)
              )
                field.checked = false;
              const rejected = field.validity.valueMissing;
              checks.push({
                field: name,
                scenario: "Empty required field",
                valid: !rejected,
                detail: rejected
                  ? "Native validity reports valueMissing. Empty input is rejected without submitting."
                  : "Native validity did not report valueMissing for an empty required field; field type or configuration may explain this.",
              });
              if (!rejected && field.willValidate) suspicious.push(name);
            }
            if (field instanceof HTMLInputElement && field.type === "email") {
              field.value = "buggd-invalid-email";
              checks.push({
                field: name,
                scenario: "Invalid email format",
                valid: !field.validity.typeMismatch,
                detail: field.validity.typeMismatch
                  ? "Native validity reports typeMismatch for a synthetic invalid email. No submission attempted."
                  : "The browser did not reject the synthetic invalid email.",
              });
            }
            field.value = value;
            if (field instanceof HTMLInputElement) field.checked = checked;
          }
          return {
            element: window.BuggdEvidence.locate(form),
            fields: fields.length,
            requiredFields: fields.filter((field) => field.required).length,
            checks,
            suspicious,
            detail: `${form.noValidate ? "Form declares novalidate. " : ""}Native constraint properties inspected only. Custom JavaScript validation, submission and backend processing are not tested.`,
          };
        });
    },
  );
  for (const form of forms) {
    const { suspicious, ...result } = form;
    report.forms.push(result);
    const formEvidence = await elementAt(page, form.element);
    addIssue(scan, report.url, {
      category: "forms",
      severity: "informational",
      confidence: "not-tested",
      title: "Custom validation and form processing not tested",
      description:
        "Buggd inspected native validity properties without dispatching input or submit handlers. Custom error messages and backend processing require a separate authorised manual check.",
      evidence: `${form.element}: ${form.checks.length} native constraint scenarios inspected. ${form.detail}`,
      element: form.element,
      elementEvidence: formEvidence,
      suggestion:
        "Verify custom validation messages and submission handling manually with non-sensitive synthetic data in a test environment.",
      checkId: "forms.coverage",
    });
    for (const field of suspicious)
      addIssue(scan, report.url, {
        category: "forms",
        severity: "low",
        confidence: "potential",
        title: "Required field configuration needs review",
        description:
          "A field marked required did not expose the expected native missing-value state.",
        evidence: `${field}. ${form.detail}`,
        element: field,
        elementEvidence: await elementAt(page, field),
        suggestion:
          "Check field types, required attributes and custom validation behaviour.",
        checkId: "forms.required",
      });
    report.coverage ??= [];
    for (const field of new Set(
      form.checks
        .filter((check) => check.scenario === "Empty required field")
        .map((check) => check.field),
    )) {
      const captured = await elementAt(page, field);
      report.coverage.push({
        checkId: "forms.required",
        elementIdentity: captured?.identity,
        status: "completed",
      });
    }
    scan.checksExecuted += Math.max(1, form.checks.length);
  }
}
