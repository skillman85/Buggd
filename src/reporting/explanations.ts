import { redactText } from "./redact.js";
import type { Issue, Scan } from "../shared/schemas.js";
import type {
  Platform,
  Occurrence,
  ElementEvidence,
} from "../shared/evidence.js";

type Family =
  | "links"
  | "images"
  | "alt"
  | "names"
  | "layout"
  | "forms"
  | "content"
  | "technical"
  | "coverage";
type Rule = {
  confirmed: string;
  potential: string;
  explanation: string;
  impact: string;
  fix: string;
  developer: string;
  family: Family;
};
const rule = (
  confirmed: string,
  potential: string,
  explanation: string,
  impact: string,
  fix: string,
  developer: string,
  family: Family,
): Rule => ({
  confirmed,
  potential,
  explanation,
  impact,
  fix,
  developer,
  family,
});
export const explanations = {
  "links.http": rule(
    "This link leads to a page that could not load",
    "This page response needs checking",
    "The destination returned an error when Buggd tried to open it.",
    "Visitors may reach an error page instead of the information they wanted.",
    "Update the link destination or restore the missing page.",
    "Inspect the recorded HTTP response, source link and redirect chain. Return a useful response for the intended URL.",
    "links",
  ),
  "links.navigation": rule(
    "This page gets stuck in a redirect loop",
    "Buggd could not finish checking this page",
    "The browser could not finish opening the destination within the scan rules.",
    "Visitors may be unable to reach the page, but connection or scanning restrictions can also explain this result.",
    "Open the page yourself. Check its address, redirects and availability before changing the site.",
    "Inspect the navigation error. Separate certificate, timeout and scanner-policy exclusions from application failures.",
    "links",
  ),
  "images.dimensions": rule(
    "This image did not load",
    "This image needs checking",
    "The browser did not receive a usable image.",
    "Visitors may see an empty space or a broken-image symbol.",
    "Replace the image or correct its address, then check the page again.",
    "Inspect currentSrc, the response and decoded natural dimensions. Keep intentional lazy loading in mind.",
    "images",
  ),
  "network.http": rule(
    "Part of this page did not load",
    "A page resource needs checking",
    "An image, file or service returned an error.",
    "A missing resource can affect the appearance or behaviour of the page.",
    "Review the affected resource. Restore it or update the page to use a working address.",
    "Inspect the response status and resource type. Third-party failures are not automatically attributable to this website.",
    "images",
  ),
  "network.failure": rule(
    "A request did not complete",
    "A loading problem needs checking",
    "The browser could not complete a request.",
    "Some content or features may be unavailable. Connection failures and browser restrictions can also cause this.",
    "Try the affected page in a normal browser and check whether the resource is needed.",
    "Review the recorded failure, timeout, CORS restrictions and request destination before assigning a cause.",
    "technical",
  ),
  "javascript.error": rule(
    "A website error was recorded",
    "A website error needs checking",
    "The browser recorded an error while this page was open.",
    "An error can interrupt a feature, although some logged messages do not affect visitors.",
    "Try the affected page and ask your developer to investigate the recorded error.",
    "Reproduce the exception or console error, inspect the captured stack/location and check scanner interference.",
    "technical",
  ),
  "metadata.title": rule(
    "This page is missing its browser-tab title",
    "This page title needs checking",
    "Buggd found no non-empty page title.",
    "A clear title helps visitors recognise browser tabs, bookmarks and search results.",
    "Give this page a short, descriptive title.",
    "Set one meaningful document <title> for this route.",
    "content",
  ),
  "metadata.duplicates": rule(
    "This page has repeated page information",
    "Repeated page information needs checking",
    "More than one title or page description was found.",
    "Browsers and other tools may choose an unintended version.",
    "Keep one clear title and one page description.",
    "Remove duplicate title/meta-description output from templates or head management.",
    "content",
  ),
  "metadata.image-alt": rule(
    "An image is missing a description",
    "An image description needs checking",
    "Buggd found an image without an alternative-text attribute.",
    "People who cannot see the image may miss information. Decorative images need an intentionally empty description.",
    "Add a useful image description, or mark the image as decorative if it conveys no information.",
    'Use a meaningful alt attribute, or alt="" for a genuinely decorative image.',
    "alt",
  ),
  "metadata.control-name": rule(
    "A button or link is missing a description",
    "A button or link may need a description",
    "Buggd could not find a description for this control that a screen reader could announce.",
    "People using screen readers may not understand what this control does.",
    "Find the affected control and give it a meaningful name that describes its real action.",
    "Use visible text, a valid aria-labelledby reference or an appropriate aria-label. A decorative icon alone is not a name.",
    "names",
  ),
  "forms.label": rule(
    "A form field is missing a label",
    "A form field may need a label",
    "Buggd could not find a name for this form field.",
    "Visitors may not understand what to enter, especially when using a screen reader.",
    "Add a clear label and connect it to the affected field.",
    "Associate a label with the field id, or provide an equivalent valid accessible name. Do not rely on placeholder text alone.",
    "names",
  ),
  "content.placeholder": rule(
    "Some text appears unfinished",
    "Some text may still be a placeholder",
    "The visible page contains wording commonly used during development.",
    "Visitors could see unfinished or confusing information. The wording may also be intentional.",
    "Review the quoted text and replace it if it was not meant for visitors.",
    "Inspect the exact text excerpt. Do not replace intentional examples or announcements blindly.",
    "content",
  ),
  "content.placeholder-link": rule(
    "This link has no real destination",
    "This link may need a destination",
    "The link points only to # without an observed controlled section.",
    "Visitors may click it and stay on the same page without an explanation.",
    "Give the link a useful destination or use an appropriate button for an on-page action.",
    'Replace href="#" with a real URL/fragment or a semantic button with an implemented handler.',
    "links",
  ),
  "responsive.overflow": rule(
    "Part of this page extends beyond the screen",
    "Part of this page may be cut off",
    "The page was wider than the tested screen size.",
    "Visitors may have to scroll sideways or miss content on mobile and tablet screens.",
    "Review the affected section at this screen size and adjust its layout.",
    "Inspect fixed/minimum widths, long unbroken content and overflow. Avoid hiding important content as a quick fix.",
    "layout",
  ),
  "responsive.clip": rule(
    "Some page text is cut off",
    "Some page text may be cut off",
    "Buggd found a text element with hidden overflow.",
    "Visitors may be unable to read the full heading, label or button text. Intentional truncation can also explain this.",
    "Review the highlighted text at the affected screen size and allow enough room.",
    "Inspect scrollWidth/clientWidth, overflow and text truncation at the recorded viewport.",
    "layout",
  ),
  "responsive.overlap": rule(
    "A control is covered by another element",
    "A control may be covered by something else",
    "Another element covered the centre of a visible control.",
    "Visitors may find it difficult to select the control. An intentional menu or dialogue can also explain this.",
    "Check the control at this screen size and adjust overlapping content if needed.",
    "Inspect stacking contexts, z-index, fixed/sticky layers and the recorded hit-test result.",
    "layout",
  ),
  "interactions.response": rule(
    "This control did not show a visible response",
    "This control may not be responding",
    "Buggd tried a recognised safe action and saw no change during a short observation.",
    "Visitors may be unsure whether their action worked. Delayed, clipboard or browser effects may not be visible to Buggd.",
    "Try the control yourself and check what it is meant to do.",
    "Inspect the handler, aria-controls target and response timing. The network-locked observation does not prove the control is broken.",
    "technical",
  ),
  "interactions.blocked": rule(
    "This action was not fully checked",
    "This action was not fully checked",
    "The action needed network activity, which Buggd blocked during safe interaction testing.",
    "The result is unknown. This is not a website problem count.",
    "Try this action manually in an authorised test environment.",
    "Network requests are locked during interactions. Do not weaken that lock to test a write action.",
    "coverage",
  ),
  "interactions.excluded": rule(
    "Some actions were left for you to check",
    "Some actions were left for you to check",
    "Buggd did not run unknown, excluded or potentially state-changing actions.",
    "Their behaviour has not been verified. No failure is implied.",
    "Review these actions yourself, using test data where appropriate.",
    "Inspect the classified controls and their exclusions; do not execute destructive handlers automatically.",
    "coverage",
  ),
  "forms.coverage": rule(
    "Form submission was not checked",
    "Form submission was not checked",
    "Buggd checked safe native form rules but did not send a real enquiry or test custom submission code.",
    "You still need to confirm that messages are successfully delivered. This is a coverage limit, not a defect.",
    "Send a harmless test enquiry yourself and confirm its delivery with the recipient.",
    "Native validity inspection does not verify JavaScript validation messages, submit handlers or backend delivery.",
    "forms",
  ),
  "forms.required": rule(
    "A required field is not rejecting an empty value",
    "A required field needs checking",
    "An empty required field did not show the expected native missing-value state.",
    "Visitors may be able to leave out information you need. The field type or custom validation may explain this.",
    "Check the affected field and its required-field settings.",
    "Review field type, required, willValidate and any custom validation separately.",
    "forms",
  ),
  "coverage.resource": rule(
    "Some resources were not checked",
    "Some resources were not checked",
    "A resource or request was excluded by the scan policy.",
    "The screenshot or page behaviour may differ from what visitors see. Blocking is not proof that the resource is broken.",
    "Review the resource yourself, or explicitly allow eligible public assets in a new scan.",
    "Inspect the resource provenance and exclusion reason. Navigation, private networks and writes must remain blocked.",
    "coverage",
  ),
} satisfies Record<string, Rule>;
export type DetectorKey = keyof typeof explanations;
// Topic headings organise the report; they do not combine or reclassify original findings.
const groupTitles: Record<DetectorKey, [string, string]> = {
  "links.http": [
    "Links lead to pages that could not load",
    "Some page destinations need checking",
  ],
  "links.navigation": [
    "Pages are stuck in redirect loops",
    "Some pages could not be fully checked",
  ],
  "images.dimensions": ["Images did not load", "Some images need checking"],
  "network.http": [
    "Parts of the website did not load",
    "Some page resources need checking",
  ],
  "network.failure": [
    "Requests did not complete",
    "Some loading problems need checking",
  ],
  "javascript.error": [
    "Website errors were recorded",
    "Some website errors need checking",
  ],
  "metadata.title": [
    "Pages are missing browser-tab titles",
    "Some page titles need checking",
  ],
  "metadata.duplicates": [
    "Pages have repeated page information",
    "Some repeated page information needs checking",
  ],
  "metadata.image-alt": [
    "Images are missing descriptions",
    "Some image descriptions need checking",
  ],
  "metadata.control-name": [
    "Buttons or links are missing descriptions",
    "Some buttons or links may need descriptions",
  ],
  "forms.label": [
    "Form fields are missing labels",
    "Some form fields may need labels",
  ],
  "content.placeholder": [
    "Some page text appears unfinished",
    "Some text may still be a placeholder",
  ],
  "content.placeholder-link": [
    "Links have no real destination",
    "Some links may need a destination",
  ],
  "responsive.overflow": [
    "Parts of pages extend beyond the screen",
    "Some page content may be cut off",
  ],
  "responsive.clip": ["Page text is cut off", "Some page text may be cut off"],
  "responsive.overlap": [
    "Controls are covered by other elements",
    "Some controls may be covered by other content",
  ],
  "interactions.response": [
    "Controls did not show a visible response",
    "Some controls may not be responding",
  ],
  "interactions.blocked": [
    "Actions needed a manual check",
    "Actions needed a manual check",
  ],
  "interactions.excluded": [
    "Some actions were left for you to check",
    "Some actions were left for you to check",
  ],
  "forms.coverage": [
    "Form delivery was not tested",
    "Form delivery was not tested",
  ],
  "forms.required": [
    "Required fields are not rejecting empty values",
    "Some required fields need checking",
  ],
  "coverage.resource": [
    "Some page resources were left unchecked",
    "Some page resources were left unchecked",
  ],
};
export function detectorKey(checkId: string): string {
  return checkId.replace(/\.\d+$/, "");
}
export function elementKind(element: ElementEvidence): string {
  return (
    (
      {
        link: "link",
        button: "button",
        textbox: "text field",
        searchbox: "search field",
        checkbox: "tick box",
        radio: "option",
        combobox: "choice field",
        switch: "switch",
        tab: "tab",
        img: "image",
        form: "form",
      } as Record<string, string>
    )[element.role] ||
    (
      { a: "link", img: "image", form: "form", html: "page section" } as Record<
        string,
        string
      >
    )[element.tag] ||
    "control"
  );
}
export function elementRegion(element?: ElementEvidence) {
  const raw = element?.landmark || "";
  if (!raw) return "Location not captured";
  return raw
    .replace(/^(contentinfo|footer)\b/i, "Footer")
    .replace(/^(banner|header)\b/i, "Header")
    .replace(/^navigation\b/i, "Navigation")
    .replace(/^main\b/i, "Main content")
    .replace(/^Page content\b/i, "Page content");
}
export function elementTitle(element: ElementEvidence): string {
  const kind = elementKind(element);
  return (
    element.text ||
    element.accessibleName ||
    kind[0].toUpperCase() + kind.slice(1)
  );
}
export function occurrences(issue: Issue): Occurrence[] {
  return issue.occurrenceList?.length
    ? [...issue.occurrenceList].sort(
        (a, b) =>
          Number(b.element?.alignment === "reliable") -
          Number(a.element?.alignment === "reliable"),
      )
    : issue.affectedPages.map((pageUrl, index) => ({
        id: `legacy-${issue.id}-${index}`,
        pageUrl,
        timestamp: issue.timestamp,
        evidence: issue.evidence,
        screenshotId: index === 0 ? issue.screenshotId : undefined,
        note: "This older scan has no precise element coordinates. No highlight can be reconstructed.",
      }));
}
export function explain(issue: Issue) {
  const key = detectorKey(issue.checkId);
  const entry =
    explanations[key as DetectorKey] ||
    rule(
      "An observation needs review",
      "An observation needs review",
      "Buggd recorded an observation from an older or unsupported detector.",
      "Review the actual evidence before deciding whether visitors are affected.",
      issue.suggestion || "Ask your developer to review the recorded evidence.",
      "See the original detector message and evidence.",
      "technical",
    );
  const first = occurrences(issue)[0];
  const width = first?.viewportWidth || first?.element?.viewport.width;
  const title =
    key === "links.http" && /404|410/.test(issue.title)
      ? "This link leads to a page that does not exist"
      : issue.confidence === "confirmed"
        ? entry.confirmed
        : entry.potential;
  return {
    ...entry,
    title:
      key === "metadata.control-name" && first?.element
        ? `${first.element.role === "link" ? (/navigation/.test(first.element.landmark) ? "A navigation link" : "A link") : `A ${elementKind(first.element)}`} ${issue.confidence === "confirmed" ? "is missing" : "may need"} a description`
        : title,
    observed: first?.element
      ? `${first.element.text || first.element.accessibleName || `A ${elementKind(first.element)} with no observed name`} in ${elementRegion(first.element)}${width ? ` at ${width}px` : ""}. ${entry.explanation}`
      : entry.explanation,
    groupTitle:
      groupTitles[key as DetectorKey]?.[
        issue.confidence === "confirmed" ? 0 : 1
      ] || title,
    classification: issue.confidence,
  };
}
export const bucketLabels = {
  confirmed: "Problems found",
  potential: "Things to check",
  "not-tested": "Checks not performed",
} as const;
export function counts(scan: Scan) {
  return {
    confirmed: scan.issues.filter((i) => i.confidence === "confirmed").length,
    potential: scan.issues.filter((i) => i.confidence === "potential").length,
    untested: scan.issues.filter((i) => i.confidence === "not-tested").length,
  };
}
export function summary(scan: Scan) {
  const c = counts(scan);
  const pages = scan.pages.filter((p) => p.status === "completed").length;
  return `Your scan checked ${pages} ${pages === 1 ? "page" : "pages"}. ${c.confirmed ? `${c.confirmed} confirmed ${c.confirmed === 1 ? "problem was" : "problems were"} found.` : "No confirmed problems were detected in the checks completed."} ${c.potential ? `${c.potential} ${c.potential === 1 ? "issue needs" : "issues need"} reviewing.` : "No additional potential issues were recorded."} ${c.untested} ${c.untested === 1 ? "check was" : "checks were"} not performed. This does not guarantee every part of your website works.`;
}
export function prioritised(issues: Issue[]) {
  const severity = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    informational: 1,
  };
  const score = (i: Issue) =>
    (i.confidence === "confirmed"
      ? 1000
      : i.confidence === "potential"
        ? 500
        : 0) +
    severity[i.severity] * 30 +
    Math.min(i.affectedPages.length, 25) +
    (/navigation|banner/.test(i.grouping?.region || "") ? 20 : 0);
  return [...issues].sort(
    (a, b) => score(b) - score(a) || a.id.localeCompare(b.id),
  );
}
export function priority(issue: Issue) {
  return issue.confidence === "confirmed"
    ? "Fix first"
    : issue.confidence === "potential"
      ? "Worth checking"
      : "Check yourself";
}

