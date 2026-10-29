# Buggd v1.1.0 — GitHub release notes (draft)

> **Draft only.** This file prepares copy for a future GitHub Release. No GitHub Release or npm package has been published. The unscoped npm name `buggd` is currently blocked by npm’s name-similarity check, and an appeal is pending. Do not publish a release or announce `npx buggd` as working before it has been verified against the public registry.

## Find what’s broken

Buggd is a free, MIT-licensed, local-first website scanner for people who build and maintain websites. Scan sites you own or have permission to test, inspect real Chromium evidence, and work through potential problems in a visual dashboard. No accounts, telemetry, cloud storage or mandatory AI.

## Highlights

- **Discover and inspect pages:** bounded same-origin crawling, broken links and missing resources, browser errors, placeholders and common document checks.
- **Understand findings:** Simple and Technical modes, plain-English explanations, individual affected elements and evidence-backed screenshots.
- **Test across screen sizes:** desktop, tablet and mobile checks with measured highlights and explicit capture limitations.
- **Check safer interactions:** recognised nondestructive controls and native form validity, without submitting forms.
- **Fix and verify:** save review progress, rescan and compare findings with conservative coverage-aware resolution rules.
- **Keep results local:** export HTML, PDF and JSON reports; manage saved scan history and inspect the discovered page map.
- **Choose light or dark:** Buggd’s olive/lime visual identity and self-hosted typefaces.

## How to try the public source today

Requires Node.js 22.12+ and Git.

```sh
git clone https://github.com/skillman85/Buggd.git
cd Buggd
npm ci
npm run browser:install
npm run build
npm start
```

Buggd starts a local dashboard and prints its address. Only scan websites you are authorised to test.

**Pending npm name approval:** The intended installation command is `npx buggd`, but it is not currently available for this application. A public npm installation must be verified after publishing before these release notes are used as an npm launch announcement.

## Tested

The v1.1.0 source passed real GitHub Actions checks on Windows, Ubuntu and macOS, each with Node.js 22 and 24. The matrix includes 71 unit/integration tests, 25 browser tests, typecheck, lint, build and compiled-package/CLI smoke checks. See [CI run](https://github.com/skillman85/Buggd/actions/runs/40932911586) and [release-readiness report](final-release-readiness.md).

## Scope and limitations

Buggd is not a comprehensive accessibility, SEO or security audit. It deliberately excludes destructive actions, live form submissions, authenticated journeys and some cross-origin content. Browser screenshots may contain private information: inspect reports before sharing. See [security and coverage limits](security.md).

## After npm approval — publication checklist

- [ ] Confirm npm explicitly permits publishing the **unscoped** `buggd` name.
- [ ] Publish the authorised reviewed package and confirm `buggd@1.1.0` exists in the public npm registry.
- [ ] Test `npx buggd` and browser setup from a clean environment; document any platform prerequisites.
- [ ] Update README release status and link to the real npm package.
- [ ] Add reviewed Buggd UI screenshots after a fresh safe test scan.
- [ ] Only then create an official GitHub Release and announce public availability.

Buggd is [MIT licensed](../LICENSE). Contributions and bug reports are welcome via [GitHub Issues](https://github.com/skillman85/Buggd/issues).
