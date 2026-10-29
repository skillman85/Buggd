import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

export async function startFixture() {
  const counts = { writes: 0, unsafeGets: 0, external: 0 };
  const server = createServer((req, res) => {
    const path = new URL(req.url || "/", "http://fixture").pathname;
    if (!["GET", "HEAD"].includes(req.method || "")) {
      counts.writes++;
      res.writeHead(200).end("write received");
      return;
    }
    if (path === "/side-effect") {
      counts.unsafeGets++;
      res.writeHead(200).end("side effect");
      return;
    }
    if (path === "/external") {
      counts.external++;
      res.writeHead(200).end("external destination");
      return;
    }
    if (path === "/redirect-loop") {
      res.writeHead(302, { location: "/redirect-loop" }).end();
      return;
    }
    if (path === "/slow") {
      const timer = setTimeout(() => {
        res
          .writeHead(200, { "Content-Type": "text/html" })
          .end("<title>Slow</title><h1>Eventually loaded</h1>");
      }, 15000);
      req.on("close", () => clearTimeout(timer));
      return;
    }
    if (path === "/missing" || path === "/missing.png") {
      res
        .writeHead(404, {
          "Content-Type": path.endsWith("png") ? "image/png" : "text/html",
        })
        .end(
          path.endsWith("png")
            ? ""
            : "<title>Not found</title><h1>Not found</h1>",
        );
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (path === "/clean") {
      res.end(
        '<!doctype html><html lang="en"><head><title>Clean fixture</title><meta name="viewport" content="width=device-width"></head><body><main><h1>A healthy page</h1><p>This page is intentionally simple.</p><a href="/">Home</a></main></body></html>',
      );
      return;
    }
    if (path === "/non-html") {
      res.setHeader("Content-Type", "application/pdf");
      res.end("not actually HTML");
      return;
    }
    res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;margin:24px}#overflow{width:1800px;height:32px;background:#eee}button,input,select{margin:8px;padding:8px}#clipped{width:40px;overflow:hidden;white-space:nowrap}</style></head><body><main>
      <h1>Defective fixture</h1><p>Lorem ipsum. TODO: replace this copy.</p><p>Coming soon</p>
      <nav><a href="/clean">Clean page</a> <a href="/missing">Broken internal link</a> <a href="/redirect-loop">Redirect loop</a> <a href="/non-html">Document</a> <a href="https://example.org/">External destination</a> <a href="#">Placeholder</a></nav>
      <img id="broken-image" src="/missing.png"><div id="overflow">Horizontal overflow</div><h2 id="clipped">Visibly clipped heading</h2>
      <details id="accordion"><summary>Helpful accordion</summary><p>Expanded content</p></details>
      <button type="button" id="tab" aria-expanded="false" aria-controls="panel" onclick="const p=document.getElementById('panel');p.hidden=!p.hidden;this.setAttribute('aria-expanded',String(!p.hidden))">Toggle panel</button><div id="panel" hidden>Panel content</div>
      <button type="button" id="noop" aria-expanded="false" aria-controls="noop-panel">Non-responsive control</button><div id="noop-panel" hidden>Never opens</div>
      <button type="button" id="guarded-get" aria-expanded="false" aria-controls="network-panel" onclick="fetch('/side-effect')">Toggle network panel</button><div id="network-panel" hidden>Requires network</div>
      <label for="dropdown">Choose a colour</label><select id="dropdown" onchange="document.getElementById('choice').textContent=this.value"><option>Olive</option><option>Lime</option></select><span id="choice">Olive</span>
      <button type="button" id="delete" onclick="fetch('/write',{method:'POST'})">Delete account</button><button type="button" id="unknown">Unknown custom action</button>
      <form id="contact" action="/write" method="post"><label for="email">Email</label><input id="email" type="email" required><input id="unlabelled" required><label for="agree">Agree</label><input id="agree" type="checkbox" required><button type="submit">Send</button></form>
      </main><script>console.error('Fixture console error');setTimeout(()=>{throw new Error('Fixture uncaught exception')},30);fetch('/write',{method:'POST'}).catch(()=>{});</script></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    url,
    counts,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
