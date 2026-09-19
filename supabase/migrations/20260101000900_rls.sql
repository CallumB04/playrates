-- Row level security: enabled everywhere, with no policies. Deny by default.
--
-- This is deliberate, and it is the single most important file in the schema.
--
-- Every Supabase project exposes a public PostgREST endpoint that accepts the
-- anon key — a key that ships inside the frontend bundle and is public by
-- design. Without RLS, every table here would be readable and writable by
-- anyone who opened devtools. That would be a bigger hole than the one this
-- refactor is closing.
--
-- No policies are needed because nothing legitimately talks to these tables
-- with the anon key. All access goes through the Express API using the
-- service-role key, and service_role bypasses RLS. Authorization therefore
-- lives in one place — the backend service layer — where it is testable, and
-- is not duplicated into policies that would silently drift out of sync.
--
-- If the frontend ever needs to read a table directly, that is the moment to
-- add a policy for it. Not before.

alter table public.profiles enable row level security;
alter table public.platforms enable row level security;
alter table public.games enable row level security;
alter table public.game_platforms enable row level security;
alter table public.game_logs enable row level security;
alter table public.reviews enable row level security;
alter table public.friendships enable row level security;

-- Belt and braces on top of RLS: remove the default grants too, so the intent
-- is explicit to the next person reading this.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public
    revoke all on tables from anon, authenticated;
