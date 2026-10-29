#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { createServer } from "../server/index.js";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    "Buggd — Find what’s broken.\n\nUsage: buggd [--port 0] [--no-open]\n       buggd --install-browser\n\nScans and reports stay on this computer. Test only websites you own or are authorised to test.",
  );
} else if (args.includes("--install-browser")) {
  console.log(
    "Downloading Playwright Chromium. This requires network access and disk space.",
  );
  const require = createRequire(import.meta.url);
  const cli = join(
    dirname(require.resolve("playwright/package.json")),
    "cli.js",
  );
  const child = spawn(process.execPath, [cli, "install", "chromium"], {
    stdio: "inherit",
  });
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} else {
  try {
    const portIndex = args.indexOf("--port");
    const port =
      portIndex >= 0
        ? Number(args[portIndex + 1])
        : Number(process.env.BUGGD_PORT || 0);
    if (!Number.isInteger(port) || port < 0 || port > 65535)
      throw new Error("Port must be an integer from 0 to 65535.");
    const app = await createServer();
    const address = await app.listen({ host: "127.0.0.1", port });
    console.log(
      `\n  Buggd — Find what’s broken.\n  ${address}\n\n  Local reports · No accounts · No telemetry\n  Press Ctrl+C to stop.\n`,
    );
    if (!existsSync(chromium.executablePath()))
      console.log(
        "  Chromium is not installed. Run: buggd --install-browser\n  In this repository: npm run browser:install\n",
      );
    if (!args.includes("--no-open") && !process.env.CI) {
      const command =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "rundll32"
            : "xdg-open";
      const openArgs =
        process.platform === "win32"
          ? ["url.dll,FileProtocolHandler", address]
          : [address];
      const child = spawn(command, openArgs, {
        stdio: "ignore",
        detached: true,
      });
      child.on("error", () =>
        console.log(`  Open ${address} in your browser.`),
      );
      child.unref();
    }
    let stopping = false;
    const stop = async () => {
      if (stopping) return;
      stopping = true;
      await app.close();
    };
    process.on("SIGINT", () => void stop());
    process.on("SIGTERM", () => void stop());
  } catch (error) {
    console.error(
      `Buggd: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
