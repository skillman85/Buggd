import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  brandPalette,
  bugBody,
  bugLegs,
  wordmark,
} from "../web/src/components/brand/geometry";
import { themeBootstrap } from "../web/src/theme/preferences";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = `${root}web/public/brand`;
await mkdir(output, { recursive: true });
const glyph = (color: string) =>
  `<g fill="${color}"><path d="${bugBody}"/><path d="${bugLegs}" fill="none" stroke="${color}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const letters = (text: string, dot: string) =>
  `<path d="${wordmark}" transform="translate(114 6)" fill="${text}" fill-rule="evenodd"/><circle cx="404" cy="65" r="8" fill="${dot}"/>`;
const svg = (viewBox: string, content: string, title: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title"><title id="title">${title}</title>${content}</svg>\n`;

for (const [tone, colors] of Object.entries(brandPalette)) {
  await writeFile(
    `${output}/buggd-logo-${tone}.svg`,
    svg(
      "0 0 420 104",
      `<g transform="translate(0 5)">${glyph(colors.icon)}</g>${letters(colors.wordmark, colors.dot)}`,
      "Buggd",
    ),
  );
  await writeFile(
    `${output}/buggd-icon-${tone}.svg`,
    svg(
      "0 0 96 96",
      `<g transform="translate(0 4)">${glyph(colors.icon)}</g>`,
      "Buggd icon",
    ),
  );
}

// Automatic standalone icon. Explicit theme variants remain available for fixed surfaces.
await writeFile(
  `${output}/buggd-icon.svg`,
  svg(
    "0 0 96 96",
    `<style>:root{color:${brandPalette.light.icon}}@media(prefers-color-scheme:dark){:root{color:${brandPalette.dark.icon}}}</style><g transform="translate(0 4)">${glyph("currentColor")}</g>`,
    "Buggd icon",
  ),
);
const appIcon = svg(
  "0 0 192 192",
  `<rect width="192" height="192" rx="40" fill="${brandPalette.lime.background}"/><g transform="translate(30 35) scale(1.375)">${glyph(brandPalette.lime.icon)}</g>`,
  "Buggd app icon",
);
await writeFile(`${output}/buggd-app-icon.svg`, appIcon);
// Use a solid lime tile so favicons retain contrast in both browser themes.
await writeFile(`${output}/favicon.svg`, appIcon);
for (const size of [16, 32, 48, 180, 192, 512]) {
  const name =
    size === 180
      ? "apple-touch-icon.png"
      : size >= 192
        ? `buggd-app-icon-${size}.png`
        : `favicon-${size}.png`;
  await sharp(Buffer.from(appIcon))
    .resize(size, size)
    .png()
    .toFile(`${output}/${name}`);
}

// Path-only social card; no renderer-dependent fonts or raster reference.
const social = svg(
  "0 0 1200 630",
  `<rect width="1200" height="630" fill="${brandPalette.dark.background}"/><rect x="64" y="64" width="1072" height="502" rx="32" fill="none" stroke="${brandPalette.light.icon}"/><g transform="translate(180 210) scale(2)"><g transform="translate(0 5)">${glyph(brandPalette.dark.icon)}</g>${letters(brandPalette.dark.wordmark, brandPalette.dark.dot)}</g>`,
  "Buggd — Find what’s broken.",
);
await writeFile(`${output}/buggd-social.svg`, social);
await sharp(Buffer.from(social)).png().toFile(`${output}/buggd-social.png`);
await writeFile(`${root}web/public/theme-init.js`, themeBootstrap);
await writeFile(
  `${root}web/public/manifest.webmanifest`,
  JSON.stringify(
    {
      name: "Buggd",
      short_name: "Buggd",
      start_url: "/",
      display: "standalone",
      background_color: "#FAF9F1",
      theme_color: "#0F1B12",
      icons: [192, 512].map((size) => ({
        src: `/brand/buggd-app-icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      })),
    },
    null,
    2,
  ) + "\n",
);
await mkdir(`${root}docs/brand/font-licenses`, { recursive: true });
for (const name of ["plus-jakarta-sans", "google-sans-code"]) {
  await copyFile(
    `${root}node_modules/@fontsource/${name}/LICENSE`,
    `${root}docs/brand/font-licenses/${name}.txt`,
  );
}
console.log(
  "Generated SVG logos, icons, favicons, app icons, social artwork and theme bootstrap.",
);
