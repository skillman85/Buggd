import { it, expect } from "vitest";
import { chromium } from "playwright";
import axe from "axe-core";
import { inventory } from "../../src/scanner/evidence/capture.js";
it("agrees with independent axe name rules for native, SVG, hidden-text and shared-navigation controls", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<title>Reference</title><style>a{display:inline-block;min-width:30px;min-height:30px}</style><nav><a id="unnamed-link" href="/home"><img alt=""></a><a id="named-image" href="/team"><img alt="Our team"></a><a id="named-text" href="/about">About</a></nav><button id="unnamed-button"><svg aria-hidden="true" width="20" height="20"></svg></button><button id="aria" aria-label="Search"></button><span hidden id="label">Open account</span><button id="reference" aria-labelledby="label"></button><button id="svg"><svg width="20" height="20"><title>Close</title></svg></button><button id="hidden"><span style="position:absolute;clip:rect(0,0,0,0)">Menu</span></button><span aria-hidden="true">Decorative</span><footer><a id="footer-unnamed" href="/home"><img alt=""></a></footer>`,
    );
    const elements = await inventory(page);
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(
      async () =>
        await (window as unknown as { axe: typeof axe }).axe.run(document, {
          runOnly: { type: "rule", values: ["button-name", "link-name"] },
        }),
    );
    const reference = results.violations
      .flatMap((v) => v.nodes.flatMap((n) => n.target.map(String)))
      .sort();
    const buggd = elements
      .filter((e) => ["link", "button"].includes(e.role) && !e.accessibleName)
      .map((e) => e.locator)
      .sort();
    expect(buggd).toEqual(reference);
    expect(reference).toEqual([
      "#footer-unnamed",
      "#unnamed-button",
      "#unnamed-link",
    ]);
  } finally {
    await browser.close();
  }
});
