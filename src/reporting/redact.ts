/** Output-only redaction. Raw observations and review states remain separate. */
export function redactText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(
      /([?&](?:access_token|token|api_key|password|secret|session|signature)=)[^\s&<>"']+/gi,
      "$1[redacted]",
    )
    .replace(
      /((?:password|secret|authorization|cookie|api[_-]?key)\s*[:=]\s*)[^\s,;<>]+/gi,
      "$1[redacted]",
    )
    .replace(
      /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)[^\s<>"']+/g,
      "[local path redacted]",
    );
}
export function redactExport<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "string" ? redactText(item) : item,
    ),
  ) as T;
}
