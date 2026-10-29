export const THEME_KEY = "buggd.theme";
export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}
/** Blocking head script runs before stylesheet loading. Generated with the assets. */
export const themeBootstrap = `(() => {
  let preference = 'system';
  try { const value = localStorage.getItem('${THEME_KEY}'); if (['light','dark','system'].includes(value)) preference = value; } catch {}
  const resolved = preference === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
})();\n`;
