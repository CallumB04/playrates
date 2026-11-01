/**
 * The last answer `load` gave, for `ttlMs`, then a fresh one. Per instance:
 * for small lists that change about never (genres, platforms), where a
 * stale minute costs nothing and a database round trip on every page
 * costs something. A failed load isn't kept.
 */
export const memoFor = <T>(ttlMs: number, load: () => Promise<T>) => {
  let cached: { value: Promise<T>; at: number } | null = null;
  return (): Promise<T> => {
    if (cached && Date.now() - cached.at < ttlMs) return cached.value;
    const value = load();
    cached = { value, at: Date.now() };
    value.catch(() => {
      cached = null;
    });
    return value;
  };
};
