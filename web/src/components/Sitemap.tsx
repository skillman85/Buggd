import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import type { Scan } from "../../../src/shared/schemas";
import { pageName } from "../lib/format";
import { Button } from "./ui/button";

export function Sitemap({
  scan,
  onPage,
}: {
  scan: Scan;
  onPage: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const drag = useRef<{
    x: number;
    y: number;
    originalX: number;
    originalY: number;
  } | null>(null);
  const graph = useMemo(() => {
    const nodes = scan.pages.map((page) => ({
      id: page.id,
      url: page.url,
      title: page.title,
      status: page.status,
      issues: scan.issues.filter(
        (issue) =>
          issue.confidence !== "not-tested" &&
          issue.affectedPages.includes(page.url),
      ).length,
      level: 0,
      x: 0,
      y: 0,
    }));
    const known = new Set(nodes.map((node) => node.url));
    const extras = [
      ...new Set(
        scan.pages
          .flatMap((page) => page.links)
          .filter((url) => !known.has(url)),
      ),
    ];
    for (const url of extras.slice(0, Math.max(0, 150 - nodes.length)))
      nodes.push({
        id: url,
        url,
        title: "",
        status: "discovered",
        issues: 0,
        level: 1,
        x: 0,
        y: 0,
      });
    const byUrl = new Map(nodes.map((node) => [node.url, node]));
    const visited = new Set<string>();
    const queue = nodes[0] ? [{ url: nodes[0].url, depth: 0 }] : [];
    while (queue.length) {
      const item = queue.shift()!;
      if (visited.has(item.url)) continue;
      visited.add(item.url);
      const node = byUrl.get(item.url);
      if (!node) continue;
      node.level = Math.min(3, item.depth);
      const page = scan.pages.find((page) => page.url === item.url);
      for (const link of page?.links || [])
        if (!visited.has(link))
          queue.push({ url: link, depth: item.depth + 1 });
    }
    const rows = new Map<number, number>();
    for (const node of nodes) {
      const row = rows.get(node.level) || 0;
      node.x = node.level * 260;
      node.y = row * 104;
      rows.set(node.level, row + 1);
    }
    const edges = scan.pages
      .flatMap((page) =>
        page.links.map((url) => ({
          source: byUrl.get(page.url),
          target: byUrl.get(url),
        })),
      )
      .filter(
        (edge) => edge.source && edge.target && edge.source !== edge.target,
      );
    return {
      nodes,
      edges,
      extras,
      width: Math.max(400, ...nodes.map((node) => node.x + 220)),
      height: Math.max(240, ...nodes.map((node) => node.y + 100)),
    };
  }, [scan.pages, scan.issues]);
  const fit = () => {
    if (!container.current) return;
    const factor = Math.min(
      1,
      (container.current.clientWidth - 40) / graph.width,
      (container.current.clientHeight - 40) / graph.height,
    );
    setZoom(Math.max(0.15, factor));
    setPan({ x: 20, y: 20 });
  };
  useEffect(() => {
    fit();
  }, [scan.id, graph.nodes.length]); // Fit once as discovery grows; zoom/pan remain user-controlled between updates.
  return (
    <section className="sitemap-panel">
      <div className="section-top">
        <div>
          <h2>Discovered website map</h2>
          <p className="small-muted">
            Connections come from observed internal links. Select a scanned page
            to inspect it.
          </p>
        </div>
        <div className="map-tools">
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            onClick={() => setZoom((value) => Math.max(0.15, value - 0.15))}
          >
            <Minus />
          </Button>
          <span>{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            onClick={() => setZoom((value) => Math.min(2, value + 0.15))}
          >
            <Plus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Fit map"
            onClick={fit}
          >
            <Maximize2 />
          </Button>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-dot" /> Inspected
        </span>
        <span>
          <i className="legend-dot problem" /> Findings
        </span>
        <span>
          <i className="legend-dot pending" /> Not inspected
        </span>
        <span>Drag background to pan</span>
      </div>
      <div
        className="map-canvas"
        ref={container}
        onPointerDown={(event) => {
          if ((event.target as Element).closest("[data-node]")) return;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            originalX: pan.x,
            originalY: pan.y,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current)
            setPan({
              x: drag.current.originalX + event.clientX - drag.current.x,
              y: drag.current.originalY + event.clientY - drag.current.y,
            });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <svg
          role="group"
          aria-label="Interactive map of discovered website pages"
          width="100%"
          height="100%"
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {graph.edges.map((edge, index) => (
              <path
                key={index}
                d={`M${edge.source!.x + 210},${edge.source!.y + 36} C${edge.source!.x + 240},${edge.source!.y + 36} ${edge.target!.x - 30},${edge.target!.y + 36} ${edge.target!.x},${edge.target!.y + 36}`}
                className="map-edge"
              />
            ))}
            {graph.nodes.map((node) => {
              const scanned = scan.pages.find((page) => page.id === node.id);
              return (
                <g
                  key={node.id}
                  data-node="true"
                  transform={`translate(${node.x},${node.y})`}
                  className={`map-node ${node.issues ? "has-issues" : ""} ${node.status !== "completed" ? "pending" : ""}`}
                  role="button"
                  aria-disabled={!scanned}
                  tabIndex={0}
                  aria-label={`${pageName(node.url)}, ${scanned ? node.status : "not scanned"}, ${node.issues} findings`}
                  onClick={() => {
                    if (scanned) onPage(node.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (scanned) onPage(node.id);
                    }
                  }}
                >
                  <title>{node.url}</title>
                  <rect width="210" height="74" rx="10" />
                  <circle cx="17" cy="24" r="4" />
                  <text x="30" y="29" className="node-title">
                    {pageName(node.url).slice(0, 22)}
                  </text>
                  <text x="16" y="54">
                    {scanned
                      ? `${node.status} · ${node.issues} findings`
                      : "Not scanned · outside page limit"}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <p className="field-help">
        {graph.nodes.length} routes shown.{" "}
        {graph.extras.length
          ? `${graph.extras.length} linked routes were not inspected. `
          : ""}
        Map limited to 150 displayed nodes. This represents discovered pages,
        not every application state.
      </p>
    </section>
  );
}
