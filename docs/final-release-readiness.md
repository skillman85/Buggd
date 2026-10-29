# Final release-readiness audit

29 October 2026 · **1.1.0-rc.1** · macOS ARM64 / Node 22.17.0

## Executive decision

**Conditional release candidate; broad public-release readiness is not yet verified.** The current automated regressions and clean local installation pass. No P0 vulnerability was demonstrated by this audit. This is not evidence that all security flaws are absent. Required non-macOS execution and several realistic browser scenarios remain unverified; do not describe this candidate as fully production-validated.

No push, publication, deployment or public release occurred. The package remains private.

## Audit checklist and independent verification

| Area | Evidence and result |
| --- | --- |
| Repository/documentation | Reviewed README, security/contribution policy, architecture, current schemas, scanner orchestration, network/resource controls, comparison logic, CLI and test inventory. MIT retained. Fixed README's incorrect description of customer-report screenshots as fixture screenshots. |
| Scanner | `npm test`: **66 passed, 11 files**. Real Chromium fixtures exercise linked pages, missing resources, exceptions, placeholders, overflow, safe controls, native forms, cancellation and timeout behaviour. Output (local verification artefact, excluded from publication). |
| Owner workflow | `npm run test:e2e`: **24 passed**. Real scans, both themes/modes, identifiable elements, measured highlights, saved repair progress, platform changes, linked rescans, resolved/remaining/new comparisons, export and empty/error states. Output (local verification artefact, excluded from publication). |
| Typecheck / lint | Both passed. Typecheck (local verification artefact, excluded from publication), lint (local verification artefact, excluded from publication). |
| Production build | Passed. Advisory bundle-size warning remains, approximately 511 kB minified main JS; no build failure. Output (local verification artefact, excluded from publication). |
| npm distributable | Dry run and actual pack succeeded. Compiled CLI/frontend and notices included. Dry-run manifest (local verification artefact, excluded from publication), tarball manifest (local verification artefact, excluded from publication). |
| Clean installation | Actual tarball installed into a temporary project with runtime dependencies only. Executable starts, serves UI, scans fixture, saves evidence/progress, exports JSON/PDF, compares linked scans, exercises browser bootstrap and missing-browser guidance, shuts down. Output (local verification artefact, excluded from publication). Public-registry `npx buggd`: **Not verified**, package unpublished. |
| Actual browser UI | Fresh captures of the running saved report in light/dark mode; no mock metrics. Light (local verification artefact, excluded from publication), dark (local verification artefact, excluded from publication), expanded elements (local verification artefact, excluded from publication). |
| PDF | Actual integration export is valid A4, 14 pages, no JavaScript. Page 3 rendered with Poppler and visually inspected: legible text, visible correct highlight, intact card/footer. Complete new all-page visual inspection: **Not verified** in this audit; earlier review is historical evidence only. |

## Accessibility false-positive investigation

The existing saved saved-site evidence was replayed **offline**, without live-site requests. All 33 representative fragments retained empty computed names with both unloaded and decoded images; all 33 recognised explicit positive labels. Fresh audit results (local verification artefact, excluded from publication).

The report contains 0 confirmed findings, 33 potential records and 98 occurrences: 49 desktop and 49 mobile. The older two generic naming groups represented 49 observations; detailed structural identities and responsive states explain the increase. Ten presentation folders organise the records without deleting observations or proving a common cause.

Captured shapes include empty-alt image links and icon-only FAQ buttons. Nearby question text is not automatically an associated accessible name. Existing real-browser fixtures also cover SVG titles, aria-label/labelledby, hidden labels, decorative controls and open shadow roots. Correct named controls pass those fixtures.

**Live site verification: Not verified.** CSS-generated content, hydration or blocked scripts can alter names. The original scan blocked scripts/fonts/images, so the potential classification must remain. The offline replay is not an independent browser accessibility-tree conformance audit; cross-checking against assistive technology or a second mature audit engine remains **Not verified**. Findings were neither hidden nor promoted to confirmed to change totals.

## Realistic coverage and known limits

Traditional linked-page, shared-navigation, image, native contact-form and external-resource scenarios are covered by existing local fixtures. Framer-like empty-image links and FAQ buttons are reproduced. Safe accordion/tab/dropdown behaviour and responsive naming are exercised.

The following requested scenario validations remain **Not verified** as dedicated release tests: a complete client-side router application, delayed hydration beyond the bounded observation window, modal-specific safe-interaction coverage, a representative WordPress gallery/contact journey and a complete Webflow/AI-generated application fixture. Current fixtures do not establish compatibility with those platforms merely by resembling some markup. These gaps must be closed before claiming broad builder/SPA coverage.

Discovery depends on observed same-origin links; later navigation or dynamic links can be missed. Safe interactions use recognised contracts in isolated network-locked contexts; arbitrary handlers, real submissions, purchases and authenticated journeys are deliberately excluded. Geometry heuristics can flag intentional layouts. No full WCAG/SEO/security audit is claimed.

## Guided fixing and comparisons

