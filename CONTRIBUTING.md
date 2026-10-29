# Contributing

Use Node.js 22.12+ and `npm ci`. See [development setup](docs/development.md).

Keep changes focused. Separate scanner detection rules from browser orchestration and use the shared Zod schemas for API contracts. Add deliberately defective local fixtures for new checks. Prefer evidence-based findings to speculative diagnoses; use `potential` or `not-tested` when proof is incomplete.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and relevant end-to-end tests before opening a pull request. Never use a third-party website for destructive tests. Test only sites you own or are authorised to test.

Preserve the approved branding and theme tokens. Edit master vector geometry, then regenerate assets; do not crop the reference image into UI assets.

Do not include scan reports containing private data, credentials, authentication cookies or screenshots without permission. Never add publishing credentials or automatic release steps to CI.

All contributions are under the existing MIT licence. Be kind, precise and open to review.
