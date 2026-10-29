import { useEffect, useState } from "react";
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
  ArrowRight,
} from "lucide-react";
import type { Issue, Scan } from "../../../src/shared/schemas";
import { confidenceLabels } from "../../../src/shared/schemas";
import {
  explain,
  occurrences,
  platformGuidance,
  developerDetails,
  aiFixPrompt,
} from "../../../src/reporting/explanations";
import {
  elementDescription,
  regionName,
} from "../../../src/reporting/issue-presentation";
import { redactText } from "../../../src/reporting/redact";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { VisualEvidence } from "./VisualEvidence";
import { ReviewControls } from "./ReviewControls";
import { TechnicalDetails } from "./TechnicalDetails";
import { PlatformSelect, usePreferences } from "../contexts/Preferences";
import { useScanWorkspace } from "../contexts/ScanWorkspace";
export function SeverityBadge({ value }: { value: Issue["severity"] }) {
  return (
    <span className={`severity severity--${value}`}>
      <span aria-hidden="true">
        {value === "high" || value === "critical"
          ? "!"
          : value === "medium"
            ? "△"
            : "i"}
      </span>
      {value}
    </span>
  );
}
export function IssueInspector({
  issue,
  scan,
  onClose,
  onPage,
  initialOccurrenceId,
}: {
  issue?: Issue;
  initialOccurrenceId?: string;
  scan: Scan;
  onClose: () => void;
  onPage?: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");
  const { mode } = usePreferences();
  const { workspace, setPlatform, save } = useScanWorkspace();
  useEffect(() => {
    setIndex(
      Math.max(
        0,
        (issue ? occurrences(issue) : []).findIndex(
          (o) => o.id === initialOccurrenceId,
        ),
      ),
    );
    setMessage("");
  }, [issue?.id, initialOccurrenceId]);
  const all = issue ? occurrences(issue) : [];
  const occurrence = all[Math.min(index, Math.max(0, all.length - 1))];
  const explanation = issue ? explain(issue) : undefined;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(redactText(text));
      setMessage("Copied. Review the details before sharing them.");
    } catch {
      setMessage(
        "Clipboard access was unavailable. Select the visible details and copy them manually.",
      );
    }
  };
  const page = scan.pages.find((page) => page.url === occurrence?.pageUrl);
  return (
    <Dialog
      open={!!issue}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="issue-dialog">
        {issue && explanation && occurrence && (
          <>
            <DialogHeader>
              <div className="dialog-badges">
                <span className={`confidence confidence--${issue.confidence}`}>
                  {confidenceLabels[issue.confidence]}
                </span>
                {mode === "technical" && (
                  <SeverityBadge value={issue.severity} />
                )}
              </div>
              <DialogTitle>
                {mode === "technical" ? issue.title : explanation.title}
              </DialogTitle>
              <DialogDescription>{explanation.explanation}</DialogDescription>
            </DialogHeader>
            <div className="inspector-content">
              <section className="visitor-impact">
                <h3>Why this matters</h3>
                <p>{explanation.impact}</p>
              </section>
              <section className="affected-element">
                <div className="section-top">
                  <h3>Exact affected element</h3>
                  <span className="small-muted">
                    Place {index + 1} of {all.length}
                  </span>
                </div>
                <p className="break-url">{occurrence.pageUrl}</p>
                <h4>{elementDescription(occurrence, issue)}</h4>
                <p className="small-muted">
                  {occurrence.element
                    ? regionName(occurrence.element)
                    : occurrence.note}
                </p>
                {occurrence.element?.nearbyText && (
                  <p className="nearby-text">
                    Nearby: “{occurrence.element.nearbyText}”
                  </p>
                )}
                <div className="occurrence-controls">
                  {all.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setIndex(
                            (value) => (value - 1 + all.length) % all.length,
                          )
                        }
                      >
                        <ChevronLeft /> Previous occurrence
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setIndex((value) => (value + 1) % all.length)
                        }
                      >
                        Next occurrence <ChevronRight />
                      </Button>
                    </>
                  )}
                  {page && onPage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onPage(page.id);
                      }}
                    >
                      View affected page
                    </Button>
                  )}
                  {/^https?:\/\//.test(occurrence.pageUrl) && (
                    <a
                      className="text-link"
                      target="_blank"
                      rel="noreferrer"
                      href={occurrence.pageUrl}
                    >
                      Open live website <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <VisualEvidence scan={scan} occurrence={occurrence} />
              </section>
              <h3>What Buggd observed</h3>
              <p>{explanation.observed}</p>
              <h3>Suggested next action</h3>
              <p>{explanation.fix}</p>
              <PlatformSelect
                value={workspace.platform}
                onChange={(value) => {
                  void setPlatform(value).catch((error) =>
                    setMessage((error as Error).message),
                  );
                }}
              />
              <ol className="fix-steps">
                {platformGuidance(issue, workspace.platform).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {issue.grouping?.shared && (
                <p className="notice">
                  {issue.grouping.reason} You might only need to correct a
                  shared component once.
                </p>
              )}
              <details className="related-places">
                <summary>
                  {all.length} places affected · {issue.affectedPages.length}{" "}
                  pages
                </summary>
                {all.map((item, i) => (
                  <button
                    key={item.id}
                    className={i === index ? "selected" : ""}
                    onClick={() => setIndex(i)}
                  >
                    <span>{item.pageUrl}</span>
                    <strong>
                      {item.element?.text ||
                        item.element?.accessibleName ||
                        (item.element ? regionName(item.element) : "") ||
                        "Element not precisely located"}
                    </strong>
                  </button>
                ))}
              </details>
              <div className="copy-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void copy(
                      `${explanation.title}\n${explanation.impact}\n${occurrence.pageUrl}\n${explanation.fix}`,
                    )
                  }
                >
                  <Copy /> Copy issue summary
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copy(developerDetails(issue))}
                >
                  Copy developer details
                </Button>
                {workspace.platform === "unsure" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copy(aiFixPrompt(issue))}
                  >
                    Copy AI fixing prompt
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void copy(
                      JSON.stringify(
                        occurrence.element || {
                          page: occurrence.pageUrl,
                          note: occurrence.note,
                        },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  Copy element details
                </Button>
              </div>
              {message && (
                <p role="status" className="notice">
                  {message}
                </p>
              )}
              <Button
                asChild
                onClick={() => {
                  void save({ guidedIssueId: issue.id, guidedStep: 0 }).catch(
                    () => {},
                  );
                  onClose();
                }}
              >
                <a href={`#scan/${scan.id}/guide`}>
                  Add to guided fixing <ArrowRight />
                </a>
              </Button>
              <ReviewControls key={issue.id} issue={issue} />
              <TechnicalDetails issue={issue} occurrence={occurrence} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
