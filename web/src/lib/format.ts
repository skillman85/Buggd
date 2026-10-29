export function duration(ms: number) { return ms < 1000 ? `${Math.round(ms)}ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60000)}m ${Math.floor(ms / 1000) % 60}s`; }
export function date(value: string) { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
export function pageName(url: string) { try { const parsed = new URL(url); return decodeURI(parsed.pathname + parsed.search); } catch { return url; } }
export function siteName(url: string) { try { return new URL(url).host; } catch { return url; } }
