import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe2,
  Image,
  Link2,
  Code2,
  MousePointer2,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  LoaderCircle,
  Clock3,
  Download,
} from "lucide-react";
import type { Scan, ScanInput } from "../../../src/shared/schemas";
import { Button } from "../components/ui/button";
import { usePreferences, PlatformSelect } from "../contexts/Preferences";
import { counts } from "../../../src/reporting/explanations";
import { api } from "../lib/api";
import { date, duration, siteName } from "../lib/format";

export type Capabilities = {
  browserAvailable: boolean;
  installation: {
    status: "idle" | "running" | "installed" | "failed";
    message: string;
  };
  retention: { maxScans: number; maxEvidenceMiB: number };
};
const coverage = [
  {
    icon: Link2,
    name: "Links & resources",
    description: "Find broken destinations and failed assets.",
  },
  {
    icon: Code2,
    name: "JavaScript errors",
    description: "Catch exceptions and browser console errors.",
  },
  {
    icon: Smartphone,
    name: "Mobile and tablet display",
    description: "Inspect mobile, tablet and desktop widths.",
  },
  {
    icon: MousePointer2,
    name: "Safe interactions",
    description: "Inspect recognised UI controls in isolation.",
  },
  {
    icon: Image,
    name: "Images & page information",
    description: "Spot missing images, alt text and titles.",
  },
  {
    icon: ShieldCheck,
    name: "Forms & evidence",
    description: "Check native validation without submitting.",
  },
];

