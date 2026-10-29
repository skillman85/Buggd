import { expect, it } from "vitest";
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  NetworkPolicy,
  createGuardedProxy,
} from "../../src/scanner/network.js";
import { crawl } from "../../src/scanner/crawler.js";
import { Storage } from "../../src/reports/storage.js";
import { scanInputSchema } from "../../src/shared/schemas.js";
import type { Scan } from "../../src/shared/schemas.js";

it("blocks cross-port loopback subresources and redirects in a real browser", async () => {
  let trapHits = 0;
  const trap = createServer((_req, res) => {
    trapHits++;
    res.end("private data");
  });
  await new Promise<void>((resolve) => trap.listen(0, "127.0.0.1", resolve));
  const trapUrl = `http://127.0.0.1:${(trap.address() as AddressInfo).port}`;
  const target = createServer((req, res) => {
    if (req.url === "/redirect") {
      res.writeHead(302, { location: trapUrl }).end();
      return;
    }
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        `<title>Guard fixture</title><h1>Target</h1><img alt="Private resource" src="${trapUrl}/image"><a href="/redirect">Redirect</a><script>fetch('${trapUrl}/secret').catch(()=>{})</script>`,
      );
  });
  await new Promise<void>((resolve) => target.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(target.address() as AddressInfo).port}/`;
  const directory = await mkdtemp(join(tmpdir(), "buggd-network-"));
  const scan: Scan = {
    id: randomUUID(),
    url,
    settings: scanInputSchema.parse({ url, maxPages: 2, interactions: false }),
    status: "starting",
    createdAt: new Date().toISOString(),
    activity: "",
    checksExecuted: 0,
    pages: [],
    issues: [],
    limitations: [],
    evidenceBytes: 0,
  };
  try {
    await crawl(
      scan,
      new Storage(directory),
      new AbortController().signal,
      [],
      () => {},
    );
    expect(trapHits).toBe(0);
    expect(
      scan.issues.some(
        (issue) =>
          issue.title === "Page inspection blocked by safety limits" &&
          issue.confidence === "not-tested",
      ),
    ).toBe(true);
    expect(
      scan.issues.some(
        (issue) =>
          issue.category === "images" && issue.confidence === "confirmed",
      ),
    ).toBe(false);
  } finally {
    trap.closeAllConnections();
    target.closeAllConnections();
    await Promise.all([
      new Promise<void>((resolve) => trap.close(() => resolve())),
      new Promise<void>((resolve) => target.close(() => resolve())),
    ]);
    await rm(directory, { recursive: true, force: true });
  }
});

it("the authenticated proxy connects to the validated IP and refuses writes", async () => {
  let writes = 0;
  const target = createServer((req, res) => {
    if (req.method !== "GET") writes++;
    res.end(req.headers.host);
  });
  await new Promise<void>((resolve) => target.listen(0, "127.0.0.1", resolve));
  const port = (target.address() as AddressInfo).port;
  const policy = new NetworkPolicy(
    new URL(`http://public.invalid:${port}`),
    [],
  );
  // Resolve the fictitious hostname to the controlled test server; no real DNS query.
  policy.resolve = async () => ({ address: "127.0.0.1", family: 4 });
  const proxy = await createGuardedProxy(policy);
  const call = (method: string, auth: boolean) =>
    new Promise<{ status: number; text: string }>((resolve, reject) => {
      const destination = new URL(proxy.server);
      const req = request(
        {
          hostname: destination.hostname,
          port: destination.port,
          path: `http://public.invalid:${port}/`,
          method,
          headers: auth
            ? {
                "proxy-authorization": `Basic ${Buffer.from(`buggd:${proxy.password}`).toString("base64")}`,
              }
            : {},
        },
        (res) => {
          let text = "";
          res.on("data", (chunk) => {
            text += chunk;
          });
          res.on("end", () => resolve({ status: res.statusCode!, text }));
        },
      );
      req.on("error", reject);
      req.end();
    });
  try {
    expect((await call("GET", false)).status).toBe(407);
    expect(await call("GET", true)).toEqual({
      status: 200,
      text: `public.invalid:${port}`,
    });
    expect((await call("POST", true)).status).toBe(403);
    expect(writes).toBe(0);
  } finally {
    await proxy.close();
    target.closeAllConnections();
    await new Promise<void>((resolve) => target.close(() => resolve()));
  }
});
