<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="web/public/brand/buggd-logo-dark.svg">
    <img src="web/public/brand/buggd-logo-light.svg" width="270" alt="Buggd logo">
  </picture>
</p>

<h1 align="center">Buggd</h1>
<p align="center"><strong>Find what’s broken.</strong><br>Local-first website testing, with real browser evidence and fixes you can understand.</p>

<p align="center">
  <a href="https://github.com/skillman85/Buggd/actions/workflows/ci.yml"><img alt="Buggd CI" src="https://github.com/skillman85/Buggd/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-7B8B4D"></a>
  <img alt="Node.js 22.12+" src="https://img.shields.io/badge/Node.js-22.12%2B-333333">
</p>

<p align="center">
  <a href="#run-buggd-from-source">Get started</a> ·
  <a href="#what-buggd-checks">Features</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="docs/security.md">Security & limits</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

---

**Release status:** The source for **Buggd v1.1.0** is public and has passed Windows, Ubuntu and macOS CI on Node.js 22 and 24. **The npm package is not published:** the registry has blocked the unscoped name `buggd` pending a name review. The intended public command remains `npx buggd`, but **it will not install this application until npm publication succeeds**.

Buggd is a free, MIT-licensed website scanning and testing tool. Enter a website URL, let Chromium inspect it, then use a visual dashboard to understand what was observed, where it happened and what to check or fix. It runs on your computer — no signup, hosted account, paid API or mandatory AI service.

## Why Buggd?

Most website checks tell you that something is wrong. Buggd aims to show **which page and element**, the **browser evidence**, and **what to do next** — without burying a website owner in raw technical logs.

- **Simple mode:** clear explanations, grouped issues, individual affected elements and practical next steps.
- **Technical mode:** detailed browser and scanner observations for developers.
- **Evidence you can inspect:** screenshots, element highlights, page details, console/network observations and a navigable page map.
- **Check your fixes:** save a review state, run another scan and compare verified changes without confusing “fix attempted” with “fixed”.

## Run Buggd from source

Until npm approves the package name, this is the working way to try Buggd. You need [Node.js 22.12+](https://nodejs.org/en/download), npm and Git.

```bash
git clone https://github.com/skillman85/Buggd.git
cd Buggd
npm ci
npm run browser:install
npm run build
npm start
```

Buggd prints a local address and normally opens its dashboard in your browser. Enter a URL for a site you **own or have permission to test**, then choose **Start scan**. Scan history and screenshots are saved locally (by default under `~/.buggd`). Stop the server with **Ctrl+C**.

For local development instead of the compiled application:

```bash
npm run dev
```

The development UI runs at `http://127.0.0.1:5173`. On Linux, Chromium may additionally need operating-system dependencies; see [development setup](docs/development.md).

### Planned one-command install

Once npm approves and publishes the **unscoped** `buggd` package, the intended command is:

```bash
npx buggd
```

If Chromium is missing, Buggd offers an installation flow, or you can run `npx buggd --install-browser`. **These npm commands are not available for Buggd yet.** We will update this section when the actual registry install is independently verified.

## What Buggd checks

| Area | What you can inspect |
| --- | --- |
| Pages and links | Same-origin discovery, HTTP errors, broken links and missing resources |
| Browser problems | JavaScript exceptions, console errors and relevant network failures |
| Content and metadata | Common placeholders, empty descriptions and missing accessible names |
| Layouts | Responsive overflow, clipped text and potentially obscured controls at desktop, tablet and mobile sizes |
| Safe interactions | Recognised non-destructive controls and native form validity, without sending real form submissions |
| Reports | Local HTML, PDF and JSON exports with evidence and actionable explanations |
| Progress and comparison | Live scanning, cancellation, saved review progress, linked rescans and coverage-aware comparisons |

Buggd keeps **confirmed findings**, **things to check**, and **checks not performed** separate. An untested interaction does not count as a broken button. An attempted fix does not become a verified fix until a later scan has enough evidence.

### A quick workflow

1. **Scan:** enter an authorised URL and set page or scan limits if needed.
2. **Inspect:** filter findings, open an affected element and examine its screenshot or evidence.
3. **Fix:** follow plain-language guidance or switch to Technical mode for deeper detail.
4. **Rescan:** compare results and see which changes Buggd could actually verify.
5. **Share carefully:** export a report after reviewing it for personal or private information.

## Screenshots

We’ll add actual light/dark dashboard, issue inspector and guided-fix screenshots after a fresh Buggd run. They will be reviewed for sensitive URLs, identifiers and personal data before being committed. **No fabricated interface or private scan screenshots are included.**

## Local-first by design

- Runs a Chromium scanner and a protected local dashboard on your own machine.
- No accounts, analytics, cloud database, telemetry, mandatory AI or automatic report uploads.
- Keeps up to **50 scans** and **512 MiB** of screenshot evidence by default; older records may be pruned.
- Offers light, dark and system themes with the Buggd olive/lime visual identity.
- Uses bounded crawls, constrained network access and cautious, non-destructive checks.

**Important limits:** Buggd is not a full accessibility, SEO or security audit. It cannot verify authenticated workflows, backend form processing, arbitrary interactive controls or every dynamically loaded page. External resources are blocked by default; an explicitly enabled public-assets option supports eligible bounded anonymous requests, but may still produce incomplete rendering. Even a normal page load can cause side effects on a poorly designed website. See the [security and coverage guide](docs/security.md).

## Project status and verification

The [release-readiness report](docs/final-release-readiness.md) documents the cross-platform audit, including **71 unit/integration tests** and **25 browser tests** per successful CI job across Windows, Ubuntu and macOS on Node.js 22 and 24. These tests do not establish perfect coverage or replace user testing on real sites.

Run the checks yourself:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm pack --dry-run
npm pack
npm run package:smoke
```

The generated tarball contains the compiled CLI and frontend. A local tarball smoke test is **not** the same as a successful public npm installation.

## Get involved

Buggd is open source under the [MIT licence](LICENSE). Contributions, useful bug reports and small reproducible fixture cases are welcome.

- [Report a bug or request a feature](https://github.com/skillman85/Buggd/issues)
- [Contributing guidelines](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md)
- [Architecture](docs/architecture.md) · [Development](docs/development.md)
- [Security policy](SECURITY.md) · [Limitations](docs/security.md)
- [Changelog](CHANGELOG.md) · [Roadmap](docs/roadmap.md)
- [GitHub release-notes draft](docs/github-release-notes-draft.md)

Built by **James Hillman — James Builds Tech**. Buggd uses approved brand assets, self-hosted fonts and retained [third-party notices](THIRD_PARTY_NOTICES.md).
