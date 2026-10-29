import { z } from "zod";
import {
  platformSchema,
  elementSchema,
  occurrenceSchema,
  screenshotSchema,
  resourceSchema,
  coverageSchema,
} from "./evidence.js";

export const severitySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "informational",
]);
export const confidenceSchema = z.enum([
  "confirmed",
  "potential",
  "not-tested",
]);
export const categorySchema = z.enum([
  "links",
  "images",
  "javascript",
  "network",
  "content",
  "metadata",
  "responsive",
  "interactions",
  "forms",
]);
export const scanInputSchema = z
  .object({
    url: z.string().trim().min(1, "Enter a website URL.").max(2048),
    maxPages: z.number().int().min(1).max(100).default(25),
    concurrency: z.number().int().min(1).max(4).default(2),
    timeout: z.number().int().min(1000).max(45000).default(15000),
    maxDuration: z.number().int().min(5000).max(600000).default(180000),
    interactions: z.boolean().default(true),
    maxInteractions: z.number().int().min(0).max(12).default(6),
    platform: platformSchema.optional(),
    resourcePolicy: z.enum(["same-origin", "public-assets"]).optional(),
    previousScanId: z.string().uuid().optional(),
  })
  .strict();
export const idSchema = z.string().uuid();
export const issueSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  pageUrl: z.string(),
  affectedPages: z.array(z.string()),
  category: categorySchema,
  severity: severitySchema,
  confidence: confidenceSchema,
  title: z.string(),
  description: z.string(),
  evidence: z.string(),
  suggestion: z.string(),
  checkId: z.string(),
  timestamp: z.string(),
  occurrences: z.number(),
  element: z.string().optional(),
  resource: z.string().optional(),
  screenshotId: z.string().optional(),
  occurrenceList: z.array(occurrenceSchema).optional(),
  grouping: z
    .object({
      key: z.string(),
      shared: z.boolean(),
      region: z.string(),
      reason: z.string(),
    })
    .optional(),
});
export const interactionSchema = z.object({
  label: z.string(),
  element: z.string(),
  classification: z.enum(["safe", "excluded", "unknown"]),
  outcome: z.enum(["changed", "no-response", "blocked", "not-tested"]),
  detail: z.string(),
});
export const formSchema = z.object({
  element: z.string(),
  fields: z.number(),
  requiredFields: z.number(),
  checks: z.array(
    z.object({
      field: z.string(),
      scenario: z.string(),
      valid: z.boolean(),
      detail: z.string(),
    }),
  ),
  detail: z.string(),
});
export const pageSchema = z.object({
  id: z.string(),
  url: z.string(),
  sourceUrl: z.string().optional(),
  finalUrl: z.string().optional(),
  title: z.string(),
  status: z.enum(["discovered", "scanning", "completed", "failed", "skipped"]),
  httpStatus: z.number().optional(),
  duration: z.number(),
  links: z.array(z.string()),
  externalLinks: z.array(z.string()),
  screenshots: z.array(screenshotSchema),
  detailScreenshots: z.array(screenshotSchema).optional(),
  elements: z.array(elementSchema).optional(),
  coverage: z.array(coverageSchema).optional(),
  resources: z.array(resourceSchema).optional(),
  consoleErrors: z.array(z.string()),
  failedResources: z.array(z.object({ url: z.string(), detail: z.string() })),
  interactions: z.array(interactionSchema),
  forms: z.array(formSchema),
  responsive: z.array(
    z.object({
      width: z.number(),
      overflow: z.number(),
      elements: z.array(z.string()),
      screenshotId: z.string().optional(),
    }),
  ),
  description: z.string().optional(),
});
export const scanSchema = z.object({
  id: z.string(),
  url: z.string(),
  settings: scanInputSchema,
  status: z.enum([
    "queued",
    "starting",
    "running",
    "completed",
    "failed",
    "cancelled",
  ]),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  activity: z.string(),
  currentPage: z.string().optional(),
  checksExecuted: z.number(),
  pages: z.array(pageSchema),
  issues: z.array(issueSchema),
  limitations: z.array(z.string()),
  error: z.string().optional(),
  evidenceBytes: z.number(),
  schemaVersion: z.number().optional(),
});
export type ScanInput = z.infer<typeof scanInputSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type PageReport = z.infer<typeof pageSchema>;
export type Scan = z.infer<typeof scanSchema>;
export type Interaction = z.infer<typeof interactionSchema>;
export type FormReport = z.infer<typeof formSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type Category = z.infer<typeof categorySchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export const terminal = (status: Scan["status"]) =>
  ["completed", "failed", "cancelled"].includes(status);
export const confidenceLabels: Record<Confidence, string> = {
  confirmed: "Confirmed problem",
  potential: "Needs checking",
  "not-tested": "Not tested",
};
export const categoryLabels: Record<Category, string> = {
  links: "Broken links",
  images: "Images",
  javascript: "Technical errors",
  network: "Loading problems",
  content: "Content",
  metadata: "Page information",
  responsive: "Mobile and tablet display",
  interactions: "Interactions",
  forms: "Forms",
};
