import type { Db } from "./supabase.js";

export interface ServerErrorReport {
  status: number;
  code: string;
  method: string;
  path: string;
  message: string;
  requestId: string | null;
  userId: string | null;
  stack: string | null;
}

/** Where a 5xx is recorded, beyond the log. Must not throw. */
export type ErrorSink = (report: ServerErrorReport) => Promise<void>;

export const noopErrorSink: ErrorSink = async () => undefined;

const STACK_LIMIT = 4_000;

export const createServerErrorSink =
  (db: Db): ErrorSink =>
  async (report) => {
    try {
      await db.from("server_errors").insert({
        status: report.status,
        code: report.code,
        method: report.method,
        path: report.path.slice(0, 500),
        message: report.message.slice(0, 1_000),
        request_id: report.requestId,
        user_id: report.userId,
        stack: report.stack?.slice(0, STACK_LIMIT) ?? null,
      });
    } catch {
      // the database being down is a likely reason to be here at all
    }
  };
