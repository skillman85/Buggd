import type { Scan } from "../../../src/shared/schemas";
import { resultCounts } from "../../../src/reporting/issue-presentation";
import { summary } from "../../../src/reporting/explanations";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
export function ResultSummary({ scan }: { scan: Scan }) {
  const totals = resultCounts(scan);
  return (
    <section className="report-summary panel" aria-label="Scan summary">
      <p className="eyebrow">YOUR WEBSITE CHECK-UP</p>
      <h2>
        {totals.confirmed
          ? "Here is what needs attention."
          : totals.potential
            ? `${totals.potential} ${totals.potential === 1 ? "thing needs" : "things need"} checking.`
            : "No problems found in the checks completed."}
      </h2>
      <p>{summary(scan)}</p>
      <div className="result-buckets">
        <a href={`#scan/${scan.id}/issues?confidence=confirmed`}>
          <strong>{totals.confirmed}</strong>
          <span>Confirmed problems</span>
          <small>Supported by direct evidence →</small>
        </a>
        <a href={`#scan/${scan.id}/issues?confidence=potential`}>
          <strong>{totals.potential}</strong>
          <span>Potential issues</span>
          <small>Needs human checking →</small>
        </a>
        <a href={`#scan/${scan.id}/issues?confidence=not-tested`}>
          <strong>{totals.untested}</strong>
          <span>Checks not performed</span>
          <small>Coverage records, not defects →</small>
        </a>
      </div>
      <div className="observation-counts">
        <p>
          <strong>{totals.occurrences}</strong>
          <span>Recorded occurrences</span>
          <small>
            Repeats across pages and screen sizes, not extra problems.
          </small>
        </p>
        <p>
          <strong>{totals.completedChecks}</strong>
          <span>Checks completed</span>
          <small>Scanner checks performed, separate from findings.</small>
        </p>
      </div>
      <p className="count-explanation">
        Confirmed and potential counts refer to separate recorded findings.
        Topics below organise them for review; they do not combine the evidence
        or prove a shared cause.
      </p>
      <div className="copy-actions">
        <Button asChild>
          <a href={`#scan/${scan.id}/guide`}>
            Help me fix my website <ArrowRight />
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`#scan/${scan.id}/pages`}>Open affected pages</a>
        </Button>
      </div>
    </section>
  );
}
