-- "Newest" with a genre or platform chosen counts released games joined to
-- their links, which needs each game's id as well as its date. Without it
-- the count read the whole table again, six seconds for Indie. The same
-- index with the id carried, so it can be counted from the index alone.

set search_path = pg_catalog, public;

create index if not exists games_released_family_safe_ids_idx on public.games
    (release_date) include (id) where not has_sexual_content;

drop index if exists public.games_released_family_safe_idx;
