# Issues screen UX correction

29 October 2026 · Buggd v1.1.0-rc.1 · local, unpublished

## What changed

Simple mode now uses a dedicated presentation instead of the developer table:

1. A scan summary separates confirmed findings, potential findings, recorded occurrences, completed checks and unperformed-check records.
2. Human-friendly topic cards show visitor impact, actual affected-element previews and the practical next action before any expansion.
3. Expanding a topic shows evidence-based element folders. Matching fragments, roles, attributes, destinations and regions can place similar captures together. This is a browsing hierarchy, not a declaration that the same component or cause is proven.
4. Every original finding remains separately inspectable inside its folder. No detector-only merge, fingerprint rewrite or confidence change occurs. Individual occurrences open the correct page/screen-size capture in the inspector.
5. Element descriptions use actual visible text or computed name, then recorded destination or nearby text, with a plain-language role and region. An unnamed FAQ control can be identified as a button near its actual question; the question is not falsely described as its accessible name. Missing legacy evidence gets an explicit fallback.
6. Unperformed checks occupy a separate section and never contribute to website-problem counts. The combined “Issues and checks 130” label is removed, including from live progress.
7. Technical mode keeps the full table, advanced filters, original messages, rule identifiers, selectors, escaped HTML and measured evidence. The preference persists. Fresh contexts still default to Simple. Hidden technical material is no longer rendered by the Simple issue/page inspectors or the visible guided-fixing prompt.
8. The existing olive/lime tokens, cream/dark themes, vector mark, typography, rounded cards and app navigation remain.

## Investigation of the actual saved report

Read-only inspection used saved-site scan `00000000-0000-4000-8000-000000000001`, created at 12:41 UTC, plus its older saved scan. No customer-site rescan or live-site request was needed for this investigation.

| Quantity | Saved evidence / presentation |
| --- | --- |
| Pages checked | 12 |
| Confirmed findings | **0** |
| Potential findings | **33** |
| Recorded naming occurrences | **98**, comprising **49 desktop + 49 mobile** observations |
| Checks completed | **198** |
| Unperformed-check records | **97**: 91 resource records, one form record, five excluded-action records |
| Main review hierarchy | One naming topic, **10 element folders**, preserving all **33 findings** and **98 occurrences** |

The earlier report's three groups consisted of two generic naming groups (`a`, 45 occurrences; `button`, four occurrences) and one untested form group. The later report retains specific DOM paths and checks both desktop and mobile. It splits changed parent paths and responsive structures into more records. The counts are not evidence that the website acquired 33 new defects.

The new browsing folders identify the navigation link, footer destinations, distinct FAQ buttons, share destinations and a telephone destination using recorded evidence. They deliberately avoid inventing intended action names such as “logo button” or assuming unrelated controls share a cause.

### Accessible-name validation

The scanner already uses the bundled `dom-accessibility-api` implementation. The saved report contains image-only links with empty `alt` attributes and icon-only buttons without labels. Their nearby text is not programmatically associated as a name.

A read-only Chromium replay of all **33 saved representative fragments** produced:

- **33/33 empty computed names** with image decoding unavailable.
- **33/33 empty computed names** with images successfully decoded.
- **33/33 recognised positive labels** after adding an explicit label in the isolated replay.

The audit JSON (local verification artefact, excluded from publication) records the method, individual finding results and subject breakdown. A separate automated fixture regression reproduces the empty-image-link and FAQ-button shapes, while confirming correctly labelled controls are not flagged.

This validates the observed fragment shapes, not the complete live website. The original scan blocked scripts, images and fonts. The replay does not reconstruct live CSS, generated content or hydration. Findings remain **potential**, and the expanded naming topic prominently explains that the fully loaded website needs a normal-browser review. No existing scan, raw evidence or review history was rewritten.

## Verification

- **66 unit/integration tests passed across 11 files**, including all existing regressions and the new grouping/count/naming-shape checks.
- **24 browser tests passed**, including all existing browser scenarios and new light/dark Issues-screen acceptance tests.
- Typecheck, ESLint and production build passed. Vite reports its advisory 500 kB chunk-size warning; the build succeeds.
- The new browser tests check Simple titles, summaries, expanded findings, inspector and all six guided steps for raw detector terms; verify Technical table/filter/raw evidence access; assert counts, source-record preservation, occurrence selection and responsive behaviour.
- Keyboard expansion, saved mode preference, contrast/theme checks, scanning, SSE, cancellation, maps, exports, guided fixing and comparison regressions remain passing.

The existing owner workflow now expands the Simple topic and verifies its confidence-filter URL instead of expecting the removed Simple-mode advanced dropdown. Its scan, evidence, highlight, persistence, rescan/comparison and export assertions remain. Technical filtering continues to be tested directly.

## Actual screenshots

The following are screenshots of the production application displaying the **actual saved saved-site report**, not invented metrics or mock result data:

- Simple issues — light (local verification artefact, excluded from publication)
- Simple issues — dark (local verification artefact, excluded from publication)
- Expanded affected elements — light (local verification artefact, excluded from publication)
- Expanded affected elements — dark (local verification artefact, excluded from publication)





## Reproduce

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

With local Chromium available, `scripts/audit-saved-names.mjs` takes a saved scan JSON path and an output JSON path. It replays sanitised fragments offline with JavaScript/network disabled. `scripts/capture-issues.mjs` takes the local preview URL, an existing scan ID and an output folder; it captures real report UI in both themes without modifying stored results.

No GitHub push, npm publication or external deployment was performed.
