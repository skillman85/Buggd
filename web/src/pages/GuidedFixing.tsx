import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Copy } from "lucide-react";
import type { Scan, Issue } from "../../../src/shared/schemas";
import {
  explain,
  prioritised,
  occurrences,
  priority,
  platformGuidance,
  aiFixPrompt,
  elementTitle,
} from "../../../src/reporting/explanations";
import { Button } from "../components/ui/button";
import { VisualEvidence } from "../components/VisualEvidence";
import { ReviewControls } from "../components/ReviewControls";
import { TechnicalDetails } from "../components/TechnicalDetails";
import { useScanWorkspace } from "../contexts/ScanWorkspace";
import {
  elementDescription,
  regionName,
} from "../../../src/reporting/issue-presentation";
import { PlatformSelect, usePreferences } from "../contexts/Preferences";
import { api } from "../lib/api";
const steps = [
  "Choose an issue",
  "See where it is",
  "Understand the impact",
  "Follow the guidance",
  "Mark your progress",
  "Rescan and verify",
];
export function GuidedFixing({
  scan,
  onIssue,
}: {
  scan: Scan;
  onIssue: (issue: Issue) => void;
}) {
  const { workspace, ready, error, save, setPlatform } = useScanWorkspace();
  const { mode } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showReviewed, setShowReviewed] = useState(false);
  const tasks = prioritised(
    scan.issues.filter((issue) => issue.confidence !== "not-tested"),
  );
  const reviewed = tasks.filter((issue) =>
    ["fix-attempted", "dismissed"].includes(
      workspace.reviews[issue.id]?.status,
    ),
  ).length;
  const index = Math.max(
    0,
    tasks.findIndex((issue) => issue.id === workspace.guidedIssueId),
  );
  const issue = tasks[index];
  const step = workspace.guidedStep;
  const stepNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = stepNav.current,
      active = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (nav && active)
      nav.scrollLeft +=
        active.getBoundingClientRect().left -
        nav.getBoundingClientRect().left -
        (nav.clientWidth - active.clientWidth) / 2;
  }, [step, ready]);
  const explanation = issue ? explain(issue) : undefined;
  const occurrence = issue ? occurrences(issue)[0] : undefined;
  const move = async (nextIssue = issue?.id, nextStep = step) => {
    try {
      await save({ guidedIssueId: nextIssue, guidedStep: nextStep });
    } catch (reason) {
      setMessage((reason as Error).message);
    }
  };
  const rescan = async () => {
    setBusy(true);
    setMessage("");
    try {
      const next = await api<Scan>("/scans", {
        method: "POST",
        body: JSON.stringify({
          ...scan.settings,
          url: scan.url,
          platform: workspace.platform,
          previousScanId: scan.id,
        }),
      });
      location.hash = `scan/${next.id}/compare`;
    } catch (reason) {
      setMessage((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!ready)
    return (
      <div className="empty-state" role="status">
        {error || "Loading your saved fixing progress…"}
      </div>
    );
  if (!issue || (!showReviewed && reviewed === tasks.length))
    return (
      <section className="panel guided-empty">
        <h2>No guided tasks remaining.</h2>
        <p>
          {tasks.length
            ? "You have attempted a fix or dismissed each task. These manual statuses do not verify that the website is fixed."
            : "No confirmed or potential problems were recorded in this scan. Check the untested functions yourself."}
        </p>
        <Button onClick={rescan} disabled={busy}>
          Rescan website <RotateCw />
        </Button>
        {tasks.length > 0 && (
          <Button variant="outline" onClick={() => setShowReviewed(true)}>
            Review previous tasks
          </Button>
        )}
        {message && <p role="alert">{message}</p>}
      </section>
    );
  return (
    <section className="guided-panel">
      <div className="section-top">
        <div>
          <p className="eyebrow">HELP ME FIX MY WEBSITE</p>
          <h2>One clear step at a time.</h2>
          <p className="small-muted">
            {reviewed} of {tasks.length} issues marked fix attempted or
            dismissed. Progress is saved locally.
          </p>
        </div>
        <span className="count-pill neutral">
          Issue {index + 1} / {tasks.length}
        </span>
      </div>
      <p className="small-muted" role="status">
        Step {step + 1} of {steps.length}: {steps[step]}
      </p>
      <nav
        ref={stepNav}
        className="guided-steps"
        aria-label="Guided fixing steps"
      >
        {steps.map((label, i) => (
          <button
            key={label}
            aria-current={step === i ? "step" : undefined}
            onClick={() => void move(issue.id, i)}
          >
            <span>{i + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className="guided-task">
        <span className={`priority priority-${issue.confidence}`}>
          {priority(issue)}
        </span>
        <h2>{explanation!.title}</h2>
        <p>{explanation!.explanation}</p>
        {step === 0 && (
          <>
            <p>
              Start with this prioritised issue, or choose another one below.
            </p>
            <label>
              Choose an issue
              <select
                aria-label="Choose guided issue"
                value={issue.id}
                onChange={(event) => void move(event.target.value, 0)}
              >
                {tasks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {priority(item)} — {explain(item).title} ·{" "}
                    {elementDescription(occurrences(item)[0], item)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {step === 1 && occurrence && (
          <>
            <h3>See exactly where it is</h3>
            <p className="break-url">{occurrence.pageUrl}</p>
            <p>
              {occurrence.element?.text ||
                occurrence.element?.accessibleName ||
                (occurrence.element
                  ? `${elementTitle(occurrence.element)} · ${regionName(occurrence.element)}`
                  : "") ||
                "No precise element was captured for this observation."}
            </p>
            <VisualEvidence scan={scan} occurrence={occurrence} />
            <Button variant="outline" onClick={() => onIssue(issue)}>
              Review all {occurrences(issue).length} places affected
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <h3>Why this matters to visitors</h3>
            <p>{explanation!.impact}</p>
            <h3>What Buggd actually observed</h3>
            <p>{explanation!.observed}</p>
            <p className="notice">
              {issue.confidence === "confirmed"
                ? "This problem has direct evidence. The proposed cause or fix still needs your judgement."
                : "This needs human confirmation. Buggd has not proved the control or layout is broken."}
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <h3>Follow the recommended fix</h3>
            <PlatformSelect
              value={workspace.platform}
              onChange={(value) =>
                void setPlatform(value).catch((reason) =>
                  setMessage((reason as Error).message),
                )
              }
            />
            <ol className="fix-steps">
              {platformGuidance(issue, workspace.platform).map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ol>
            {workspace.platform === "unsure" && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(aiFixPrompt(issue))
                      .then(() =>
                        setMessage(
                          "Verified issue details copied. No source file has been assumed.",
                        ),
                      )
                      .catch(() =>
                        setMessage(
                          "Clipboard unavailable. Copy the prompt below manually.",
                        ),
                      )
                  }
                >
                  <Copy /> Copy AI fixing prompt
                </Button>
                {mode === "technical" && (
                  <details>
                    <summary>View the prompt</summary>
                    <pre className="evidence-code">{aiFixPrompt(issue)}</pre>
                  </details>
                )}
              </>
            )}
            <TechnicalDetails issue={issue} occurrence={occurrence} />
          </>
        )}
        {step === 4 && <ReviewControls key={issue.id} issue={issue} />}
        {step === 5 && (
          <>
            <h3>Check what changed</h3>
            <p>
              Rescan the website after publishing your changes. Buggd will
              compare the actual observations and check whether the relevant
              page, element and check were covered.
            </p>
            <p className="field-help">
              A skipped page, blocked check or uncertain element match will say
              “Unable to verify”, rather than “Fixed”.
            </p>
            <Button onClick={rescan} disabled={busy}>
              <RotateCw />
              {busy ? "Starting rescan…" : "Rescan website"}
            </Button>
          </>
        )}
      </div>
      <div className="guided-navigation">
        <Button
          variant="outline"
          onClick={() => void move(issue.id, Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ArrowLeft /> Previous step
        </Button>
        <Button
          onClick={() => void move(issue.id, Math.min(5, step + 1))}
          disabled={step === 5}
        >
          Next step <ArrowRight />
        </Button>
      </div>
      <div className="guided-issue-navigation">
        <Button
          variant="ghost"
          onClick={() =>
            void move(tasks[(index - 1 + tasks.length) % tasks.length].id, 0)
          }
        >
          Previous issue
        </Button>
        <Button
          variant="ghost"
          onClick={() => void move(tasks[(index + 1) % tasks.length].id, 0)}
        >
          Skip issue
        </Button>
        <Button
          variant="ghost"
          onClick={() => void move(tasks[(index + 1) % tasks.length].id, 0)}
        >
          Next issue
        </Button>
      </div>
      {(message || error) && (
        <p role="status" className="notice">
          {message || error}
        </p>
      )}
    </section>
  );
}
