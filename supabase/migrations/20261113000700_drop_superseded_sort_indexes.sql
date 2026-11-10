-- The sort indexes the covering ones replace. Each new one leads with the
-- same keys, so anything the old served, the new serves.

set search_path = pg_catalog, public;

drop index if exists public.games_logged_then_known_idx;
drop index if exists public.games_avg_rating_idx;
drop index if exists public.games_title_idx;
drop index if exists public.games_release_idx;
drop index if exists public.games_critic_score_idx;
