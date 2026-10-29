import { useState } from "react";
import {
  ChevronDown,
  Image as ImageIcon,
  Search,
  ArrowRight,
} from "lucide-react";
import type { Issue, Scan, Confidence } from "../../../src/shared/schemas";
import {
  explain,
  occurrences,
  priority,
  bucketLabels,
} from "../../../src/reporting/explanations";
import {
  problemGroups,
  elementDescription,
  regionName,
  pageTitle,
  captureLabel,
  namingCaution,
  occurrenceCount,
} from "../../../src/reporting/issue-presentation";
import type {
  ProblemGroup,
  ElementFolder,
} from "../../../src/reporting/issue-presentation";
import { Button } from "./ui/button";
type Select = (issue: Issue, occurrenceId?: string) => void;
function Finding({
  issue,
  scan,
  onSelect,
}: {
  issue: Issue;
  scan: Scan;
  onSelect: Select;
}) {
  const all = occurrences(issue),
    example = all[0],
    explanation = explain(issue);
  return (
    <article className="simple-finding" data-finding-id={issue.id}>
      <div className="simple-finding-heading">
        <div>
          <button
            className="finding-button"
            onClick={() => onSelect(issue, example?.id)}
          >
            {explanation.title}
          </button>
          <p className="element-identity">
            {elementDescription(example, issue)}
          </p>
        </div>
        <span className={`priority priority-${issue.confidence}`}>
          {priority(issue)}
        </span>
      </div>
      <dl className="element-facts">
        <div>
          <dt>Where</dt>
          <dd>
            {regionName(example?.element)} ·{" "}
            {pageTitle(scan, example?.pageUrl || issue.pageUrl)}
          </dd>
        </div>
        <div>
          <dt>Seen</dt>
          <dd>
            {captureLabel(example)} · {occurrenceCount(issue)} recorded{" "}
            {occurrenceCount(issue) === 1 ? "occurrence" : "occurrences"} on{" "}
            {issue.affectedPages.length}{" "}
            {issue.affectedPages.length === 1 ? "page" : "pages"}
          </dd>
        </div>
        {example?.element?.destination && (
          <div>
            <dt>Destination</dt>
            <dd>{example.element.destination}</dd>
          </div>
        )}
        {example?.element?.nearbyText && (
          <div>
            <dt>Nearby text</dt>
            <dd>“{example.element.nearbyText}”</dd>
          </div>
        )}
      </dl>
      {!example?.element && (
        <p className="field-help">
          This older observation has no precise element evidence. The original
          page and screenshot are still available where captured.
        </p>
      )}
      <div className="finding-next-action">
        <p>
          <strong>Next action</strong> {explanation.fix}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelect(issue, example?.id)}
        >
          {example?.screenshotId ? (
            <>
              <ImageIcon />
              View captured evidence
            </>
          ) : (
            "Review this finding"
          )}
          <ArrowRight />
        </Button>
      </div>
      {all.length > 1 && (
        <details className="finding-occurrences">
          <summary>See all {all.length} captured occurrences</summary>
          <ul>
            {all.map((o) => (
              <li key={o.id}>
                <div>
                  <strong>{pageTitle(scan, o.pageUrl)}</strong>
                  <span>{elementDescription(o, issue)}</span>
                  <small>
                    {regionName(o.element)} · {captureLabel(o)}
                    {o.screenshotId
                      ? " · Screenshot available"
                      : " · No screenshot captured"}
                  </small>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelect(issue, o.id)}
                >
                  Inspect this occurrence
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
function ElementGroup({
  folder,
  scan,
  onSelect,
}: {
  folder: ElementFolder;
  scan: Scan;
  onSelect: Select;
}) {
  const example = folder.example;
  if (folder.issues.length === 1)
    return <Finding issue={folder.issues[0]} scan={scan} onSelect={onSelect} />;
  return (
    <details className="similar-elements">
      <summary>
        <span>
          <strong>{elementDescription(example, folder.issues[0])}</strong>
          <small>
            {regionName(example?.element)} · {folder.issues.length} separate
            findings · {folder.occurrenceCount} recorded occurrences ·{" "}
            {folder.pages.length} pages
          </small>
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="similar-elements-body">
        <p className="field-help">
          These captures have matching element details, destinations and page
          regions. They may come from a shared component. Each original finding
          is kept separately below; a common cause has not been verified.
        </p>
        {folder.issues.map((issue) => (
          <Finding
            key={issue.id}
            issue={issue}
            scan={scan}
            onSelect={onSelect}
          />
        ))}
      </div>
    </details>
  );
}
function Group({
  group,
  scan,
  onSelect,
}: {
  group: ProblemGroup;
  scan: Scan;
  onSelect: Select;
}) {
  const caution = namingCaution(scan, group.issues);
  return (
    <details
      className={`problem-group ${group.confidence}`}
      data-problem-group={group.key}
    >
      <summary aria-label={`Review ${group.title}`}>
        <span className="problem-group-top">
          <span className={`confidence confidence--${group.confidence}`}>
            {bucketLabels[group.confidence]}
          </span>
          <span>
            {group.issues.length}{" "}
            {group.confidence === "not-tested"
              ? "coverage records"
              : "separate findings"}{" "}
            · {group.occurrenceCount}{" "}
            {group.confidence === "not-tested"
              ? "recorded exclusions"
              : "recorded occurrences"}{" "}
            · {group.pages.length} {group.pages.length === 1 ? "page" : "pages"}
          </span>
          <ChevronDown aria-hidden="true" />
        </span>
        <span role="heading" aria-level={3} className="problem-group-title">
          {group.title}
        </span>
        <span className="problem-impact">{group.impact}</span>
        <span className="problem-preview">
          <strong>Affected elements</strong>
          {group.elements.slice(0, 3).map((folder) => (
            <span key={folder.key}>
              {regionName(folder.example?.element)} ·{" "}
              {elementDescription(folder.example, folder.issues[0])}
            </span>
          ))}
          {group.elements.length > 3 && (
            <span>+ {group.elements.length - 3} more element sets</span>
          )}
        </span>
        <span className="problem-action">
          <strong>Next action</strong>
          {group.fix}
        </span>
        <span className="text-link group-review-link">
          Review affected elements <ArrowRight size={13} />
        </span>
      </summary>
      <div className="problem-group-body">
        {caution && (
          <p className="notice" role="note">
            {caution}
          </p>
        )}
        <p className="field-help">
          This topic is a way to browse related findings. It does not mean they
          all have the same cause. Open an element to review its own evidence.
        </p>
        {group.elements.map((folder) => (
          <ElementGroup
            key={folder.key}
            folder={folder}
            scan={scan}
            onSelect={onSelect}
          />
        ))}
      </div>
    </details>
  );
}
export function SimpleIssues({
  scan,
  onSelect,
  pageUrl,
  compact = false,
  initialConfidence = "",
}: {
  scan: Scan;
  onSelect: Select;
  pageUrl?: string;
  compact?: boolean;
  initialConfidence?: Confidence | "";
}) {
  const [search, setSearch] = useState("");
  const relevant = scan.issues.filter(
    (i) =>
      (!pageUrl || i.affectedPages.includes(pageUrl)) &&
      (!initialConfidence || i.confidence === initialConfidence),
  );
  const matched = relevant.filter((i) =>
    `${explain(i).title} ${occurrences(i)
      .map(
        (o) =>
          `${elementDescription(o, i)} ${regionName(o.element)} ${o.pageUrl}`,
      )
      .join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const groups = problemGroups(matched),
    actionable = groups.filter((g) => g.confidence !== "not-tested"),
    untested = groups.filter((g) => g.confidence === "not-tested");
  return (
    <section
      className="simple-issues issues-section"
      aria-label="Human-friendly issues"
    >
      <div className="section-top">
        <div>
          <h2>
            {pageUrl
              ? "What needs attention here"
              : initialConfidence === "not-tested"
                ? "What still needs a manual check"
                : "What needs attention"}
          </h2>
          <p className="small-muted">
            {actionable.length} {actionable.length === 1 ? "topic" : "topics"}{" "}
            to review. Open a topic to see its distinct findings, affected
            elements and next actions.
          </p>
        </div>
        {compact && (
          <a className="text-link" href={`#scan/${scan.id}/issues`}>
            Review all findings →
          </a>
        )}
      </div>
      {!compact && (
        <div className="simple-issue-tools">
          <label className="search-field">
            <Search size={14} />
            <input
              aria-label="Search affected elements"
              placeholder="Find a page, element or destination…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <p className="field-help">
            Technical view includes the full table, rule identifiers and
            advanced filters.
          </p>
        </div>
      )}
      {actionable.map((group) => (
        <Group key={group.key} group={group} scan={scan} onSelect={onSelect} />
      ))}
      {!actionable.length && initialConfidence !== "not-tested" && (
        <div className="empty-state compact">
          <div>
            <h3>
              {search
                ? "No affected elements match your search."
                : initialConfidence === "confirmed"
                  ? "No confirmed problems were recorded."
                  : "No problems found in the checks completed."}
            </h3>
            <p>
              {search
                ? "Try a page name or destination."
                : "Review potential findings and unperformed checks. This scan cannot guarantee that every part of the website works."}
            </p>
          </div>
        </div>
      )}
      {!!untested.length && !compact && (
        <section className="untested-section" aria-label="Checks not performed">
          <h2>Checks not performed</h2>
          <p className="small-muted">
            {matched.filter((i) => i.confidence === "not-tested").length}{" "}
            coverage records in {untested.length}{" "}
            {untested.length === 1 ? "topic" : "topics"}. These are not website
            problems and are excluded from the problem counts.
          </p>
          {untested.map((group) => (
            <Group
              key={group.key}
              group={group}
              scan={scan}
              onSelect={onSelect}
            />
          ))}
        </section>
      )}
      {!!untested.length && compact && (
        <p className="field-help">
          Unperformed checks are kept separately.{" "}
          <a
            className="text-link"
            href={`#scan/${scan.id}/issues?confidence=not-tested`}
          >
            Review coverage limits →
          </a>
        </p>
      )}
      {initialConfidence === "not-tested" && !untested.length && (
        <p className="empty-state compact">
          No unperformed-check records match this view. Review the scan’s
          general coverage limits.
        </p>
      )}
    </section>
  );
}
