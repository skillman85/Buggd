import type { Scan } from "../shared/schemas.js";
import {
  platformLabels,
  type Comparison,
  type DisplayMode,
  type Platform,
} from "../shared/evidence.js";
import type { Storage } from "./storage.js";
import { readFile } from "node:fs/promises";
import {
  explain,
  counts,
  summary,
  occurrences,
  platformGuidance,
  prioritised,
  priority,
  developerDetails,
  bucketLabels,
} from "../reporting/explanations.js";
import { highlightBounds } from "../reporting/geometry.js";
import { redactText, redactExport } from "../reporting/redact.js";
export function escapeHtml(value: unknown) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
const e = (value: unknown) => escapeHtml(redactText(String(value)));
export type ReportOptions = {
  mode?: DisplayMode;
  platform?: Platform;
  print?: boolean;
};
const css = `body{font:13px/1.65 system-ui,sans-serif;background:#FAF9F1;color:#0F1B12;max-width:1040px;margin:auto;padding:36px}h1,h2,h3{line-height:1.3;letter-spacing:-.025em}h1{font-size:34px}h2{font-size:21px;margin-top:32px}h3{font-size:17px}p,li,dd,pre{overflow-wrap:anywhere}.muted{color:#526057;font-size:11px}.metrics{display:flex;flex-wrap:wrap;gap:10px}.metrics p{flex:1;min-width:110px;background:#edf3de;padding:15px;border-radius:9px}.metrics strong{font-size:27px}.issue{background:#fffdf7;border:1px solid #dfe2d5;border-radius:12px;padding:22px;margin:18px 0}.pill{font-size:11px;padding:5px 8px;border-radius:6px;background:#edf3de}.visual{position:relative;line-height:0;margin:14px 0;border:1px solid #dfe2d5;overflow:hidden}.visual img{width:100%;height:auto}.visual svg{display:block;width:100%;height:auto}.visual rect.highlight{fill:rgba(163,230,53,.12);stroke:#AE223A;stroke-width:3;vector-effect:non-scaling-stroke}.highlight{position:absolute;border:3px solid #AE223A;box-sizing:border-box;background:rgba(163,230,53,.12)}.visual-label{font-size:10px;color:#526057}pre{white-space:pre-wrap;background:#f1f0e6;padding:12px;border-radius:7px;font-size:10px}dt{font-weight:700}dd{margin:3px 0 10px}table{width:100%;border-collapse:collapse;font-size:11px}td,th{text-align:left;padding:9px;border-bottom:1px solid #dfe2d5}.notice{background:#fff1c8;padding:14px;border-radius:8px}.logo{width:145px;height:auto}footer{border-top:1px solid #dfe2d5;margin-top:30px;padding-top:15px;font-size:10px}@page{size:A4;margin:15mm}@media print{body{background:white;padding:0;font-size:11px;max-width:none}.issue{break-inside:avoid;padding:14px;margin:12px 0}.issue h4{margin:12px 0 4px}.issue p{margin:6px 0}.issue ol{margin:6px 0}.coverage-row{break-inside:avoid}.page-evidence .visual{max-width:360px}h2,h3{break-after:avoid}.visual{break-inside:avoid;max-width:560px}.metrics{break-inside:avoid}pre{font-size:9px}.appendix{break-before:page}details>summary{font-weight:700}}`;
function reportPicture(
  picture: string,
  bounds: ReturnType<typeof highlightBounds>,
  screenshot?: import("../shared/evidence.js").ScreenshotEvidence,
  size?: { width: number; height: number },
) {
  const w = size?.width || screenshot?.pixelWidth || 1440,
    h = size?.height || screenshot?.pixelHeight || screenshot?.height || 960;
  if (!bounds)
    return `<svg role="img" aria-label="Captured affected page" viewBox="0 0 ${w} ${h}"><use href="${e(picture)}"/></svg>`;
  const x = (bounds.left * w) / 100,
    y = (bounds.top * h) / 100,
    ew = (bounds.width * w) / 100,
    eh = (bounds.height * h) / 100;
  const cw = Math.min(w, Math.max(650, ew + 160)),
    ch = Math.min(h, Math.max(260, eh + 120));
  const cx = Math.max(0, Math.min(w - cw, x + ew / 2 - cw / 2)),
    cy = Math.max(0, Math.min(h - ch, y + eh / 2 - ch / 2));
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Captured page detail with the affected element outlined" viewBox="${cx} ${cy} ${cw} ${ch}"><use href="${e(picture)}"/><rect class="highlight" x="${x}" y="${y}" width="${ew}" height="${eh}"/></svg>`;
}
function documentHtml(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><title>${e(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}
export async function htmlReport(
  raw: Scan,
  storage: Storage,
  options: ReportOptions = {},
): Promise<string> {
  const scan = redactExport(raw);
  const c = counts(scan);
  const platform = options.platform || scan.settings.platform || "unsure";
  let logo = "";
  try {
    logo = await readFile(
      new URL("../../dist/brand/buggd-logo-light.svg", import.meta.url),
      "utf8",
    );
  } catch {
    /* Tests/source runs can use the text brand fallback. */
  }
  const images = new Map<string, string>();
  const sizes = new Map<string, { width: number; height: number }>();
  let imageBytes = 0;
  const ordered = prioritised(scan.issues);
  const shown = options.print ? ordered.slice(0, 100) : ordered;
  for (const issue of shown.filter(
    (issue) => issue.confidence !== "not-tested",
  )) {
    const occurrence = occurrences(issue).find((o) => o.screenshotId);
    if (
      !occurrence?.screenshotId ||
      images.has(occurrence.screenshotId) ||
      images.size >= 10
    )
      continue;
    try {
      const png = await storage.evidence(scan.id, occurrence.screenshotId);
      if (imageBytes + png.length > 12 * 1024 * 1024) continue;
      imageBytes += png.length;
      sizes.set(occurrence.screenshotId, {
        width: png.readUInt32BE(16),
        height: png.readUInt32BE(20),
      });
      images.set(
        occurrence.screenshotId,
        `data:image/png;base64,${png.toString("base64")}`,
      );
    } catch {}
  }
  // Preserve useful clean-page evidence even when there are no issues.
  for (const page of scan.pages) {
    const screenshot = page.screenshots.find((s) => s.width === 1440);
    if (!screenshot || images.size >= 10 || images.has(screenshot.id)) continue;
    try {
      const png = await storage.evidence(scan.id, screenshot.id);
      if (imageBytes + png.length > 12 * 1024 * 1024) continue;
      imageBytes += png.length;
      sizes.set(screenshot.id, {
        width: png.readUInt32BE(16),
        height: png.readUInt32BE(20),
      });
      images.set(
        screenshot.id,
        `data:image/png;base64,${png.toString("base64")}`,
      );
    } catch {}
  }
  const sections = (["confirmed", "potential", "not-tested"] as const)
    .map(
      (confidence) =>
        `<section><h2>${bucketLabels[confidence]}</h2>${
          shown
            .filter((issue) => issue.confidence === confidence)
            .map((issue) => {
              if (confidence === "not-tested")
                return `<article class="coverage-row"><h3>${e(explain(issue).title)}</h3><p>${e(explain(issue).explanation)} ${e(explain(issue).fix)}</p><details ${options.print ? "open" : ""}><summary>${occurrences(issue).length} places affected</summary><ul>${occurrences(
                  issue,
                )
                  .map(
                    (o) =>
                      `<li>${e(o.pageUrl)} · ${e(o.element?.text || o.element?.landmark || "Page check")} · ${e(o.evidence)}</li>`,
                  )
                  .join("")}</ul></details></article>`;
              const explanation = explain(issue);
              const occs = occurrences(issue);
              const occ =
                occs.find(
                  (o) => o.screenshotId && images.has(o.screenshotId),
                ) || occs[0];
              const page = scan.pages.find((p) => p.url === occ?.pageUrl);
              const screenshot = [
                ...(page?.screenshots || []),
                ...(page?.detailScreenshots || []),
              ].find((s) => s.id === occ?.screenshotId);
              const bounds = occ ? highlightBounds(occ, screenshot) : undefined;
              const picture =
                occ?.screenshotId && images.has(occ.screenshotId)
                  ? `#capture-${occ.screenshotId}`
                  : undefined;
              return `<article class="issue"><span class="pill">${e(priority(issue))} · ${e(confidence === "confirmed" ? "Confirmed problem" : confidence === "potential" ? "Needs checking" : "Not tested")}</span><h3>${e(explanation.title)}</h3><p>${e(explanation.explanation)}</p><h4>Why this matters</h4><p>${e(explanation.impact)}</p><p><strong>Where:</strong> ${e(occ?.pageUrl || issue.pageUrl)}${occ?.element ? ` · ${e(occ.element.landmark)} · ${e(occ.element.text || occ.element.accessibleName || occ.element.tag)}` : ""}</p><p>${e(explanation.observed)}</p>${picture ? `<div class="visual">${reportPicture(picture, bounds, screenshot, sizes.get(occ!.screenshotId!))}</div><p class="visual-label">${bounds ? "Highlight calculated from the captured element bounds." : "Exact highlighting was not available for this capture."}</p>` : '<p class="muted">No screenshot was included for this observation. Review the affected page manually.</p>'}${screenshot?.note ? `<p class="notice">${e(screenshot.note)}</p>` : ""}<h4>Recommended fix</h4><p>${e(explanation.fix)}</p><ol>${platformGuidance(
                issue,
                platform,
              )
                .map((step) => `<li>${e(step)}</li>`)
                .join(
                  "",
                )}</ol>${issue.grouping?.shared ? `<p>${e(issue.grouping.reason)}</p>` : ""}<details ${options.mode === "technical" || options.print ? "open" : ""}><summary>${occs.length} places affected across ${issue.affectedPages.length} page(s)</summary><ul>${occs.map((o) => `<li>${e(o.pageUrl)} · ${e(o.element?.text || o.element?.accessibleName || o.element?.landmark || o.note || "Element not precisely located")}</li>`).join("")}</ul></details>${options.mode === "technical" ? `<pre>${e(developerDetails(issue))}</pre>` : ""}</article>`;
            })
            .join("") ||
          (ordered.some((i) => i.confidence === confidence)
            ? "<p>Additional observations in this category were omitted by the PDF group limit. Download HTML or JSON for the full report.</p>"
            : "<p>No observations were recorded in this category within the checks completed.</p>")
        }</section>`,
    )
    .join("");
  const pageEvidence = scan.pages
    .map((page) => {
      const shot = page.screenshots.find((s) => s.width === 1440);
      const image =
        shot && images.has(shot.id) ? `#capture-${shot.id}` : undefined;
      return `<article class="issue page-evidence"><h3>${e(page.title || page.url)}</h3><p>${e(page.url)} · ${e(page.status)}</p>${image ? `<div class="visual">${reportPicture(image, undefined, shot, sizes.get(shot!.id))}</div>` : ""}${shot?.note ? `<p class="notice">${e(shot.note)}</p>` : ""}<p>${page.interactions.length} controls classified · ${page.forms.length} forms inspected · ${page.responsive.length} screen-size checks</p></article>`;
    })
    .join("");
  return documentHtml(
    "Buggd Website Report",
    `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" style="position:absolute"><defs>${[...images].map(([id, data]) => `<image id="capture-${e(id)}" href="${data}" width="${sizes.get(id)!.width}" height="${sizes.get(id)!.height}"/>`).join("")}</defs></svg><header><div class="logo">${logo || "<strong>buggd.</strong>"}</div><p>LOCAL WEBSITE REPORT</p><h1>What needs attention on your website</h1><p>${e(scan.url)}</p><p class="muted">${e(new Date(scan.createdAt).toLocaleString("en-GB", { timeZone: "UTC" }))} UTC · ${e(scan.status)} · ${e(platformLabels[platform])} guidance</p></header><p>${e(summary(scan))}</p><div class="metrics"><p><strong>${scan.pages.filter((p) => p.status === "completed").length}</strong><br>Pages checked</p><p><strong>${c.confirmed}</strong><br>Problems found</p><p><strong>${c.potential}</strong><br>Things to check</p><p><strong>${c.untested}</strong><br>Checks not performed</p></div>${scan.error ? `<p class="notice">Scan stopped: ${e(scan.error)}. Partial observations remain below.</p>` : ""}${options.print && ordered.length > 100 ? '<p class="notice">This bounded PDF includes the first 100 prioritised groups. Download HTML or JSON for the complete observations.</p>' : ""}<h2>What to do first</h2><ol>${
      prioritised(scan.issues)
        .filter((i) => i.confidence !== "not-tested")
        .slice(0, 10)
        .map(
          (i) =>
            `<li>${e(priority(i))}: ${e(explain(i).title)} — ${e(explain(i).fix)}</li>`,
        )
        .join("") ||
      "<li>No confirmed or potential issues were recorded. Review the checks not performed and test important visitor journeys yourself.</li>"
    }</ol>${sections}<h2>Pages and evidence</h2>${pageEvidence}<h2>Coverage and limitations</h2><p>${scan.checksExecuted} checks completed. Only observed pages and supported safe checks were covered.</p><ul>${scan.limitations.map((note) => `<li>${e(note)}</li>`).join("")}</ul><p>Images are bounded to ten captures and 12 MiB. Missing or unreliable element evidence is never reconstructed from guesses. Manual review progress does not prove an issue is resolved.</p><section class="appendix"><h2>Technical appendix</h2>${shown
      .filter((issue) => issue.confidence !== "not-tested")
      .map(
        (issue) =>
          `<details ${options.mode === "technical" || options.print ? "open" : ""}><summary>${e(issue.title)} · ${e(issue.checkId)}</summary><pre>${e(developerDetails(issue))}</pre></details>`,
      )
      .join(
        "",
      )}</section><footer>Buggd · James Hillman — James Builds Tech · MIT · Generated locally. Includes observed page text and screenshot content; review before sharing. No cloud upload.</footer>`,
  );
}
export function comparisonHtml(
  comparison: Comparison,
  previous: Scan,
  current: Scan,
) {
  return documentHtml(
    "Buggd scan comparison",
    `<h1>What changed on your website</h1><p>${e(current.url)}</p><p>Previous: ${e(previous.createdAt)} · Newer: ${e(current.createdAt)}</p><table><thead><tr><th>Outcome</th><th>Observation</th><th>Evidence basis</th></tr></thead><tbody>${comparison.items
      .map((item) => {
        const issue =
          current.issues.find((i) => i.id === item.currentIssueId) ||
          previous.issues.find((i) => i.id === item.previousIssueId);
        return `<tr><td>${e(item.status === "unable" ? "Unable to verify" : item.status)}</td><td>${e(issue ? explain(issue).title : "Observation unavailable")}<br>${item.pageUrls.map(e).join("<br>")}</td><td>${e(item.reason)}</td></tr>`;
      })
      .join(
        "",
      )}</tbody></table><p>Resolved means no longer detected only where page, check and identity coverage were sufficient. Review both original reports for screenshots and raw evidence.</p>`,
  );
}
