import { chromium } from "playwright";
import type { Browser, BrowserContext } from "playwright";
import type { Scan } from "../shared/schemas.js";
import { safeUrl } from "./url.js";
import { NetworkPolicy, createGuardedProxy } from "./network.js";
import { readPublicAsset, closePublicAssets } from "./public-assets.js";
import type { PageReport } from "../shared/schemas.js";
import type { ResourceObservation } from "../shared/evidence.js";

export type GuardState = {
  locked: boolean;
  blocked: number;
  blockedUrls: Set<string>;
  requests: number;
  redirectLoop: boolean;
  resources: ResourceObservation[];
};
export async function launchBrowser(policy: NetworkPolicy) {
  const proxy = await createGuardedProxy(policy);
  try {
    const browser = await chromium.launch({
      headless: true,
      proxy: {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password,
      },
      args: [
        "--proxy-bypass-list=<-loopback>",
        "--disable-quic",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
      ],
    });
    let closing: Promise<void> | undefined;
    return {
      browser,
      limited: proxy.limited,
      close: () => {
        closePublicAssets(policy);
        // Break pending proxy connections before waiting for Chromium shutdown.
        // Share cleanup when cancellation and the crawler's finally both close.
        closing ??= Promise.all([
          proxy.close(),
          browser.close().catch(() => {}),
        ]).then(() => {});
        return closing;
      },
    };
  } catch (error) {
    await proxy.close();
    throw new Error(
      `Chromium could not start. Run “buggd --install-browser” (repository: npm run browser:install). On Linux, Playwright system dependencies may also be required. ${error instanceof Error ? error.message.split("\n")[0] : ""}`,
    );
  }
}

export async function guardedContext(
  browser: Browser,
  scan: Scan,
  policy: NetworkPolicy,
  report?: PageReport,
) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    serviceWorkers: "block",
    acceptDownloads: false,
    javaScriptEnabled: true,
  });
  const guard: GuardState = {
    locked: false,
    blocked: 0,
    blockedUrls: new Set(),
    requests: 0,
    redirectLoop: false,
    resources: report ? (report.resources ??= []) : [],
  };
  context.setDefaultTimeout(Math.min(scan.settings.timeout, 5000));
  context.setDefaultNavigationTimeout(scan.settings.timeout);
  context.on("response", (response) => {
    const request = response.request();
    if (
      !request.isNavigationRequest() ||
      response.status() < 300 ||
      response.status() >= 400
    )
      return;
    let redirects = 0;
    for (
      let previous = request.redirectedFrom();
      previous;
      previous = previous.redirectedFrom()
    ) {
      if (previous.url() === request.url()) guard.redirectLoop = true;
      if (guard.redirectLoop || ++redirects >= 8) {
        guard.blocked++;
        guard.blockedUrls.add(safeUrl(request.url()));
        void response
          .frame()
          .page()
          .close()
          .catch(() => {});
        return;
      }
    }
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    let fetchingPublic = false;
    try {
      guard.requests++;
      const url = new URL(request.url());
      if (
        guard.locked ||
        guard.requests > 500 ||
        !["GET", "HEAD", "OPTIONS"].includes(request.method())
      )
        throw new Error("Request excluded by safety limits.");
      if (
        request.isNavigationRequest() &&
        url.origin !== new URL(scan.url).origin
      )
        throw new Error("Cross-origin navigation excluded.");
      if (url.origin !== new URL(scan.url).origin) {
        if (
          scan.settings.resourcePolicy !== "public-assets" ||
          !["image", "font", "stylesheet", "script"].includes(
            request.resourceType(),
          )
        )
          throw new Error(
            "External resource excluded by the selected scan policy.",
          );
        fetchingPublic = true;
        const response = await readPublicAsset(url.href, policy);
        await route.fulfill(response);
        return;
      }
      let redirects = 0;
      for (
        let previous = request.redirectedFrom();
        previous;
        previous = previous.redirectedFrom()
      ) {
        if (previous.url() === request.url()) {
          guard.redirectLoop = true;
          throw new Error("Redirect loop detected.");
        }
        if (++redirects > 8) throw new Error("Redirect limit exceeded.");
      }
      await policy.resolve(url);
      await route.continue();
    } catch (error) {
      const detail = (
        error instanceof Error ? error.message : "Excluded by scanner policy."
      ).slice(0, 400);
      const status: ResourceObservation["status"] = fetchingPublic
        ? /timed out|timeout/i.test(detail)
          ? "timeout"
          : /limit|budget/i.test(detail)
            ? "unsupported"
            : /private|reserved|outside|credentials|unsupported network|own server/i.test(
                  detail,
                )
              ? "blocked"
              : "failed"
        : "blocked";
      guard.blocked++;
      guard.blockedUrls.add(safeUrl(request.url()));
      if (guard.resources.length < 250)
        guard.resources.push({
          url: safeUrl(request.url()),
          type: request.resourceType(),
          status,
          provenance:
            status === "failed" || status === "timeout"
              ? "third-party"
              : "buggd",
          detail,
        });
      await route.abort("blockedbyclient").catch(() => {});
    }
  });
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  await context.addInitScript(() => {
    document.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
    HTMLFormElement.prototype.submit = function () {
      /* All form submissions are intentionally suppressed. */
    };
    HTMLFormElement.prototype.requestSubmit = function () {
      this.reportValidity();
    };
    window.open = () => null;
  });
  context.on("page", (page) => {
    page.on("dialog", (dialog) => void dialog.dismiss().catch(() => {}));
    page.on("download", (download) => void download.cancel().catch(() => {}));
  });
  return { context, guard };
}

export async function closeContext(context: BrowserContext) {
  await context.close().catch(() => {});
}
