import { z } from "zod";
import { PaginationSchema } from "./common.js";

/** What can be reported. A thread is reported through its opening message's
 *  place on the page, but it is the thread that goes. */
export const REPORT_TARGETS = ["thread", "message", "review", "profile"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "illegal",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** How each reason reads in the dialog and the queue. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam or advertising",
  harassment: "Bullying or harassment",
  hate: "Hateful or abusive",
  sexual: "Sexual content",
  illegal: "Something illegal",
  other: "Something else",
};

export const REPORT_DETAILS_MAX = 1000;

export const CreateReportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGETS),
    /** A thread, message or review id, or a profile's user id. */
    targetId: z.string().trim().min(1).max(64),
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(REPORT_DETAILS_MAX).optional(),
  })
  .strict();

export type CreateReportInput = z.infer<typeof CreateReportSchema>;

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const AdminReportsQuerySchema = PaginationSchema.extend({
  status: z.enum(REPORT_STATUSES).default("open"),
});

export type AdminReportsQuery = z.infer<typeof AdminReportsQuerySchema>;

export const ResolveReportSchema = z
  .object({
    status: z.enum(["resolved", "dismissed"]),
    /** Take the reported thing down as well. Ignored when dismissing. */
    removeContent: z.boolean().default(false),
  })
  .strict();

export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;

/** A report as the admin queue shows it. */
export interface AdminReport {
  id: number;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { username: string } | null;
  /** What was reported, as it stands now. Null once it has gone. */
  target: {
    /** A title, an excerpt or a username. */
    label: string;
    href: string;
    author: string | null;
  } | null;
  /** Other open reports about the same thing. */
  otherReports: number;
}
