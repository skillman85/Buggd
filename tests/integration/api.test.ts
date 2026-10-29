import { afterAll, beforeAll, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { createServer } from "../../src/server/index.js";
import { startFixture } from "../../fixtures/server.js";

let app: Awaited<ReturnType<typeof createServer>>;
let fixture: Awaited<ReturnType<typeof startFixture>>;
let root: string;
let headers: Record<string, string>;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "buggd-api-"));
  fixture = await startFixture();
  app = await createServer({ dataDir: root });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const host = `127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const response = await app.inject({ url: "/api/session", headers: { host } });
  headers = {
    host,
    cookie: response.headers["set-cookie"] as string,
    "x-buggd-token": response.json().token,
  };
});
afterAll(async () => {
  await app?.close();
  await fixture?.close();
  await rm(root, { recursive: true, force: true });
});
it("blocks its own server and permits authorised local targets", async () => {
  const self = await app.inject({
    method: "POST",
    url: "/api/scans",
    headers,
    payload: { url: `http://${headers.host}` },
  });
  expect(self.statusCode).toBe(400);
  expect(self.json().error).toContain("own server");
  const created = await app.inject({
    method: "POST",
    url: "/api/scans",
    headers,
    payload: { url: fixture.url + "/clean", maxPages: 1 },
  });
  expect(created.statusCode).toBe(202);
  const id = created.json().id as string;
  await expect
    .poll(
      async () =>
        (await app.inject({ url: `/api/scans/${id}`, headers })).json().status,
      { timeout: 20000 },
    )
    .toBe("completed");
  const result = (
    await app.inject({ url: `/api/scans/${id}`, headers })
  ).json();
  expect(result.issues).toEqual([]);
  expect(
    (await app.inject({ url: `/api/scans/${id}/sitemap`, headers })).json()
      .nodes,
  ).toHaveLength(1);
  const evidence = await app.inject({
    url: `/api/scans/${id}/evidence/${result.pages[0].screenshots[0].id}`,
    headers,
  });
  expect(evidence.statusCode).toBe(200);
  expect(evidence.headers["content-type"]).toBe("image/png");
  const removed = await app.inject({
    method: "DELETE",
    url: `/api/scans/${id}`,
    headers,
  });
  expect(removed.statusCode).toBe(204);
  expect(
    (await app.inject({ url: `/api/scans/${id}`, headers })).statusCode,
  ).toBe(404);
});
it("cancels using an empty-body mutation and rejects unauthorised evidence", async () => {
  const created = await app.inject({
    method: "POST",
    url: "/api/scans",
    headers,
    payload: { url: fixture.url + "/slow" },
  });
  const id = created.json().id as string;
  await new Promise((resolve) => setTimeout(resolve, 200));
  const cancelled = await app.inject({
    method: "POST",
    url: `/api/scans/${id}/cancel`,
    headers,
  });
  expect(cancelled.statusCode).toBe(200);
  expect(cancelled.json().status).toBe("cancelled");
  expect(
    (
      await app.inject({
        url: `/api/scans/${id}/export`,
        headers: { host: headers.host },
      })
    ).statusCode,
  ).toBe(401);
});

it("bounds simultaneous scan submissions before asynchronous validation and storage", async () => {
  const responses = await Promise.all(
    Array.from({ length: 20 }, () =>
      app.inject({
        method: "POST",
        url: "/api/scans",
        headers,
        payload: { url: fixture.url + "/slow" },
      }),
    ),
  );
  const accepted = responses.filter((response) => response.statusCode === 202);
  expect(accepted).toHaveLength(4);
  expect(
    responses.filter((response) => response.statusCode === 429),
  ).toHaveLength(16);
  await Promise.all(
    accepted.map((response) =>
      app.inject({
        method: "POST",
        url: `/api/scans/${response.json().id}/cancel`,
        headers,
      }),
    ),
  );
});
