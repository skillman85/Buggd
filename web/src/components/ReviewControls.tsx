import { useEffect, useState } from "react";
import type { Issue } from "../../../src/shared/schemas";
import type { Review } from "../../../src/shared/evidence";
import { useScanWorkspace } from "../contexts/ScanWorkspace";
import { Button } from "./ui/button";
export function ReviewControls({ issue }: { issue: Issue }) {
  const { workspace, review, ready } = useScanWorkspace();
  const current = workspace.reviews[issue.id];
  const [status, setStatus] = useState<Review["status"]>(
    current?.status || "not-reviewed",
  );
  const [reason, setReason] = useState(current?.reason || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setStatus(current?.status || "not-reviewed");
    setReason(current?.reason || "");
  }, [current?.status, current?.reason, issue.id]);
  const submit = async () => {
    if (status === "dismissed" && !reason.trim()) {
      setMessage("Add a reason before dismissing this issue.");
      return;
    }
    setBusy(true);
    try {
      await review(issue.id, status, reason);
      setMessage("Review progress saved. This does not verify a fix.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="review-controls">
      <h3>Mark your progress</h3>
      <label>
        Review status
        <select
          aria-label="Review status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as Review["status"])
          }
        >
          <option value="not-reviewed">Not reviewed</option>
          <option value="reviewing">Reviewing</option>
          <option value="fix-attempted">Fix attempted</option>
          <option value="dismissed">Dismissed with reason</option>
        </select>
      </label>
      {status === "dismissed" && (
        <label>
          Why are you dismissing it?
          <textarea
            aria-label="Dismissal reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
          />
        </label>
      )}
      <Button variant="outline" onClick={submit} disabled={!ready || busy}>
        {busy ? "Saving…" : "Save review progress"}
      </Button>
      <p className="field-help">
        Only a sufficiently covered rescan can verify that Buggd no longer
        detects this issue.
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