const editor: Record<Platform, string> = {
  wordpress:
    "Open the affected page or shared template in the WordPress editor.",
  webflow:
    "Open the page in the Webflow Designer and select the affected element.",
  framer:
    "Open the page in Framer and select the affected layer or shared component.",
  squarespace:
    "Open the page in the Squarespace editor and select the relevant block or section.",
  html: "Open the source or template that renders the affected page.",
  react:
    "Find the component that renders the identified element. The source file is not known to Buggd.",
  unsure:
    "Open your website builder, or give the verified details below to the person or coding assistant that maintains your site.",
};
export function platformGuidance(issue: Issue, platform: Platform): string[] {
  const e = explain(issue);
  const visual = !["html", "react", "unsure"].includes(platform);
  let action = e.fix;
  if (e.family === "links")
    action = visual
      ? "Select the link and review its destination in the link settings. Choose the correct page or enter a working address."
      : "Update the observed href or redirect rule. Preserve the intended destination and test the response.";
  if (e.family === "alt")
    action =
      platform === "wordpress"
        ? "Select the image or its Media Library entry and review the Alternative Text field. Use an empty alt value only for a decorative image."
        : visual
          ? "Select the image and review its alternative-text/accessibility setting. Describe meaningful content, or intentionally mark decorative content."
          : 'Add an appropriate alt attribute to the identified image. Use alt="" only when it is decorative.';
  if (e.family === "names")
    action = visual
      ? "Select the affected control and review its label/accessibility settings. Describe its actual action. If the builder does not expose this, ask its developer for help."
      : "Give the identified control a visible associated label or a valid accessible name. Do not invent an action name from the icon alone.";
  if (e.family === "layout")
    action = visual
      ? "Switch to the affected mobile/tablet breakpoint. Review the selected section’s width, spacing, wrapping and overlapping layers."
      : "Inspect the recorded element and viewport. Adjust fixed/minimum widths, wrapping or stacking; avoid masking useful content with overflow:hidden.";
  if (e.family === "images")
    action = visual
      ? "Select the image/file and reconnect or replace the missing resource. Confirm its published address still works."
      : "Check the observed resource URL, deployment assets and response. Update the reference or restore the file.";
  if (e.family === "forms")
    action = visual
      ? "Review the form field settings and the destination/integration used by this form. Use a harmless manual enquiry to verify delivery."
      : "Review native field constraints and custom handlers separately. Test delivery manually in a controlled environment; Buggd did not submit the form.";
  return [
    editor[platform],
    action,
    platform === "unsure"
      ? "The platform and source location are unknown. Use the actual page and element details rather than assuming a file path."
      : "Publish or preview the intended change, then rescan the same pages to check what Buggd now observes.",
  ];
}
export function developerDetails(issue: Issue) {
  const e = explain(issue);
  return redactText(
    `${issue.title}\nRule: ${issue.checkId}\nConfidence: ${issue.confidence}\nSeverity: ${issue.severity}\n${occurrences(
      issue,
    )
      .map(
        (o) =>
          `Page: ${o.pageUrl}\nElement: ${o.element?.locator || "not precisely located"}\nName: ${o.element?.accessibleName || "no observed name"}\nEvidence: ${o.evidence}`,
      )
      .join("\n\n")}\nGuidance: ${e.developer}`,
  );
}
export function aiFixPrompt(issue: Issue) {
  const e = explain(issue);
  return `Help me investigate this website finding. Do not assume a source file, framework or cause that is not shown.\n${e.title}\nClassification: ${issue.confidence}. A manual review status is not proof of a fix.\n${developerDetails(issue)}\nPreserve unrelated content and branding. Explain your proposed change, test it safely, and rescan the relevant page and check. Do not submit real forms or perform destructive actions.`;
}
