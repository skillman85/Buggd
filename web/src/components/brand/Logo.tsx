import { useId } from "react";
import type { CSSProperties, SVGProps } from "react";
import { bugBody, bugLegs, wordmark, brandPalette } from "./geometry";
import type { BrandTone } from "./geometry";

type BrandProps = Omit<
  SVGProps<SVGSVGElement>,
  | "children"
  | "color"
  | "role"
  | "aria-label"
  | "aria-labelledby"
  | "aria-hidden"
> & {
  /** Omit to follow the active UI theme. Use a fixed tone on fixed backgrounds. */
  tone?: BrandTone;
  decorative?: boolean;
  label?: string;
};

function toneStyle(tone?: BrandTone): CSSProperties {
  if (!tone) return {};
  const colors = brandPalette[tone];
  return {
    "--brand-icon": colors.icon,
    "--brand-wordmark": colors.wordmark,
    "--brand-dot": colors.dot,
  } as CSSProperties;
}

export function BugGlyph() {
  return (
    <g fill="var(--brand-icon, currentColor)">
      <path d={bugBody} />
      <path
        d={bugLegs}
        fill="none"
        stroke="var(--brand-icon, currentColor)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

export function BugIcon({
  tone,
  decorative = false,
  label = "Buggd",
  width = 40,
  style,
  ...props
}: BrandProps) {
  const titleId = useId();
  return (
    <svg
      {...props}
      viewBox="0 0 96 96"
      width={width}
      height={width}
      style={{ ...toneStyle(tone), ...style }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : titleId}
      focusable="false"
    >
      {!decorative && <title id={titleId}>{label}</title>}
      <g transform="translate(0 4)">
        <BugGlyph />
      </g>
    </svg>
  );
}

export function Logo({
  tone,
  decorative = false,
  label = "Buggd",
  width = 164,
  style,
  ...props
}: BrandProps) {
  const titleId = useId();
  return (
    <svg
      {...props}
      viewBox="0 0 420 104"
      width={width}
      style={{ height: "auto", maxWidth: "100%", ...toneStyle(tone), ...style }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : titleId}
      focusable="false"
    >
      {!decorative && <title id={titleId}>{label}</title>}
      <g transform="translate(0 5)">
        <BugGlyph />
      </g>
      <path
        d={wordmark}
        transform="translate(114 6)"
        fill="var(--brand-wordmark, currentColor)"
        fillRule="evenodd"
      />
      <circle cx="404" cy="65" r="8" fill="var(--brand-dot, currentColor)" />
    </svg>
  );
}
