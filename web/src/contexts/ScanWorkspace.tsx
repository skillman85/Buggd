import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Scan } from "../../../src/shared/schemas";
import { workspaceSchema } from "../../../src/shared/evidence";
import type { Workspace, Review, Platform } from "../../../src/shared/evidence";
import { api } from "../lib/api";
type Value = {
  workspace: Workspace;
  ready: boolean;
  error: string;
  save: (patch: Partial<Workspace>) => Promise<void>;
  review: (
    id: string,
    status: Review["status"],
    reason?: string,
  ) => Promise<void>;
  setPlatform: (value: Platform) => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function ScanWorkspaceProvider({
  scan,
  children,
}: {
  scan: Scan;
  children: ReactNode;
}) {
  const [workspace, setWorkspace] = useState(() =>
    workspaceSchema.parse({ platform: scan.settings.platform || "unsure" }),
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api<Workspace>(`/scans/${scan.id}/workspace`)
      .then((value) => {
        if (alive) {
          setWorkspace(value);
          setReady(true);
        }
      })
      .catch((reason) => {
        if (alive) setError((reason as Error).message);
      });
    return () => {
      alive = false;
    };
  }, [scan.id]);
  const save = useCallback(
    async (patch: Partial<Workspace>) => {
      setError("");
      try {
        setWorkspace(
          await api<Workspace>(`/scans/${scan.id}/workspace`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          }),
        );
      } catch (reason) {
        setError((reason as Error).message);
        throw reason;
      }
    },
    [scan.id],
  );
  return (
    <Context.Provider
      value={{
        workspace,
        ready,
        error,
        save,
        review: (id, status, reason = "") =>
          save({
            reviews: {
              [id]: { status, reason, updatedAt: new Date().toISOString() },
            },
          }),
        setPlatform: (platform) => save({ platform }),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useScanWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("ScanWorkspaceProvider is required.");
  return value;
}
