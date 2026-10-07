/**
 * Which log a request addressed by game means, from a client written when a
 * game had one log. A tab left open across the deploy still sends these.
 *
 * With one log there is no question. With several, a write names its console
 * in the body, which is enough to pick one; without that it can't be told
 * apart, and guessing would overwrite the wrong console's log.
 */
export type LegacyPick<T> =
  { kind: "none" } | { kind: "one"; log: T } | { kind: "several" };

export const pickLegacyLog = <T extends { system_slug: string | null }>(
  logs: readonly T[],
  system?: string | null,
): LegacyPick<T> => {
  if (logs.length === 0) return { kind: "none" };
  if (logs.length === 1) return { kind: "one", log: logs[0]! };
  if (system === undefined) return { kind: "several" };
  const match = logs.find((l) => l.system_slug === system);
  return match ? { kind: "one", log: match } : { kind: "several" };
};
