import type { FastifyInstance } from "fastify";
import { scanInputSchema, idSchema, terminal } from "../shared/schemas.js";
import { ScanManager } from "../scanner/manager.js";
import { htmlReport } from "../reports/html.js";
import { z } from "zod";
import { workspacePatchSchema } from "../shared/evidence.js";
import { compareScans } from "../reporting/comparison.js";
import { redactExport } from "../reporting/redact.js";
import { pdfReport } from "../reports/pdf.js";
import { BrowserInstaller } from "./browser-install.js";

export function registerRoutes(app: FastifyInstance, manager: ScanManager) {
  const installer = new BrowserInstaller();
  app.addHook("onClose", async () => installer.close());
  app.get("/api/capabilities", async () => ({
    browserAvailable: installer.available(),
    installation: installer.state,
    retention: { maxScans: 50, maxEvidenceMiB: 512 },
  }));
  app.post("/api/browser/install", async (_request, reply) => {
    installer.start();
    return reply.code(202).send(installer.state);
  });
  app.get("/api/scans", async () =>
    manager.list().map((scan) => ({
      ...scan,
      pages: scan.pages.map((page) => ({
        ...page,
        consoleErrors: [],
        failedResources: [],
        interactions: [],
        forms: [],
        responsive: [],
      })),
      issues: scan.issues.map((issue) => ({
        ...issue,
        evidence: "",
        description: "",
        suggestion: "",
      })),
    })),
  );
  app.post("/api/scans", async (request, reply) => {
    const parsed = scanInputSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });
    try {
      if (parsed.data.previousScanId) {
        const old = manager.scans.get(parsed.data.previousScanId);
        let origin = "";
        try {
          origin = new URL(parsed.data.url).origin;
        } catch {}
        if (!old || new URL(old.url).origin !== origin)
          return reply.code(400).send({
            error:
              "A rescan must refer to an existing scan of the same website origin.",
          });
      }
      const scan = await manager.create(parsed.data);
      return reply.code(202).send(scan);
    } catch (error) {
      const detail = error as { statusCode?: number; message?: string };
      return reply
        .code(detail.statusCode || 400)
        .send({ error: detail.message || "The scan could not be started." });
    }
  });
  const scanFor = (params: unknown) => {
    const parsed = idSchema.safeParse((params as { id?: string }).id);
    if (!parsed.success)
      throw Object.assign(new Error("Invalid scan identifier."), {
        statusCode: 400,
      });
    const scan = manager.scans.get(parsed.data);
    if (!scan)
      throw Object.assign(new Error("Scan not found."), { statusCode: 404 });
    return scan;
  };
  app.get("/api/scans/:id", async (request) => scanFor(request.params));
  app.get("/api/scans/:id/workspace", async (request) =>
    manager.storage.workspace(scanFor(request.params)),
  );
  app.patch("/api/scans/:id/workspace", async (request, reply) => {
    const scan = scanFor(request.params);
    const parsed = workspacePatchSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "Invalid review progress or platform preference." });
    for (const [id, review] of Object.entries(parsed.data.reviews || {})) {
      if (!scan.issues.some((issue) => issue.id === id))
        return reply
          .code(400)
          .send({ error: "The reviewed issue does not belong to this scan." });
      if (review.status === "dismissed" && !review.reason.trim())
        return reply
          .code(400)
          .send({ error: "Add a reason before dismissing this issue." });
    }
    if (
      parsed.data.guidedIssueId &&
      !scan.issues.some((issue) => issue.id === parsed.data.guidedIssueId)
    )
      return reply
        .code(400)
        .send({ error: "Guided issue not found in this scan." });
    return manager.storage.updateWorkspace(scan, parsed.data);
  });
  app.get("/api/scans/:id/compare", async (request, reply) => {
    const current = scanFor(request.params);
    const parsed = z
      .object({
        previous: idSchema,
        format: z.enum(["json", "html"]).optional(),
      })
      .safeParse(request.query);
    if (!parsed.success)
      return reply.code(400).send({ error: "Choose a valid previous scan." });
    const previous = manager.scans.get(parsed.data.previous);
    if (!previous)
      return reply.code(404).send({ error: "Previous scan not found." });
    try {
      const comparison = compareScans(previous, current);
      if (parsed.data.format === "html") {
        reply.header(
          "Content-Disposition",
          `attachment; filename="buggd-comparison-${current.id}.html"`,
        );
        const { comparisonHtml } = await import("../reports/html.js");
        return reply
          .type("text/html; charset=utf-8")
          .send(comparisonHtml(comparison, previous, current));
      }
      return redactExport(comparison);
    } catch (error) {
      return reply.code(400).send({
        error:
          error instanceof Error
            ? error.message
            : "These scans cannot be compared.",
      });
    }
  });
  app.post("/api/scans/:id/cancel", async (request) => {
    const scan = scanFor(request.params);
    await manager.cancel(scan.id);
    return scan;
  });
  app.delete("/api/scans/:id", async (request, reply) => {
    const scan = scanFor(request.params);
    await manager.remove(scan.id);
    return reply.code(204).send();
  });
  app.get("/api/scans/:id/sitemap", async (request) => {
    const scan = scanFor(request.params);
    const urls = new Map(scan.pages.map((page) => [page.url, page.id]));
    return {
      nodes: scan.pages.map((page) => ({
        id: page.id,
        url: page.url,
        title: page.title,
        status: page.status,
        issueCount: scan.issues.filter(
          (issue) =>
            issue.confidence !== "not-tested" &&
            issue.affectedPages.includes(page.url),
        ).length,
      })),
      edges: scan.pages.flatMap((page) =>
        page.links.map((url) => ({
          source: page.id,
          target: urls.get(url) || url,
          url,
          scanned: urls.has(url),
        })),
      ),
    };
  });
  app.get("/api/scans/:id/evidence/:evidenceId", async (request, reply) => {
    const scan = scanFor(request.params);
    const parsed = idSchema.safeParse(
      (request.params as { evidenceId: string }).evidenceId,
    );
    if (
      !parsed.success ||
      !scan.pages.some((page) =>
        [...page.screenshots, ...(page.detailScreenshots || [])].some(
          (screenshot) => screenshot.id === parsed.data,
        ),
      )
    )
      return reply.code(404).send({ error: "Evidence not found." });
    try {
      return reply
        .type("image/png")
        .header("Content-Security-Policy", "default-src 'none'")
        .send(await manager.storage.evidence(scan.id, parsed.data));
    } catch {
      return reply.code(404).send({ error: "Evidence file is unavailable." });
    }
  });
  app.get("/api/scans/:id/export", async (request, reply) => {
    const scan = scanFor(request.params);
    const query = z
      .object({
        format: z.enum(["json", "html", "pdf"]).default("json"),
        mode: z.enum(["simple", "technical"]).default("simple"),
      })
      .safeParse(request.query);
    if (!query.success)
      return reply
        .code(400)
        .send({ error: "Choose HTML, PDF or JSON and a valid display mode." });
    const { format, mode } = query.data;
    const workspace = await manager.storage.workspace(scan);
    reply.header(
      "Content-Disposition",
      `attachment; filename="buggd-${scan.id}.${format}"`,
    );
    if (format === "pdf") {
      try {
        const pdf = await pdfReport(scan, manager.storage, {
          mode,
          platform: workspace.platform,
        });
        return reply.type("application/pdf").send(pdf);
      } catch (error) {
        const busy = (error as { statusCode?: number }).statusCode === 429;
        return reply
          .removeHeader("Content-Disposition")
          .code(busy ? 429 : 503)
          .type("application/json")
          .send({
            error: busy
              ? "Another PDF is being prepared. Please try again shortly."
              : "The PDF could not be prepared. Check local Chromium is installed, retry, or download the HTML report.",
          });
      }
    }
    if (format === "html")
      return reply.type("text/html; charset=utf-8").send(
        await htmlReport(scan, manager.storage, {
          mode,
          platform: workspace.platform,
        }),
      );
    return reply
      .type("application/json")
      .send(
        JSON.stringify(
          { ...redactExport(scan), workspace: redactExport(workspace) },
          null,
          2,
        ),
      );
  });
  const connections = new Set<() => void>();
  app.addHook("preClose", async () => {
    for (const close of connections) close();
    await manager.close();
  });
  app.get("/api/scans/:id/events", async (request, reply) => {
    const scan = scanFor(request.params);
    if (connections.size >= 20)
      return reply.code(429).send({ error: "Too many live scan connections." });
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    });
    let closed = false;
    const send = (updated: typeof scan) => {
      if (closed || updated.id !== scan.id) return;
      if (reply.raw.writableLength > 2 * 1024 * 1024) {
        close();
        return;
      }
      reply.raw.write(`event: scan\ndata: ${JSON.stringify(updated)}\n\n`);
      if (terminal(updated.status)) close();
    };
    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      manager.off("update", send);
      connections.delete(close);
      reply.raw.end();
    };
    const heartbeat = setInterval(() => {
      if (!closed) reply.raw.write(": heartbeat\n\n");
    }, 15000);
    request.raw.on("close", close);
    connections.add(close);
    manager.on("update", send);
    send(scan);
  });
}
