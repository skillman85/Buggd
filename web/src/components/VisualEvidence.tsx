import { useEffect, useRef, useState } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import type { Scan } from "../../../src/shared/schemas";
import type { Occurrence } from "../../../src/shared/evidence";
import { elementTitle } from "../../../src/reporting/explanations";
import { highlightBounds } from "../../../src/reporting/geometry";
import { evidenceUrl } from "../lib/api";
import { Button } from "./ui/button";
export function VisualEvidence({
  scan,
  occurrence,
}: {
  scan: Scan;
  occurrence: Occurrence;
}) {
  const [highlight, setHighlight] = useState(true);
  const [zoom, setZoom] = useState(1);
  const mark = useRef<HTMLDivElement>(null);
  const page = scan.pages.find((page) => page.url === occurrence.pageUrl);
  const screenshot = [
    ...(page?.screenshots || []),
    ...(page?.detailScreenshots || []),
  ].find((s) => s.id === occurrence.screenshotId);
  const bounds = highlightBounds(occurrence, screenshot);
  useEffect(() => {
    setHighlight(true);
    setZoom(1);
  }, [occurrence.id]);
  const focus = () => {
    setHighlight((value) => !value);
    requestAnimationFrame(() =>
      mark.current?.scrollIntoView({ block: "nearest", inline: "nearest" }),
    );
  };
  if (!occurrence.screenshotId)
    return (
      <div className="empty-state compact">
        <p>
          No screenshot is available for this place. Open the affected page and
          use the identifying text to locate it.
        </p>
      </div>
    );
  return (
    <section className="visual-evidence">
      <div className="evidence-tools">
        {bounds && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={highlight}
            onClick={focus}
          >
            <Crosshair /> Highlight affected element
          </Button>
        )}
        <div>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Zoom screenshot out"
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
          >
            <Minus />
          </Button>
          <span>{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Zoom screenshot in"
            onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
          >
            <Plus />
          </Button>
        </div>
      </div>
      {screenshot?.note && (
        <p className="notice screenshot-warning">{screenshot.note}</p>
      )}
      <div className="evidence-viewport">
        <div className="image-plane" style={{ width: `${zoom * 100}%` }}>
          <img
            src={evidenceUrl(scan.id, occurrence.screenshotId)}
            alt={`Page screenshot associated with ${occurrence.element?.text || occurrence.element?.accessibleName || "this observation"}`}
          />
          {bounds && highlight && (
            <div
              ref={mark}
              data-testid="element-highlight"
              className="element-highlight"
              style={{
                left: `${bounds.left}%`,
                top: `${bounds.top}%`,
                width: `${bounds.width}%`,
                height: `${bounds.height}%`,
              }}
            >
              <span>
                {occurrence.element?.text ||
                  occurrence.element?.accessibleName ||
                  (occurrence.element
                    ? elementTitle(occurrence.element)
                    : "") ||
                  "Affected element"}
              </span>
            </div>
          )}
        </div>
      </div>
      {!bounds && (
        <p className="field-help">
          {occurrence.element?.alignmentNote ||
            occurrence.note ||
            "The element could not be precisely located in this screenshot. No coordinates have been guessed."}
        </p>
      )}
      {bounds && (
        <p className="field-help">
          The outline uses bounds measured with this screenshot. It does not
          link to a live element.
        </p>
      )}
    </section>
  );
}
