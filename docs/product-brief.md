# BUGGD — COMPLETE V1.0 DEVELOPMENT MASTER PROMPT

## Your role

You are an expert senior full-stack engineer, browser automation specialist, application security engineer, UI/UX designer and open-source maintainer.

You are responsible for implementing **Buggd**, a genuinely functional, polished, local-first, open-source website testing application.

Build a real product that developers can install, run, understand, extend and contribute to.

Do not build a prototype filled with mock data. Do not deliver a visually impressive dashboard that lacks working testing functionality.

**Your mission is to take Buggd from its existing GitHub repository to a complete, tested, npm-release-ready v1.0 application.**

Implement incrementally, verify every major feature and maintain a working application throughout development.

Do not deploy, publish to npm, push code or create GitHub releases without explicit approval.

---

# 1. PRODUCT IDENTITY

**Product:** Buggd
**Tagline:** Find what's broken.
**Category:** Open-source website testing and quality assurance
**Creator:** James Hillman — James Builds Tech
**Licence:** MIT
**Primary command:** `npx buggd`

## Product description

Buggd is a free, open-source website testing application that automatically discovers pages, inspects website functionality, identifies technical and visual issues and presents actionable findings through a beautifully designed dashboard.

A user should be able to:

1. Launch Buggd with one command.
2. Enter their website URL.
3. Click Start Scan.
4. Have Buggd automatically discover and inspect pages.
5. Watch scan progress in real time.
6. See broken links, failed resources, JavaScript errors, suspicious interactions, form validation issues and responsive layout problems.
7. Explore findings visually with screenshots and page navigation.
8. Export a professional report.

**No manually configured user journeys, test scripts, cloud accounts, subscriptions or AI APIs should be required.**

## Core product values

- Zero-friction onboarding
- Automatic website discovery
- Useful and evidence-backed findings
- Beautiful, intuitive UI
- Local-first privacy
- Safe, controlled browser automation
- Transparent limitations
- Accessible design
- Open-source extensibility
- No unnecessary dependencies or services

Buggd should be significantly easier to use than traditional browser testing frameworks.

It is not intended to replace Playwright's full end-to-end testing capabilities.

It should make common website testing accessible to people who do not want to write test code.

---

# 2. APPROVED BRANDING — MANDATORY

The Buggd visual identity has already been approved.

**Do not invent a new brand identity or replace it with generic developer-tool styling.**

The approved visual reference is located at:

`docs/brand/buggd-brand-reference.png`

Inspect this image before implementing the user interface.

Use the reference for:

- Logo proportions and styling
- Bug icon geometry
- Wordmark treatment
- Colour hierarchy
- Light and dark themes
- Landing page composition
- Dashboard layout
- Buttons
- Navigation
- Cards
- Status badges
- Typography
- Spacing
- Interface density

If the reference file is absent, report that explicitly. Continue implementing the supplied design tokens, but do not claim visual fidelity has been verified.

## 2.1 Brand colours

The approved identity uses olive, lime, cream and charcoal.

Define semantic design tokens based on this palette.

| Token     | Hex       | Purpose                  |
| --------- | --------- | ------------------------ |
| Cream     | `#FAF9F1` | Light-mode background    |
| Olive 900 | `#0F1B12` | Dark-mode background     |
| Olive 700 | `#1E3A1F` | Dark surfaces            |
| Olive 500 | `#4D7C0F` | Olive accent             |
| Lime 400  | `#A3E635` | Primary lime             |
| Lime 300  | `#C7F464` | Bright lime highlight    |
| Slate 400 | `#94A3B8` | Muted interface elements |
| Slate 700 | `#334155` | Secondary neutral        |

These are starting design tokens. Derive additional border, foreground, background and interaction colours as needed.

Do not use lime for every component.

Use restrained accent placement so the application feels premium rather than fluorescent.

### Light mode

- Warm cream background
- White or warm-white cards
- Dark charcoal text
- Olive accents
- Selective lime highlights
- Subtle outlines
- Soft shadows
- Clear visual hierarchy

### Dark mode

- Deep olive-black background
- Dark green-tinted surfaces
- Off-white text
- Lime accents and primary CTAs
- Soft borders
- Restrained highlights
- Excellent text contrast

Do not create dark mode by simply inverting the light palette.

Both modes must be independently polished.

