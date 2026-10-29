import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bug,
  CircleAlert,
  FileText,
  FolderClock,
  GitBranch,
  Image,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Monitor,
  Plus,
  Settings2,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import { Logo } from "./components/brand";
import { ThemeSwitcher } from "./theme/ThemeSwitcher";
import { Button } from "./components/ui/button";
import { NewScan } from "./pages/NewScan";
import type { Capabilities } from "./pages/NewScan";
import { ScanResults, resultTabs } from "./pages/ScanResults";
import type { ResultTab } from "./pages/ScanResults";
import { History } from "./pages/History";
import { useScan } from "./hooks/useScan";
import { api } from "./lib/api";
import type { Scan } from "../../src/shared/schemas";
import { counts } from "../../src/reporting/explanations";
import { DisplayModeSwitcher } from "./contexts/Preferences";
import type { Confidence } from "../../src/shared/schemas";
import { terminal } from "../../src/shared/schemas";

type Route = {
  view: "new" | "history" | "scan" | "settings";
  id: string;
  tab: ResultTab;
  filter?: Confidence;
};
function currentRoute(): Route {
  const parts = location.hash.slice(1).split("/");
  const base: Route = { view: "new", id: "", tab: "overview" };
  if (parts[0] === "history" || parts[0] === "settings")
    return { ...base, view: parts[0] };
  if (parts[0] === "scan" && /^[0-9a-f-]{36}$/i.test(parts[1] || ""))
    return {
      view: "scan",
      id: parts[1],
      tab: resultTabs.includes(parts[2]?.split("?")[0] as ResultTab)
        ? (parts[2].split("?")[0] as ResultTab)
        : "overview",
      filter: ["confirmed", "potential", "not-tested"].includes(
        new URLSearchParams(parts[2]?.split("?")[1]).get("confidence") || "",
      )
        ? (new URLSearchParams(parts[2]?.split("?")[1]).get(
            "confidence",
          ) as Confidence)
        : undefined,
    };
  return base;
}

