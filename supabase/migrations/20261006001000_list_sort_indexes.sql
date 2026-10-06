-- The listing sorts "desc nulls last" on every key, and an index built in
-- the other null order can't serve that, so each home page load sorted the
-- whole catalogue, several times at once, and ran past the API's timeout.
-- Rebuilt in the order the queries ask for.

set search_path = pg_catalog, public;

drop index if exists public.games_logged_then_known_idx;
create index games_logged_then_known_idx on public.games
    (log_count desc nulls last, igdb_rating_count desc nulls last, id);

drop index if exists public.games_avg_rating_idx;
create index games_avg_rating_idx on public.games
    (avg_rating desc nulls last, rating_count desc nulls last, id);

analyze public.games;
