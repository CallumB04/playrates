import type { Db } from "../../config/supabase.js";
import type { PushTarget } from "../../config/push.js";

export interface PushRepository {
  /** A browser already saved moves to this member: whoever signed in on
   *  it last is who it's for. */
  save(
    userId: string,
    target: PushTarget & { userAgent: string | null },
  ): Promise<void>;
  remove(userId: string, endpoint: string): Promise<void>;
  forUser(userId: string): Promise<PushTarget[]>;
  /** Forgotten by its push service. */
  forget(endpoint: string): Promise<void>;
}

export const createPushRepository = (db: Db): PushRepository => ({
  async save(userId, target) {
    const { error } = await db.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: target.endpoint,
        p256dh: target.p256dh,
        auth: target.auth,
        user_agent: target.userAgent,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
  },

  async remove(userId, endpoint) {
    const { error } = await db
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
    if (error) throw error;
  },

  async forUser(userId) {
    const { data, error } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as PushTarget[];
  },

  async forget(endpoint) {
    const { error } = await db
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (error) throw error;
  },
});
