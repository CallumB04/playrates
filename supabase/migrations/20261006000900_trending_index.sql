-- Clearing the trending set reads only the few games in it; without this
-- it scanned all hundred thousand, which once ran past the API's timeout.

set search_path = pg_catalog, public;

create index games_trending_set_idx on public.games (id)
    where is_trending or trending_rank is not null;

analyze public.games;
