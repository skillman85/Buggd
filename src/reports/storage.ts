import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { idSchema, scanSchema } from "../shared/schemas.js";
import type { Scan } from "../shared/schemas.js";
import { workspaceSchema } from "../shared/evidence.js";
import type { Workspace } from "../shared/evidence.js";

export class Storage {
  private writes = new Map<string, Promise<void>>();
  constructor(
    readonly root = process.env.BUGGD_DATA_DIR || join(homedir(), ".buggd"),
  ) {}
  directory(id: string) {
    return join(this.root, idSchema.parse(id));
  }
  async init() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
  }
  async list(): Promise<Scan[]> {
    await this.init();
    const entries = await readdir(this.root);
    const scans: Scan[] = [];
    for (const name of entries) {
      if (!idSchema.safeParse(name).success) continue;
      try {
        const path = join(this.directory(name), "scan.json");
        if ((await stat(path)).size > 64 * 1024 * 1024) continue;
        const scan = scanSchema.parse(JSON.parse(await readFile(path, "utf8")));
        if (["queued", "starting", "running"].includes(scan.status)) {
          scan.status = "failed";
          scan.error = "Buggd stopped before this scan finished.";
          scan.finishedAt = new Date().toISOString();
          await this.save(scan);
        }
        scans.push(scan);
      } catch {
        /* Ignore damaged records; never treat disk content as executable. */
      }
    }
    return scans.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  save(scan: Scan): Promise<void> {
    const data = JSON.stringify(scan);
    if (Buffer.byteLength(data) > 64 * 1024 * 1024)
      return Promise.reject(
        new Error("The report size limit was reached. Narrow the scan."),
      );
    const previous = this.writes.get(scan.id) ?? Promise.resolve();
    const next = previous
      .catch(() => {})
      .then(async () => {
        const directory = this.directory(scan.id);
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const temp = join(directory, `${randomUUID()}.tmp`);
        await writeFile(temp, data, { mode: 0o600 });
        await rename(temp, join(directory, "scan.json"));
      });
    this.writes.set(scan.id, next);
    void next
      .finally(() => {
        if (this.writes.get(scan.id) === next) this.writes.delete(scan.id);
      })
      .catch(() => {});
    return next;
  }
  async evidence(scanId: string, evidenceId: string) {
    return readFile(
      join(this.directory(scanId), `${idSchema.parse(evidenceId)}.png`),
    );
  }
  async saveEvidence(scanId: string, evidenceId: string, data: Buffer) {
    await mkdir(this.directory(scanId), { recursive: true, mode: 0o700 });
    await writeFile(
      join(this.directory(scanId), `${idSchema.parse(evidenceId)}.png`),
      data,
      { mode: 0o600 },
    );
  }
  async remove(id: string) {
    await Promise.all([
      this.writes.get(id),
      this.writes.get(`workspace:${id}`),
    ]);
    await rm(this.directory(id), { recursive: true, force: true });
  }
  async workspace(scan: Scan): Promise<Workspace> {
    try {
      const path = join(this.directory(scan.id), "workspace.json");
      if ((await stat(path)).size > 2 * 1024 * 1024)
        throw new Error("Oversized workspace.");
      return workspaceSchema.parse(JSON.parse(await readFile(path, "utf8")));
    } catch {
      return workspaceSchema.parse({
        platform: scan.settings.platform || "unsure",
      });
    }
  }
  updateWorkspace(scan: Scan, patch: Partial<Workspace>): Promise<Workspace> {
    const key = `workspace:${scan.id}`;
    const previous = this.writes.get(key) || Promise.resolve();
    let result: Workspace;
    const next = previous
      .catch(() => {})
      .then(async () => {
        const old = await this.workspace(scan);
        result = workspaceSchema.parse({
          ...old,
          ...patch,
          reviews: { ...old.reviews, ...patch.reviews },
          updatedAt: new Date().toISOString(),
        });
        const directory = this.directory(scan.id);
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const tmp = join(directory, `${randomUUID()}.tmp`);
        await writeFile(tmp, JSON.stringify(result), { mode: 0o600 });
        await rename(tmp, join(directory, "workspace.json"));
      });
    this.writes.set(key, next);
    void next
      .finally(() => {
        if (this.writes.get(key) === next) this.writes.delete(key);
      })
      .catch(() => {});
    return next.then(() => result);
  }
}
