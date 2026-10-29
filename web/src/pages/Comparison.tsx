import { useEffect, useState } from "react";
import type { Scan, Issue } from "../../../src/shared/schemas";
import type { Comparison } from "../../../src/shared/evidence";
import { explain } from "../../../src/reporting/explanations";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { IssueInspector } from "../components/IssueInspector";
import { ScanWorkspaceProvider } from "../contexts/ScanWorkspace";
import { date } from "../lib/format";
export function ComparisonView({ scan }: { scan: Scan }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [previousId, setPreviousId] = useState(
    scan.settings.previousScanId || "",
  );
  const [previous, setPrevious] = useState<Scan>();
  const [result, setResult] = useState<Comparison>();
  const [error, setError] = useState("");
  const [inspecting, setInspecting] = useState<{ scan: Scan; issue: Issue }>();
  useEffect(() => {
    api<Scan[]>("/scans")
      .then((values) =>
        setScans(
          values.filter(
            (item) =>
              item.id !== scan.id &&
              new URL(item.url).origin === new URL(scan.url).origin &&
              item.createdAt <= scan.createdAt,
          ),
        ),
      )
      .catch((reason) => setError((reason as Error).message));
  }, [scan.id, scan.url, scan.createdAt]);
  useEffect(() => {
    setResult(undefined);
    setError("");
    if (!previousId) return;
    let alive = true;
    Promise.all([
      api<Comparison>(`/scans/${scan.id}/compare?previous=${previousId}`),
      api<Scan>(`/scans/${previousId}`),
    ])
      .then(([comparison, report]) => {
        if (alive) {
          setResult(comparison);
          setPrevious(report);
        }
      })
      .catch((reason) => {
        if (alive) setError((reason as Error).message);
      });
    return () => {
      alive = false;
    };
  }, [previousId, scan.id, scan.status]);
  return (
    <section className="comparison-panel">
      <div className="section-top">
        <div>
          <h2>See what changed</h2>
          <p className="small-muted">
            Only sufficiently covered checks can verify that an observation is
            no longer detected.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={`#scan/${scan.id}/guide`}>Return to guided fixing</a>
        </Button>
      </div>
      <label>
        Compare this scan with
        <select
          aria-label="Previous scan to compare"
          value={previousId}
          onChange={(event) => setPreviousId(event.target.value)}
        >
          <option value="">Choose a previous scan of this website</option>
          {scans.map((item) => (
            <option key={item.id} value={item.id}>
              {date(item.createdAt)} · {item.status} · {item.url}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {!previousId && (
        <div className="empty-state">
          <h3>Choose two scans to compare.</h3>
          <p>
            Scans must belong to the same website origin. Run another scan after
            making changes, then choose the earlier one.
          </p>
        </div>
      )}
      {result && (
        <>
          <div className="comparison-metrics">
            {(["resolved", "remaining", "new", "unable"] as const).map(
              (status) => (
                <article key={status}>
                  <strong>
                    {
                      result.items.filter((item) => item.status === status)
                        .length
                    }
                  </strong>
                  <span>
                    {status === "unable"
                      ? "Unable to verify"
                      : status === "new"
                        ? "Newly detected"
                        : status === "remaining"
                          ? "Still present"
                          : "Resolved in checks completed"}
                  </span>
                </article>
              ),
            )}
          </div>
          {scan.status !== "completed" && (
            <p className="notice">
              This scan is {scan.status}. Results can remain unable to verify
              until the relevant checks finish.
            </p>
          )}
          <div className="comparison-list">
            {result.items.map((item, index) => {
              const before = previous?.issues.find(
                (issue) => issue.id === item.previousIssueId,
              );
              const now = scan.issues.find(
                (issue) => issue.id === item.currentIssueId,
              );
              return (
                <article className="panel" key={index}>
                  <span className={`comparison-status ${item.status}`}>
                    {item.status === "unable"
                      ? "Unable to verify"
                      : item.status === "resolved"
                        ? "No longer detected"
                        : item.status === "new"
                          ? "Newly detected"
                          : "Still present"}
                  </span>
                  <h3>{explain(now || before!).title}</h3>
                  <p>{item.reason}</p>
                  <p className="small-muted break-url">
                    {item.pageUrls.join(" · ")}
                  </p>
                  <div className="copy-actions">
                    {before && previous && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setInspecting({ scan: previous, issue: before })
                        }
                      >
                        Inspect previous evidence
                      </Button>
                    )}
                    {now && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspecting({ scan, issue: now })}
                      >
                        Inspect current evidence
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!result.items.length && (
            <div className="empty-state">
              <h3>No website issues to compare.</h3>
              <p>
                Both scans may have no actionable observations. Review their
                untested checks separately.
              </p>
            </div>
          )}
          <div className="copy-actions">
            <a
              className="outline-action"
              download
              href={`/api/scans/${scan.id}/compare?previous=${previousId}&format=html`}
            >
              Download comparison report
            </a>
            <a
              className="text-link"
              download
              href={`/api/scans/${scan.id}/compare?previous=${previousId}`}
            >
              Comparison JSON
            </a>
          </div>
        </>
      )}
      {inspecting && (
        <ScanWorkspaceProvider key={inspecting.scan.id} scan={inspecting.scan}>
          <IssueInspector
            issue={inspecting.issue}
            scan={inspecting.scan}
            onClose={() => setInspecting(undefined)}
          />
        </ScanWorkspaceProvider>
      )}
    </section>
  );
}