Fresh browser and integration tests verify selection, actual evidence, platform guidance, independent persisted review states, resume, rescan and comparison. Unit tests reject resolution claims for cancelled/failed/missing-page/skipped-check/changed-identity coverage. Interaction/form verification requires the particular element's completed check. A manual repair attempt is never scanner verification.

A structurally replaced element may remain unable to verify after a genuine repair. This conservative false-negative risk is documented and preferable to asserting an unsupported fix.

## Screenshot and resource accuracy

Tests distinguish scanner-blocked resources from target HTTP failures, external failures and incomplete captures. Explicit public assets use anonymous bounded GETs with redirect/IP validation; external navigation, API requests and writes remain excluded. Tests exercise private redirects, byte/concurrency budgets and outstanding-request cleanup.

Highlights require matching capture metadata, viewport, scroll and stable before/after geometry; moved/legacy elements do not receive invented coordinates. DPR/scroll and offscreen evidence are tested. Production captures are **viewport-based**. Full-page screenshot production/alignment is **Not verified and not an enabled feature**; do not advertise it. Closed shadow roots and iframe contents are not audited.

## Focused security review

Reviewed loopback binding, Host/Origin/Fetch-Metadata checks, random cookie/token protection, validated evidence UUID references, escaped report text, offline PDF rendering, network IP pinning, redirect checks, context isolation, write/form locks, cleanup and evidence limits. Fresh existing adversarial tests pass for these exercised boundaries.

No new confirmed P0 exploit was reproduced. Independent penetration testing, exhaustive malicious DOM/browser-exploit resistance and broad fuzzing: **Not verified**. Browser/OS vulnerabilities and CPU/memory consumption are outside hard sandbox guarantees. Even GET loading may cause effects on a badly designed target. Known-pattern redaction cannot remove all sensitive screenshot content. Local reports rely on OS permissions and are not encrypted. See [security scope](security.md).

## Platform and licensing status

- **macOS ARM64, Node 22:** local build/tests/packaged CLI verified as recorded above.
- **Windows:** execution **Not verified**. CI matrix added; command-shim, process termination and browser-install behaviour require actual results.
- **Linux:** execution **Not verified**. CI matrix configured with Chromium system dependencies; no local Linux run claimed.
- **macOS Node 24 / other architectures:** **Not verified**.

CI now configures Ubuntu, Windows and macOS on Node 22/24, with platform-appropriate Chromium installation and the same build/tests/pack/smoke checks. Configuration does not count as a successful run. No workflow was pushed or dispatched.

MIT licence and existing font/dom-accessibility-api/shadcn notices remain. Package manifests include retained notices and fonts. Independent legal clearance, exact designer vector ownership confirmation and complete transitive licence audit: **Not verified**. Reconstructed vector branding remains an approximation of the approved reference.

## Defect classification and publication prerequisites

| Priority | Finding | Disposition |
| --- | --- | --- |
| P0 | No critical vulnerability demonstrated by the exercised checks | No claim of exhaustive security clearance. |
| P1 validation gate | Windows/Linux execution and installation unverified | Run and pass all configured CI jobs, investigate failures; do not advertise verified cross-platform support yet. |
| P1 validation gate | Requested representative SPA/builder scenarios and independent accessibility-semantic cross-check incomplete | Add/run meaningful controlled scenarios and record false positives/negatives before broad production claims. |
| P2 | CI previously omitted Windows/macOS | Matrix corrected; execution pending. |
| P2 | README misidentified actual report screenshots as fixture data | Corrected. |
| P2 | Main bundle exceeds advisory size threshold | Consider measured splitting after release blockers; no unrelated refactor performed. |
| P2 | New all-page PDF visual inspection and broader malicious-report samples incomplete | Complete export review before final sign-off. |
| P3 | Full-page captures, authenticated journeys and additional interaction semantics | Future enhancements; not implemented in this audit. |

Before publication: close the P1 validation gates; complete export/security/licence review; verify package-name ownership, provenance and final metadata; rerun checks on the exact approved revision; obtain explicit permission to push and publish; only then remove `private: true` for the authorised release. Public registry availability and a first-time browser download on a genuinely clean OS remain unverified until actually exercised.

This report is a working audit checkpoint with explicit remaining gates, **not a declaration that the entire requested final audit is complete**.

# Release gate closure — subsequent verification

This section supersedes the earlier checkpoint's outstanding-gate assessment. Version remains **1.1.0-rc.1**. Evidence: gate directory (local verification artefact, excluded from publication).

