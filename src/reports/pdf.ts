import { chromium } from "playwright";
import type { Scan } from "../shared/schemas.js";
import type { Storage } from "./storage.js";
import { htmlReport } from "./html.js";
import type { ReportOptions } from "./html.js";
let active = false;
export async function pdfReport(
  scan: Scan,
  storage: Storage,
  options: ReportOptions = {},
) {
  if (active)
    throw Object.assign(
      new Error("Another PDF is being prepared. Please try again shortly."),
      { statusCode: 429 },
    );
  active = true;
  try {
    const html = await htmlReport(scan, storage, { ...options, print: true });
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        serviceWorkers: "block",
        offline: true,
      });
      await context.route("**/*", (route) => route.abort());
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      await page.setContent(html, { waitUntil: "load", timeout: 20000 });
      await page.evaluate(() => document.fonts.ready);
      const deadline = setTimeout(() => {
        void browser.close();
      }, 25000);
      const data = await page
        .pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "15mm", bottom: "17mm", left: "14mm", right: "14mm" },
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate:
            '<div style="font-size:8px;color:#526057;width:100%;text-align:center">Buggd · Website Report · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        })
        .finally(() => clearTimeout(deadline));
      if (data.length > 24 * 1024 * 1024)
        throw new Error(
          "The PDF size limit was reached. Narrow the scan or export structured JSON.",
        );
      return data;
    } finally {
      await browser.close();
    }
  } finally {
    active = false;
  }
}
