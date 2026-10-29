# Security and coverage limits

Only inspect websites you own or are authorised to test. Buggd runs website JavaScript in Chromium. It is not a security vulnerability scanner, an exhaustive audit or a complete sandbox.

## Local application

The server listens on `127.0.0.1` only. A random HttpOnly, SameSite=Strict cookie protects API reads including SSE, exports and screenshots. Mutations additionally require a random request token in a header. Tokens are not placed in URLs. Origin/Fetch Metadata checks reject cross-site requests and Host checks reject DNS-rebinding hostnames. The UI uses a Content Security Policy, frame restrictions and escaped React text. Exported HTML escapes website content, contains no scripts and embeds bounded evidence images.

Filesystem identifiers are validated UUIDs. Evidence routes only read images referenced by that scan; supplied paths cannot become arbitrary filesystem paths. This is local single-user software, not protection against another process running as the same OS user. Multiple Buggd instances should use different data directories to avoid competing writes.

## Browser network scope

Requests are restricted to the exact target origin, including its scheme and port. Cross-origin navigation, frames and API requests are blocked. CDNs, fonts and other external assets are blocked by default. This can produce incomplete rendering and behaviour on sites that depend on third-party assets. Blocked resources are coverage limits, not confirmed website defects. Private LAN scanning is excluded. Explicit localhost/loopback targets remain supported on their target port; the application’s own server port (and Vite port in development) is forbidden.

The **explicit public-assets option** retrieves external image/font/style/script resources through a separate anonymous server-side GET path. Each destination and redirect is resolved and validated, then connected to the pinned public IP. No browser Cookie, Authorization or referrer is forwarded; Set-Cookie is discarded. Original content type and relevant CORS/CORP headers are preserved rather than bypassed. External navigation, external fetch/XHR, private/loopback assets and network writes remain blocked, including when the scan target is explicitly localhost. Cookies set by a downloaded script are not authenticated credentials supplied by Buggd; scripts still execute within the isolated context and network policy.

Public retrieval is bounded to eight active assets, three redirects, 5s socket inactivity per request, 4 MiB per asset and 32 MiB per scan. Closing/cancelling a scan destroys outstanding asset requests and prevents pending DNS lookups from opening new connections. DNS and socket timeouts are not a guarantee against all browser or OS resource consumption.

The browser uses an authenticated local forward proxy. All destination IPs are validated, including IPv4-mapped IPv6; private, link-local, unspecified, multicast and reserved addresses are rejected. DNS results are checked at connection time, and the proxy connects to the validated IP without re-resolving it. HTTPS uses CONNECT and retains browser certificate validation. Self-signed certificates are not silently trusted.

Scope enforcement lives in both browser routing and the proxy because [Playwright does not re-run route handlers for redirect hops](https://playwright.dev/docs/network#redirects). Navigation response chains are observed to stop repeated destinations or the bounded redirect limit. Service workers, WebSockets, downloads and popups are excluded. QUIC and non-proxied WebRTC UDP are disabled as additional protections. Browser internals, DNS traffic, vulnerabilities in Chromium and OS-level processes are outside these guarantees. Use OS isolation for hostile content.

## Safe interaction limits

All browser contexts block non-idempotent network requests and real form submissions. Only semantically recognised local UI controls are considered for clicks. Destructive/action/form/download controls are excluded. Unknown handlers are not executed. Every attempted interaction reloads a page in a new context, then blocks **all** network requests, including GET, before the action.

Even an initial GET request or page load can cause a side effect on an incorrectly designed server. Buggd cannot guarantee zero side effects. Browser permissions, clipboard changes, delayed effects and application state outside the observation window are not fully observable. “No observable response” is a potential issue, not proof of a broken button. Interaction testing can be disabled.

Native form checks temporarily use synthetic empty/invalid values, read validity properties and restore the original values without dispatching input/submit events. Custom JavaScript messages and backend form processing are explicitly not tested. No passwords or live form values are saved by the form checker.

## Resource controls

- Default: 25 pages, two concurrent pages, 15s page timeout and 180s overall scan deadline.
- Configurable bounds: 1–100 pages, 1–4 concurrent pages, 1–45s page timeout, 5–600s scan deadline and 0–12 safe interaction attempts per page.
- Five query variants per pathname; meaningful query parameters and slash routes are preserved. Known authentication/secret query parameters and URL credentials are rejected.
- At most 500 requests per context, 128 proxy connections and 96 MiB of proxied socket traffic per scan. DNS lookups time out after four seconds.
- At most 150 internal/50 external recorded links per page, 3,000 total links, 1,000 finding groups and bounded text excerpts.
- Viewport screenshots at 1440, 768 and 390px, with up to eight additional offscreen captures per page and bounded isolated interaction captures; individual PNGs below 4 MiB, approximately 60 MiB evidence per scan and 64 MiB JSON reports.
- Standalone HTML/PDF embeds at most ten captures and 12 MiB of image bytes. PDF includes the first 100 prioritised groups, uses one offline renderer at a time and limits output to 24 MiB. Other findings and locators remain readable.
- History retention: up to 50 scans and 512 MiB of recorded evidence. Old completed scans are pruned when those limits are exceeded.

These are application controls, not hard browser memory/CPU isolation. Large or adversarial DOMs may consume resources before the checker can respond. Cancellation closes active browser contexts and the proxy; timeouts leave partial results with an explicit terminal state.

## Accuracy and privacy

Responsive overlap/clipping checks are geometry heuristics. Intentional overlays can trigger potential findings. Accessible-name checks use dom-accessibility-api, cover common HTML/ARIA patterns and open shadow roots, and inspect desktop/mobile states. Closed shadow roots and iframe contents are not audited. This is not a complete WCAG audit. Offscreen lazy loading is exercised with a bounded scroll, not exhaustive page traversal. Placeholder markers may be intentional. There is no overall quality score and no claim of complete SEO/accessibility/security compliance.

Screenshots, URLs, page text, stack traces and resource paths may contain sensitive visible content. Reports stay local by default, but review them before sharing. Do not scan production private-account flows. Data is protected by OS permissions, not encrypted by Buggd. Runtime logs avoid printing target URLs. Dependencies and Chromium installation require network downloads; the application has no telemetry, analytics, AI calls or upload service.

## Evidence, exports and comparisons

A screenshot marked complete means no observed blocking/loading limitation was recorded at capture time; it is not proof that every asset, lazy state or visitor journey rendered. Failed or blocked resources make captures limited with a visible note. A changing/missing element or incompatible legacy screenshot never gets invented highlight coordinates. Fixed/sticky elements are measured in the captured viewport; full-page capture is not currently used.

The HTML/PDF exporter escapes detector text and uses original PNG evidence. Any close-up is a viewBox crop calculated from the same verified bounds. It cannot fetch remote content or run website scripts. Attribute whitelists exclude form values and handlers from saved fragments; explicit field values are not collected by element capture. Known credential patterns and local home paths are removed from shared text/JSON exports, but automatic redaction is not an exhaustive personal-data detector and cannot remove sensitive content visible inside screenshots. Review reports before sharing.

Review progress is separate from raw observations. Comparisons never treat a manual fix status as proof. Missing pages, incomplete scans, skipped checks, rendering interference and uncertain element matches prevent verified-resolution claims. History compatibility does not add evidence that older versions never captured.