| Gate | Status | Tests/evidence | Fixes and limitations | Blocks release? |
| --- | --- | --- | --- | --- |
| Accessibility reference | **Passed** for representative fixtures | New axe-core comparison in Chromium: native buttons, shared navigation/image links, SVG title, aria-label/labelledby, hidden text/reference and decorative content. Exact target agreement for button-name/link-name; new full-suite results below. | Initial zero-size image-link fixture was corrected to represent a visible control. No confirmed Buggd name-computation mismatch remained; no warnings suppressed. Saved saved-site findings remain potential because live hydration/CSS were not independently verified. This is not full WCAG coverage. | No, within documented supported scope. |
| Realistic fixtures | **Passed** | Actual bundled React client navigation, pushState changes, delayed insertion, discovered routes, mobile menu, WordPress-style gallery/contact form, builder-style disclosure/dialog; safe panel response, native constraints, missing image, screenshots and zero writes asserted. | Test root URL corrected to normal CLI normalization. Assertion narrowed to naming rules so legitimate untested-interaction coverage is retained. No scanner wait or unsafe-click relaxation introduced. Arbitrarily late content and real custom submission remain outside safe bounded coverage. | No; do not claim complete vendor compatibility. |
| Report verification | **Passed** for generated representative reports | HTML/PDF/JSON produced from real multi-page scan with naming/image findings, grouped occurrences and excluded actions. JSON IDs checked; standalone HTML inspected offline; adversarial script/credential/path strings checked; all 14 PDF pages rendered and reviewed in contact sheet, extracted text checked. | No confirmed new exporter defect. Reports retain technical appendix and real screenshot highlights. Automatic redaction is not exhaustive; screenshot pixels cannot be assumed scrubbed. | No, with existing privacy disclosure. |
| macOS execution | **Passed** | Node 22.17.0 ARM64: typecheck, lint, build, **68 tests / 13 files**, **24 browser tests**, pack and clean compiled-CLI smoke. | Bundler advisory size warning remains P2. | No. |
| Windows execution | **Not verified** | Windows Node 22/24 matrix configured, manual dispatch enabled. | Fixed smoke tooling to prefer Node plus npm_execpath over direct .cmd execution. No Windows runtime available here; configuration is not execution. | **Yes for the requested cross-platform release sign-off.** |
| Linux execution | **Not verified** | Ubuntu Node 22/24 matrix provisions Chromium system dependencies. | No Linux execution environment available locally. | **Yes for the requested cross-platform release sign-off.** |

## Fresh verification commands

Executed with `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/buggd-playwright` for browser-backed commands on this host:

- `npm test` — 68 passed; log (local verification artefact, excluded from publication).
- `npm run test:e2e` — 24 passed; log (local verification artefact, excluded from publication).
- `npm run typecheck`, `npm run lint`, `npm run build` — passed; corresponding logs in the gate directory.
- `npm pack --dry-run --json`, `npm pack --json` — manifests saved in the gate directory.
- `npm run package:smoke` — clean tarball/runtime-only installation, compiled CLI, local dashboard, actual scan, exports, linked comparison, Chromium provisioning command and missing-browser behaviour, clean shutdown passed.

No existing tests were deleted. New axe-core dependency is development-only. MIT and approved branding remain intact.

## Exact remaining platform execution steps

After explicit permission to push this candidate (not granted or performed here):

1. Push the reviewed revision to GitHub, or open its approved PR. The existing push/PR workflow runs automatically.
2. Alternatively open **Actions → Verify Buggd → Run workflow**, select that exact branch and run; `workflow_dispatch` is now configured. CLI equivalent on an authorised machine: `gh workflow run ci.yml --ref <reviewed-branch>`.
3. Wait for all six OS/Node matrix jobs: Ubuntu, Windows and macOS × Node 22/24. Each runs npm ci, appropriate Chromium installation, typecheck, lint, unit/integration tests, build, browser tests, pack dry run, pack, and clean package smoke (including compiled CLI/dashboard).
4. Save actual run URLs/logs and the tested commit; fix failures and repeat affected jobs. Only then replace Windows/Linux **Not verified** with Passed.

No independent legal opinion, comprehensive penetration test or new product feature is added as an arbitrary gate. Existing licence/privacy/scope disclosures continue to apply. Public npm resolution remains untested because publication is prohibited.

**Ready for public release review: No.** The three locally executable verification areas are closed within their documented scope. Actual Windows and Linux matrix execution is the remaining blocker to the requested cross-platform sign-off. Nothing was pushed, published or deployed.

# Publication sanitisation gate

The four generic-api-key detections were individually traced to `grouping.key` fields in a generated synthetic fixture export. Each is a truncated SHA-256 issue fingerprint produced by the scanner, not a service credential. No credential rotation is indicated by these four findings. The generated report remains excluded; no Gitleaks suppression was added.

Private screenshots, saved-site QA evidence and generated reports are retained locally but excluded through `docs/screenshots/`, `docs/qa/`, `output/` and `docs/*verification.json`. Original documentation is preserved in an ignored local archive before public examples were sanitised. Runtime storage outside the repository is unchanged, verified by file hashes. Tests now write their export artefacts into disposable test storage rather than overwriting local reports.

Public documentation replaces saved-site names/URLs, scan identifiers and personal home paths with synthetic examples. Intentionally public author/copyright and repository metadata remain. Source, synthetic fixtures, approved branding, fonts/licences and CI remain included. Historical evidence links were converted to descriptions of local artefacts rather than dangling public links.

Security review: sanitised candidate Gitleaks **Passed**; existing Git history **Passed**; unpacked npm tarball **Passed**. No broad exclusions in Gitleaks. Typecheck, lint, production build, 68 unit/integration tests and 24 browser tests passed. The tarball is restricted by the package files allowlist and excludes private QA/screenshots/reports. Cross-platform CI results remain pending until actual execution; see the subsequent validation record when available.
