export interface BackfillSource {
  /** Member ids after `after`, in order, `limit` at a time. */
  ids(after: string | null, limit: number): Promise<string[]>;
  evaluate(userId: string): Promise<unknown>;
}

export interface BackfillResult {
  evaluated: number;
  failed: string[];
}

/**
 * Brings every member's progress up to date, as their first visit would,
 * so a profile shows its level before its owner comes back. Evaluating is
 * what a visit does, keyed award by award, so this pays nothing twice and
 * can run again; and it never marks a reveal seen, so a member from before
 * still gets theirs, badges and all, on their next visit.
 */
export const backfillProgress = async (
  source: BackfillSource,
  {
    batch = 100,
    concurrency = 4,
    onError,
  }: {
    batch?: number;
    concurrency?: number;
    onError?: (userId: string, error: unknown) => void;
  } = {},
): Promise<BackfillResult> => {
  const result: BackfillResult = { evaluated: 0, failed: [] };
  let after: string | null = null;
  for (;;) {
    const ids = await source.ids(after, batch);
    if (ids.length === 0) return result;
    for (let i = 0; i < ids.length; i += concurrency) {
      await Promise.all(
        ids.slice(i, i + concurrency).map(async (id) => {
          try {
            await source.evaluate(id);
            result.evaluated++;
          } catch (error) {
            // One member's bad row shouldn't leave everyone after them out.
            result.failed.push(id);
            onError?.(id, error);
          }
        }),
      );
    }
    after = ids.at(-1)!;
  }
};
