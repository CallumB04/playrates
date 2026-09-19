import type { Paginated, Pagination } from "@playrates/shared";

/** Converts a page/limit pair into the inclusive range Supabase expects. */
export const toRange = ({
  page,
  limit,
}: Pagination): { from: number; to: number } => {
  const from = (page - 1) * limit;
  return { from, to: from + limit - 1 };
};

export const paginate = <T>(
  data: T[],
  { page, limit }: Pagination,
  total: number,
): Paginated<T> => ({
  data,
  meta: { page, limit, total },
});
