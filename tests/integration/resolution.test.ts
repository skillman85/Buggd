import { chromium } from "playwright";
import { htmlReport } from "../../src/reports/html.js";
import { beforeAll, afterAll, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../../src/server/index.js";
import { startV11Fixture } from "../../fixtures/v11.js";
import type { Scan } from "../../src/shared/schemas.js";
import { ScanManager } from "../../src/scanner/manager.js";
import { Storage } from "../../src/reports/storage.js";
let app: Awaited<ReturnType<typeof createServer>>,
  fixture: Awaited<ReturnType<typeof startV11Fixture>>,
  root: string,
  headers: Record<string, string>;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "buggd-resolution-"));
  fixture = await startV11Fixture();
  app = await createServer({ dataDir: root });
  const response = await app.inject({
    url: "/api/session",
    headers: { host: "127.0.0.1:4173" },
  });
  headers = {
    host: "127.0.0.1:4173",
    cookie: response.headers["set-cookie"] as string,
    "x-buggd-token": response.json().token,
  };
});
afterAll(async () => {
  await app?.close();
  await fixture?.close();
  await rm(root, { recursive: true, force: true });
});
async function wait(id: string): Promise<Scan> {
  let scan: Scan | undefined;
  await expect
    .poll(
      async () => {
        scan = (await app.inject({ url: `/api/scans/${id}`, headers })).json();
        return scan!.status;
      },
      { timeout: 40000 },
    )
    .toBe("completed");
  return scan!;
}
it("saves platform/review progress separately, rescans changed pages and verifies real resolutions", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/scans",
    headers,
    payload: {
      url: fixture.url,
      maxPages: 2,
      interactions: false,
      platform: "wordpress",
    },
  });
  expect(response.statusCode).toBe(202);
  const old = await wait(response.json().id);
  const issue = old.issues.find(
    (i) =>
      i.checkId === "metadata.control-name" &&
      i.occurrenceList?.some((o) => o.element?.locator === "#bad-nav"),
  )!;
  expect(issue).toBeTruthy();
  expect(issue.grouping?.shared).toBe(true);
  const original = JSON.stringify(old.issues);
  const progress = await app.inject({
    method: "PATCH",
    url: `/api/scans/${old.id}/workspace`,
    headers,
    payload: {
      platform: "framer",
      guidedIssueId: issue.id,
      guidedStep: 4,
      reviews: {
        [issue.id]: {
          status: "fix-attempted",
          reason: "Added a meaningful description",
          updatedAt: new Date().toISOString(),
        },
      },
    },
  });
  expect(progress.statusCode).toBe(200);
  expect(progress.json().platform).toBe("framer");
  expect(progress.json().reviews[issue.id].status).toBe("fix-attempted");
  expect(
    (await app.inject({ url: `/api/scans/${old.id}`, headers })).json().issues,
  ).toEqual(JSON.parse(original));
  const stepOnly = await app.inject({
    method: "PATCH",
    url: `/api/scans/${old.id}/workspace`,
    headers,
    payload: { guidedStep: 3 },
  });
  expect(stepOnly.json().platform).toBe("framer");
  expect(stepOnly.json().reviews[issue.id].status).toBe("fix-attempted");
  const platformOnly = await app.inject({
    method: "PATCH",
    url: `/api/scans/${old.id}/workspace`,
    headers,
    payload: { platform: "framer" },
  });
  expect(platformOnly.json().guidedStep).toBe(3);
  await app.inject({
    method: "PATCH",
    url: `/api/scans/${old.id}/workspace`,
    headers,
    payload: { guidedStep: 4 },
  });
  const store = new Storage(root);
  expect((await store.workspace(old)).guidedStep).toBe(4);
  const denied = await app.inject({
    method: "PATCH",
    url: `/api/scans/${old.id}/workspace`,
    headers,
    payload: {
      reviews: {
        [issue.id]: { status: "dismissed", reason: "", updatedAt: "now" },
      },
    },
  });
  expect(denied.statusCode).toBe(400);
  fixture.state.fixed = true;
  const created = await app.inject({
    method: "POST",
    url: "/api/scans",
    headers,
    payload: {
      ...old.settings,
      url: fixture.url,
      previousScanId: old.id,
      platform: "framer",
    },
  });
  expect(created.statusCode).toBe(202);
  const current = await wait(created.json().id);
  const comparison = await app.inject({
    url: `/api/scans/${current.id}/compare?previous=${old.id}`,
    headers,
  });
  expect(comparison.statusCode).toBe(200);
  const item = comparison
    .json()
    .items.find(
      (item: { previousIssueId: string }) => item.previousIssueId === issue.id,
    );
  expect(item.status, item.reason).toBe("resolved");
  const json = await app.inject({
    url: `/api/scans/${old.id}/export?format=json`,
    headers,
  });
  expect(json.json().workspace.reviews[issue.id].status).toBe("fix-attempted");
  const html = await app.inject({
    url: `/api/scans/${old.id}/export?format=html&mode=simple`,
    headers,
  });
  expect(html.body).toContain("Problems found");
  expect(html.body).toContain("Checks not performed");
  expect(html.body).toContain('class="highlight"');
  expect(
    (html.body.match(/data:image\/png;base64,/g) || []).length,
  ).toBeLessThanOrEqual(10);
  expect(html.body).toContain("Framer");
  expect(html.body).not.toContain("<script>");
  const pdf = await app.inject({
    url: `/api/scans/${old.id}/export?format=pdf&mode=simple`,
    headers,
  });
  expect(pdf.statusCode, pdf.body.slice(0, 200)).toBe(200);
  expect(pdf.rawPayload.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.rawPayload.length).toBeGreaterThan(10000);
  const exportDirectory = join(root, "exports");
  await mkdir(exportDirectory, { recursive: true });
  await writeFile(join(exportDirectory, "website-report.pdf"), pdf.rawPayload);
  await writeFile(join(exportDirectory, "website-report.html"), html.body);
  await writeFile(join(exportDirectory, "website-report.json"), json.body);
  expect(json.json().issues.map((i: { id: string }) => i.id)).toEqual(
    old.issues.map((i) => i.id),
  );
  const malicious = structuredClone(old);
  malicious.issues[0].evidence =
    "password=gate-secret Bearer gate-token /Users/private/customer.txt <script>window.pwned=true</script>";
  const safe = await htmlReport(malicious, store, { mode: "technical" });
  expect(safe).not.toContain("gate-secret");
  expect(safe).not.toContain("gate-token");
  expect(safe).not.toContain("/Users/private");
  expect(safe).not.toContain("<script>");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      offline: true,
      javaScriptEnabled: false,
    });
    await context.route("**/*", (r) => r.abort());
    const page = await context.newPage();
    await page.setContent(safe);
    expect(await page.title()).toBe("Buggd Website Report");
    expect(await page.locator("rect.highlight").count()).toBeGreaterThan(0);
    expect(await page.locator("image").count()).toBeGreaterThan(0);
    expect(await page.locator("body").innerText()).toContain(
      "Technical appendix",
    );
  } finally {
    await browser.close();
  }

  const reloaded = new ScanManager(store, () => []);
  await reloaded.init();
  expect(reloaded.scans.get(old.id)?.issues).toEqual(JSON.parse(original));
  await reloaded.close();
});
