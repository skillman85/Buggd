let token: Promise<string> | undefined;
async function session() {
  token ??= fetch('/api/session', { credentials: 'same-origin' }).then(async response => {
    if (!response.ok) throw new Error('The local Buggd server is unavailable.');
    return (await response.json() as { token: string }).token;
  }).catch(error => { token = undefined; throw error; });
  return token;
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const csrf = await session();
  const response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), 'x-buggd-token': csrf, ...options.headers } });
  if (response.status === 401 && retry) { token = undefined; return api(path, options, false); }
  if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error || `Request failed (${response.status}).`); }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function evidenceUrl(scanId: string, evidenceId: string) { return `/api/scans/${scanId}/evidence/${evidenceId}`; }
export function exportUrl(scanId: string, format: 'json' | 'html') { return `/api/scans/${scanId}/export?format=${format}`; }
