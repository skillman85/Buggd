# Buggd

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="web/public/brand/buggd-logo-dark.svg">
  <img src="web/public/brand/buggd-logo-light.svg" width="240" alt="Buggd">
</picture>

**Find what’s broken.**

Buggd is a local-first, open-source website testing application by **James Hillman — James Builds Tech**. Enter a URL, run a real Chromium scan, and inspect evidence-backed findings without writing test journeys or creating an account.

This repository contains the **v1.1.0 release-ready source**. Cross-platform validation and documented limitations are tracked in the [release-readiness report](docs/final-release-readiness.md). **The npm package is not live until its first publication is verified on the public registry.**

## Quick start — npm publication

Requires **Node.js 22.12+** and npm. After `buggd@1.1.0` has been published and verified on the [npm registry](https://www.npmjs.com/package/buggd), launch Buggd with:

```sh
npx buggd
```

The local dashboard opens in your browser. If Chromium is missing, install it once and launch again:

```sh
npx buggd --install-browser
npx buggd
```

Buggd runs locally with no account, telemetry or cloud service. Scan only websites you own or have permission to test. The [security guide](docs/security.md) explains coverage and limitations.

## Run from source

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run browser:install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Enter an authorised website URL, optionally adjust scan limits, then click **Start scan**. Local development targets such as `http://localhost:3000` are supported. The dashboard's own server is excluded.

For the compiled application:

```sh
npm run build
npm start
# Or choose a port without opening a browser:
npm start -- --port 8787 --no-open
```

The CLI binds to loopback, selects an available port by default and opens the browser where supported. It reports missing Chromium and provides a first-run installation flow in the app. Stop with Ctrl+C. See [development.md](docs/development.md) for setup, browser dependencies and environment variables.

## What works

- Automatic, bounded same-origin link discovery and crawling.
- HTTP failures, missing images, console errors, uncaught exceptions, unfinished-content markers and common metadata/label checks.
- Responsive overflow, clipped-text and potentially obscured-control checks at 390, 768 and 1440px, with real screenshots.
- Semantic safe-control classification; isolated accordion, tab, dropdown and local-toggle inspection with network requests locked during actions.
- Native required-field, checkbox and email validity inspection with synthetic values, without submitting forms.
- Real-time scan events, cancellation, results overview, severity/category/evidence/page filters, issue and page inspectors, network and console views.
- Clickable discovered-page map with zoom, pan and fit; screenshot gallery and persistent history with deliberate deletion.
- Simple (default) and Technical reports from the same unchanged scanner observations.
- Human explanations, three evidence categories, prioritised fixes and grouped individual occurrences.
- Captured DOM bounds, viewport/scroll/DPR metadata and accurately aligned screenshot highlights, with explicit fallbacks.
- Recognised accessible-name computation, including labelled icons, SVG titles, hidden references and open shadow roots.
- Platform guidance for WordPress, Webflow, Framer, Squarespace, HTML, React and AI-built/unknown sites.
- Six-step guided fixing with saved review progress, linked rescans and coverage-aware comparisons.
- Standalone HTML, local Chromium PDF and structured JSON exports, with technical appendices and no uploads.
- Approved olive/lime light, dark and system themes; self-hosted typography and path-based SVG logos.

There are no accounts, analytics, cloud databases, AI calls or automatic uploads. Scans are stored in `~/.buggd` by default. Retention is bounded to 50 scans and 512 MiB of recorded screenshot evidence.

## Actual interface

Representative application screenshots will be added after a fresh Buggd run against a safe, synthetic demonstration website. No private saved-site evidence is included in this repository.


See the [Issues-screen review](docs/issues-screen-review.md) for the corrected hierarchy, count definitions and read-only investigation of the actual saved naming findings.

## What the results mean

**Problems found** have direct browser/DOM/HTTP evidence. **Things to check** need human review. **Checks not performed** identify operations excluded by safety or coverage and never count as website problems. “No observable response” does not prove a control is broken. Findings are not an overall quality score.

The browser proxy allows only the exact target origin. External links and cross-origin navigation remain excluded. By default, external resources are blocked too. The explicit public-assets option can retrieve eligible images, fonts, styles and scripts using anonymous, bounded GET requests with public-IP validation on each redirect. It does not permit private networks, authenticated requests or external API calls. Sites that require external assets can render incompletely. Unknown controls, custom form validation, backend submissions and authenticated workflows are not verified. Visual geometry and common naming checks do not constitute comprehensive accessibility, SEO, visual-design or security audits.

Test only websites you own or are authorised to test. Even loading a GET page can cause a side effect on an incorrectly designed server. Screenshots and website text may contain private information; review reports before sharing. Read [security.md](docs/security.md) for the scope, safeguards and practical limits.

## Validate and package locally

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm pack --dry-run
npm pack
npm run package:smoke
```

`npm test` includes real Chromium integration tests. Install Chromium first. The tarball contains the compiled CLI/server and production frontend; consumers do not need TypeScript tooling.

To install the generated candidate in another local directory:

```sh
npm install /absolute/path/to/Buggd/buggd-1.1.0.tgz
npx --no-install buggd --install-browser
npx --no-install buggd
```

These commands use the locally installed tarball. They do not establish that a public npm release exists. Nothing in this repository automatically publishes, pushes or deploys the application.

See the [final release audit](docs/final-release-readiness.md) for verified results and outstanding publication gates.

## Contributor reference

- [Architecture and repository structure](docs/architecture.md)
- [Development and platform guidance](docs/development.md)
- [Security and coverage limits](docs/security.md)
- [Brand vector sources and usage](docs/brand/README.md)
- [Release acceptance and verification](docs/release-review.md)
- [Contributing](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md) · [Future work](docs/roadmap.md)

Manual “Fix attempted” and “Dismissed” statuses record your work; they never mean Buggd verified a fix. A comparison reports an observation as resolved only when the affected page and relevant check completed with a sufficiently matched element or resource. Missing, cancelled or ambiguous coverage says **Unable to verify**. Older scans remain readable, with no invented coordinates.

The approved raster branding board is a reference asset. The application uses reusable SVG geometry and theme-aware React components. The reconstructed vectors approximate the supplied image; they are not an original designer master.

MIT licence. Copyright © 2026 James Hillman. Third-party font and component notices are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `docs/brand/font-licenses/`.