## 2.2 Typography

Use the following approved font pairing.

### Google Sans Code

Primary interface font for:

- Body text
- Buttons
- Navigation
- URLs
- Inputs
- Issue descriptions
- Technical information
- Scan logs
- Tables
- Metadata

Recommended weights: 400 and 500.

### Plus Jakarta Sans

Use for:

- Page headings
- Marketing headlines
- Dashboard statistics
- Section headings
- Major labels
- Branding and wordmark

Recommended weights: 600, 700 and 800.

Where licensing permits, self-host font assets and retain required notices. Use appropriate font fallbacks.

Do not replace the approved fonts with Inter or Geist.

## 2.3 Logo assets

The approved logo includes:

- A minimalist geometric bug symbol
- A bold lowercase `buggd` wordmark
- A contrasting lime full stop
- Theme-aware colour variants

Create production-ready assets:

- Horizontal light-mode logo
- Horizontal dark-mode logo
- Standalone icon
- SVG logo variants
- SVG favicon
- PNG favicon sizes
- App icon
- Open Graph/social sharing image

Reconstruct clean vectors from the approved reference where practical.

Do not use a cropped branding-board screenshot as the logo.

Do not use a generic emoji as the logo.

If the reference cannot be reconstructed precisely, implement a close vector approximation and disclose the limitation.

---

# 3. DESIGN SYSTEM AND THEMING

Implement a comprehensive design system using Tailwind CSS and shadcn/ui.

Use semantic CSS variables for all theme-dependent values.

## Required theme options

- Light
- Dark
- System

Requirements:

- Manual theme switcher
- System preference detection
- Persistent preference
- No visible theme flash on initial load
- Correct theme applied to all components
- Accessible contrast
- Visible focus states
- Reduced-motion support

Theme all components, including tables, dialogs, tooltips, dropdowns, form fields, charts and status indicators.

## UI design principles

The interface should feel premium, modern, minimal and focused.

Use:

- Consistent spacing
- Rounded cards
- Restrained borders
- Subtle shadows
- Excellent typography
- Strong hierarchy
- Responsive layouts
- Accessible semantic HTML
- Meaningful empty states
- Polished loading states
- Subtle transitions

Avoid:

- Cluttered dashboards
- Excessive gradients
- Unnecessary glassmorphism
- Constant glowing effects
- Generic blue SaaS styling
- Decorative charts without useful data
- Fake metrics
- Excessive animations

Use the approved visual reference as the design direction.

---

# 4. TECHNICAL STACK

Use:

- Node.js 22+
- TypeScript with strict mode
- React
- Vite
- Tailwind CSS
- shadcn/ui
- Fastify
- Playwright Chromium
- Zod
- Vitest
- Local filesystem-based JSON storage

Use additional small, established dependencies only where justified.

Keep the project modular and easy for open-source contributors to understand.

Do not add:

- A hosted database
- User authentication
- Stripe
- External AI APIs
- Cloud infrastructure
- Telemetry or analytics by default
- Unnecessary microservices

## Suggested architecture

```text
buggd/
├── docs/
│   ├── brand/
│   │   └── buggd-brand-reference.png
│   ├── architecture.md
│   └── security.md
├── src/
│   ├── cli/
│   │   └── index.ts
│   ├── server/
│   │   ├── index.ts
│   │   └── routes/
│   ├── scanner/
│   │   ├── browser.ts
│   │   ├── crawler.ts
│   │   ├── scheduler.ts
│   │   ├── discovery/
│   │   ├── checks/
│   │   ├── interactions/
│   │   ├── forms/
│   │   ├── responsive/
│   │   ├── evidence/
│   │   └── types.ts
│   ├── reports/
│   │   ├── json.ts
│   │   ├── html.ts
│   │   └── storage.ts
│   └── shared/
│       ├── schemas.ts
│       └── types.ts
├── web/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       ├── hooks/
│       ├── contexts/
│       ├── styles/
│       └── assets/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── fixtures/
├── .github/
│   └── workflows/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
└── package.json
```

You may refine the structure if a simpler arrangement is more maintainable.

Use shared TypeScript types between the scanner, API and frontend.

Separate detection rules from browser orchestration.

---

# 5. ONE-COMMAND INSTALLATION

The published application must ultimately run through:

```bash
npx buggd
```

This should start the local server and open the application in the user's browser.

