-- The library's A to Z sort had no index to walk, so every page of it read
-- and sorted the whole catalogue, spilled to disk, and ran past the API's
-- timeout: the sort answered 500 every time.

set search_path = pg_catalog, public;

create index if not exists games_title_idx on public.games (title, id);

analyze public.games;
