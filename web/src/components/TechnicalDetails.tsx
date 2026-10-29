import type { Issue } from "../../../src/shared/schemas";
import type { Occurrence } from "../../../src/shared/evidence";
import { explain } from "../../../src/reporting/explanations";
import { usePreferences } from "../contexts/Preferences";
export function TechnicalDetails({
  issue,
  occurrence,
}: {
  issue: Issue;
  occurrence?: Occurrence;
}) {
  const { mode } = usePreferences();
  const element = occurrence?.element;
  if (mode !== "technical")
    return (
      <p className="field-help">
        Switch to Technical view for original messages, rules and measured
        element details.
      </p>
    );
  return (
    <details
      className="technical-details"
      open={mode === "technical" || undefined}
    >
      <summary>Technical information</summary>
      <dl className="detail-list">
        <div>
          <dt>Original detector message</dt>
          <dd>{issue.title}</dd>
        </div>
        <div>
          <dt>Detection rule</dt>
          <dd>
            <code>{issue.checkId}</code>
          </dd>
        </div>
        <div>
          <dt>CSS / DOM selector</dt>
          <dd>
            <code>
              {element?.locator ||
                issue.element ||
                "No precise selector available"}
            </code>
          </dd>
        </div>
        <div>
          <dt>Accessible name</dt>
          <dd>
            {element?.accessibleName ||
              "No name observed or no element captured"}
          </dd>
        </div>
        {issue.resource && (
          <div>
            <dt>Resource / destination</dt>
            <dd>{issue.resource}</dd>
          </div>
        )}
        <div>
          <dt>Evidence classification</dt>
          <dd>
            {issue.confidence} · Severity {issue.severity}
          </dd>
        </div>
      </dl>
      {element && (
        <>
          <h4>Escaped HTML fragment</h4>
          <pre className="evidence-code">{element.html}</pre>
          <h4>Measured element data</h4>
          <pre className="evidence-code">
            {JSON.stringify(element, null, 2)}
          </pre>
        </>
      )}
      <h4>Raw evidence</h4>
      <pre className="evidence-code">
        {occurrence?.evidence || issue.evidence}
      </pre>
      <h4>Developer guidance</h4>
      <p>{explain(issue).developer}</p>
    </details>
  );
}
