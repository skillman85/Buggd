# v1.0 release review

This is an unpublished **1.0.0-rc.1** implementation for local review, not a claim that all release gates or platform checks have passed. The original specification is retained in [product-brief.md](product-brief.md).

## Implemented and exercised

- Loopback CLI/server, available-port selection, protected local session, CSRF/origin/Host controls and production frontend serving.
- Real Chromium crawling with same-origin discovery, meaningful query preservation, bounded concurrency, page/request/time/transfer limits and cancellation.
- HTTP/link/resource failures, missing images, console/exception capture, placeholders, common metadata/labels and responsive geometry checks.
- Isolated safe interactions with network locks, unknown/destructive controls excluded, potential no-response findings and explicit untested coverage.
- Synthetic native required/email/checkbox validity inspection without form submission.
- Page/issue evidence and locators, three viewport screenshots, findings filtering, real-time progress, website map, network/console views, history and deletion.
- Atomic local JSON/evidence storage, stable issue grouping, restart recovery and retention pruning.
- Script-free standalone HTML reports with escaped content and embedded evidence, plus JSON export.
- Approved olive/lime themes, local fonts, reusable SVG assets and accessible shadcn/Radix inspectors.
- Contributor/security/architecture/development documentation, issue/PR templates, CI, npm tarball and clean-install smoke tooling.

## Local evidence

- Strict TypeScript, lint and production build: passed.
- Unit/integration tests: **20 passed**, across six files. Includes real Chromium, clean/defective fixtures, unsafe-action counters, cancellation/timeouts, proxy authentication and IP pinning, localhost IPv4/IPv6 compatibility, private/cross-origin destinations, API protection, evidence/export routes, deduplication, storage recovery, retention and simultaneous scan admission limits.
- End-to-end/theme tests: **19 passed**. Includes complete scans in both themes, live cancellation, inspectors, filtering, keyboard map selection, exports, deletion, responsive layouts, actual button/text contrast, initial/persistent/system themes and mobile Escape navigation.
- CI/issue-template YAML parsing: passed. Workflow uses official checkout/setup-node actions with Node.js 22/24, Chromium setup, checks, build, package and smoke validation. It has not run on GitHub yet.
- npm pack dry run and actual pack: passed; compiled executable and frontend, notices and security documentation present. No fixtures, node_modules or test runtime data included.
- Clean tarball install: passed with runtime dependencies only. Installed executable served the production UI, scanned the clean local fixture, captured three screenshots, exported JSON, invoked browser bootstrap, reported a deliberately missing browser and shut down cleanly.
- Screenshots in screenshots/ (local verification artefact, excluded from publication) show the actual app and deliberately defective fixture results. No metrics were fabricated.

## Explicit coverage limits and incomplete acceptance gates

- **Cross-origin assets are blocked.** Sites using CDNs, cross-origin APIs or apex-to-www redirects can be incompletely rendered or excluded. This is a conservative safety trade-off, not full general-site coverage.
- **Custom form validation and backend processing are not tested.** Native validity scenarios are inspected, and the report marks remaining form coverage as not tested. Arbitrary submission handlers are intentionally not executed.
- **Visual/accessibility checks are partial.** Common naming patterns, overflow, clipping and obscured control centres are checked. Geometry findings can reflect intentional designs. This is not a complete audit or perfect overlap detector.
- **Unknown UI controls and authenticated flows are not verified.** Only supported safe semantics are attempted. Clipboard, browser permission UI and delayed effects remain outside the observation window.
- **Platform release gates remain open.** macOS ARM64/Node.js 22 was exercised locally. Linux Node.js 22/24 CI, Windows launch/install/shutdown and broader HTTPS/platform fixtures still require actual runs. Do not mark them passed from configuration alone.
- The reconstructed vector mark needs final owner review; exact original designer paths were unavailable.
- The package is deliberately private and unpublished. Public-registry availability, package-name ownership, npm provenance and public installation cannot be claimed.

## Before publication

1. Review the complete code, security limitations, actual screenshots and reconstructed identity.
2. Run the Linux CI matrix and Windows/manual browser-install checks; address any failures.
3. Decide whether the conservative same-origin resource scope is acceptable for v1.0, or implement and test an explicit public-resource allowlist first.
4. Review third-party licences, package metadata, version/release notes and npm package ownership.
5. Repeat build/test/pack/clean-install validation on the exact reviewed revision.
6. Obtain explicit approval for pushing/releasing/publishing. Only then remove the private-package safeguard and perform the approved release steps.

Recommended v1.1 work is tracked in [roadmap.md](roadmap.md). No publish, deployment, push or GitHub release has been performed.
