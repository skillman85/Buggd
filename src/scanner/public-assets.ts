import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { ClientRequest } from "node:http";
import type { NetworkPolicy } from "./network.js";
const closed = new WeakSet<NetworkPolicy>();
const requests = new WeakMap<NetworkPolicy, Set<ClientRequest>>();
const active = new WeakMap<NetworkPolicy, number>();
export function closePublicAssets(policy: NetworkPolicy) {
  closed.add(policy);
  for (const request of requests.get(policy) || [])
    request.destroy(new Error("Scan closed."));
}
/** Anonymous, bounded GET-only public asset fetch. Browser egress stays same-origin. */
export async function readPublicAsset(
  input: string,
  policy: NetworkPolicy,
): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  if (closed.has(policy)) throw new Error("Scan closed.");
  if ((active.get(policy) || 0) >= 8)
    throw new Error("Public asset concurrency limit reached.");
  active.set(policy, (active.get(policy) || 0) + 1);
  try {
    return await fetchAsset(input, policy, 0);
  } finally {
    active.set(policy, (active.get(policy) || 1) - 1);
  }
}
async function fetchAsset(
  input: string,
  policy: NetworkPolicy,
  redirects: number,
): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  if (redirects > 3) throw new Error("Public asset redirect limit reached.");
  const url = new URL(input);
  const destination = await policy.resolve(url, "asset");
  if (closed.has(policy)) throw new Error("Scan closed.");
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      {
        hostname: destination.address,
        family: destination.family,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        servername: url.hostname,
        method: "GET",
        path: url.pathname + url.search,
        headers: {
          host: url.host,
          "accept-encoding": "identity",
          "user-agent": "Buggd/1.1 public-asset check",
        },
        timeout: 5000,
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          void fetchAsset(
            new URL(response.headers.location, url).href,
            policy,
            redirects + 1,
          ).then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          policy.assetBytes += chunk.length;
          if (bytes > 4 * 1024 * 1024 || policy.assetBytes > 32 * 1024 * 1024) {
            request.destroy(new Error("Public asset size budget exceeded."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const headers: Record<string, string> = {};
          for (const name of [
            "content-type",
            "access-control-allow-origin",
            "cross-origin-resource-policy",
            "content-encoding",
          ]) {
            const value = response.headers[name];
            if (typeof value === "string") headers[name] = value;
          }
          headers["x-buggd-public-asset"] = "true";
          resolve({
            status: response.statusCode || 502,
            headers,
            body: Buffer.concat(chunks),
          });
        });
        response.on("error", reject);
      },
    );
    let tracked = requests.get(policy);
    if (!tracked) {
      tracked = new Set();
      requests.set(policy, tracked);
    }
    tracked.add(request);
    request.once("close", () => tracked.delete(request));
    request.on("timeout", () =>
      request.destroy(new Error("Public asset request timed out.")),
    );
    request.on("error", reject);
    request.end();
  });
}
