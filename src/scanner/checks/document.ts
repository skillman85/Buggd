import type { Page } from "playwright";
import type { PageReport, Scan } from "../../shared/schemas.js";
import { addIssue } from "../issues.js";
import { inventory, installEvidence } from "../evidence/capture.js";
import { inspectAccessibleNames } from "./names.js";
import { normalizeUrl, safeUrl } from "../url.js";

export async function inspectDocument(
  page: Page,
  scan: Scan,
  report: PageReport,
  blockedUrls: Set<string> = new Set(),
) {
  await installEvidence(page);
  report.elements = await inventory(page);
  const snapshot = await page.evaluate(() => {
    const text = (document.body?.innerText || "").slice(0, 250000);
    const label = (element: Element) =>
      (
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        element.textContent ||
        ""
      )
        .trim()
        .slice(0, 100);
    const selector = (element: Element) => window.BuggdEvidence.locate(element);
    const images = Array.from(document.images)
      .slice(0, 300)
      .map((img) => ({
        src: img.currentSrc || img.src,
        altMissing:
          !img.hasAttribute("alt") &&
          !["none", "presentation"].includes(img.getAttribute("role") || "") &&
          img.getAttribute("aria-hidden") !== "true",
        broken:
          img.complete &&
          img.naturalWidth === 0 &&
          !!(img.currentSrc || img.src) &&
          (img.loading !== "lazy" ||
            img.getBoundingClientRect().top < innerHeight),
        element: selector(img),
        identification: window.BuggdEvidence.capture(img),
      }));
    return {
      title: document.title.trim(),
      description: document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.slice(0, 1000),
      titleCount: document.head.querySelectorAll("title").length,
      descriptionCount: document.head.querySelectorAll(
        'meta[name="description"]',
      ).length,
      links: Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .slice(0, 500)
        .map((a) => ({
          href: a.href,
          placeholder:
            a.getAttribute("href") === "#" && !a.hasAttribute("aria-controls"),
          label: label(a),
          identification: window.BuggdEvidence.capture(a),
        })),
      images,
      placeholders: [
        ...text.matchAll(
          /\blorem ipsum\b|\bTODO\b|\bFIXME\b|\bcoming soon\b|\bplaceholder (?:text|copy|content)\b/gi,
        ),
      ]
        .slice(0, 10)
        .map((match) => ({
          text: text.slice(Math.max(0, match.index! - 35), match.index! + 90),
          ambiguous: /coming soon/i.test(match[0]),
        })),
    };
  });
  report.title = snapshot.title.slice(0, 300);
  report.description = snapshot.description;
  const add = (finding: Parameters<typeof addIssue>[2]) =>
    addIssue(scan, report.url, finding);
  if (!snapshot.title)
    add({
      category: "metadata",
      severity: "medium",
      confidence: "confirmed",
      title: "Missing document title",
      description: "This HTML page has no non-empty document title.",
      evidence: "snapshot.title is empty.",
      suggestion: "Add a descriptive <title> in the document head.",
      checkId: "metadata.title",
    });
  if (snapshot.titleCount > 1 || snapshot.descriptionCount > 1)
    add({
      category: "metadata",
      severity: "low",
      confidence: "confirmed",
      title: "Duplicate metadata elements",
      description: "More than one title or meta description was found.",
      evidence: `${snapshot.titleCount} title elements; ${snapshot.descriptionCount} meta descriptions.`,
      suggestion: "Render one title and one meta description per snapshot.",
      checkId: "metadata.duplicates",
    });
  for (const image of snapshot.images) {
    const resourceIssue = scan.issues.find(
      (issue) =>
        issue.category === "images" && issue.resource === safeUrl(image.src),
    );
    if (resourceIssue && !blockedUrls.has(safeUrl(image.src)))
      add({
        ...resourceIssue,
        checkId: resourceIssue.checkId,
        elementEvidence: image.identification,
        element: image.element,
      });
    if (
      image.broken &&
      !blockedUrls.has(safeUrl(image.src)) &&
      !scan.issues.some(
        (issue) =>
          issue.category === "images" && issue.resource === safeUrl(image.src),
      )
    )
      add({
        category: "images",
        severity: "high",
        confidence:
          new URL(image.src).origin === new URL(scan.url).origin
            ? "confirmed"
            : "potential",
        title: "Image failed to load",
        description:
          "The browser finished loading this image, but no usable image dimensions were available.",
        evidence: "complete=true; naturalWidth=0.",
        resource: image.src,
        element: image.element,
        elementEvidence: image.identification,
        suggestion: "Check the image URL, response status and file contents.",
        checkId: "images.dimensions",
      });
    if (image.altMissing)
      add({
        category: "metadata",
        severity: "medium",
        confidence: "confirmed",
        title: "Image is missing an alt attribute",
        description:
          "The image has no alt attribute. Decorative images should use an empty alt attribute.",
        evidence: `No alt attribute on ${image.element}.`,
        resource: image.src,
        element: image.element,
        elementEvidence: image.identification,
        suggestion:
          'Add meaningful alternative text, or alt="" when the image is decorative.',
        checkId: "metadata.image-alt",
      });
  }
  await inspectAccessibleNames(
    page,
    scan,
    report,
    (report.resources || []).some(
      (r) =>
        [
          "blocked",
          "unsupported",
          "failed",
          "timeout",
          "browser-restriction",
        ].includes(r.status) &&
        ["image", "font", "stylesheet", "script"].includes(r.type) &&
        (r.type !== "image" || r.provenance === "buggd"),
    ),
  );
  for (const placeholder of snapshot.placeholders)
    add({
      category: "content",
      severity: "low",
      confidence: "potential",
      title: placeholder.ambiguous
        ? "Coming soon content needs review"
        : "Possible unfinished content",
      description:
        "Visible page text contains a marker commonly used during development.",
      evidence: placeholder.text,
      suggestion: "Review whether this content is intentional before shipping.",
      checkId: "content.placeholder",
    });
  const links = new Set<string>();
  const external = new Set<string>();
  for (const link of snapshot.links) {
    if (link.placeholder)
      add({
        category: "content",
        severity: "low",
        confidence: "potential",
        title: "Link has a placeholder destination",
        description:
          "A link points only to # and has no observed controlled UI target.",
        evidence: `href="#"; label: ${link.label}`,
        suggestion:
          "Provide a real destination or use a button for a local interaction.",
        checkId: "content.placeholder-link",
        elementEvidence: link.identification,
      });
    try {
      const url = normalizeUrl(link.href);
      if (new URL(url).origin === new URL(scan.url).origin) links.add(url);
      else external.add(safeUrl(url));
    } catch {
      /* mailto/tel/download schemes are outside crawl scope. */
    }
  }
  const recorded = scan.pages.reduce(
    (sum, page) => sum + page.links.length + page.externalLinks.length,
    0,
  );
  const available = Math.max(0, 3000 - recorded);
  report.links = [...links].slice(0, Math.min(150, available));
  report.externalLinks = [...external].slice(
    0,
    Math.min(50, Math.max(0, available - report.links.length)),
  );
  report.coverage ??= [];
  for (const checkId of [
    "metadata.title",
    "metadata.duplicates",
    "images.dimensions",
    "metadata.image-alt",
    "content.placeholder",
    "content.placeholder-link",
  ])
    report.coverage.push({ checkId, status: "completed" });
  scan.checksExecuted += 7;
  return report.links;
}
