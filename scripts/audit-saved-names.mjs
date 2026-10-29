/* global document, window */
// Read-only replay of saved, sanitised element evidence. No live-site requests.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { chromium } from "playwright";
import { evidenceScript } from "../lib/scanner/evidence/browser-source.js";
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("Pass a saved scan JSON path and an audit output path.");
const scan = JSON.parse(await readFile(input, "utf8"));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    offline: true,
    serviceWorkers: "block",
  });
  await context.route("**/*", (route) => route.abort());
  const page = await context.newPage();
  const findings = [];
  for (const issue of scan.issues.filter(
    (i) => i.checkId === "metadata.control-name",
  )) {
    const element = issue.occurrenceList?.[0]?.element;
    if (!element?.html || !["a", "button"].includes(element.tag)) continue;
    const names = [];
    for (const loaded of [false, true]) {
      await page.setContent(`<html><body>${element.html}</body></html>`);
      await page.evaluate(
        ({ tag, destination, loaded }) => {
          const el = document.querySelector(tag);
          if (tag === "a" && destination) el.setAttribute("href", destination);
          for (const img of document.images)
            img.src = loaded
              ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJp8AAAAASUVORK5CYII="
              : "data:image/png;base64,invalid";
        },
        { tag: element.tag, destination: element.destination, loaded },
      );
      await page.evaluate(() =>
        Promise.all(
          [...document.images].map((img) => img.decode().catch(() => {})),
        ),
      );
      await page.evaluate(
        `${evidenceScript}\nwindow.BuggdEvidence=BuggdEvidence;`,
      );
      names.push(
        await page.evaluate(
          (tag) =>
            window.BuggdEvidence.computeAccessibleName(
              document.querySelector(tag),
            ),
          element.tag,
        ),
      );
    }
    const positiveName = "Verified replay control";
    await page
      .locator(element.tag)
      .first()
      .evaluate(
        (el, name) => el.setAttribute("aria-label", name),
        positiveName,
      );
    const labelled = await page.evaluate(
      (tag) =>
        window.BuggdEvidence.computeAccessibleName(document.querySelector(tag)),
      element.tag,
    );
    findings.push({
      id: issue.id,
      confidence: issue.confidence,
      page: issue.pageUrl,
      region: element.landmark,
      destination: element.destination,
      nearbyText: element.nearbyText,
      occurrences: issue.occurrenceList.length,
      storedName: element.accessibleName,
      replayWithoutImages: names[0],
      replayWithImages: names[1],
      positiveLabelRecognised: labelled === positiveName,
    });
  }
  const grouped = new Map();
  for (const f of findings) {
    const k = JSON.stringify([f.region, f.destination, f.nearbyText]);
    const v = grouped.get(k) || {
      region: f.region,
      destination: f.destination,
      nearbyText: f.nearbyText,
      findings: 0,
      occurrences: 0,
    };
    v.findings++;
    v.occurrences += f.occurrences;
    grouped.set(k, v);
  }
  const result = {
    auditedAt: new Date().toISOString(),
    scanId: scan.id,
    url: scan.url,
    method:
      "Offline replay of each saved sanitised link/button fragment using the bundled accessible-name implementation; images replaced by loaded and invalid data URLs; no live website scripts or network requests.",
    confirmed: scan.issues.filter((i) => i.confidence === "confirmed").length,
    potential: scan.issues.filter((i) => i.confidence === "potential").length,
    unperformed: scan.issues.filter((i) => i.confidence === "not-tested")
      .length,
    namingFindings: findings.length,
    namingOccurrences: findings.reduce((a, f) => a + f.occurrences, 0),
    emptyInBothStates: findings.filter(
      (f) => !f.replayWithoutImages && !f.replayWithImages,
    ).length,
    positiveControlsRecognised: findings.filter(
      (f) => f.positiveLabelRecognised,
    ).length,
    interpretation:
      'Stored shapes genuinely lack a computed name, including image-only links with alt="" and icon-only buttons. This replay does not establish live-site correctness: external scripts, fonts and images were blocked in the original scan. Keep findings potential, expose the limitation, and ask for a fully loaded manual review. Structural and responsive paths explain the increase in separate records; do not equate it with new defects.',
    subjects: [...grouped.values()],
    findings,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  console.log(
    JSON.stringify({
      namingFindings: result.namingFindings,
      occurrences: result.namingOccurrences,
      emptyInBothStates: result.emptyInBothStates,
      positiveControlsRecognised: result.positiveControlsRecognised,
      subjects: result.subjects.length,
    }),
  );
} finally {
  await browser.close();
}
