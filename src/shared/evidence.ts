import { z } from "zod";

export const platformSchema = z.enum([
  "wordpress",
  "webflow",
  "framer",
  "squarespace",
  "html",
  "react",
  "unsure",
]);
export type Platform = z.infer<typeof platformSchema>;
export const platformLabels: Record<Platform, string> = {
  wordpress: "WordPress",
  webflow: "Webflow",
  framer: "Framer",
  squarespace: "Squarespace",
  html: "Custom HTML / CSS / JavaScript",
  react: "React / Next.js / other code",
  unsure: "AI-built website / unsure",
};
export const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export const elementSchema = z.object({
  locator: z.string(),
  identity: z.string(),
  identityStrength: z.enum(["id", "structural"]),
  tag: z.string(),
  role: z.string(),
  text: z.string(),
  accessibleName: z.string(),
  attributes: z.record(z.string(), z.string()),
  destination: z.string().optional(),
  nearbyText: z.string(),
  landmark: z.string(),
  html: z.string(),
  rect: rectSchema,
  viewport: z.object({
    width: z.number(),
    height: z.number(),
    dpr: z.number(),
    scrollX: z.number(),
    scrollY: z.number(),
  }),
  state: z.string().optional(),
  screenshotId: z.string().optional(),
  alignment: z.enum(["reliable", "unavailable", "moved"]),
  alignmentNote: z.string().optional(),
});
export const screenshotSchema = z.object({
  id: z.string(),
  width: z.number(),
  height: z.number().optional(),
  pixelWidth: z.number().optional(),
  pixelHeight: z.number().optional(),
  dpr: z.number().optional(),
  scrollX: z.number().optional(),
  scrollY: z.number().optional(),
  fullPage: z.boolean().optional(),
  completeness: z.enum(["complete", "limited", "unknown"]).optional(),
  note: z.string().optional(),
});
export const occurrenceSchema = z.object({
  id: z.string(),
  pageUrl: z.string(),
  timestamp: z.string(),
  evidence: z.string(),
  element: elementSchema.optional(),
  screenshotId: z.string().optional(),
  viewportWidth: z.number().optional(),
  note: z.string().optional(),
  repeatCount: z.number().optional(),
});
export const resourceSchema = z.object({
  url: z.string(),
  type: z.string(),
  status: z.enum([
    "loaded",
    "failed",
    "blocked",
    "timeout",
    "browser-restriction",
    "unsupported",
  ]),
  provenance: z.enum(["target", "third-party", "buggd"]),
  detail: z.string(),
  httpStatus: z.number().optional(),
});
export const coverageSchema = z.object({
  checkId: z.string(),
  elementIdentity: z.string().optional(),
  status: z.enum(["completed", "blocked", "not-tested"]),
  viewportWidth: z.number().optional(),
  note: z.string().optional(),
});
export type ElementEvidence = z.infer<typeof elementSchema>;
export type Occurrence = z.infer<typeof occurrenceSchema>;
export type ScreenshotEvidence = z.infer<typeof screenshotSchema>;
export type ResourceObservation = z.infer<typeof resourceSchema>;
export const reviewSchema = z.object({
  status: z.enum(["not-reviewed", "reviewing", "fix-attempted", "dismissed"]),
  reason: z.string().max(1000).default(""),
  updatedAt: z.string(),
});
export const workspaceSchema = z.object({
  platform: platformSchema.default("unsure"),
  reviews: z.record(z.string(), reviewSchema).default({}),
  guidedIssueId: z.string().max(100).optional(),
  guidedStep: z.number().int().min(0).max(5).default(0),
  updatedAt: z.string().default(""),
});
// Patch fields must not inherit read-time defaults: a step update must preserve the saved platform.
export const workspacePatchSchema = z
  .object({
    platform: platformSchema.optional(),
    reviews: z.record(z.string(), reviewSchema).optional(),
    guidedIssueId: z.string().max(100).optional(),
    guidedStep: z.number().int().min(0).max(5).optional(),
    updatedAt: z.string().optional(),
  })
  .strict();
export type Workspace = z.infer<typeof workspaceSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type DisplayMode = "simple" | "technical";
export const comparisonItemSchema = z.object({
  previousIssueId: z.string().optional(),
  currentIssueId: z.string().optional(),
  status: z.enum(["resolved", "remaining", "new", "unable"]),
  reason: z.string(),
  pageUrls: z.array(z.string()),
});
export const comparisonSchema = z.object({
  previousScanId: z.string(),
  currentScanId: z.string(),
  createdAt: z.string(),
  items: z.array(comparisonItemSchema),
});
export type Comparison = z.infer<typeof comparisonSchema>;
