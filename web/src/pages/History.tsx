import { useState } from "react";
import { ArrowRight, Download, Globe2, ScanLine, Trash2 } from "lucide-react";
import type { Scan } from "../../../src/shared/schemas";
import { counts } from "../../../src/reporting/explanations";
import { terminal } from "../../../src/shared/schemas";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { api, exportUrl } from "../lib/api";
import { date, siteName } from "../lib/format";

export function History({
  scans,
  refresh,
  notify,
}: {
  scans: Scan[];
  refresh: () => void;
  notify: (message: string) => void;
}) {
  const [deleting, setDeleting] = useState<Scan>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/scans/${deleting.id}`, { method: "DELETE" });
      setDeleting(undefined);
      refresh();
      notify("Scan and screenshot evidence removed from this computer.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LOCAL REPORTS</p>
          <h1>Scan history</h1>
          <p className="small-muted">
            Previous scans, evidence and exports. Stored on this computer.
          </p>
        </div>
        <Button asChild>
          <a href="#new">
            <ScanLine /> New scan
          </a>
        </Button>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {scans.length ? (
        <div className="history-list">
          {scans.map((scan) => (
            <article key={scan.id}>
              <span className="icon-tile">
                <Globe2 />
              </span>
              <a className="history-target" href={`#scan/${scan.id}/overview`}>
                <h2>{siteName(scan.url)}</h2>
                <p>{scan.url}</p>
                <span>
                  {date(scan.createdAt)} ·{" "}
                  {
                    scan.pages.filter((page) => page.status === "completed")
                      .length
                  }{" "}
                  pages · {counts(scan).confirmed + counts(scan).potential}{" "}
                  issues · {counts(scan).untested} checks not performed
                </span>
              </a>
              <span className={`scan-status ${scan.status}`}>
                {scan.status}
              </span>
              <div className="history-actions">
                <Button asChild size="icon" variant="outline">
                  <a
                    href={exportUrl(scan.id, "html")}
                    download
                    aria-label={`Export report for ${scan.url}`}
                  >
                    <Download />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={!terminal(scan.status)}
                  aria-label={`Delete scan for ${scan.url}`}
                  onClick={() => setDeleting(scan)}
                >
                  <Trash2 />
                </Button>
                <Button asChild size="icon" variant="ghost">
                  <a
                    href={`#scan/${scan.id}/overview`}
                    aria-label={`Open scan for ${scan.url}`}
                  >
                    <ArrowRight />
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ScanLine />
          <h2>No scans yet.</h2>
          <p>Start a scan to discover what needs attention.</p>
          <Button asChild>
            <a href="#new">
              Start your first scan <ArrowRight />
            </a>
          </Button>
        </div>
      )}
      <p className="retention-note">
        Buggd keeps up to 50 scans and 512 MiB of screenshot evidence. Old
        completed scans are pruned as those limits are reached.
      </p>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this scan?</DialogTitle>
            <DialogDescription>
              This removes the report and screenshots for {deleting?.url} from
              this computer. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(undefined)}>
              Keep scan
            </Button>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete scan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