## CLI requirements

1. Start a Fastify server.
2. Bind to `127.0.0.1`.
3. Select an available port.
4. Display a useful startup message.
5. Open the default browser where supported.
6. Serve the built React dashboard.
7. Locate the Playwright Chromium executable.
8. Detect missing browser dependencies.
9. Provide an actionable installation path.
10. Shut down cleanly on process termination.
11. Handle errors without unexplained crashes.

### Browser installation

A key requirement is reducing installation friction.

Investigate a reliable first-run Chromium installation or bootstrap workflow using supported Playwright mechanisms.

If Chromium must be downloaded, explain the download and provide progress or actionable output.

Do not silently claim a browser is available when it is not.

Avoid requiring users to clone the repository.

Ensure users do not need a global npm installation.

## Development commands

Support:

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm test
npm run lint
```

Create a proper npm executable entry point.

The distributable package must include the compiled server, CLI and frontend assets.

Do not require TypeScript execution tooling at runtime.

---

# 6. AUTOMATIC CRAWLING ENGINE

The core purpose of Buggd is to discover and inspect websites automatically.

Users must not have to define journeys manually.

## Scan input

Accept:

- HTTPS URLs
- HTTP URLs
- Local development servers
- Custom local ports

Normalise and validate URLs.

Provide useful error messages.

## Crawling behaviour

The scanner must:

1. Open the target website in Chromium.
2. Discover internal links.
3. Build a list of discovered pages.
4. Visit each allowed page.
5. Inspect page content and resources.
6. Record detected issues.
7. Discover further internal pages.
8. Continue within configured limits.
9. Generate a report.
10. Close browser resources cleanly.

## Default limits

- Maximum pages: 25
- Concurrent pages: 2
- Configurable timeout: sensible bounded default
- Maximum scan duration: configurable
- Maximum interaction attempts per page: bounded
- Maximum redirects: bounded

Provide advanced settings for scan limits without requiring users to configure them.

## URL handling

Handle:

- Duplicate URLs
- URL fragments
- Query parameters
- Redirects
- Relative links
- Trailing slashes
- Canonicalisation where appropriate
- Pages returning errors
- Non-HTML resources
- Redirect loops

Do not blindly strip meaningful query parameters.

Do not expand unlimited parameter combinations.

Restrict the crawl to the permitted target scope.

---

# 7. CORE TECHNICAL CHECKS

Implement the following checks as separate, testable modules.

## 7.1 Broken links

Detect:

- HTTP 404
- HTTP 410
- Relevant HTTP 4xx failures
- HTTP 5xx failures
- Navigation errors
- Redirect loops

Store both the source page and destination URL.

Distinguish internal links from external links.

External destinations should not be crawled by default.

## 7.2 Missing images

Detect:

- Failed image requests
- Broken image loading
- Invalid image resources
- Images with zero natural dimensions where relevant

Support normal HTML images and common lazy-loading behaviour.

Avoid assuming that every offscreen image must load immediately.

## 7.3 JavaScript errors

Capture:

- Uncaught page exceptions
- Browser console errors
- Relevant errors triggered during safe interactions

Record:

- Error message
- Page URL
- Stack or location where available
- Time
- Interaction context, if applicable

Deduplicate repeated errors.

## 7.4 Network failures

Observe:

- Failed requests
- HTTP 4xx responses
- HTTP 5xx responses

Differentiate between:

- Observed network failure
- Potential application issue
- Confirmed broken resource

Do not label every blocked analytics request as a critical website defect.

## 7.5 Placeholder content

Detect explicit unfinished content, including:

- Lorem ipsum
- TODO markers
- FIXME markers
- Placeholder copy
- Common unfinished-template content
- Clearly incomplete links such as `href="#"` where relevant

Treat ambiguous phrases such as "Coming soon" as potential issues rather than guaranteed defects.

## 7.6 Metadata

Check:

- Missing document title
- Empty document title
- Missing image alt attributes
- Empty accessible names on interactive controls
- Basic form-label associations
- Obvious duplicate metadata where confidently observable

Do not describe these checks as a complete SEO or accessibility audit.

## 7.7 Responsive problems

Test at minimum:

- 390px mobile width
- 768px tablet width
- 1440px desktop width

Detect:

- Horizontal document overflow
- Elements extending beyond the viewport
- Common visibly clipped content
- Suspicious overlapping elements

Use DOM geometry and screenshots.

Classify uncertain visual findings as potential issues.

Do not attempt to promise perfect visual design analysis.

---

# 8. AUTOMATIC INTERACTION TESTING

**This is a defining feature of Buggd and must not be omitted.**

Buggd should inspect interactive website elements automatically, without requiring manually written test journeys.

However, interaction testing must be implemented cautiously, because arbitrary clicks can trigger real-world actions.

## 8.1 Element discovery

Discover relevant controls, including:

- Buttons
- Links
- Navigation menu items
- Dropdowns
- Accordions
- Tabs
- Modals
- Expandable sections
- Accessible custom controls

Use accessible roles and semantic markup as primary identification methods.

Use DOM heuristics as a fallback.

## 8.2 Interaction classification

Classify elements before attempting interactions.

Examples:

**Safe inspection candidates**

- Accordion toggles
- Tab switches
- Menu expansion
- Non-destructive modal opening
- Local UI toggles

**Potentially unsafe**

- Form submission buttons
- Save buttons
- Account actions
- File upload actions
- External navigation
- Unknown custom handlers

**Excluded by default**

- Delete
- Remove account
- Purchase
- Checkout
- Payment
- Logout
- Send
- Publish
- Confirm transaction
- Other potentially destructive actions

Classification should use semantic information, element attributes, destinations and context.

Do not rely on button text alone as a security guarantee.

## 8.3 Safe interaction verification

For approved safe candidates:

1. Record the pre-interaction state.
2. Observe the destination or relevant DOM state.
3. Attempt the interaction in an isolated context.
4. Observe the resulting state.
5. Record whether a meaningful change occurred.
6. Capture relevant evidence.
7. Restore or recreate the browser state where necessary.

Possible outcomes include:

- Navigation
- New tab
- Modal opened
- Menu expanded
- Tab content changed
- Visible DOM updated
- Relevant accessibility state changed
- No observable response
- Interaction blocked
- Interaction could not be safely tested

## 8.4 Dead button detection

A control with no detected response must be classified as:

**Potential issue — No observable response**

Do not automatically claim the control is broken.

A legitimate action may affect the clipboard, browser permissions, download behaviour or other systems outside the observation window.

## 8.5 Interaction safety

Safe interaction mode must:

- Block or avoid potentially state-changing actions.
- Avoid arbitrary API writes.
- Prevent real form submissions.
- Restrict cross-origin navigation.
- Limit interaction attempts.
- Use isolated browser contexts.
- Avoid triggering downloads where possible.
- Avoid file uploads.
- Respect explicit excluded-action rules.

Intercept non-idempotent requests in interaction-test contexts where practical.

Recognise that even GET requests can have side effects on incorrectly designed websites.

Clearly document that automatic interaction testing cannot guarantee zero side effects.

Provide an option to disable interaction testing entirely.

---

# 9. AUTOMATIC FORM VALIDATION

Implement useful form inspection without sending real data.

## 9.1 Form discovery

Identify forms and controls such as:

- Text inputs
- Email inputs
- Password inputs
- Textareas
- Select controls
- Checkboxes
- Radio buttons
- Required fields
- Submit buttons

## 9.2 Structural checks

Detect:

- Missing associated labels
- Missing accessible names
- Invalid or suspicious required-field configuration
- Missing or invalid form destinations where applicable
- Relevant HTML validation attributes

## 9.3 Validation testing

Test safe client-side validation scenarios:

- Empty required fields
- Invalid email formats
- Required checkbox behaviour
- Native constraint validation
- Detectable client-side error messages

Use synthetic data only.

Avoid entering sensitive information.

Prevent actual form submissions and side-effecting network actions.

If a validation flow cannot be tested without submission, mark it **Not tested** rather than fabricating a result.

## 9.4 Form reporting

Each form finding should explain:

- What was inspected
- What was attempted
- What was expected or checked
- What was observed
- Whether the result is confirmed or suspected
- What the developer should investigate

Do not claim backend form processing works unless explicitly and safely verified.

---

# 10. VISUAL WEBSITE MAP

Implement an interactive website map showing discovered pages and relationships.

The map must be generated from actual crawl results.

## Required features

- Node for each discovered page
- Connections based on discovered internal links
- Page labels
- Issue counts
- Visual distinction for pages with problems
- Clickable page selection
- Zoom and pan
- Fit-to-view
- Clear indication of pages that were not scanned

Avoid uncontrolled layout complexity on large websites.

Use a lightweight, established graph library if appropriate.

The map must remain responsive and usable for the configured crawl limit.

Selecting a page should open its findings and associated evidence.

Do not pretend that the map represents all possible application states or authenticated journeys.

---

# 11. ISSUE ENGINE AND REPORTING

Create a consistent issue model shared across the scanner and UI.

## Issue schema

Every finding should contain:

- Stable unique identifier
- Scan identifier
- Page URL
- Category
- Severity
- Evidence classification
- Title
- Plain-English description
- Technical evidence
- Element reference where available
- Relevant destination or resource
- Suggested next action
- Screenshot reference where available
- Timestamp
- Check identifier

## Severity

Use:

- Critical
- High
- Medium
- Low
- Informational

Severity should be based on likely impact.

Do not label all errors critical.

## Evidence classification

Use:

**Confirmed failure**
A failure directly supported by reliable evidence.

**Potential issue**
Suspicious behaviour that requires confirmation.

**Not tested**
A feature or operation outside the scanner's verified coverage.

## Deduplication

Group repeated identical findings when appropriate.

Preserve the pages affected.

Avoid presenting hundreds of duplicate console errors as separate findings.

## Report exports

Implement:

- JSON export
- Standalone HTML export

HTML reports must be readable without the Buggd server running.

Include report metadata, findings, scan limitations and relevant evidence.

Ensure untrusted website content is safely escaped in exported HTML.

---

# 12. LOCAL SERVER AND API

Use Fastify.

Implement typed API endpoints.

Minimum endpoints:

```text
POST /api/scans
GET /api/scans
GET /api/scans/:id
GET /api/scans/:id/events
POST /api/scans/:id/cancel
GET /api/scans/:id/export
GET /api/scans/:id/sitemap
GET /api/scans/:id/evidence/:evidenceId
```

Use SSE or a similarly appropriate mechanism for real-time progress.

## Scan lifecycle

Support:

- Queued
- Starting
- Running
- Completed
- Failed
- Cancelled

Persist appropriate scan metadata.

Support cancellation using abort signals and browser cleanup.

Prevent unlimited concurrent scan creation.

Implement clear error handling.

## Storage

Use local filesystem storage for:

- Scan metadata
- Findings
- Screenshots
- Reports
- Sitemap data

Store runtime data outside the installed npm package.

Do not store runtime data inside the repository by default.

Do not require a database.

---

# 13. SECURITY REQUIREMENTS

Security is critical because Buggd opens potentially untrusted websites in a browser.

## 13.1 Local server

- Bind to loopback only.
- Do not expose the server to the LAN by default.
- Validate request origins.
- Protect state-changing API endpoints against cross-site requests.
- Use appropriate session or token protection.
- Do not expose credentials in URLs.
- Secure SSE and evidence access appropriately.
- Prevent path traversal.
- Validate all request parameters.

The website being scanned must not be able to control the Buggd application.

## 13.2 Network isolation

Implement appropriate restrictions for:

- Private network addresses
- Loopback addresses
- Link-local addresses
- Local network services
- DNS resolution changes
- Redirects
- IPv4 and IPv6

Localhost scanning must remain possible for authorised local development websites.

Do not accidentally allow a scanned page to access Buggd's own server.

Consider browser subresources, redirects and unexpected cross-origin requests, not just top-level navigation.

Clearly document the practical limits of browser and network isolation.

## 13.3 Untrusted content

Treat all website content as untrusted data.

- Escape untrusted text.
- Avoid unsafe HTML rendering.
- Prevent script injection through scan results.
- Validate screenshot paths.
- Do not execute user-supplied JavaScript.
- Avoid persisting cookies, passwords or authentication secrets.
- Do not include sensitive form values in reports.
- Limit log verbosity for potentially sensitive data.

## 13.4 Resource limits

Implement:

- Page limits
- Request timeouts
- Browser timeouts
- Interaction limits
- Bounded concurrency
- Scan cancellation
- Maximum execution duration
- Appropriate response and evidence size controls

## 13.5 Authorisation

Clearly state that Buggd is intended for websites users own or are authorised to test.

Do not implement destructive scanning modes by default.

Do not represent the tool as a security vulnerability scanner or a complete sandbox.

---

# 14. COMPLETE FRONTEND EXPERIENCE

Implement the following application screens.

## 14.1 Home / New Scan

Features:

- Buggd branding
- Large URL input
- Start Scan button
- Quick explanation of what Buggd tests
- Scan settings
- Recent scans
- Theme control

The interface should be immediately understandable.

## 14.2 Live Scan

Show real-time information:

- Current page
- Scan status
- Pages discovered
- Pages completed
- Checks executed
- Findings detected
- Current activity
- Elapsed time
- Cancel scan

Do not fabricate scan percentages.

Use actual events from the backend.

## 14.3 Results Overview

Include:

- Target URL
- Scan date and duration
- Pages scanned
- Total findings
- Severity distribution
- Confirmed failures
- Potential issues
- Responsive results
- Interaction findings
- Relevant check coverage

Use clear metric cards.

Avoid meaningless vanity scores.

## 14.4 Issues

Implement:

- Search
- Category filtering
- Severity filtering
- Confidence filtering
- Page filtering
- Grouped findings
- Sortable results where useful

Clicking a finding should open its inspector.

## 14.5 Page Inspector

For an individual page, display:

- Page URL
- Screenshot
- Findings
- Metadata
- Failed resources
- Console errors
- Interaction checks
- Form checks
- Responsive results

Allow navigation between discovered pages.

## 14.6 Issue Inspector

For a finding, show:

- Title
- Severity
- Evidence classification
- Page URL
- Affected element
- Screenshot
- Error details
- What Buggd detected
- Why it may matter
- Suggested next action

Use language that ordinary developers and designers can understand.

Where evidence supports it, highlight the affected element in the screenshot or provide a clear locator.

Do not fabricate element highlights.

## 14.7 Visual Sitemap

Implement the interactive discovered-page graph defined earlier.

Users should be able to move from sitemap nodes into page findings.

## 14.8 Scan History

Display locally stored previous scans.

Allow:

- Opening a previous report
- Exporting findings
- Removing an old scan
- Starting a new scan

Make deletion explicit and deliberate.

---

# 15. UI/UX QUALITY REQUIREMENTS

All screens must support both approved themes.

Implement:

- Accessible navigation
- Keyboard interaction
- Clear selected states
- Responsive desktop and mobile layouts
- Appropriate loading indicators
- Empty states
- Error states
- Toast notifications
- Confirmation dialogs where necessary
- Proper disabled states
- Visible focus styles
- Screen-reader-friendly labels
- Reduced-motion preferences
- Consistent visual spacing

Avoid horizontal overflow in Buggd's own interface.

Do not add large dependencies purely for decorative effects.

Prioritise useful UI over excessive animation.

---

# 16. AUTOMATED TESTING

Create deliberately defective local fixture websites.

## Fixture scenarios

Include:

1. Clean website
2. Broken internal link
3. Missing image
4. Uncaught JavaScript exception
5. Placeholder content
6. Missing title
7. Horizontal overflow
8. Functional accordion
9. Non-responsive button
10. Functional dropdown
11. Required-field validation
12. Invalid email validation
13. Missing form label
14. Redirect loop
15. Slow-loading page
16. Attempted unsafe interaction
17. Cross-origin link
18. Cancelled scan

## Test levels

### Unit tests

Test:

- URL normalisation
- Crawl deduplication
- Issue classification
- Detection rules
- Safety classification
- Report generation
- Schema validation

### Integration tests

Verify:

- Real Playwright crawling
- Correct detection results
- Safe interaction handling
- Form-validation behaviour
- Scan cancellation
- Screenshot generation
- Sitemap generation
- JSON and HTML exports

### Frontend tests

Verify:

- Scan submission
- Live progress updates
- Results rendering
- Filtering
- Issue inspection
- Sitemap navigation
- Theme switching
- Persistent theme preference

### End-to-end tests

Test the complete experience:

1. Launch Buggd.
2. Enter the fixture URL.
3. Start a scan.
4. Observe scan progress.
5. Wait for completion.
6. Review detected issues.
7. Open screenshot evidence.
8. View sitemap.
9. Export a report.

Test in light and dark mode.

Do not invent test results.

---

# 17. PERFORMANCE AND RELIABILITY

Ensure the application remains usable during scanning.

Requirements:

- Non-blocking UI
- Bounded browser concurrency
- Responsive progress reporting
- Proper cleanup
- Retry handling where appropriate
- Error isolation
- Controlled memory usage
- Bounded storage growth
- Graceful handling of unavailable websites

Do not promise fixed scan durations.

Prioritise predictable operation and accurate results over aggressive scanning speed.

---

# 18. NPM PACKAGING AND DISTRIBUTION

Prepare Buggd for public npm distribution.

## Package requirements

- Package name: `buggd`
- MIT licence metadata
- Correct executable entry point
- Compiled CLI
- Bundled production frontend
- Required runtime dependencies
- Correct package file inclusion
- Appropriate Node.js engine declaration
- Version metadata
- Repository metadata
- Supported operating-system guidance

Ensure the npm package does not depend on files excluded from publication.

## Packaging verification

Run:

```bash
npm run build
npm pack --dry-run
npm pack
```

Inspect the package contents.

Test installation and execution from a clean temporary project using the generated package tarball.

Verify that the resulting CLI starts correctly and serves its frontend.

Verify Chromium installation and fallback behaviour.

Do not claim that `npx buggd` works from the public npm registry until the package has actually been published and tested.

Do not publish without explicit approval.

---

# 19. GITHUB AND OPEN-SOURCE READINESS

The repository already exists and includes an MIT licence.

Preserve its existing history and licence.

Create or improve:

- README.md
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- SECURITY.md
- CHANGELOG.md
- Issue templates
- Pull request template
- .gitignore
- Architecture documentation
- Development documentation
- Security limitations
- Roadmap

## README requirements

Include:

- Buggd logo
- Tagline
- Product description
- Feature overview
- Screenshots
- Installation instructions
- CLI usage
- Supported testing capabilities
- Known limitations
- Security and authorisation guidance
- Development setup
- Contribution instructions
- MIT licence information
- James Builds Tech attribution

Use accurate wording.

Do not claim features are complete unless they have been implemented.

Do not claim the npm package is published before publication.

## Copyright

Copyright (c) 2026 James Hillman

## GitHub Actions CI

Create a workflow that runs on pull requests and relevant pushes.

It should perform:

- Dependency installation
- TypeScript checks
- Linting
- Unit tests
- Integration tests where supported
- Production build
- Packaging checks

Use a reasonable supported Node.js matrix.

Avoid uncontrolled browser downloads or excessive resource usage.

Do not configure automatic npm publication without approval.

---

# 20. PRIVACY

Buggd must operate locally by default.

Requirements:

- No user accounts
- No cloud database
- No analytics by default
- No third-party AI calls
- No uploading scan results to external services
- No compulsory external account connections
- Locally stored reports
- User-controlled deletion of scan history

Document any network access required for downloading npm dependencies or Playwright Chromium.

Avoid exposing scan URLs or sensitive website content in unnecessary logs.

---

# 21. DEVELOPMENT EXECUTION PLAN

Implement this project in structured stages.

**Do not attempt to generate the entire codebase in one unverified step.**

## Stage 1 — Foundation

- Inspect repository
- Inspect approved branding reference
- Establish project structure
- Configure TypeScript
- Configure build tools
- Implement CLI
- Implement local Fastify server
- Implement React frontend shell

Acceptance: Application starts locally and displays the themed interface.

## Stage 2 — Core scanning

- URL validation
- Browser lifecycle
- Page discovery
- Link checks
- Image checks
- JavaScript errors
- Network errors
- Placeholder checks
- Metadata checks
- Responsive checks

Acceptance: Real fixture defects are detected and returned through the API.

## Stage 3 — Interaction intelligence

- Element discovery
- Safe interaction classification
- Non-destructive interaction testing
- Button-response analysis
- Form inspection
- Safe client-side validation
- Evidence capture

Acceptance: The scanner detects supported interaction problems without real form submissions.

## Stage 4 — Premium dashboard

- Approved branding
- Full design system
- Light and dark modes
- Scan progress
- Results overview
- Issue filtering
- Page inspector
- Screenshot evidence
- Interactive sitemap
- Scan history

Acceptance: The complete scan workflow works through the interface with real data.

## Stage 5 — Reporting and reliability

- JSON export
- Standalone HTML report
- Deduplication
- Severity classification
- Scan cancellation
- Resource cleanup
- Security improvements
- Error handling

Acceptance: Results are reliable, explainable and exportable.

## Stage 6 — Release preparation

- Automated test suite
- GitHub Actions
- Documentation
- npm packaging
- Clean-install validation
- Cross-platform considerations
- Final UI polish
- Known limitations

Acceptance: The package is ready for review and publication approval.

### Execution rules

At each stage:

1. Implement the feature.
2. Add or update appropriate tests.
3. Run relevant checks.
4. Fix failures.
5. Record the result.
6. Continue to the next stage.

Do not silently skip difficult requirements.

If the full project cannot be completed in one Codex session, finish at a clean, working checkpoint, document what remains and provide the exact next implementation step.

Do not pretend unfinished features are complete.

---

# 22. OUT OF SCOPE FOR V1.0

Do not add:

- AI-generated code fixes
- Paid subscriptions
- Cloud-hosted scanning
- User registration
- Multi-user accounts
- Continuous website monitoring
- Scheduled cloud scans
- Authenticated private account workflows
- Real payment testing
- Destructive form submissions
- Browser extensions
- Desktop application installers
- Vulnerability exploitation
- Mandatory third-party integrations

These are potential future features, not v1.0 requirements.

---

# 23. RELEASE ACCEPTANCE CRITERIA

Buggd v1.0 is ready for release review only when the following are verified:

### Installation

- The application builds successfully.
- The CLI launches locally.
- The production dashboard is served correctly.
- The npm tarball installs in a clean environment.
- Missing Chromium dependencies are handled clearly.

### Scanning

- A URL can be submitted.
- Internal pages are discovered automatically.
- Broken links are detected.
- Missing images are detected.
- JavaScript exceptions are captured.
- Network failures are recorded.
- Placeholder content is identified.
- Responsive overflow checks operate.
- Supported safe interactions are inspected.
- Forms receive non-destructive validation checks.

### Reporting

- Findings contain evidence.
- Confirmed failures and potential issues are distinguished.
- Screenshots work.
- Issue details are accessible.
- Page-level results work.
- Visual sitemap works.
- JSON export works.
- HTML export works.

### Interface

- Light mode matches the approved branding.
- Dark mode matches the approved branding.
- Theme preference persists.
- Typography matches the specification.
- The logo matches the approved reference as closely as practical.
- The interface works at mobile and desktop widths.
- Navigation and controls are accessible.

### Reliability

- Scans can be cancelled.
- Timeouts are handled.
- Browser resources are cleaned up.
- Unsafe interactions are avoided or blocked.
- Local API protection is implemented.
- Results handle untrusted content safely.
- Automated tests pass.
- Production build succeeds.
- CI configuration is valid.

### Open source

- MIT licence is preserved.
- README is complete.
- Contributing guidance exists.
- Security limitations are documented.
- Package metadata is correct.
- Release notes are prepared.

Do not mark a criterion complete without evidence.

---

# 24. FINAL DELIVERABLES

When finished, provide:

1. Full implementation summary.
2. Repository structure.
3. List of completed features.
4. Exact local development commands.
5. Exact production CLI launch instructions.
6. Test results.
7. Build results.
8. npm packaging verification.
9. Screenshots of the actual interface.
10. Known issues and limitations.
11. Security considerations.
12. Any incomplete acceptance criteria.
13. Steps required before npm publication.
14. Recommended v1.1 improvements.

Do not publish to npm, deploy externally or push the repository without explicit approval.

Do not claim the project is production-ready solely because it builds.

---

# 25. FINAL QUALITY STANDARD

Buggd must feel like a genuine, professionally developed open-source product.

The completed application should demonstrate:

- Strong software architecture
- Reliable browser automation
- Safe testing practices
- Evidence-based issue reporting
- Thoughtful interaction design
- Excellent light and dark themes
- Consistent olive-and-lime branding
- Clear documentation
- Straightforward installation
- Maintainable open-source code

Above all, **the scanner must work**.

Do not prioritise appearance over functionality.

Do not create placeholder screens, invented scan results or non-functional controls.

Make sensible engineering decisions without repeatedly asking for minor clarification.

Record major trade-offs and limitations.

**Begin by inspecting the existing repository and approved branding reference, then implement the project in the staged order above.**
