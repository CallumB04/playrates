import { z } from "zod";

/** A crash in someone's browser, as the app sends it. Long values are cut
 *  rather than refused: a report that bounces is a crash nobody hears of. */
export const ClientErrorReportSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.slice(0, 1_000)),
  stack: z
    .string()
    .nullish()
    .transform((s) => s?.slice(0, 4_000) || null),
  // Path only: a query string can carry a token.
  path: z
    .string()
    .min(1)
    .transform((s) => s.split(/[?#]/)[0]!.slice(0, 500)),
  build: z
    .string()
    .nullish()
    .transform((s) => s?.slice(0, 64) || null),
});
export type ClientErrorReport = z.input<typeof ClientErrorReportSchema>;

export interface ClientErrorEntry {
  id: number;
  message: string;
  stack: string | null;
  path: string;
  userAgent: string | null;
  build: string | null;
  userId: string | null;
  username: string | null;
  createdAt: string;
}
