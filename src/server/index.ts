import Fastify from "fastify";
import cookie from "@fastify/cookie";
import staticFiles from "@fastify/static";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { Storage } from "../reports/storage.js";
import { ScanManager } from "../scanner/manager.js";
import { registerRoutes } from "./routes.js";

export async function createServer(
  options: { dataDir?: string; forbiddenPorts?: number[] } = {},
) {
  const app = Fastify({
    logger: false,
    bodyLimit: 8192,
    requestTimeout: 30000,
    connectionTimeout: 30000,
  });
  await app.register(cookie);
  const session = randomBytes(32).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  app.addHook("onRequest", async (request, reply) => {
    const host = request.headers.host ?? "";
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host))
      return reply.code(403).send({ error: "Use the local Buggd address." });
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Frame-Options", "DENY");
    reply.header(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'${process.env.NODE_ENV === "development" ? " ws://127.0.0.1:5173" : ""}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
    );
    if (!request.url.startsWith("/api/")) return;
    reply.header("Cache-Control", "no-store");
    const origin = request.headers.origin;
    if (
      (origin && origin !== `http://${host}`) ||
      request.headers["sec-fetch-site"] === "cross-site"
    )
      return reply
        .code(403)
        .send({ error: "Cross-origin API requests are blocked." });
    if (request.url === "/api/session" && request.method === "GET") return;
    if (request.cookies.buggd_session !== session)
      return reply.code(401).send({
        error: "Open Buggd in your browser to start a local session.",
      });
    if (
      !["GET", "HEAD"].includes(request.method) &&
      request.headers["x-buggd-token"] !== csrf
    )
      return reply
        .code(403)
        .send({ error: "Invalid local request token. Reload Buggd." });
  });
  app.get("/api/session", async (_request, reply) => {
    reply.setCookie("buggd_session", session, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
    });
    return { token: csrf };
  });
  app.get("/api/health", async () => ({ status: "ok" }));
  const manager = new ScanManager(new Storage(options.dataDir), () => {
    const address = app.server.address();
    return [
      ...(options.forbiddenPorts || []),
      ...(process.env.NODE_ENV === "development" ? [5173] : []),
      ...(address && typeof address !== "string" ? [address.port] : []),
    ];
  });
  await manager.init();
  registerRoutes(app, manager);
  const webRoot = fileURLToPath(new URL("../../dist/", import.meta.url));
  if (existsSync(webRoot)) {
    await app.register(staticFiles, {
      root: webRoot,
      index: "index.html",
      maxAge: 0,
    });
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith("/api/")
        ? reply.code(404).send({ error: "API endpoint not found." })
        : reply.type("text/html").sendFile("index.html"),
    );
  }
  app.setErrorHandler((error, _request, reply) => {
    const details = error as { statusCode?: number; message?: string };
    const status =
      typeof details.statusCode === "number" ? details.statusCode : 500;
    reply.code(status).send({
      error:
        status >= 500
          ? "Buggd could not complete this request."
          : details.message,
    });
  });
  return app;
}
