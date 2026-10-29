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
    let polling: ReturnType<typeof setInterval> | undefined;
    let pending = false;
    let settled = false;
    const stop = () => {
      source?.close();
      clearInterval(polling);
    };
    const accept = (report: Scan) => {
      if (!alive || settled) return;
      setScan(report);
      if (terminal(report.status)) {
        settled = true;
        setReconnecting(false);
        stop();
      }
    };
    const reconcile = async () => {
      if (pending || !alive) return;
      pending = true;
      try {
        const report = await api<Scan>(`/scans/${id}`);
        accept(report);
      } catch {
        if (alive) setReconnecting(true);
      } finally {
        pending = false;
      }
    };
    api<Scan>(`/scans/${id}`)
      .then((report) => {
        if (!alive) return;
        setScan(report);
        if (terminal(report.status)) return;
        polling = setInterval(() => void reconcile(), 3000);
        source = new EventSource(`/api/scans/${id}/events`);
        source.addEventListener("scan", (event) => {
          if (!alive) return;
          const updated = JSON.parse((event as MessageEvent).data) as Scan;
          accept(updated);
          setReconnecting(false);
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
      stop();
    };
  }, [id]);
  return { scan, error, reconnecting };
}
