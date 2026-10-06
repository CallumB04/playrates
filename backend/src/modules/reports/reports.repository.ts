import type { Db } from "../../config/supabase.js";
import type { ContentReportRow } from "../../types/database.types.js";

export interface ReportsRepository {
  create(
    row: Pick<
      ContentReportRow,
      "reporter_id" | "target_type" | "target_id" | "reason" | "details"
    >,
  ): Promise<ContentReportRow>;
  findOpen(
    reporterId: string,
    targetType: string,
    targetId: string,
  ): Promise<ContentReportRow | null>;
  findById(id: number): Promise<ContentReportRow | null>;
  list(
    status: string,
    from: number,
    to: number,
  ): Promise<{ rows: ContentReportRow[]; total: number }>;
  countOpenFor(targetType: string, targetId: string): Promise<number>;
  /** Closes every open report on a target, the one being handled included. */
  closeOpenFor(
    targetType: string,
    targetId: string,
    status: string,
    by: string,
  ): Promise<void>;
  close(id: number, status: string, by: string): Promise<void>;
}

export const createReportsRepository = (db: Db): ReportsRepository => ({
  async create(row) {
    const { data, error } = await db
      .from("content_reports")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return data as ContentReportRow;
  },

  async findOpen(reporterId, targetType, targetId) {
    const { data, error } = await db
      .from("content_reports")
      .select("*")
      .eq("reporter_id", reporterId)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("status", "open")
      .maybeSingle();
    if (error) throw error;
    return (data as ContentReportRow | null) ?? null;
  },

  async findById(id) {
    const { data, error } = await db
      .from("content_reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ContentReportRow | null) ?? null;
  },

  async list(status, from, to) {
    const { data, error, count } = await db
      .from("content_reports")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: status === "open" })
      .order("id")
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as ContentReportRow[], total: count ?? 0 };
  },

  async countOpenFor(targetType, targetId) {
    const { count, error } = await db
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("status", "open");
    if (error) throw error;
    return count ?? 0;
  },

  async closeOpenFor(targetType, targetId, status, by) {
    const { error } = await db
      .from("content_reports")
      .update({ status, resolved_by: by, resolved_at: new Date().toISOString() })
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("status", "open");
    if (error) throw error;
  },

  async close(id, status, by) {
    const { error } = await db
      .from("content_reports")
      .update({ status, resolved_by: by, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
});
