import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DisplayMode, Platform } from "../../../src/shared/evidence";
import { platformSchema, platformLabels } from "../../../src/shared/evidence";
type Preferences = {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
  platform: Platform;
  setPlatform: (value: Platform) => void;
};
const Context = createContext<Preferences | null>(null);
function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Session preference still works without storage. */
  }
}
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [mode, updateMode] = useState<DisplayMode>(() =>
    read("buggd.displayMode", "simple") === "technical"
      ? "technical"
      : "simple",
  );
  const [platform, updatePlatform] = useState<Platform>(
    () =>
      platformSchema.safeParse(read("buggd.platform", "unsure")).data ||
      "unsure",
  );
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "buggd.displayMode")
        updateMode(event.newValue === "technical" ? "technical" : "simple");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <Context.Provider
      value={{
        mode,
        setMode: (value) => {
          updateMode(value);
          save("buggd.displayMode", value);
        },
        platform,
        setPlatform: (value) => {
          updatePlatform(value);
          save("buggd.platform", value);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error("PreferencesProvider is required.");
  return context;
}
export function DisplayModeSwitcher() {
  const { mode, setMode } = usePreferences();
  return (
    <label className="display-mode-control">
      <span>Report view</span>
      <select
        aria-label="Report display mode"
        value={mode}
        onChange={(event) => setMode(event.target.value as DisplayMode)}
      >
        <option value="simple">Simple</option>
        <option value="technical">Technical</option>
      </select>
    </label>
  );
}
export function PlatformSelect({
  value,
  onChange,
}: {
  value: Platform;
  onChange: (value: Platform) => void;
}) {
  return (
    <label className="platform-select">
      Website platform
      <select
        aria-label="Website platform"
        value={value}
        onChange={(event) => onChange(event.target.value as Platform)}
      >
        {Object.entries(platformLabels).map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
