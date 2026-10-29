import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { stripVTControlCharacters } from "node:util";

export class BrowserInstaller {
  private child?: ChildProcess;
  state: {
    status: "idle" | "running" | "installed" | "failed";
    message: string;
  } = { status: "idle", message: "" };
  available() {
    return existsSync(chromium.executablePath());
  }
  start() {
    if (this.child) return;
    if (this.available()) {
      this.state = { status: "installed", message: "Chromium is installed." };
      return;
    }
    const require = createRequire(import.meta.url);
    const cli = join(
      dirname(require.resolve("playwright/package.json")),
      "cli.js",
    );
    this.state = {
      status: "running",
      message: "Downloading Playwright Chromium. This requires network access.",
    };
    const child = spawn(process.execPath, [cli, "install", "chromium"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.child = child;
    const progress = (data: Buffer) => {
      const text = stripVTControlCharacters(data.toString()).trim();
      if (text) this.state.message = text.slice(-1500);
    };
    child.stdout?.on("data", progress);
    child.stderr?.on("data", progress);
    child.on("error", (error) => {
      this.state = { status: "failed", message: error.message };
      this.child = undefined;
    });
    child.on("exit", (code) => {
      this.state =
        code === 0 && this.available()
          ? { status: "installed", message: "Chromium is ready." }
          : {
              status: "failed",
              message: `${this.state.message}\nRun buggd --install-browser. Linux may also require Playwright system dependencies.`,
            };
      this.child = undefined;
    });
  }
  close() {
    this.child?.kill("SIGTERM");
  }
}
