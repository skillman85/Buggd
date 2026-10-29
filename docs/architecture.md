# Architecture

The compiled CLI starts one loopback Fastify server and serves the production React bundle. Development uses the same API on port 8787 with Vite on 5173. Runtime execution uses plain JavaScript, not TypeScript tooling.

```text
src/cli/          Startup, browser bootstrap, default-browser opening and shutdown
src/server/       Session/origin/CSRF checks, routes, SSE and browser installer
src/shared/       Shared Zod schemas and TypeScript models
src/scanner/      Queue, crawler, guarded browser/proxy and issue deduplication
  checks/         Document metadata/content, image and browser observations
  interactions/   Semantic control classification and isolated UI checks
  forms/          Native validation-property inspection with synthetic values
  responsive/     Viewport geometry and bounded screenshot capture
  evidence/       Bundled accessible-name library, unique locators and scene alignment
src/reporting/    Pure explanations, projection, redaction and conservative comparisons
src/reports/      Atomic observations/workspace storage, evidence, HTML and offline PDF
web/src/          React application, shadcn components, themes and SVG branding
fixtures/         Deliberately defective local HTTP site
tests/            Unit, real-browser integration and full dashboard tests
```

One scan runs at a time, with up to three queued scans. Each scan processes bounded batches of pages (default two). Each page uses an isolated context; every safe interaction uses a fresh context and locks all network requests before executing the action. New scans do not inherit previous cookies or authentication state.

The manager owns lifecycle transitions, abort controllers, progress and persistence. SSE sends complete current snapshots, so reconnecting clients receive the latest state without needing a historical event log. Terminal events close the stream. Report writes are atomic and serialized per scan; intermediate snapshots are throttled to one write per second.

Detection modules emit the common issue model. Stable fingerprints group repeated check/evidence combinations and retain affected pages, occurrence counts, timestamps, locators and screenshots. Confirmed, potential and not-tested findings are distinct from severity.

Storage defaults to `~/.buggd`, outside the repository and installed package. Each UUID scan directory contains `scan.json`, UUID PNG files and a separate optional `workspace.json` for platform, reviews and guided steps. Retention is bounded to 50 scans and 512 MiB of recorded screenshot evidence; individual evidence and report sizes are capped. Interrupted scans become failed records at startup. Damaged/oversized records are skipped, not executed.

The sitemap uses actual same-origin link relationships and a bounded SVG layout. Zoom, background dragging, fit and keyboard page selection are implemented without an external graph service.

See [security](security.md) for proxy scope and isolation limits. No accounts, database, analytics, AI API or hosted service is used.

## v1.1 reporting flow

Checks emit original detector findings and per-place evidence. Resource events distinguish target failures, third-party failures, timeouts, browser restrictions and Buggd exclusions. Unique IDs or full structural paths (including open shadow hosts) distinguish controls; shared components are suggested only with repeated identity and region evidence.

`captureScene` measures before and after the actual CSS-scale PNG. Highlights require matching screenshot ID, viewport and scroll metadata and a stable measured rectangle/state. Extra offscreen/control captures live in `detailScreenshots`, preserving the three original viewport screenshots. Unmatched/moved/legacy observations retain unannotated evidence.

The typed explanation registry and priority/count helpers are shared by React and exports. Display mode changes presentation only. Reviews are serialised separately from immutable scan observations. PATCH schemas deliberately omit read-time defaults, so a step change cannot reset the platform or reviews.

Comparisons match detector, page, element/resource identity and evidence. Resolution requires a completed newer scan, affected page, relevant check, screen size and sufficient identity. Individual interaction/form coverage must match that element. Partial, blocked and structurally ambiguous results remain unable to verify; manual progress does not influence verification.

Owner HTML is scriptless and self-contained. PDFs use that report in offline Chromium with JavaScript disabled, network routing denied and bounded images/groups/size/concurrency. The browser has no untrusted live-page scripts in the report UI. JSON retains scanner observations plus a separate workspace object; known secrets and local home paths are redacted on export without changing stored data.
