import { useEffect, useState } from "react";
import type { Scan } from "../../../src/shared/schemas";
import { terminal } from "../../../src/shared/schemas";
import { api } from "../lib/api";

export function useScan(id: string) {
  const [scan, setScan] = useState<Scan>();
  const [error, setError] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  useEffect(() => {
    setScan(undefined);
    setError("");
    setReconnecting(false);
    if (!id) return;
    let alive = true;
    let source: EventSource | undefined;
    api<Scan>(`/scans/${id}`)
      .then((report) => {
        if (!alive) return;
        setScan(report);
        if (terminal(report.status)) return;
        source = new EventSource(`/api/scans/${id}/events`);
        source.addEventListener("scan", (event) => {
          if (!alive) return;
          const updated = JSON.parse((event as MessageEvent).data) as Scan;
          setScan(updated);
          setReconnecting(false);
          if (terminal(updated.status)) source?.close();
        });
        source.onopen = () => setReconnecting(false);
        source.onerror = () => {
          if (alive) setReconnecting(true);
        };
      })
      .catch((reason) => {
        if (alive)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      alive = false;
      source?.close();
    };
  }, [id]);
  return { scan, error, reconnecting };
}
