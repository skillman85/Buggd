import { useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  CircleCheck,
} from "lucide-react";
import type { Issue, Scan, Confidence } from "../../../src/shared/schemas";
import { categoryLabels } from "../../../src/shared/schemas";
import {
  bucketLabels,
  explain,
  prioritised,
  priority,
  occurrences,
} from "../../../src/reporting/explanations";
import { SimpleIssues } from "./SimpleIssues";
import { SeverityBadge } from "./IssueInspector";
import { pageName } from "../lib/format";
import { usePreferences } from "../contexts/Preferences";
export function IssuesTable({
  scan,
  onSelect,
  pageUrl,
  compact = false,
  initialConfidence = "",
}: {
  scan: Scan;
  onSelect: (issue: Issue, occurrenceId?: string) => void;
  pageUrl?: string;
  compact?: boolean;
  initialConfidence?: Confidence | "";
}) {
  const { mode } = usePreferences();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [confidence, setConfidence] = useState<string>(initialConfidence);
  const [pageFilter, setPageFilter] = useState("");
  const [sort, setSort] = useState<"priority" | "page">("priority");
  useEffect(() => setConfidence(initialConfidence), [initialConfidence]);
  const issues = prioritised(scan.issues).filter(
    (issue) =>
      (!pageUrl || issue.affectedPages.includes(pageUrl)) &&
      (!category || issue.category === category) &&
      (!severity || issue.severity === severity) &&
      (!confidence || issue.confidence === confidence) &&
      (!compact || issue.confidence !== "not-tested") &&
      (!pageFilter || issue.affectedPages.includes(pageFilter)) &&
      `${explain(issue).title} ${issue.title} ${issue.description} ${issue.resource || ""} ${issue.pageUrl} ${issue.evidence}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (sort === "page")
    issues.sort((a, b) => a.pageUrl.localeCompare(b.pageUrl));
  if (mode === "simple")
    return (
      <SimpleIssues
        key={initialConfidence}
        scan={scan}
        onSelect={onSelect}
        pageUrl={pageUrl}
        compact={compact}
        initialConfidence={initialConfidence}
      />
    );
  return (
    <section className="issues-section">
      <div className="section-top">
        <h2>
          {pageUrl
            ? "What needs attention here"
            : compact
              ? "What to look at first"
              : "Recorded findings"}{" "}
          <span className="small-muted">
            {issues.filter((i) => i.confidence === "confirmed").length}{" "}
            confirmed ·{" "}
            {issues.filter((i) => i.confidence === "potential").length}{" "}
            potential ·{" "}
            {issues.filter((i) => i.confidence === "not-tested").length}{" "}
            unperformed-check records
          </span>
        </h2>
        {compact && (
          <a className="text-link" href={`#scan/${scan.id}/issues`}>
            Review all issues →
          </a>
        )}
      </div>
      <div className="filter-bar">
        <span className="filter-label">
          <SlidersHorizontal size={14} /> Filters
        </span>
        <select
          aria-label="Filter category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All types</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {mode === "technical" && (
          <select
            aria-label="Filter severity"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option value="">Any severity</option>
            {["critical", "high", "medium", "low", "informational"].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        )}
        {!compact && (
          <>
            <select
              aria-label="Filter confidence"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
            >
              <option value="">All results</option>
              {Object.entries(bucketLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {!pageUrl && (
              <select
                aria-label="Filter page"
                value={pageFilter}
                onChange={(event) => setPageFilter(event.target.value)}
              >
                <option value="">All pages</option>
                {scan.pages.map((page) => (
                  <option key={page.id} value={page.url}>
                    {pageName(page.url)}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        <label className="search-field">
          <Search size={14} />
          <input
            aria-label="Search issues"
            placeholder="Search issues…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {issues.length ? (
        <div className="table-scroll">
          <table className="issues-table">
            <thead>
              <tr>
                <th>
                  {mode === "technical" ? "Finding" : "What needs attention"}
                </th>
                <th>
                  <button
                    onClick={() =>
                      setSort(sort === "page" ? "priority" : "page")
                    }
                  >
                    Page <ArrowUpDown size={11} />
                  </button>
                </th>
                <th>What we know</th>
                <th>{mode === "technical" ? "Severity" : "Next step"}</th>
              </tr>
            </thead>
            <tbody>
              {issues.slice(0, compact ? 8 : 1000).map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <button
                      className="finding-button"
                      onClick={() => onSelect(issue)}
                    >
                      <span
                        className={`issue-dot ${issue.confidence === "not-tested" ? "coverage" : issue.severity}`}
                        aria-hidden="true"
                      >
                        {issue.confidence === "not-tested"
                          ? "–"
                          : issue.confidence === "confirmed"
                            ? "!"
                            : "?"}
                      </span>
                      <span>
                        {mode === "technical"
                          ? issue.title
                          : explain(issue).title}
                        <small>
                          {occurrences(issue).length}{" "}
                          {occurrences(issue).length === 1 ? "place" : "places"}
                          {issue.grouping?.shared
                            ? " · possibly shared component"
                            : ""}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="table-url" title={issue.pageUrl}>
                      {pageName(issue.pageUrl)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`confidence confidence--${issue.confidence}`}
                    >
                      {bucketLabels[issue.confidence]}
                    </span>
                  </td>
                  <td>
                    {mode === "technical" ? (
                      <SeverityBadge value={issue.severity} />
                    ) : (
                      <span className={`priority priority-${issue.confidence}`}>
                        {priority(issue)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state compact">
          <CircleCheck />
          <div>
            <h3>
              {scan.issues.length
                ? "Nothing matches these filters."
                : "No problems found in the checks completed."}
            </h3>
            <p>
              {scan.issues.length
                ? "Try a different category or search."
                : "This does not guarantee every part of your website works. Review the checks not performed and test key visitor journeys yourself."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
