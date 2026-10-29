import { useEffect, useState } from "react";
import type { Issue, PageReport, Scan } from "../../../src/shared/schemas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { IssuesTable } from "./IssuesTable";
import { usePreferences } from "../contexts/Preferences";
import { evidenceUrl } from "../lib/api";
import { duration, pageName } from "../lib/format";
export function PageInspector({
  page,
  scan,
  onClose,
  onIssue,
  onPage,
}: {
  page?: PageReport;
  scan: Scan;
  onClose: () => void;
  onIssue: (issue: Issue, occurrenceId?: string) => void;
  onPage: (id: string) => void;
}) {
  const { mode } = usePreferences();
  const [viewport, setViewport] = useState(1440);
  useEffect(() => setViewport(1440), [page?.id]);
  const image = page?.screenshots.find((item) => item.width === viewport);
  return (
    <Dialog
      open={!!page}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="page-dialog">
        {page && (
          <>
            <DialogHeader>
              <DialogTitle>{page.title || "Affected page"}</DialogTitle>
              <DialogDescription className="break-url">
                {page.url}
              </DialogDescription>
            </DialogHeader>
            <div className="inspector-content">
              <div className="inspector-navigation">
                <label>
                  Choose a page
                  <select
                    aria-label="Inspect a different page"
                    value={page.id}
                    onChange={(event) => onPage(event.target.value)}
                  >
                    {scan.pages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {pageName(item.url)}
                      </option>
                    ))}
                  </select>
                </label>
                <span className={`scan-status ${page.status}`}>
                  {page.status === "skipped" ? "Not checked" : page.status}
                </span>
                <span className="small-muted">
                  {mode === "technical" && page.httpStatus
                    ? `HTTP ${page.httpStatus} · `
                    : ""}
                  {duration(page.duration)}
                </span>
              </div>
              <div className="viewport-options">
                {[1440, 768, 390].map((width) => (
                  <Button
                    key={width}
                    variant={width === viewport ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setViewport(width)}
                  >
                    {width === 1440
                      ? "Desktop"
                      : width === 768
                        ? "Tablet"
                        : "Mobile"}{" "}
                    · {width}px
                  </Button>
                ))}
              </div>
              {image?.note && (
                <p className="notice screenshot-warning">{image.note}</p>
              )}
              {image ? (
                <a
                  href={evidenceUrl(scan.id, image.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    className="evidence-image"
                    src={evidenceUrl(scan.id, image.id)}
                    alt={`${viewport}px viewport screenshot of ${page.url}`}
                  />
                </a>
              ) : (
                <div className="empty-state compact">
                  <p>
                    No screenshot was captured at this screen size. A failed,
                    cancelled or limited check can explain this. Try a new scan.
                  </p>
                </div>
              )}
              <IssuesTable scan={scan} onSelect={onIssue} pageUrl={page.url} />
              <section>
                <h3>Page information</h3>
                <dl className="detail-list">
                  <div>
                    <dt>Page title</dt>
                    <dd>{page.title || "No title"}</dd>
                  </div>
                  <div>
                    <dt>Page description</dt>
                    <dd>{page.description || "Not present"}</dd>
                  </div>
                  <div>
                    <dt>Final address</dt>
                    <dd>{page.finalUrl || "Not reached"}</dd>
                  </div>
                  <div>
                    <dt>Links found</dt>
                    <dd>
                      {page.links.length} on this website ·{" "}
                      {page.externalLinks.length} external destinations not
                      visited
                    </dd>
                  </div>
                </dl>
              </section>
              <section>
                <h3>Mobile and tablet display</h3>
                {page.responsive.map((result) => (
                  <div className="check-row" key={result.width}>
                    <strong>{result.width}px</strong>
                    <span>
                      {result.overflow > 3
                        ? `${result.overflow}px extends beyond the screen`
                        : "No sideways page overflow observed"}
                    </span>
                  </div>
                ))}
                {!page.responsive.length && (
                  <p className="small-muted">This check was not performed.</p>
                )}
              </section>
              <section>
                <h3>
                  {mode === "technical"
                    ? "Interaction checks"
                    : "Buttons and other controls"}
                </h3>
                {page.interactions.map((item, index) => (
                  <details className="check-detail" key={index}>
                    <summary>
                      <span>{item.label}</span>
                      <span className={`outcome ${item.outcome}`}>
                        {item.outcome === "changed"
                          ? "A response was seen"
                          : item.outcome === "no-response"
                            ? "Needs checking"
                            : item.outcome === "blocked"
                              ? "Blocked by Buggd"
                              : "Not tested"}
                      </span>
                    </summary>
                    <p>
                      {item.outcome === "changed"
                        ? "A local change was observed during the safe check. This does not verify every possible effect."
                        : item.outcome === "no-response"
                          ? "No visible response was seen during the short check. Try the control yourself before assuming it is broken."
                          : "Buggd did not safely verify this action. Check it manually with appropriate test data."}
                    </p>
                    {mode === "technical" && (
                      <>
                        <p>{item.detail}</p>
                        <code>{item.element}</code>
                        <p>Classification: {item.classification}</p>
                      </>
                    )}
                  </details>
                ))}
                {!page.interactions.length && (
                  <p className="small-muted">
                    No supported controls were found.
                  </p>
                )}
              </section>
              <section>
                <h3>Forms</h3>
                {page.forms.map((form) => (
                  <article className="form-result" key={form.element}>
                    <h4>
                      {form.fields} fields · {form.requiredFields} required
                    </h4>
                    <p>
                      Buggd checked safe browser field rules without sending any
                      information. Real delivery and custom validation were not
                      tested.
                    </p>
                    {mode === "technical" && (
                      <>
                        <p className="small-muted">
                          {form.element} — {form.detail}
                        </p>
                        {form.checks.map((check, index) => (
                          <div className="native-check" key={index}>
                            <strong>{check.scenario}</strong>
                            <code>{check.field}</code>
                            <p>{check.detail}</p>
                          </div>
                        ))}
                      </>
                    )}
                  </article>
                ))}
                {!page.forms.length && (
                  <p className="small-muted">
                    No forms were found on this page.
                  </p>
                )}
              </section>
              <section>
                <h3>Loading and scan restrictions</h3>
                {page.resources?.map((resource, index) => (
                  <div className="resource-row" key={index}>
                    <span>
                      {resource.status === "blocked"
                        ? "Blocked by Buggd"
                        : resource.status === "loaded"
                          ? "Loaded"
                          : resource.status === "timeout"
                            ? "Timed out"
                            : resource.status === "unsupported"
                              ? "Not supported"
                              : resource.status === "browser-restriction"
                                ? "Browser restriction"
                                : "Loading failed"}
                    </span>
                    <div>
                      <span className="break-url">{resource.url}</span>
                      <p className="small-muted">
                        {resource.provenance === "third-party"
                          ? "External resource"
                          : resource.provenance === "buggd"
                            ? "Scanner restriction"
                            : "Website resource"}{" "}
                        · {resource.detail}
                      </p>
                    </div>
                  </div>
                ))}
                {!page.resources?.length && (
                  <p className="small-muted">
                    Detailed resource provenance is not available for this older
                    scan.
                  </p>
                )}
              </section>
              {mode === "technical" && (
                <details
                  className="technical-details"
                  open={mode === "technical" || undefined}
                >
                  <summary>Technical errors and raw page checks</summary>
                  <h3>Console errors</h3>
                  {page.consoleErrors.map((error, index) => (
                    <pre key={index} className="evidence-code">
                      {error}
                    </pre>
                  ))}
                  {!page.consoleErrors.length && (
                    <p>No console errors recorded.</p>
                  )}
                  <h3>Failed resources</h3>
                  {page.failedResources.map((resource, index) => (
                    <div className="resource-row" key={index}>
                      <span>{resource.detail}</span>
                      <code>{resource.url}</code>
                    </div>
                  ))}
                  <h3>Check coverage</h3>
                  <pre className="evidence-code">
                    {page.coverage
                      ? JSON.stringify(page.coverage, null, 2)
                      : "This older scan did not record per-detector coverage."}
                  </pre>
                </details>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
