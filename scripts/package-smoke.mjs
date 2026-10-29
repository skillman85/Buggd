import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:http";

const package_ = JSON.parse(
  await (
    await import("node:fs/promises")
  ).readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const tarball = resolve(process.argv[2] || `buggd-${package_.version}.tgz`);
const directory = await mkdtemp(join(tmpdir(), "buggd-package-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();
const fixture = createServer((_req, res) =>
  res
    .writeHead(200, { "Content-Type": "text/html" })
    .end(
      "<!doctype html><title>Packaged fixture</title><h1>A clean local page</h1>",
    ),
);
await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
const fixtureUrl = `http://127.0.0.1:${fixture.address().port}/`;
async function launch(extraEnv = {}) {
  let output = "";
  const executable =
    process.platform === "win32"
      ? process.execPath
      : join(directory, "node_modules/.bin/buggd");
  const arguments_ =
    process.platform === "win32"
      ? [join(directory, "node_modules/buggd/lib/cli/index.js"), "--no-open"]
      : ["--no-open"];
  const child = spawn(executable, arguments_, {
    cwd: directory,
    env: {
      ...process.env,
      BUGGD_DATA_DIR: join(directory, `data-${children.size}`),
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  let address;
  for (let i = 0; i < 100; i++) {
    address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (address) break;
    if (child.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(address, `Packaged CLI did not start: ${output}`);
  const response = await fetch(`${address}/api/session`);
  const session = await response.json();
  const headers = {
    cookie: response.headers.get("set-cookie").split(";")[0],
    "x-buggd-token": session.token,
  };
  const api = async (path, options = {}) => {
    const response = await fetch(`${address}/api${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    assert(response.ok, `${response.status}: ${await response.clone().text()}`);
    return response.json();
  };
  return { child, address, api, headers, output: () => output };
}
async function completed(runtime, id) {
  for (let i = 0; i < 200; i++) {
    const scan = await runtime.api(`/scans/${id}`);
    if (["completed", "failed", "cancelled"].includes(scan.status)) return scan;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Packaged scan did not finish.");
}
async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((_, reject) =>
      setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("CLI did not shut down cleanly."));
      }, 8000).unref(),
    ),
  ]);
}
try {
  await writeFile(
    join(directory, "package.json"),
    '{"name":"buggd-clean-install","version":"1.0.0","private":true}',
  );
  execFileSync(
    process.env.npm_execpath ? process.execPath : npm,
    [
      ...(process.env.npm_execpath ? [process.env.npm_execpath] : []),
      "install",
      tarball,
      "--omit=dev",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: directory, stdio: "pipe", timeout: 120000 },
  );
  await access(
    join(
      directory,
      "node_modules/.bin",
      process.platform === "win32" ? "buggd.cmd" : "buggd",
    ),
  );
  const runtime = await launch();
  const home = await fetch(runtime.address);
  assert(home.ok);
  assert((await home.text()).includes("/assets/"));
  const created = await runtime.api("/scans", {
    method: "POST",
    body: JSON.stringify({ url: fixtureUrl, maxPages: 1 }),
  });
  const scan = await completed(runtime, created.id);
  assert.equal(scan.status, "completed", scan.error);
  assert.equal(scan.pages.length, 1);
  assert.equal(scan.issues.length, 0);
  assert.equal(scan.pages[0].screenshots.length, 3);
  const exported = await runtime.api(`/scans/${created.id}/export`);
  assert.equal(exported.id, created.id);
  const workspace = await runtime.api(`/scans/${scan.id}/workspace`, {
    method: "PATCH",
    body: JSON.stringify({ platform: "framer", guidedStep: 3 }),
  });
  assert.equal(workspace.platform, "framer");
  const stepOnly = await runtime.api(`/scans/${scan.id}/workspace`, {
    method: "PATCH",
    body: JSON.stringify({ guidedStep: 4 }),
  });
  assert.equal(stepOnly.platform, "framer");
  const pdf = await fetch(
    `${runtime.address}/api/scans/${scan.id}/export?format=pdf`,
    { headers: runtime.headers },
  );
  assert(pdf.ok);
  assert.equal(
    Buffer.from(await pdf.arrayBuffer())
      .subarray(0, 5)
      .toString(),
    "%PDF-",
  );
  const rescan = await runtime.api("/scans", {
    method: "POST",
    body: JSON.stringify({
      ...scan.settings,
      url: fixtureUrl,
      previousScanId: scan.id,
    }),
  });
  assert.equal((await completed(runtime, rescan.id)).status, "completed");
  assert.deepEqual(
    (await runtime.api(`/scans/${rescan.id}/compare?previous=${scan.id}`))
      .items,
    [],
  );
  const install = execFileSync(
    process.execPath,
    [
      join(directory, "node_modules/buggd/lib/cli/index.js"),
      "--install-browser",
    ],
    { cwd: directory, env: process.env, timeout: 120000, encoding: "utf8" },
  );
  assert(install.includes("Playwright Chromium"));
  await stop(runtime.child);
  const missing = join(directory, "missing-browsers");
  await mkdir(missing);
  const fallback = await launch({ PLAYWRIGHT_BROWSERS_PATH: missing });
  assert.equal((await fallback.api("/capabilities")).browserAvailable, false);
  assert(fallback.output().includes("--install-browser"));
  const unavailable = await fallback.api("/scans", {
    method: "POST",
    body: JSON.stringify({ url: fixtureUrl, maxPages: 1 }),
  });
  const failed = await completed(fallback, unavailable.id);
  assert.equal(failed.status, "failed");
  assert(failed.error.includes("--install-browser"));
  const unavailablePdf = await fetch(
    `${fallback.address}/api/scans/${failed.id}/export?format=pdf`,
    { headers: fallback.headers },
  );
  assert.equal(unavailablePdf.status, 503);
  assert((await unavailablePdf.json()).error.includes("Chromium"));
  await stop(fallback.child);
  console.log(
    "Clean package install passed: executable, production UI, real scan, evidence, JSON/PDF exports, platform/progress persistence, linked comparison, browser bootstrap, missing-browser guidance and clean shutdown.",
  );
} finally {
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  fixture.closeAllConnections();
  await new Promise((resolve) => fixture.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
