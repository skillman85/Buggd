import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Globe2,
  Image,
  LoaderCircle,
  Plus,
  ScanLine,
  Square,
  ChevronDown,
  ShieldCheck,
  Activity,
  MousePointer2,
  Smartphone,
} from "lucide-react";
import type { Issue, Scan, Confidence } from "../../../src/shared/schemas";
import { categoryLabels, terminal } from "../../../src/shared/schemas";
import { Button } from "../components/ui/button";
import { IssuesTable } from "../components/IssuesTable";
import { IssueInspector } from "../components/IssueInspector";
import { PageInspector } from "../components/PageInspector";
import { Sitemap } from "../components/Sitemap";
import { ResultSummary } from "../components/ResultSummary";
import { counts } from "../../../src/reporting/explanations";
import { usePreferences } from "../contexts/Preferences";
import { ScanWorkspaceProvider } from "../contexts/ScanWorkspace";
import { GuidedFixing } from "./GuidedFixing";
import { ComparisonView } from "./Comparison";
import { ReportDownload } from "../components/ReportDownload";
import { api, evidenceUrl } from "../lib/api";
import { date, duration, pageName } from "../lib/format";

export const resultTabs = [
  "overview",
  "issues",
  "pages",
  "screenshots",
  "sitemap",
  "network",
  "console",
  "guide",
  "compare",
] as const;
export type ResultTab = (typeof resultTabs)[number];
const tabLabels = {
  overview: "Overview",
  issues: "Issues",
  pages: "Pages",
  screenshots: "Screenshots",
  sitemap: "Website map",
  network: "Network",
  console: "Technical errors",
  guide: "Guided fixing",
  compare: "Compare scans",
};

