import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import type { Scan } from "../../../src/shared/schemas";
import { usePreferences } from "../contexts/Preferences";
export function ReportDownload({ scan }: { scan: Scan }) {
  const { mode } = usePreferences();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pdf = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/scans/${scan.id}/export?format=pdf&mode=${mode}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || "The PDF could not be prepared. Please try again.",
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `buggd-${scan.id}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="export-menu">
      <summary className="outline-action">
        <Download size={14} /> Download Website Report <ChevronDown size={12} />
      </summary>
      <div>
        <p className="field-help">
          Includes observed page text, fixes, screenshots and coverage limits.
          Review before sharing. Files stay local; nothing is uploaded.
        </p>
        <a
          download
          href={`/api/scans/${scan.id}/export?format=html&mode=${mode}`}
        >
          {mode === "technical"
            ? "Standalone HTML report"
            : "Website Report (HTML)"}
        </a>
        <button
          className="text-link"
          onClick={() => void pdf()}
          disabled={busy}
        >
          {busy ? "Preparing PDF…" : "Print-friendly PDF report"}
        </button>
        {error && <p role="alert">{error}</p>}
        <a
          download
          href={`/api/scans/${scan.id}/export?format=json&mode=${mode}`}
        >
          JSON data
        </a>
        <p className="field-help">
          PDF needs local Chromium. Image inclusion is bounded; PDF includes up
          to 100 prioritised groups. JSON retains all technical observations and
          saved review progress.
        </p>
      </div>
    </details>
  );
}