export function App() {
  const [route, setRoute] = useState(currentRoute);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");
  const [capabilities, setCapabilities] = useState<Capabilities>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const previousScan = useRef<
    { id: string; status: Scan["status"] } | undefined
  >(undefined);
  const { scan, error, reconnecting } = useScan(route.id);
  useEffect(() => {
    if (
      scan &&
      terminal(scan.status) &&
      previousScan.current?.id === scan.id &&
      !terminal(previousScan.current.status)
    )
      setToast(
        `Scan ${scan.status}. ${counts(scan).confirmed} confirmed problems; ${counts(scan).potential} potential issues; ${counts(scan).untested} unperformed-check records.`,
      );
    previousScan.current = scan
      ? { id: scan.id, status: scan.status }
      : undefined;
  }, [scan?.id, scan?.status]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        requestAnimationFrame(() =>
          document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus(),
        );
      }
    };
    document.addEventListener("keydown", close);
    document.querySelector<HTMLAnchorElement>(".sidebar-new")?.focus();
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);
  const refresh = useCallback(() => {
    api<Scan[]>("/scans")
      .then((data) => {
        setScans(data);
        setServerError("");
      })
      .catch((reason) => setServerError((reason as Error).message))
      .finally(() => setLoading(false));
  }, []);
  const refreshCapabilities = useCallback(() => {
    api<Capabilities>("/capabilities")
      .then(setCapabilities)
      .catch(() => {});
  }, []);
  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute());
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    refresh();
    refreshCapabilities();
  }, [route.view, scan?.status, refresh, refreshCapabilities]);
  useEffect(() => {
    if (capabilities?.installation.status !== "running") return;
    const timer = setInterval(refreshCapabilities, 1000);
    return () => clearInterval(timer);
  }, [capabilities?.installation.status, refreshCapabilities]);
  useEffect(() => {
    document.title = `Buggd — ${route.view === "new" ? "Find what’s broken." : route.view === "history" ? "Scan history" : route.view === "settings" ? "Settings" : "Scan results"}`;
  }, [route.view]);
  const resultId = route.id || scans[0]?.id;
  const resultLink = (tab: ResultTab) =>
    resultId ? `#scan/${resultId}/${tab}` : "#history";
  const nav = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "#new",
      active: route.view === "new",
    },
    {
      label: "Scans",
      icon: FolderClock,
      href: "#history",
      active: route.view === "history",
    },
    {
      label: "Issues",
      icon: CircleAlert,
      href: resultLink("issues"),
      active: route.view === "scan" && route.tab === "issues",
      count: scan ? counts(scan).confirmed + counts(scan).potential : 0,
    },
    {
      label: "Pages",
      icon: FileText,
      href: resultLink("pages"),
      active: route.view === "scan" && route.tab === "pages",
    },
    {
      label: "Screenshots",
      icon: Image,
      href: resultLink("screenshots"),
      active: route.view === "scan" && route.tab === "screenshots",
    },
    {
      label: "Your website pages",
      icon: GitBranch,
      href: resultLink("sitemap"),
      active: route.view === "scan" && route.tab === "sitemap",
    },
  ];
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="app-sidebar"
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
      >
        <a href="#new" aria-label="Buggd home" className="sidebar-logo">
          <Logo decorative width={132} />
        </a>
        <button
          className="mobile-close"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>
        <Button asChild className="sidebar-new">
          <a href="#new">
            <Plus size={16} /> New scan
          </a>
        </Button>
        <span className="sidebar-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
              {!!item.count && <span className="nav-count">{item.count}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <span>
              <ShieldCheck size={17} />
              <strong>Your scans stay yours.</strong>
            </span>
            <p>
              No cloud. No accounts.
              <br />
              Just you and your website.
            </p>
          </div>
          <nav aria-label="Preferences">
            <a
              href="#settings"
              aria-current={route.view === "settings" ? "page" : undefined}
            >
              <Settings2 size={16} /> Settings
            </a>
            <a
              href="https://github.com/skillman85/Buggd"
              target="_blank"
              rel="noreferrer"
            >
              <Terminal size={16} /> View on GitHub <ArrowUpRight size={12} />
            </a>
          </nav>
          <p className="version-label">v1.1.0-rc.1 · James Builds Tech</p>
        </div>
      </aside>
      <div className="workspace" inert={menuOpen || undefined}>
        <header className="workspace-header">
          <div>
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              aria-controls="app-sidebar"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu />
            </button>
            <span className="header-crumb">
              Workspace <span>/</span>{" "}
              <strong>
                {route.view === "new"
                  ? "New scan"
                  : route.view === "history"
                    ? "Scan history"
                    : route.view === "settings"
                      ? "Settings"
                      : "Scan results"}
              </strong>
            </span>
          </div>
          <div className="header-right">
            <DisplayModeSwitcher />
            <span className="local-indicator">
              <span className="status-dot" /> Local-first
            </span>
            <ThemeSwitcher />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="app-main">
          {serverError && (
            <div className="error-message" role="alert">
              <strong>Local server connection unavailable</strong>
              <p>{serverError}</p>
              <Button variant="outline" onClick={refresh}>
                Retry connection
              </Button>
            </div>
          )}
          {route.view === "new" && (
            <NewScan
              scans={scans}
              loading={loading}
              capabilities={capabilities}
              refreshCapabilities={refreshCapabilities}
              onStarted={(created) => {
                refresh();
                location.hash = `scan/${created.id}/overview`;
              }}
            />
          )}
          {route.view === "history" &&
            (loading ? (
              <div className="empty-state">
                <LoaderCircle className="spin" />
                <p>Loading scan history…</p>
              </div>
            ) : (
              <History scans={scans} refresh={refresh} notify={setToast} />
            ))}
          {route.view === "scan" &&
            (error ? (
              <div className="error-message" role="alert">
                {error}
                <p>
                  <a href="#history">Return to scan history →</a>
                </p>
              </div>
            ) : scan ? (
              <ScanResults
                key={scan.id}
                scan={scan}
                tab={route.tab}
                reconnecting={reconnecting}
                initialConfidence={route.filter}
              />
            ) : (
              <div className="empty-state" role="status">
                <LoaderCircle className="spin" />
                <p>Loading scan results…</p>
              </div>
            ))}
          {route.view === "settings" && (
            <Settings capabilities={capabilities} />
          )}
          <footer className="workspace-footer">
            <span>
              <Bug size={12} /> Find what’s broken.
            </span>
            <span>
              Built by James Hillman <span className="footer-dot">·</span> Open
              source, always.
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast-message">
          <ShieldCheck size={17} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Settings({ capabilities }: { capabilities?: Capabilities }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>Settings</h1>
        </div>
      </div>
      <div className="settings-panels">
        <section className="panel">
          <div className="settings-icon">
            <Monitor />
          </div>
          <h2>Appearance</h2>
          <p className="small-muted">
            Choose light, dark or follow your system. Your preference is saved
            in this browser.
          </p>
          <ThemeSwitcher />
          <DisplayModeSwitcher />
        </section>
        <section className="panel">
          <div className="settings-icon">
            <ShieldCheck />
          </div>
          <h2>Local storage & privacy</h2>
          <p>
            Scan reports and screenshots are stored in your local Buggd data
            directory. There are no accounts, analytics or cloud uploads.
          </p>
          <p className="small-muted">
            Retention: up to 50 scans and 512 MiB of evidence. Remove individual
            scans from Scan history. Review screenshots before sharing exported
            reports.
          </p>
          <a className="text-link" href="#history">
            Manage scan history →
          </a>
        </section>
        <section className="panel">
          <div className="settings-icon">
            <Activity />
          </div>
          <h2>Browser runtime</h2>
          <p>
            {capabilities?.browserAvailable
              ? "Playwright Chromium is installed."
              : "Chromium is not installed or could not be located."}
          </p>
          <p className="small-muted">
            The New scan screen provides browser setup when needed. Linux may
            also require operating-system libraries.
          </p>
          <pre className="evidence-code">buggd --install-browser</pre>
        </section>
        <section className="panel">
          <h2>What Buggd can tell you</h2>
          <p>
            Buggd inspects discovered pages, resources, common metadata,
            responsive overflow, native form constraints and recognised safe UI
            controls.
          </p>
          <p className="small-muted">
            It does not verify authenticated journeys, backend form processing,
            all visual overlaps, every custom control, or comprehensive
            accessibility/security/SEO compliance. Use it as an evidence-backed
            first pass.
          </p>
        </section>
      </div>
    </>
  );
}
