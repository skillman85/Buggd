import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../../src/server/index.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("local API foundation", () => {
  const apps: Awaited<ReturnType<typeof createServer>>[] = [];
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });
  it("requires a local session and refuses hostile origins and hosts", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "buggd-server-"));
    dirs.push(dataDir);
    const app = await createServer({ dataDir });
    apps.push(app);
    expect(
      (
        await app.inject({
          url: "/api/health",
          headers: { host: "127.0.0.1:8787" },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          url: "/api/session",
          headers: { host: "evil.example:8787" },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          url: "/api/session",
          headers: { host: "127.0.0.1:8787", origin: "https://evil.example" },
        })
      ).statusCode,
    ).toBe(403);
    const session = await app.inject({
      url: "/api/session",
      headers: { host: "127.0.0.1:8787" },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().token).toHaveLength(64);
    const health = await app.inject({
      url: "/api/health",
      headers: {
        host: "127.0.0.1:8787",
        cookie: session.headers["set-cookie"] as string,
      },
    });
    expect(health.json()).toEqual({ status: "ok" });
    const headers = {
      host: "127.0.0.1:8787",
      cookie: session.headers["set-cookie"] as string,
    };
    const denied = await app.inject({
      method: "POST",
      url: "/api/scans",
      headers,
      payload: { url: "http://127.0.0.1:3000" },
    });
    expect(denied.statusCode).toBe(403);
    const invalid = await app.inject({
      method: "POST",
      url: "/api/scans",
      headers: { ...headers, "x-buggd-token": session.json().token },
      payload: { url: "x", maxPages: 99999 },
    });
    expect(invalid.statusCode).toBe(400);
    const traversal = await app.inject({
      url: "/api/scans/not-an-id/evidence/not-a-file",
      headers,
    });
    expect(traversal.statusCode).toBe(400);
  });
});
