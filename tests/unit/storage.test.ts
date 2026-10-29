import { afterEach, expect, it } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Storage } from "../../src/reports/storage.js";
import { ScanManager } from "../../src/scanner/manager.js";
import { addIssue } from "../../src/scanner/issues.js";
import { scanInputSchema } from "../../src/shared/schemas.js";
import type { Scan } from "../../src/shared/schemas.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
function scan(status: Scan["status"] = "completed"): Scan {
  return {
    id: randomUUID(),
    url: "https://example.com/",
    settings: scanInputSchema.parse({ url: "https://example.com/" }),
    status,
    createdAt: new Date().toISOString(),
    activity: "",
    checksExecuted: 0,
    pages: [],
    issues: [],
    limitations: [],
    evidenceBytes: 0,
  };
}
async function storage() {
  const directory = await mkdtemp(join(tmpdir(), "buggd-storage-"));
  directories.push(directory);
  return new Storage(directory);
}
it("groups repeated evidence across pages with stable identifiers", () => {
  const report = scan();
  const finding = {
    category: "javascript" as const,
    severity: "medium" as const,
    confidence: "confirmed" as const,
    title: "Exception",
    description: "Observed exception",
    evidence: "Error at app.js:1",
    suggestion: "Inspect it",
    checkId: "javascript.error",
  };
  const first = addIssue(report, "https://example.com/", finding)!;
  const repeated = addIssue(report, "https://example.com/about", finding)!;
  expect(report.issues).toHaveLength(1);
  expect(repeated.id).toBe(first.id);
  expect(repeated.occurrences).toBe(2);
  expect(repeated.affectedPages).toHaveLength(2);
  const secondReport = scan();
  expect(addIssue(secondReport, "https://example.com/", finding)?.id).toBe(
    first.id,
  );
});
it("serializes writes and recovers interrupted scans without path traversal", async () => {
  const store = await storage();
  const report = scan("running");
  const first = store.save(report);
  report.activity = "Later snapshot";
  const second = store.save(report);
  await Promise.all([first, second]);
  const recovered = (await store.list())[0];
  expect(recovered.status).toBe("failed");
  expect(recovered.activity).toBe("Later snapshot");
  expect(recovered.error).toContain("stopped");
  expect(() => store.directory("../secrets")).toThrow();
});
it("prunes oldest completed scans after the retention limit", async () => {
  const store = await storage();
  const reports = Array.from({ length: 51 }, (_, i) => ({
    ...scan(),
    createdAt: new Date(1700000000000 + i * 1000).toISOString(),
  }));
  for (const report of reports) await store.save(report);
  const manager = new ScanManager(store, () => []);
  await manager.init();
  expect(manager.list()).toHaveLength(50);
  expect(manager.scans.has(reports[0].id)).toBe(false);
  expect(manager.scans.has(reports[50].id)).toBe(true);
  await manager.close();
});

it("opens legacy reports and saves progress without rewriting original findings or inventing coordinates", async () => {
  const store = await storage();
  const legacy = scan();
  const issue = addIssue(legacy, legacy.url, {
    category: "metadata",
    severity: "medium",
    confidence: "potential",
    title: "Old control message",
    description: "Old observation",
    evidence: "a",
    suggestion: "Review",
    checkId: "metadata.control-name",
  })!;
  delete issue.occurrenceList;
  delete issue.grouping;
  delete legacy.schemaVersion;
  legacy.pages = [
    {
      id: "old-page",
      url: legacy.url,
      title: "Old home",
      status: "completed",
      duration: 1,
      links: [],
      externalLinks: [],
      screenshots: [],
      consoleErrors: [],
      failedResources: [],
      interactions: [],
      forms: [],
      responsive: [],
    },
  ];
  await store.save(legacy);
  const before = await readFile(
    join(store.directory(legacy.id), "scan.json"),
    "utf8",
  );
  const loaded = (await store.list())[0];
  expect(loaded.issues[0].evidence).toBe("a");
  expect(loaded.pages[0].elements).toBeUndefined();
  await Promise.all([
    store.updateWorkspace(loaded, { platform: "wordpress" }),
    store.updateWorkspace(loaded, {
      reviews: {
        [issue.id]: { status: "reviewing", reason: "", updatedAt: "now" },
      },
    }),
  ]);
  const progress = await new Storage(store.root).workspace(loaded);
  expect(progress.platform).toBe("wordpress");
  expect(progress.reviews[issue.id].status).toBe("reviewing");
  expect(
    await readFile(join(store.directory(legacy.id), "scan.json"), "utf8"),
  ).toBe(before);
});
