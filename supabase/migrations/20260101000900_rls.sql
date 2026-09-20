-- RLS on everywhere, no policies: deny by default.
--
-- Supabase exposes PostgREST to anyone holding the anon key, and that key ships
-- in the frontend bundle. Without this, every table is readable and writable
-- from devtools.
--
-- No policies needed — all access goes through the Express API on the
-- service-role key, which bypasses RLS, and authorization lives in the service
-- layer where it's testable. Add a policy if the frontend ever reads directly.

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