export function NewScan({
  scans,
  loading,
  capabilities,
  refreshCapabilities,
  onStarted,
}: {
  scans: Scan[];
  loading: boolean;
  capabilities?: Capabilities;
  refreshCapabilities: () => void;
  onStarted: (scan: Scan) => void;
}) {
  const { platform, setPlatform } = usePreferences();
  const [resourcePolicy, setResourcePolicy] = useState<
    "same-origin" | "public-assets"
  >("same-origin");
  const [url, setUrl] = useState("");
  const [settings, setSettings] = useState({
    maxPages: 25,
    concurrency: 2,
    timeout: 15000,
    maxDuration: 180000,
    interactions: true,
    maxInteractions: 6,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [installBusy, setInstallBusy] = useState(false);
  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onStarted(
        await api<Scan>("/scans", {
          method: "POST",
          body: JSON.stringify({
            url,
            ...settings,
            platform,
            resourcePolicy,
          } satisfies ScanInput),
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };
  const install = async () => {
    setInstallBusy(true);
    setError("");
    try {
      await api("/browser/install", { method: "POST" });
      refreshCapabilities();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setInstallBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LOCAL TESTING WORKSPACE</p>
          <h1>New scan</h1>
        </div>
        <span className="privacy-pill">
          <span className="status-dot" /> Running locally
        </span>
      </div>
      <section className="home-hero">
        <div>
          <p className="eyebrow accent">WEBSITE TESTING, MADE SIMPLE</p>
          <h2>
            Find what’s
            <br />
            <span>broken.</span>
          </h2>
          <p className="hero-description">
            Automatically inspect your website for broken links, errors and
            hidden issues — so you can ship with confidence.
          </p>
          <div className="trust-row">
            <span>
              <Check /> No accounts
            </span>
            <span>
              <Check /> Local reports
            </span>
            <span>
              <Check /> Open source
            </span>
          </div>
        </div>
        <div className="scan-card">
          <div className="card-label">
            <span className="icon-tile">
              <ScanLine />
            </span>
            <div>
              <h3>Give your website a once-over.</h3>
              <p>A URL is all you need to get started.</p>
            </div>
          </div>
          <form onSubmit={start}>
            <label htmlFor="website-url" className="field-label">
              Website URL
            </label>
            <div className="url-input">
              <Globe2 aria-hidden="true" />
              <input
                id="website-url"
                name="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://yourwebsite.com"
                required
                autoComplete="url"
                spellCheck={false}
                type="text"
                inputMode="url"
              />
            </div>
            <PlatformSelect value={platform} onChange={setPlatform} />
            <details className="scan-settings">
              <summary>
                <span>
                  <SlidersHorizontal size={14} /> Scan settings
                </span>
                <ChevronDown size={14} />
              </summary>
              <div className="settings-grid">
                <label>
                  External resources
                  <select
                    aria-label="External resource policy"
                    value={resourcePolicy}
                    onChange={(event) =>
                      setResourcePolicy(
                        event.target.value as "same-origin" | "public-assets",
                      )
                    }
                  >
                    <option value="same-origin">
                      Block external resources (default)
                    </option>
                    <option value="public-assets">
                      Allow bounded public images, fonts, styles and scripts
                    </option>
                  </select>
                </label>
                <label>
                  Maximum pages
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.maxPages}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        maxPages: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Concurrent pages
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={settings.concurrency}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        concurrency: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Page timeout (seconds)
                  <input
                    type="number"
                    min={1}
                    max={45}
                    value={settings.timeout / 1000}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        timeout: Number(event.target.value) * 1000,
                      })
                    }
                  />
                </label>
                <label>
                  Scan limit (seconds)
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={settings.maxDuration / 1000}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        maxDuration: Number(event.target.value) * 1000,
                      })
                    }
                  />
                </label>
                <label>
                  Interactions per page
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={settings.maxInteractions}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        maxInteractions: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={settings.interactions}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        interactions: event.target.checked,
                      })
                    }
                  />{" "}
                  Inspect safe interactions
                </label>
              </div>
              <p className="field-help">
                Form submissions and network writes are blocked. Unknown actions
                are skipped.
              </p>
            </details>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="start-button"
              disabled={busy || capabilities?.installation.status === "running"}
            >
              {busy ? <LoaderCircle className="spin" /> : <ScanLine />}{" "}
              {busy ? "Starting scan…" : "Start scan"} {!busy && <ArrowRight />}
            </Button>
            <p className="field-help authorisation">
              Only scan websites you own or are authorised to test.
            </p>
          </form>
        </div>
      </section>
      {capabilities && !capabilities.browserAvailable && (
        <div className="browser-notice">
          <Download size={20} />
          <div>
            <strong>One-time browser setup</strong>
            <p>
              Download Playwright Chromium to run real website scans. The
              download uses your internet connection and stays on this computer.
            </p>
            {capabilities.installation.status === "running" && (
              <p role="status">{capabilities.installation.message}</p>
            )}
            {capabilities.installation.status === "failed" && (
              <p role="alert">{capabilities.installation.message}</p>
            )}
          </div>
          <Button
            variant="outline"
            disabled={
              installBusy || capabilities.installation.status === "running"
            }
            onClick={install}
          >
            {capabilities.installation.status === "running"
              ? "Downloading…"
              : "Install Chromium"}
          </Button>
        </div>
      )}
      <section className="coverage-section" aria-labelledby="coverage-heading">
        <div className="section-top">
          <h2 id="coverage-heading">A useful first pass. Automatically.</h2>
          <span className="small-muted">Evidence, not guesswork.</span>
        </div>
        <div className="coverage-grid">
          {coverage.map((item) => (
            <div key={item.name}>
              <item.icon size={18} />
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="recent-section">
        <div className="section-top">
          <div>
            <h2>Recent scans</h2>
            <p className="small-muted">
              Stored on this computer. Ready when you are.
            </p>
          </div>
          <a className="text-link" href="#history">
            View all scans <ArrowRight size={13} />
          </a>
        </div>
        {loading ? (
          <div className="empty-state" role="status">
            <LoaderCircle className="spin" />
            <p>Loading local scans…</p>
          </div>
        ) : scans.length ? (
          <div className="recent-grid">
            {scans.slice(0, 3).map((scan) => (
              <a
                className="recent-card"
                key={scan.id}
                href={`#scan/${scan.id}/overview`}
              >
                <div>
                  <span className="icon-tile">
                    <Globe2 />
                  </span>
                  <span className={`scan-status ${scan.status}`}>
                    {scan.status}
                  </span>
                </div>
                <h3>{siteName(scan.url)}</h3>
                <p>
                  {
                    scan.pages.filter((page) => page.status === "completed")
                      .length
                  }{" "}
                  pages · {counts(scan).confirmed + counts(scan).potential}{" "}
                  issues · {counts(scan).untested} checks not performed
                </p>
                <div className="recent-meta">
                  <span>
                    <Clock3 size={11} /> {date(scan.createdAt)}
                  </span>
                  <span>
                    {scan.finishedAt && scan.startedAt
                      ? duration(
                          new Date(scan.finishedAt).getTime() -
                            new Date(scan.startedAt).getTime(),
                        )
                      : "In progress"}{" "}
                    <ArrowRight size={12} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <div className="empty-icon">
              <ScanLine />
            </div>
            <div>
              <h3>Your first scan starts here.</h3>
              <p>
                Enter a website URL above. Your results will appear here when
                you start a scan.
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
