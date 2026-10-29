import {
  computeAccessibleName,
  getRole,
  isInaccessible,
} from "dom-accessibility-api";

export function locate(element: Element): string {
  const root = element.getRootNode() as Document | ShadowRoot;
  if (
    element.id &&
    root.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1
  ) {
    const local = `#${CSS.escape(element.id)}`;
    return root instanceof ShadowRoot
      ? `${locate(root.host)} >>> ${local}`
      : local;
  }
  const parts: string[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) {
    const siblings = Array.from(
      node.parentElement?.children ||
        (root instanceof ShadowRoot ? root.children : document.children),
    ).filter((s) => s.tagName === node!.tagName);
    parts.unshift(
      `${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node) + 1})`,
    );
  }
  return root instanceof ShadowRoot
    ? `${locate(root.host)} >>> ${parts.join(" > ")}`
    : parts.join(" > ");
}
export function resolve(locator: string): Element | null {
  let root: Document | ShadowRoot = document;
  const parts = locator.split(" >>> ");
  for (let i = 0; i < parts.length; i++) {
    const matches: NodeListOf<Element> = root.querySelectorAll(parts[i]);
    if (matches.length !== 1) return null;
    const element: Element = matches[0];
    if (i === parts.length - 1) return element;
    if (!element.shadowRoot) return null;
    root = element.shadowRoot;
  }
  return null;
}
export function elements(
  selector = 'a[href],button,input:not([type="hidden"]),select,textarea,img,form,[role="button"],[role="tab"],[role="switch"],summary',
): Element[] {
  const result: Element[] = [];
  function walk(root: Document | ShadowRoot) {
    result.push(...root.querySelectorAll(selector));
    for (const el of root.querySelectorAll("*"))
      if (el.shadowRoot && result.length < 1000) walk(el.shadowRoot);
  }
  walk(document);
  return result.slice(0, 1000);
}
function visibleText(element: Element | null): string {
  if (
    !element ||
    element.matches("input,textarea,select,option") ||
    element.querySelector("input,textarea,select")
  )
    return "";
  return (
    element instanceof HTMLElement
      ? element.innerText
      : element.textContent || ""
  ).trim();
}
export function capture(element: Element) {
  const rect = element.getBoundingClientRect();
  const attrs: Record<string, string> = {};
  for (const key of [
    "id",
    "role",
    "type",
    "aria-label",
    "aria-labelledby",
    "aria-controls",
    "aria-expanded",
    "aria-selected",
    "alt",
    "title",
  ]) {
    const value = element.getAttribute(key);
    if (value !== null) attrs[key] = value.slice(0, 300);
  }
  const region = element.closest(
    'nav,header,footer,main,aside,section[aria-label],[role="navigation"],[role="contentinfo"],[role="banner"]',
  );
  const landmark = region
    ? `${getRole(region) || region.tagName.toLowerCase()}${region.getAttribute("aria-label") ? `: ${region.getAttribute("aria-label")}` : ""}`
    : "Page content";
  const locator = locate(element);
  const text = visibleText(element).slice(0, 250);
  const destination =
    element instanceof HTMLAnchorElement
      ? element.href
      : element instanceof HTMLImageElement
        ? element.currentSrc || element.src
        : undefined;
  const fragment = element.cloneNode(true) as Element;
  for (const node of [fragment, ...fragment.querySelectorAll("*")]) {
    for (const attr of [...node.attributes])
      if (
        ![
          "id",
          "role",
          "type",
          "aria-label",
          "aria-labelledby",
          "aria-controls",
          "aria-expanded",
          "aria-selected",
          "alt",
          "title",
          "class",
        ].includes(attr.name)
      )
        node.removeAttribute(attr.name);
    if (node.matches("script,style,textarea,option")) node.textContent = "";
  }
  const uniqueId =
    !!element.id &&
    (element.getRootNode() as Document | ShadowRoot).querySelectorAll(
      `#${CSS.escape(element.id)}`,
    ).length === 1;
  return {
    locator,
    identity: uniqueId
      ? `${element.tagName.toLowerCase()}|${locator}`
      : `${landmark}|${locator}|${destination || ""}`,
    identityStrength: uniqueId ? ("id" as const) : ("structural" as const),
    tag: element.tagName.toLowerCase(),
    role: getRole(element) || "",
    text,
    accessibleName: computeAccessibleName(element),
    attributes: attrs,
    destination,
    nearbyText: (element.closest("form")
      ? visibleText(element.closest("form")?.querySelector("label") || null) ||
        landmark
      : visibleText(element.parentElement)
    )
      .trim()
      .slice(0, 240),
    landmark,
    html: fragment.outerHTML.slice(0, 1600),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    viewport: {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      scrollX,
      scrollY,
    },
    state: JSON.stringify({
      expanded: element.getAttribute("aria-expanded"),
      selected: element.getAttribute("aria-selected"),
    }),
    alignment: "unavailable" as "unavailable" | "reliable" | "moved",
    alignmentNote: "No aligned screenshot has been captured for this element.",
  };
}
export function inventory() {
  return elements()
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !isInaccessible(el);
    })
    .map(capture);
}
export { computeAccessibleName, getRole, isInaccessible };
declare global {
  interface Window {
    BuggdEvidence: {
      locate: typeof locate;
      resolve: typeof resolve;
      capture: typeof capture;
      inventory: typeof inventory;
      elements: typeof elements;
      computeAccessibleName: typeof computeAccessibleName;
      isInaccessible: typeof isInaccessible;
      getRole: typeof getRole;
    };
  }
}
