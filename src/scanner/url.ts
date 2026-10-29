const sensitiveParameter =
  /^(?:(?:access|refresh|id)[_-]?token|token|api[_-]?key|password|secret|session(?:id)?|authorization|auth|code)$/i;

export function normalizeUrl(input: string, base?: string): string {
  let text = input.trim();
  if (!base && !/^[a-z][a-z\d+.-]*:\/\//i.test(text))
    text = `${/^(?:localhost|127(?:\.\d{1,3}){1,3}|\[::1\])(?::|\/|$)/i.test(text) ? "http" : "https"}://${text}`;
  const url = new URL(text, base);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Enter an HTTP or HTTPS website URL.");
  if (url.username || url.password)
    throw new Error("URLs containing credentials are not supported.");
  if (url.href.length > 2048) throw new Error("The URL is too long.");
  if ([...url.searchParams.keys()].some((key) => sensitiveParameter.test(key)))
    throw new Error(
      "URLs containing authentication or secret parameters are not supported. Use a public or local test page.",
    );
  url.hash = "";
  // Preserve meaningful query strings and trailing slashes; do not merge distinct routes.
  return url.href;
}
export function isHtmlLink(url: string): boolean {
  return !/\.(?:pdf|jpe?g|png|gif|svg|webp|avif|ico|zip|gz|mp[34]|webm|woff2?|ttf|css|js|json|xml|txt)$/i.test(
    new URL(url).pathname,
  );
}
export function displayError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(
    0,
    1200,
  );
}
export function safeUrl(input: string): string {
  try {
    const url = new URL(input);
    url.username = "";
    url.password = "";
    for (const key of [...url.searchParams.keys()])
      if (sensitiveParameter.test(key)) url.searchParams.set(key, "[redacted]");
    return url.href.slice(0, 2048);
  } catch {
    return input.slice(0, 2048);
  }
}
