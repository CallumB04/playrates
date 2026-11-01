/** PostgREST's row cap: a request asking for more gets this many. */
export const MAX_ROWS = 1000;

/**
 * Every row of a read that can outgrow one response. Without this a list
 * past 1000 rows ends there without a word: a job that should reach every
 * member stops at the thousandth. `fetchPage` reads rows `from` to `to`
 * inclusive, in a stable order.
 */
export const allPages = async <T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = MAX_ROWS,
): Promise<T[]> => {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
};
