-- What a game page needs to point onwards: the series a game belongs to,
-- IGDB's similar games, and other covers (special editions, regional
-- releases) to page through beside the main one.

set search_path = pg_catalog, public;

alter table public.games
    -- IGDB's ids, so they resolve to whichever of them are in the
    -- catalogue at the time the page is opened.
    add column similar_igdb_ids bigint[] not null default '{}',
    -- IGDB's "collection": the games of one series. Its name is kept so a
    -- page can say "The Witcher series" without another lookup.
    add column series_id bigint,
    add column series_name text,
    -- [{ "imageId": "co5uct", "label": "Complete Edition" }], the main
    -- cover not included. Image ids, not URLs: the size is chosen where
    -- the picture is shown.
    add column alt_covers jsonb not null default '[]'::jsonb;

create index games_series_idx on public.games (series_id)
    where series_id is not null;

-- "More from this developer" looks a name up in the array.
create index games_developers_idx on public.games using gin (developers);
