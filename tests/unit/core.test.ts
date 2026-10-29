import { describe, it, expect, vi } from "vitest";
import { normalizeUrl, safeUrl, isHtmlLink } from "../../src/scanner/url.js";
import { NetworkPolicy, addressRange } from "../../src/scanner/network.js";
import { scanInputSchema } from "../../src/shared/schemas.js";
import { classifyControl } from "../../src/scanner/interactions/check.js";
import type { Candidate } from "../../src/scanner/interactions/check.js";
import { escapeHtml } from "../../src/reports/html.js";
import { lookup } from "node:dns/promises";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
describe("URL handling", () => {
  it("preserves meaningful parameters and distinct slash routes while removing fragments", () => {
    expect(normalizeUrl("example.com/a?tab=two&sort=asc#thing")).toBe(
      "https://example.com/a?tab=two&sort=asc",
    );
    expect(normalizeUrl("localhost:3000/a")).toBe("http://localhost:3000/a");
    expect(normalizeUrl("../a/", "https://example.com/b/c")).toBe(
      "https://example.com/a/",
    );
    expect(() =>
      normalizeUrl("javascript:alert(1)", "https://example.com"),
    ).toThrow();
    expect(() => normalizeUrl("https://me:password@example.com")).toThrow();
    expect(isHtmlLink("https://example.com/image.png")).toBe(false);
    expect(safeUrl("https://example.com/?token=secret&view=two")).not.toContain(
      "secret",
    );
  });
  it("enforces scan limits", () => {
    expect(scanInputSchema.parse({ url: "https://example.com" }).maxPages).toBe(
      25,
    );
    expect(
      scanInputSchema.safeParse({ url: "x", maxPages: 10000 }).success,
    ).toBe(false);
    expect(scanInputSchema.safeParse({ url: "x", unsafe: true }).success).toBe(
      false,
    );
  });
});
describe("destination policy", () => {
  it("supports IPv4-only local servers when localhost also resolves to IPv6", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: "::1", family: 6 },
      { address: "127.0.0.1", family: 4 },
    ] as never);
    const policy = new NetworkPolicy(new URL("http://localhost:3000"), []);
    await expect(
      policy.resolve(new URL("http://localhost:3000")),
    ).resolves.toHaveProperty("address", "127.0.0.1");
  });
  it("rejects private IPv4/IPv6 including mapped addresses and own server ports", async () => {
    const policy = new NetworkPolicy(new URL("http://localhost:3000"), [8787]);
    for (const url of [
      "http://127.0.0.1:8787",
      "http://10.0.0.1",
      "http://169.254.169.254",
      "http://[::ffff:127.0.0.1]:8787",
      "http://[fc00::1]",
      "http://[::1]:3001",
    ])
      await expect(policy.resolve(new URL(url))).rejects.toThrow();
    expect(addressRange("::ffff:192.168.1.1")).toBe("private");
    expect(
      (
        await new NetworkPolicy(new URL("http://127.0.0.1:3000"), []).resolve(
          new URL("http://127.0.0.1:3000"),
        )
      ).address,
    ).toBe("127.0.0.1");
  });
  it("checks all DNS answers on each resolution, including rebinding", async () => {
    vi.mocked(lookup)
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }] as never)
      .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }] as never);
    const policy = new NetworkPolicy(new URL("https://example.com"), []);
    await expect(
      policy.resolve(new URL("https://example.com")),
    ).resolves.toHaveProperty("address", "93.184.216.34");
    await expect(
      policy.resolve(new URL("https://example.com")),
    ).rejects.toThrow();
  });
});
describe("safe classification and export escaping", () => {
  const control: Candidate = {
    label: "Open panel",
    element: "#toggle",
    tag: "button",
    role: "",
    type: "button",
    inForm: false,
    disabled: false,
    download: false,
    href: "",
    controlsExisting: true,
    hasExpanded: true,
  };
  it("requires semantics as well as labels and excludes form/destructive actions", () => {
    expect(classifyControl(control)).toBe("safe");
    expect(classifyControl({ ...control, controlsExisting: false })).toBe(
      "unknown",
    );
    expect(classifyControl({ ...control, label: "Delete account" })).toBe(
      "excluded",
    );
    expect(classifyControl({ ...control, inForm: true })).toBe("excluded");
    expect(classifyControl({ ...control, href: "/logout" })).toBe("excluded");
  });
  it("escapes untrusted HTML rather than injecting it", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});
