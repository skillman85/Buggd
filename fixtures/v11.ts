import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
export async function startV11Fixture() {
  const state = {
    fixed: false,
    keepButton: false,
    newProblem: false,
    externalAssets: false,
  };
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJp8AAAAASUVORK5CYII=",
    "base64",
  );
  const server = createServer((req, res) => {
    const path = new URL(req.url || "/", "http://fixture").pathname;
    if (path === "/image.png") {
      res
        .writeHead(state.fixed ? 200 : 404, { "Content-Type": "image/png" })
        .end(state.fixed ? png : undefined);
      return;
    }
    if (path === "/pixel.png") {
      res.writeHead(200, { "Content-Type": "image/png" }).end(png);
      return;
    }
    const label = (name: string) =>
      state.fixed && !(state.keepButton && name === "Open menu")
        ? `aria-label="${name}"`
        : "";
    res
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end(
        `<!doctype html><html lang="en"><head><title>${path === "/about" ? "About" : "Home"} fixture</title><meta name="viewport" content="width=device-width,initial-scale=1">${state.externalAssets ? '<script src="https://assets.invalid/render.js"></script>' : ""}<style>body{font:16px system-ui;margin:20px}nav{display:flex;gap:20px}button,a{display:inline-block;padding:12px}img{width:40px;height:40px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.mobile{display:none}@media(max-width:700px){.mobile{display:inline-block}}#far-target{width:90px;height:40px}</style></head><body><header><nav aria-label="Main navigation"><a id="bad-nav" href="/about" ${label("About us")}><svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6"/></svg></a><a href="/" id="named-link">Home</a></nav></header><main><h1>Human-friendly fixture</h1>${state.newProblem ? "<p>Lorem ipsum placeholder text</p>" : ""}<button id="bad-button" ${label("Open menu")}><svg aria-hidden="true" width="18" height="18"><path d="M0 3H18M0 9H18" stroke="black"/></svg></button><button id="named-icon" aria-label="Search"><svg aria-hidden="true" width="18" height="18"></svg></button><button id="svg-title"><svg width="18" height="18"><title>Close dialog</title><rect width="10" height="10"/></svg></button><span id="hidden-label" hidden>Open account</span><button id="labelled-by" aria-labelledby="hidden-label"><svg aria-hidden="true" width="18" height="18"></svg></button><button id="hidden-text"><span class="sr-only">Open navigation</span><svg aria-hidden="true" width="18" height="18"></svg></button><a id="image-link" href="/about"><img src="/pixel.png" alt="About our team"></a><button id="nested-name"><span><span>Read more</span></span><svg aria-hidden="true" width="10" height="10"></svg></button><button id="decorative" aria-hidden="true">Decorative hidden control</button><button class="mobile" id="mobile-bad" ${label("Open mobile menu")}><svg aria-hidden="true" width="18" height="18"></svg></button><img id="broken-image" src="/image.png" alt="Example team photo"><div id="shadow-host"></div><div style="height:1400px"></div><button id="far-target" ${label("Back to the top")}><svg aria-hidden="true" width="18" height="18"></svg></button></main><script>document.getElementById('shadow-host').attachShadow({mode:'open'}).innerHTML='<button id="shadow-bad" ${label("Expand details")}> <svg aria-hidden="true" width="18" height="18"></svg></button><button aria-label="Named shadow control">✓</button>';</script></body></html>`,
      );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`,
    state,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
