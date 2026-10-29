import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { Scan, ScanInput } from "../shared/schemas.js";
import { terminal } from "../shared/schemas.js";
import { Storage } from "../reports/storage.js";
import { crawl, scanLimitations } from "./crawler.js";
import { displayError, normalizeUrl } from "./url.js";
import { NetworkPolicy } from "./network.js";

export class ScanManager extends EventEmitter {
  readonly scans = new Map<string, Scan>();
  private queue: string[] = [];
  private active?: {
    id: string;
    controller: AbortController;
    promise: Promise<void>;
    cancelled: boolean;
  };
  private closing = false;
  private admissions = 0;
  private lastSave = new Map<string, number>();
  constructor(
    readonly storage: Storage,
    readonly forbiddenPorts: () => number[],
  ) {
    super();
    this.setMaxListeners(30);
  }
  async init() {
    for (const scan of await this.storage.list()) this.scans.set(scan.id, scan);
    await this.prune();
  }
  list() {
    return [...this.scans.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  async create(settings: ScanInput) {
    if (this.closing)
      throw Object.assign(new Error("Buggd is shutting down."), {
        statusCode: 503,
      });
    if (this.queue.length + this.admissions + (this.active ? 1 : 0) >= 4)
      throw Object.assign(
        new Error("The scan queue is full. Wait for a scan to finish."),
        { statusCode: 429 },
      );
    // Reserve synchronously before URL/DNS/storage awaits to bound simultaneous POSTs.
    this.admissions++;
    try {
      return await this.createAdmitted(settings);
    } finally {
      this.admissions--;
    }
  }
  private async createAdmitted(settings: ScanInput) {
    const url = normalizeUrl(settings.url);
    await new NetworkPolicy(new URL(url), this.forbiddenPorts()).resolve(
      new URL(url),
    );
    if (this.closing)
      throw Object.assign(new Error("Buggd is shutting down."), {
        statusCode: 503,
      });
    const scan: Scan = {
      id: randomUUID(),
      url,
      settings: { ...settings, url },
      status: "queued",
      createdAt: new Date().toISOString(),
      activity: "Waiting for a scan slot",
      checksExecuted: 0,
      pages: [],
      issues: [],
      limitations: [...scanLimitations],
      evidenceBytes: 0,
      schemaVersion: 2,
    };
    await this.storage.save(scan);
    this.scans.set(scan.id, scan);
    if (this.closing) {
      scan.status = "cancelled";
      scan.activity = "Buggd shut down before this scan started.";
      scan.finishedAt = new Date().toISOString();
      await this.storage.save(scan);
      return scan;
    }
    this.queue.push(scan.id);
    this.emit("update", scan);
    this.drain();
    return scan;
  }
  private drain() {
    if (this.active || this.closing) return;
    const id = this.queue.shift();
    if (!id) return;
    const controller = new AbortController();
    const active = {
      id,
      controller,
      cancelled: false,
      promise: Promise.resolve(),
    };
    this.active = active;
    active.promise = this.run(this.scans.get(id)!, controller).finally(() => {
      this.active = undefined;
      this.drain();
    });
  }
  private update(scan: Scan) {
    this.emit("update", scan);
    if (Date.now() - (this.lastSave.get(scan.id) || 0) > 1000) {
      this.lastSave.set(scan.id, Date.now());
      void this.storage.save(scan).catch(() => {
        this.active?.controller.abort(
          new Error(
            "Could not persist scan results. Check available disk space.",
          ),
        );
      });
    }
  }
  private async run(scan: Scan, controller: AbortController) {
    scan.status = "starting";
    scan.startedAt = new Date().toISOString();
    scan.activity = "Starting isolated Chromium";
    this.update(scan);
    const timer = setTimeout(
      () => controller.abort(new Error("The scan duration limit was reached.")),
      scan.settings.maxDuration,
    );
    try {
      await crawl(
        scan,
        this.storage,
        controller.signal,
        this.forbiddenPorts(),
        () => this.update(scan),
      );
      controller.signal.throwIfAborted();
      scan.status = "completed";
      scan.activity = "Scan completed";
    } catch (error) {
      const cancelled = this.active?.cancelled;
      scan.status = cancelled ? "cancelled" : "failed";
      scan.activity = cancelled ? "Scan cancelled" : "Scan stopped";
      if (!cancelled)
        scan.error = displayError(controller.signal.reason || error);
      for (const page of scan.pages)
        if (page.status === "scanning") page.status = "skipped";
    } finally {
      clearTimeout(timer);
      scan.finishedAt = new Date().toISOString();
      scan.currentPage = undefined;
      try {
        await this.storage.save(scan);
        await this.prune();
      } catch {
        scan.error =
          "Could not persist all scan data. Check available disk space.";
        scan.status = "failed";
      }
      this.emit("update", scan);
      this.lastSave.delete(scan.id);
    }
  }
  async cancel(id: string) {
    const scan = this.scans.get(id);
    if (!scan || terminal(scan.status)) return;
    if (this.active?.id === id) {
      this.active.cancelled = true;
      this.active.controller.abort(new Error("Cancelled by user."));
      await this.active.promise;
    } else {
      this.queue = this.queue.filter((item) => item !== id);
      scan.status = "cancelled";
      scan.activity = "Scan cancelled";
      scan.finishedAt = new Date().toISOString();
      await this.storage.save(scan);
      this.emit("update", scan);
    }
  }
  async remove(id: string) {
    const scan = this.scans.get(id);
    if (scan && !terminal(scan.status))
      throw Object.assign(new Error("Cancel the scan before removing it."), {
        statusCode: 409,
      });
    await this.storage.remove(id);
    this.scans.delete(id);
  }
  private async prune() {
    const scans = this.list();
    let bytes = scans.reduce((sum, scan) => sum + scan.evidenceBytes, 0);
    for (const scan of [...scans].reverse()) {
      if (this.scans.size <= 50 && bytes <= 512 * 1024 * 1024) break;
      if (!terminal(scan.status) || this.active?.id === scan.id) continue;
      await this.storage.remove(scan.id);
      this.scans.delete(scan.id);
      bytes -= scan.evidenceBytes;
    }
  }
  async close() {
    this.closing = true;
    for (const id of [...this.queue]) await this.cancel(id);
    if (this.active) await this.cancel(this.active.id);
  }
}
