import { z } from "zod";

/** Query params arrive as strings, so numeric fields coerce. The cap on
 *  `limit` stops a caller pulling a whole table in one request. */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** Not z.coerce.boolean() — that runs Boolean(value), and every non-empty
 *  string is truthy, so "?flag=false" would parse as true. */
export const BooleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

export type Pagination = z.infer<typeof PaginationSchema>;

export const GameIdParamSchema = z.object({
  gameId: z.coerce.number().int().positive(),
});

export const UsernameParamSchema = z.object({
  username: z.string().min(1),
});

export const UserIdSchema = z.object({
  userId: z.string().uuid(),
});

/** Shape every list endpoint returns. */
export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

/** Shape every error response takes. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
