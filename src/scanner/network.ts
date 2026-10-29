import { lookup } from "node:dns/promises";
import { isIP, connect } from "node:net";
import type { Socket } from "node:net";
import { createServer, request as httpRequest } from "node:http";
import type { OutgoingHttpHeaders } from "node:http";
import { randomBytes } from "node:crypto";
import ipaddr from "ipaddr.js";

export function addressRange(address: string): string {
  const parsed = ipaddr.process(address.replace(/^\[|\]$/g, ""));
  return parsed.range();
}
const hostnameOf = (url: URL) =>
  url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
const portOf = (url: URL) =>
  Number(url.port || (url.protocol === "https:" ? 443 : 80));

export class NetworkPolicy {
  assetBytes = 0;
  constructor(
    readonly target: URL,
    readonly forbiddenPorts: number[],
  ) {}
  async resolve(
    url: URL,
    purpose: "target" | "asset" = "target",
  ): Promise<{ address: string; family: number }> {
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error("Unsupported network destination.");
    // Apply scope at the proxy too: browser routing does not re-run on redirects.
    if (purpose === "target" && url.origin !== this.target.origin)
      throw new Error(
        "Cross-origin destinations are outside this scan’s network scope.",
      );
    const hostname = hostnameOf(url);
    const port = portOf(url);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : await Promise.race([
          lookup(hostname, { all: true, verbatim: true }),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error("DNS lookup timed out.")),
              4000,
            );
          }),
        ]).finally(() => clearTimeout(timer));
    if (!addresses.length)
      throw new Error("The destination could not be resolved.");
    const targetHost = hostnameOf(this.target);
    const explicitLocalTarget =
      targetHost === "localhost" ||
      (isIP(targetHost) !== 0 && addressRange(targetHost) === "loopback");
    for (const entry of addresses) {
      const range = addressRange(entry.address);
      if (range === "loopback" && this.forbiddenPorts.includes(port))
        throw new Error("Buggd cannot scan or access its own server.");
      if (
        range === "loopback" &&
        purpose === "target" &&
        explicitLocalTarget &&
        hostname === targetHost &&
        port === portOf(this.target)
      )
        continue;
      if (range !== "unicast")
        throw new Error(
          "Private, loopback and reserved network destinations are blocked. Local development requires an explicit localhost target.",
        );
    }
    // Many local dev servers bind IPv4 only even when localhost resolves ::1 first.
    return explicitLocalTarget
      ? addresses.find((entry) => entry.family === 4) || addresses[0]
      : addresses[0];
  }
}

/** HTTP proxy pins each TCP connection to a validated IP, avoiding DNS re-resolution
 * between policy checks and connection. HTTPS keeps end-to-end TLS via CONNECT.
 */
export async function createGuardedProxy(policy: NetworkPolicy) {
  const sockets = new Set<Socket>();
  let transferred = 0;
  let resourceLimited = false;
  const password = randomBytes(24).toString("hex");
  const authorization = `Basic ${Buffer.from(`buggd:${password}`).toString("base64")}`;
  const track = (socket: Socket) => {
    if (sockets.has(socket)) return;
    sockets.add(socket);
    socket.on("data", (chunk: Buffer) => {
      transferred += chunk.length;
      if (transferred > 96 * 1024 * 1024) {
        resourceLimited = true;
        for (const connection of sockets) connection.destroy();
      }
    });
    socket.on("close", () => sockets.delete(socket));
    socket.setTimeout(20000, () => socket.destroy());
  };
  const server = createServer(async (req, res) => {
    if (req.headers["proxy-authorization"] !== authorization) {
      res.writeHead(407, { "Proxy-Authenticate": 'Basic realm="Buggd"' }).end();
      return;
    }
    try {
      if (resourceLimited) throw new Error("Scan transfer limit reached.");
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method || ""))
        throw new Error("Writes are blocked.");
      const url = new URL(req.url || "");
      if (url.protocol !== "http:") throw new Error("Invalid proxy protocol.");
      const destination = await policy.resolve(url);
      const headers: OutgoingHttpHeaders = { ...req.headers, host: url.host };
      delete headers["proxy-authorization"];
      delete headers["proxy-connection"];
      delete headers.connection;
      const upstream = httpRequest(
        {
          hostname: destination.address,
          family: destination.family,
          port: portOf(url),
          path: url.pathname + url.search,
          method: req.method,
          headers,
          timeout: 15000,
        },
        (response) => {
          res.writeHead(response.statusCode || 502, response.headers);
          response.pipe(res);
        },
      );
      upstream.on("socket", track);
      upstream.on("timeout", () => upstream.destroy());
      upstream.on("error", () => {
        if (!res.headersSent) res.writeHead(502);
        res.end();
      });
      res.on("close", () => upstream.destroy());
      req.pipe(upstream);
    } catch {
      res
        .writeHead(403, { "X-Buggd-Policy-Blocked": "true" })
        .end("Buggd network policy blocked this request.");
    }
  });
  server.maxConnections = 128;
  server.on("connection", track);
  server.on("connect", async (req, socket, head) => {
    if (req.headers["proxy-authorization"] !== authorization) {
      socket.end(
        'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Buggd"\r\n\r\n',
      );
      return;
    }
    try {
      if (resourceLimited) throw new Error("Scan transfer limit reached.");
      const url = new URL(`https://${req.url}`);
      const destination = await policy.resolve(url);
      if (socket.destroyed) return;
      const upstream = connect({
        host: destination.address,
        family: destination.family,
        port: portOf(url),
      });
      track(upstream);
      upstream.on("connect", () => {
        if (socket.destroyed) return upstream.destroy();
        socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        upstream.pipe(socket);
        socket.pipe(upstream);
      });
      upstream.on("error", () => socket.destroy());
      socket.on("error", () => upstream.destroy());
      socket.on("close", () => upstream.destroy());
    } catch {
      socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Could not start the scan network proxy.");
  return {
    server: `http://127.0.0.1:${address.port}`,
    username: "buggd",
    password,
    limited: () => resourceLimited,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