function ResultsView({
  scan,
  tab,
  reconnecting,
  initialConfidence = "",
}: {
  scan: Scan;
  tab: ResultTab;
  reconnecting: boolean;
  initialConfidence?: Confidence | "";
}) {
  const { mode, setMode } = usePreferences();
  const totals = counts(scan);
  const [selectedIssue, setSelectedIssue] = useState<Issue>();
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>();
  const selectIssue = (issue: Issue, occurrenceId?: string) => {
    setSelectedOccurrenceId(occurrenceId);
    setSelectedIssue(issue);
  };
  const [selectedPageId, setSelectedPageId] = useState<string>();
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [screenshotWidth, setScreenshotWidth] = useState(1440);
  const done = terminal(scan.status);
  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [done]);
  const elapsed = scan.startedAt
    ? (scan.finishedAt ? new Date(scan.finishedAt).getTime() : now) -
      new Date(scan.startedAt).getTime()
    : 0;
  const completed = scan.pages.filter(
    (page) => page.status === "completed",
  ).length;
  const confirmed = scan.issues.filter(
    (issue) => issue.confidence === "confirmed",
  ).length;
  const potential = scan.issues.filter(
    (issue) => issue.confidence === "potential",
  ).length;
  const screenshotCount = scan.pages.reduce(
    (count, page) => count + page.screenshots.length,
    0,
  );
  const cancel = async () => {
    setCancelling(true);
    try {
      await api(`/scans/${scan.id}/cancel`, { method: "POST" });
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setCancelling(false);
    }
  };
  return (
    <>
      <a className="back-link" href="#history">
        <ArrowLeft size={13} /> All scans
      </a>
      <div className="results-heading">
        <div>
          <div className="heading-with-status">
            <h1>{done ? "Scan results" : "Scan in progress"}</h1>
            <span className={`scan-status ${scan.status}`}>{scan.status}</span>
          </div>
          <p className="target-url">{scan.url}</p>
          <p className="small-muted">
            {date(scan.createdAt)} · {duration(Math.max(0, elapsed))} ·{" "}
            {completed} pages inspected
          </p>
        </div>
        <div className="heading-actions">
          <ReportDownload scan={scan} />
          <Button asChild>
            <a href="#new">
              <Plus size={14} /> New scan
            </a>
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {reconnecting && (
        <p role="status" className="notice">
          Reconnecting to the local server…
        </p>
      )}
      {!done && (
        <section className="live-panel" aria-label="Live scan progress">
          <div className="live-top">
            <span className="live-icon">
              <LoaderCircle className="spin" />
            </span>
            <div>
              <h2>{scan.activity}</h2>
              <p className="break-url">
                {scan.currentPage ||
                  (scan.status === "queued"
                    ? "Another scan is using the browser. This scan will start automatically."
                    : "Preparing browser and network controls…")}
              </p>
            </div>
            <Button variant="outline" onClick={cancel} disabled={cancelling}>
              <Square size={12} /> {cancelling ? "Cancelling…" : "Cancel scan"}
            </Button>
          </div>
          <div className="live-counters">
            <span>
              <strong>{scan.pages.length}</strong> discovered
            </span>
            <span>
              <strong>{completed}</strong> completed
            </span>
            <span>
              <strong>{scan.checksExecuted}</strong> checks executed
            </span>
            <span>
              <strong>{totals.confirmed}</strong> confirmed problems ·{" "}
              <strong>{totals.potential}</strong> potential issues ·{" "}
              <strong>{totals.untested}</strong> checks not performed
            </span>
            <span>
              <Clock3 size={12} /> {duration(Math.max(0, elapsed))}
            </span>
          </div>
          <p className="field-help">
            Discovery continues as links are found. Counts are live; the final
            page total is not yet known.
          </p>
        </section>
      )}
      {scan.error && (
        <div className="error-message" role="alert">
          <strong>Scan stopped</strong>
          <p>{scan.error}</p>
          <p>Partial evidence remains available below.</p>
        </div>
      )}
      <nav className="result-tabs" aria-label="Scan result views">
        {resultTabs
          .filter(
            (value) =>
              mode === "technical" || !["network", "console"].includes(value),
          )
          .map((value) => (
            <a
              key={value}
              href={`#scan/${scan.id}/${value}`}
              aria-current={tab === value ? "page" : undefined}
            >
              {mode === "simple" && value === "sitemap"
                ? "Your website pages"
                : mode === "technical" && value === "sitemap"
                  ? "Website map"
                  : value === "network"
                    ? "Loading problems"
                    : tabLabels[value]}
              {value === "issues" && (
                <span className="count-pill">
                  {totals.confirmed + totals.potential}
                </span>
              )}
              {value === "pages" && (
                <span className="count-pill neutral">{scan.pages.length}</span>
              )}
            </a>
          ))}
      </nav>
      {mode === "technical" && (tab === "overview" || tab === "issues") && (
        <div className="metric-grid">
          <Metric
            icon={FileText}
            label="Pages inspected"
            value={completed}
            note={`${scan.pages.length} discovered`}
          />
          <Metric
            icon={CircleAlert}
            label="Issues found"
            value={totals.confirmed + totals.potential}
            note={`${potential} potential issues`}
            tone="danger"
          />
          <Metric
            icon={ShieldCheck}
            label="Confirmed problems"
            value={confirmed}
            note={`${scan.issues.filter((issue) => issue.severity === "critical" && issue.confidence !== "not-tested").length} critical`}
            tone={confirmed ? "danger" : "success"}
          />
          <Metric
            icon={Image}
            label="Screenshots"
            value={screenshotCount}
            note="Across three viewport sizes"
          />
        </div>
      )}
      {tab === "overview" && (
        <>
          <ResultSummary scan={scan} />
          <div className="overview-grid">
            {mode === "technical" && (
              <section className="panel severity-panel">
                <div className="section-top">
                  <h2>Severity breakdown</h2>
                  <span className="small-muted">
                    {totals.confirmed + totals.potential} issues
                  </span>
                </div>
                {(
                  [
                    "critical",
                    "high",
                    "medium",
                    "low",
                    "informational",
                  ] as const
                ).map((level) => {
                  const count = scan.issues.filter(
                    (issue) =>
                      issue.severity === level &&
                      issue.confidence !== "not-tested",
                  ).length;
                  return (
                    <div className="severity-row" key={level}>
                      <span>{level}</span>
                      <div>
                        <i
                          className={level}
                          style={{
                            width: `${scan.issues.length ? (count / Math.max(1, totals.confirmed + totals.potential)) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </section>
            )}
            <section className="panel coverage-panel">
              <div className="section-top">
                <h2>What was inspected</h2>
                <CheckCircle2 size={16} />
              </div>
              <div className="coverage-stats">
                <span>
                  <Activity />
                  <strong>{scan.checksExecuted}</strong> checks executed
                </span>
                <span>
                  <Smartphone />
                  <strong>
                    {scan.pages.reduce(
                      (sum, page) => sum + page.responsive.length,
                      0,
                    )}
                  </strong>{" "}
                  viewport checks
                </span>
                <span>
                  <MousePointer2 />
                  <strong>
                    {scan.pages.reduce(
                      (sum, page) =>
                        sum +
                        page.interactions.filter(
                          (item) => item.outcome !== "not-tested",
                        ).length,
                      0,
                    )}
                  </strong>{" "}
                  interactions attempted
                </span>
                <span>
                  <ShieldCheck />
                  <strong>
                    {scan.pages.reduce(
                      (sum, page) => sum + page.forms.length,
                      0,
                    )}
                  </strong>{" "}
                  forms inspected
                </span>
              </div>
              <p className="field-help">
                Coverage is bounded by scan settings and safety rules. It is not
                a complete accessibility, SEO or security audit.
              </p>
            </section>
          </div>
          <IssuesTable scan={scan} onSelect={selectIssue} compact />
          <section className="category-summary">
            <h2>Findings by category</h2>
            <div>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <a href={`#scan/${scan.id}/issues`} key={key}>
                  <span>{label}</span>
                  <strong>
                    {
                      scan.issues.filter(
                        (issue) =>
                          issue.category === key &&
                          issue.confidence !== "not-tested",
                      ).length
                    }
                  </strong>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
      {mode === "simple" && tab === "issues" && <ResultSummary scan={scan} />}
      {tab === "issues" && (
        <IssuesTable
          key={initialConfidence}
          scan={scan}
          onSelect={selectIssue}
          initialConfidence={initialConfidence}
        />
      )}
      {tab === "pages" && (
        <section>
          <div className="section-top">
            <div>
              <h2>Discovered pages</h2>
              <p className="small-muted">
                Open a page for screenshots, findings and check details.
              </p>
            </div>
            <span className="count-pill neutral">{scan.pages.length}</span>
          </div>
          <div className="page-list">
            {scan.pages.map((page) => (
              <button key={page.id} onClick={() => setSelectedPageId(page.id)}>
                <span className="icon-tile">
                  <Globe2 />
                </span>
                <div>
                  <strong>{page.title || pageName(page.url)}</strong>
                  <span>{page.url}</span>
                </div>
                <span className={`scan-status ${page.status}`}>
                  {page.status}
                </span>
                <span className="page-findings">
                  {
                    scan.issues.filter(
                      (issue) =>
                        issue.affectedPages.includes(page.url) &&
                        issue.confidence !== "not-tested",
                    ).length
                  }{" "}
                  issues
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
          {!scan.pages.length && (
            <Empty title="Pages will appear as they are discovered." />
          )}
        </section>
      )}
      {tab === "screenshots" && (
        <section>
          <div className="section-top">
            <div>
              <h2>Screenshot evidence</h2>
              <p className="small-muted">
                Real browser captures. Select a page to inspect its findings.
              </p>
            </div>
            <select
              aria-label="Screenshot viewport"
              value={screenshotWidth}
              onChange={(event) =>
                setScreenshotWidth(Number(event.target.value))
              }
            >
              <option value={1440}>Desktop · 1440px</option>
              <option value={768}>Tablet · 768px</option>
              <option value={390}>Mobile · 390px</option>
            </select>
          </div>
          <div className="screenshot-grid">
            {scan.pages
              .filter((page) =>
                page.screenshots.some(
                  (image) => image.width === screenshotWidth,
                ),
              )
              .map((page) => (
                <button
                  className="screenshot-card"
                  onClick={() => setSelectedPageId(page.id)}
                  key={page.id}
                >
                  <div>
                    <img
                      src={evidenceUrl(
                        scan.id,
                        page.screenshots.find(
                          (image) => image.width === screenshotWidth,
                        )!.id,
                      )}
                      loading="lazy"
                      alt={`${screenshotWidth}px screenshot of ${page.url}`}
                    />
                  </div>
                  <strong>{page.title || pageName(page.url)}</strong>
                  <span>{pageName(page.url)}</span>
                  {page.screenshots.find(
                    (image) => image.width === screenshotWidth,
                  )?.note && (
                    <p className="screenshot-warning">
                      {
                        page.screenshots.find(
                          (image) => image.width === screenshotWidth,
                        )!.note
                      }
                    </p>
                  )}
                </button>
              ))}
          </div>
          {!screenshotCount && (
            <Empty title="No screenshot evidence is available yet." />
          )}
        </section>
      )}
      {tab === "sitemap" &&
        (scan.pages.length ? (
          <Sitemap scan={scan} onPage={setSelectedPageId} />
        ) : (
          <Empty title="The website map will appear as pages are discovered." />
        ))}
      {mode === "technical" && tab === "network" && (
        <section>
          <div className="section-top">
            <h2>Failed resources</h2>
            <span className="small-muted">
              Observed browser failures, grouped by page
            </span>
          </div>
          {scan.pages
            .filter((page) => page.failedResources.length)
            .map((page) => (
              <section className="panel log-panel" key={page.id}>
                <button
                  className="text-link"
                  onClick={() => setSelectedPageId(page.id)}
                >
                  {pageName(page.url)} <ArrowRight size={12} />
                </button>
                {page.failedResources.map((resource, index) => (
                  <div className="resource-row" key={index}>
                    <span>{resource.detail}</span>
                    <code>{resource.url}</code>
                  </div>
                ))}
              </section>
            ))}
          {!scan.pages.some((page) => page.failedResources.length) && (
            <Empty title="No failed network resources were recorded." />
          )}
          <p className="field-help">
            Requests blocked by Buggd’s safety policy are excluded from
            website-failure counts. See coverage limitations.
          </p>
        </section>
      )}
      {mode === "technical" && tab === "console" && (
        <section>
          <div className="section-top">
            <h2>Browser console</h2>
            <span className="small-muted">Exceptions and error messages</span>
          </div>
          {scan.pages
            .filter((page) => page.consoleErrors.length)
            .map((page) => (
              <section className="panel log-panel" key={page.id}>
                <button
                  className="text-link"
                  onClick={() => setSelectedPageId(page.id)}
                >
                  {pageName(page.url)} <ArrowRight size={12} />
                </button>
                {page.consoleErrors.map((error, index) => (
                  <pre className="evidence-code" key={index}>
                    {error}
                  </pre>
                ))}
              </section>
            ))}
          {!scan.pages.some((page) => page.consoleErrors.length) && (
            <Empty title="No browser console errors were recorded." />
          )}
        </section>
      )}
      {mode === "simple" && ["network", "console"].includes(tab) && (
        <section className="empty-state">
          <div>
            <h2>Detailed browser records</h2>
            <p>
              Switch to Technical view for request details and original browser
              messages. The simple report explains what needs attention.
            </p>
            <Button onClick={() => setMode("technical")}>
              Switch to Technical view
            </Button>
          </div>
        </section>
      )}
      {tab === "guide" && <GuidedFixing scan={scan} onIssue={selectIssue} />}
      {tab === "compare" && <ComparisonView scan={scan} />}
      <details className="limitations">
        <summary>
          <ShieldCheck size={15} />
          <span>Scan coverage & limitations</span>
          <ChevronDown size={14} />
        </summary>
        <ul>
          {scan.limitations.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <p>
          {scan.settings.maxPages} page limit · {scan.settings.concurrency}{" "}
          concurrent pages · {scan.settings.timeout / 1000}s page timeout ·{" "}
          {scan.settings.maxDuration / 1000}s scan limit
        </p>
      </details>
      <PageInspector
        page={scan.pages.find((page) => page.id === selectedPageId)}
        scan={scan}
        onClose={() => setSelectedPageId(undefined)}
        onIssue={selectIssue}
        onPage={setSelectedPageId}
      />
      <IssueInspector
        initialOccurrenceId={selectedOccurrenceId}
        issue={
          scan.issues.find((issue) => issue.id === selectedIssue?.id) ||
          selectedIssue
        }
        scan={scan}
        onClose={() => setSelectedIssue(undefined)}
        onPage={setSelectedPageId}
      />
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
  tone = "accent",
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  note: string;
  tone?: string;
}) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}>
        <Icon size={21} />
      </span>
      <div>
        <strong>{value}</strong>
        <h2>{label}</h2>
        <p>{note}</p>
      </div>
    </article>
  );
}
function Empty({ title }: { title: string }) {
  return (
    <div className="empty-state">
      <ScanLine />
      <p>{title}</p>
    </div>
  );
}

export function ScanResults(props: Parameters<typeof ResultsView>[0]) {
  return (
    <ScanWorkspaceProvider scan={props.scan}>
      <ResultsView {...props} />
    </ScanWorkspaceProvider>
  );
}
