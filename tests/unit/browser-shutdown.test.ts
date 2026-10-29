import { expect, it, vi } from "vitest";
import { chromium } from "playwright";
import type { Browser } from "playwright";
import * as network from "../../src/scanner/network.js";
import { launchBrowser } from "../../src/scanner/browser.js";

it("closes the proxy while Chromium shutdown waits and shares repeated cleanup", async () => {
  let disconnect!: () => void;
  const disconnected = new Promise<void>((resolve) => {
    disconnect = resolve;
  });
  const closeBrowser = vi.fn(() => disconnected);
  const closeProxy = vi.fn(async () => {
    disconnect();
  });
  const proxy = vi.spyOn(network, "createGuardedProxy").mockResolvedValue({
    server: "http://127.0.0.1:12345",
    username: "fixture",
    password: "fixture",
    limited: () => false,
    close: closeProxy,
  });
  const browser = vi
    .spyOn(chromium, "launch")
    .mockResolvedValue({ close: closeBrowser } as unknown as Browser);
  try {
    const runtime = await launchBrowser(
      new network.NetworkPolicy(new URL("http://localhost:12345"), []),
    );
    await Promise.all([runtime.close(), runtime.close()]);
    expect(closeProxy).toHaveBeenCalledTimes(1);
    expect(closeBrowser).toHaveBeenCalledTimes(1);
  } finally {
    proxy.mockRestore();
    browser.mockRestore();
  }
});
