import { afterEach, expect, it } from "vitest";
import {
  createServer,
  type IncomingMessage,
  type RequestListener,
} from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { report } from "../helpers.js";
import { scanInputSchema, type PageReport } from "../../src/shared/schemas.js";
import { NetworkPolicy } from "../../src/scanner/network.js";
import {
  readPublicAsset,
  closePublicAssets,
} from "../../src/scanner/public-assets.js";
import { launchBrowser, guardedContext } from "../../src/scanner/browser.js";
import { observePage } from "../../src/scanner/checks/observers.js";
import { inspectAccessibleNames } from "../../src/scanner/checks/names.js";
import { captureScene } from "../../src/scanner/evidence/capture.js";
import { Storage } from "../../src/reports/storage.js";
const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});
async function serve(handler: RequestListener) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanup.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    port: (server.address() as AddressInfo).port,
  };
}
function pageReport(url: string): PageReport {
  return {
    id: "p",
    url,
    title: "",
    status: "scanning",
    duration: 0,
    links: [],
    externalLinks: [],
    screenshots: [],
    consoleErrors: [],
    failedResources: [],
    interactions: [],
    forms: [],
    responsive: [],
  };
}
it("discloses blocked external image/font/script separately from a genuine target 404 and lowers name certainty", async () => {
  let hits = 0;
  const trap = await serve((_req, res) => {
    hits++;
    res.end("not contacted");
  });
  const external = `http://assets.invalid:${trap.port}`;
  const target = await serve((req, res) => {
    if (req.url === "/missing.png") {
      res.writeHead(404).end();
      return;
    }
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        `<title>Resources</title><style>@font-face{font-family:remote;src:url('${external}/font.woff2')}body{font-family:remote,serif}</style><p>Font loading</p><script src="${external}/app.js"></script><img alt="External" src="${external}/photo.png"><img alt="Target" src="/missing.png"><button><svg aria-hidden="true" width="18" height="18"></svg></button>`,
      );
  });
  const scan = report();
  scan.url = target.url;
  scan.settings = scanInputSchema.parse({
    url: target.url,
    interactions: false,
  });
  const p = pageReport(target.url);
  scan.pages = [p];
  const policy = new NetworkPolicy(new URL(target.url), []);
  const runtime = await launchBrowser(policy);
  cleanup.push(runtime.close);
  const { context, guard } = await guardedContext(
    runtime.browser,
    scan,
    policy,
    p,
  );
  const page = await context.newPage();
  observePage(page, scan, p, guard);
  await page.goto(target.url);
  await page.evaluate(() => document.fonts.ready);
  await inspectAccessibleNames(page, scan, p, true);
  const dir = await mkdtemp(join(tmpdir(), "buggd-resources-"));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  await captureScene(page, scan, p, new Storage(dir));
  expect(hits).toBe(0);
  for (const type of ["image", "font", "script"])
    expect(
      p.resources?.some(
        (r) =>
          r.type === type && r.provenance === "buggd" && r.status === "blocked",
      ),
      type,
    ).toBe(true);
  expect(
    scan.issues.some(
      (i) =>
        i.checkId === "network.http" &&
        i.resource?.endsWith("/missing.png") &&
        i.confidence === "confirmed",
    ),
  ).toBe(true);
  expect(
    scan.issues.some(
      (i) => i.resource?.startsWith(external) && i.confidence === "confirmed",
    ),
  ).toBe(false);
  expect(
    scan.issues.find((i) => i.checkId === "metadata.control-name")?.confidence,
  ).toBe("potential");
  expect(p.screenshots[0].completeness).toBe("limited");
  expect(p.screenshots[0].note).toContain("blocked");
});
it("opt-in public assets are anonymous GETs with real response headers, while fetches and external navigation remain blocked", async () => {
  const requests: IncomingMessage[] = [];
  const asset = await serve((req, res) => {
    requests.push(req);
    if (req.url === "/script.js") {
      res
        .writeHead(200, {
          "Content-Type": "application/javascript",
          "Set-Cookie": "private=should-not-be-set",
        })
        .end("window.assetLoaded=true");
      return;
    }
    res.writeHead(404).end();
  });
  const external = `http://assets.invalid:${asset.port}`;
  const target = await serve((_req, res) =>
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        `<title>Opt in</title><script src="${external}/script.js"></script><script>fetch('${external}/data').catch(()=>{});fetch('${external}/write',{method:'POST'}).catch(()=>{})</script>`,
      ),
  );
  const scan = report();
  scan.url = target.url;
  scan.settings = scanInputSchema.parse({
    url: target.url,
    resourcePolicy: "public-assets",
  });
  const policy = new NetworkPolicy(new URL(target.url), []);
  const original = policy.resolve.bind(policy);
  policy.resolve = async (url, purpose) =>
    url.hostname === "assets.invalid" && purpose === "asset"
      ? { address: "127.0.0.1", family: 4 }
      : original(url, purpose);
  // Only this test resolver maps a fictitious public host to a controlled fixture.
  const runtime = await launchBrowser(policy);
  cleanup.push(runtime.close);
  const { context, guard } = await guardedContext(
    runtime.browser,
    scan,
    policy,
  );
  const page = await context.newPage();
  await page.goto(target.url);
  expect(await page.evaluate(() => Reflect.get(window, "assetLoaded"))).toBe(
    true,
  );
  expect(requests).toHaveLength(1);
  expect(requests[0].method).toBe("GET");
  expect(requests[0].headers.cookie).toBeUndefined();
  expect(requests[0].headers.authorization).toBeUndefined();
  expect(await context.cookies(external)).toEqual([]);
  expect(
    guard.resources.some(
      (r) => r.url.endsWith("/data") && r.status === "blocked",
    ),
  ).toBe(true);
  expect(
    guard.resources.some(
      (r) => r.url.endsWith("/write") && r.status === "blocked",
    ),
  ).toBe(true);
  await page.goto(external).catch(() => {});
  expect(requests).toHaveLength(1);
});
it("public asset redirects revalidate every destination and refuse private addresses even for localhost scans", async () => {
  const asset = await serve((_req, res) =>
    res.writeHead(302, { location: "http://127.0.0.1/private" }).end(),
  );
  const url = `http://assets.invalid:${asset.port}/redirect`;
  const policy = new NetworkPolicy(new URL("http://127.0.0.1/"), []);
  const original = policy.resolve.bind(policy);
  const resolved: string[] = [];
  policy.resolve = async (destination, purpose) => {
    resolved.push(destination.href);
    return destination.hostname === "assets.invalid"
      ? { address: "127.0.0.1", family: 4 }
      : original(destination, purpose);
  };
  await expect(readPublicAsset(url, policy)).rejects.toThrow(/Private/);
  expect(resolved).toHaveLength(2);
  await expect(
    readPublicAsset(
      "http://127.0.0.1/",
      new NetworkPolicy(new URL("http://127.0.0.1/"), []),
    ),
  ).rejects.toThrow(/Private/);
});
it("enforces asset byte and concurrency budgets and closes outstanding requests", async () => {
  const asset = await serve((req, res) => {
    if (req.url === "/large") {
      res.end(Buffer.alloc(4 * 1024 * 1024 + 1));
      return;
    }
    res.writeHead(200);
    res.flushHeaders();
  });
  const policy = new NetworkPolicy(new URL("https://example.com"), []);
  policy.resolve = async () => ({ address: "127.0.0.1", family: 4 });
  const url = `http://assets.invalid:${asset.port}`;
  await expect(readPublicAsset(`${url}/large`, policy)).rejects.toThrow(
    /budget/,
  );
  const pending = Array.from({ length: 8 }, () =>
    readPublicAsset(`${url}/hold`, policy).catch((e) => (e as Error).message),
  );
  await expect(readPublicAsset(`${url}/hold`, policy)).rejects.toThrow(
    /concurrency/,
  );
  closePublicAssets(policy);
  await expect(Promise.all(pending)).resolves.toHaveLength(8);
});
