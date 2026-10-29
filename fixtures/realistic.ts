import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { build } from "esbuild";
export async function startRealisticFixture() {
  const bundled = await build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';function App(){const[path,setPath]=React.useState(location.pathname);React.useEffect(()=>{const on=()=>setPath(location.pathname);addEventListener('popstate',on);const timer=setTimeout(()=>document.getElementById('delayed').innerHTML='<a href="/late">Late route</a><button id="late-control" aria-label="Late action">+</button>',150);return()=>{clearTimeout(timer);removeEventListener('popstate',on)}},[]);return React.createElement('main',null,React.createElement('h1',null,path),React.createElement('a',{href:'/client',onClick:e=>{e.preventDefault();history.pushState({},'', '/client');setPath('/client')}},'Client route'),React.createElement('div',{id:'delayed'}),React.createElement('a',{href:'/wordpress'},'WordPress page'))}createRoot(document.getElementById('app')).render(React.createElement(App));`,
      resolveDir: process.cwd(),
      loader: "js",
    },
    define: { "process.env.NODE_ENV": '"production"' },
    bundle: true,
    write: false,
    format: "iife",
  });
  const counts = { writes: 0 };
  const server = createServer((req, res) => {
    if (req.method !== "GET") {
      counts.writes++;
      res.end();
      return;
    }
    if (req.url === "/app.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.end(bundled.outputFiles[0].text);
      return;
    }
    if (req.url === "/missing.png") {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<!doctype html><title>Realistic fixture</title><style>body{font:16px sans-serif;margin:24px}.mobile{display:none}@media(max-width:600px){.mobile{display:block}}</style><nav><a href="/">Home</a><a href="/wordpress">Contact</a><button class="mobile" aria-label="Mobile menu">☰</button></nav>${req.url === "/wordpress" ? `<main class="wp-site-blocks"><h1>Contact and gallery</h1><figure class="wp-block-gallery"><img src="/missing.png" alt="Gallery image"></figure><form class="wp-block-form" onsubmit="event.preventDefault()"><label for="email">Email</label><input id="email" required type="email"><button>Send enquiry</button></form><details><summary>Webflow-style disclosure</summary><p>Answer</p></details><button id="modal-toggle" aria-controls="modal" aria-expanded="false" onclick="const m=document.getElementById('modal');m.hidden=!m.hidden;this.setAttribute('aria-expanded',String(!m.hidden))">Open details</button><div id="modal" role="dialog" aria-label="Details" hidden>Framer-style panel</div></main>` : '<div id="app"></div><script src="/app.js"></script>'}`,
    );
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    counts,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
