# Database

Postgres on Supabase. Only the API reaches it, with the service-role key;
the browser gets nothing but sign-in.

## Migrations

- `migrations/YYYYMMDDHHMMSS_snake_case.sql`. Open with a comment saying why,
  then `set search_path = pg_catalog, public;`.
- Backwards compatible with the code already deployed, because the migration
  runs first and old tabs keep calling: add beside, move callers, remove in a
  later migration. A changed function signature gets a new function; the old
  one stays until nothing calls it.
- Seed and reference data is idempotent (`on conflict ... do nothing`).
- Apply locally first (`npx --no-install supabase migration up --local`, or
  `npm run db:reset:local` to prove they apply from scratch), then live
  (`npx --no-install supabase db push --linked`).
- Then regenerate the types against the local stack:
  `npm run db:types -w backend` writes `backend/src/types/database.generated.ts`,
  which CI diffs byte for byte. The row shapes the code imports are
  hand-written in `backend/src/types/database.types.ts`; update those too.

## Every object is closed by default

- A new table:
  ```sql
  alter table public.x enable row level security;
  revoke all on public.x from anon, authenticated;
  ```
  No policies: RLS on with none means deny, and the API's key bypasses it.
- A function is `security definer set search_path = pg_catalog, public`,
  then `revoke execute on function public.f(args) from anon, authenticated, public;`.
  Trigger functions too, or PostgREST lists them as callable.
- A view is `with (security_invoker = true)` and revoked like a table. A view
  built on `t.*` keeps the columns it was made with, so adding a column means
  dropping and recreating the view.
- A table that only grows (errors, events) gets a retention rule in
  `prune_old_rows`, run daily by the evening cron. Member data that the auth
  cascade doesn't delete is cleared in `erase_account_traces`. Both are
  redefined whole with `create or replace` and revoked again.

## Tests

pgTAP in `tests/database/*.test.sql`, run by `supabase test db` in CI. A new
function gets a test of what it returns and of who may not call it
(`not has_function_privilege('authenticated', ...)`), and a privacy rule gets
a test that it keeps the private row out.
