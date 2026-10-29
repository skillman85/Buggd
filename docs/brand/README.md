# Buggd brand implementation

The approved olive/lime image is retained as `buggd-brand-reference.png` for design review. It must never be cropped into runtime logos or used as a substitute for components. The original supplied image is also retained at the repository root.

## Vector sources

`web/src/components/brand/geometry.ts` is the source of truth for the bug paths, lowercase wordmark paths and asset colours. The React components and asset generator import it. Change geometry there, then run:

```sh
npm run brand:generate
```

Generation also runs before development and during production builds. Commit regenerated public assets with source changes. PNGs are generated from the vectors with Sharp; never edit those PNGs directly.

The bug symbol and wordmark are hand reconstructed from the raster reference. They preserve the geometric head, split shell, six limbs, heavy lowercase lettering and lime full stop. They are a close approximation; exact designer geometry, optical spacing and subtle raster shading are not available. The vectors deliberately use flat fills for predictable small-size rendering. Have the brand owner review the approximation before a public release.

## Available assets

| File in `web/public/brand/` | Use |
| --- | --- |
| `buggd-logo-light.svg` | Olive mark, dark lettering, lime dot on light surfaces |
| `buggd-logo-dark.svg` | Lime mark and dot, cream lettering on dark surfaces |
| `buggd-logo-lime.svg` | Deep olive artwork on a lime surface |
| `buggd-icon-{light,dark,lime}.svg` | Transparent standalone marks for fixed surfaces |
| `buggd-icon.svg` | Standalone mark adapting to system colour preference |
| `favicon.svg` | Lime tile with dark bug, legible on either browser theme |
| `favicon-{16,32,48}.png` | Raster favicon fallbacks |
| `apple-touch-icon.png` | 180 × 180 icon |
| `buggd-app-icon.svg` | Scalable app tile |
| `buggd-app-icon-{192,512}.png` | App icons referenced by the web manifest |
| `buggd-social.svg`, `buggd-social.png` | 1200 × 630 social artwork |

Every SVG is self contained. The horizontal wordmark contains paths, rather than live text; it renders without an installed font. Standalone SVGs have a viewBox and can scale to any size. PNGs are fallbacks and social assets, not the master artwork.

## React usage

```tsx
import { Logo, BugIcon } from './components/brand';

// Follows semantic theme tokens automatically.
<Logo width={164} />

// Fixed tone for a surface that stays dark in both UI themes.
<Logo tone="dark" width={240} />

// Hide artwork when the parent already has an accessible name.
<a href="/" aria-label="Buggd home"><Logo decorative /></a>

<BugIcon width={24} label="Buggd" />
```

Components default to accessible named images with unique title IDs. `decorative` hides redundant artwork from assistive technology. Do not remove the accessible name from a logo-only link. The logo scales proportionally; avoid setting a conflicting height. Use at least 16px for the icon and approximately 100px for the horizontal logo.

Keep clear space of at least one antenna length around the mark. Use the light variant on cream/white, dark on olive-black and lime on lime. Do not stretch, recolour individual paths arbitrarily, or apply effects that obscure the split shell. The inline theme-aware components are preferred in the application; external SVG image files cannot inherit the application's CSS variables.

## Theme integration

Wrap the application in `ThemeProvider`, import `styles/tokens.css`, and place `ThemeSwitcher` where users can find it. `useTheme()` exposes `theme`, `resolvedTheme` and `setTheme`.

- Default preference: system.
- Storage key: `buggd.theme`; values: `light`, `dark`, `system`.
- System changes update the active theme only while system mode is selected.
- Cross-tab preference updates synchronize through the storage event.
- Missing/invalid/blocked storage falls back to system; manual selection still works for the current session.
- `theme-init.js` is a blocking external head script before application styles/scripts. It applies a validated preference before React loads, preventing the initial theme flash. Keep it in this position when integrating into a server template.
- The root `data-theme` attribute and `color-scheme` control component tokens and native form controls.
- Styling uses visible focus states and respects reduced-motion preference.

Use semantic variables such as `--surface`, `--foreground`, `--border`, `--primary`, `--danger` and `--danger-surface` for interface components. Raw palette tokens belong in brand specimens or palette definitions. Status labels include text and symbols so meaning does not depend on colour alone.

The application uses Tailwind with official shadcn Button, Badge and Dialog sources, adapted to the approved semantic tokens and direct Radix imports. Tables, filters, inspectors, status indicators and the website map use the same theme system. Do not reintroduce an independent palette inside a component.

## Typography and network use

Plus Jakarta Sans (600/700/800) is used for headings, and Google Sans Code (400/500) for interface content. Fontsource packages bundle Latin font files into the local production build; opening the preview makes no font CDN requests. Font notices are retained in `font-licenses/`. Add appropriate subsets if localization expands beyond Latin.

Dependency and Chromium installation require network access. The preview itself needs no external service. The social-image metadata currently uses a local path; if a public site is later deployed, set a canonical absolute Open Graph image URL.
