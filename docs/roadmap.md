# Future work

## Current status

Buggd v1.1.0 source is available on GitHub, with six GitHub Actions jobs passing on Windows, Ubuntu and macOS with Node.js 22 and 24. See the [final release-readiness report](final-release-readiness.md).

**Public npm publication is pending.** The unscoped `buggd` name was rejected by npm’s similarity protection; the maintainer has requested manual review. Do not claim `npx buggd` is publicly installable until a published package and clean install have been verified.

## Near-term

- Obtain npm approval for the unscoped name `buggd` without changing the CLI branding, then verify a clean registry installation.
- Add privacy-reviewed application screenshots from a fresh authorised Buggd scan.
- Collect issue reports from actual users and improve first-run guidance based on observed difficulties.

## Possible future enhancements

- Authorised iframe inspection and clearer closed-shadow-root coverage.
- Broader opt-in interaction and custom validation fixtures without weakening write/network locks.
- More identity migration strategies when sites replace or restructure elements; ambiguous cases must remain unverified.
- Additional localisation/font subsets and assistive-technology testing.
- Broader real-world HTTPS/CDN fixtures, browser resource budgets and large-site map/evidence usability.
- Designer source vectors, if available, to replace the close reconstruction of the approved brand image.

These items are ideas, not promises or claims of current functionality.
