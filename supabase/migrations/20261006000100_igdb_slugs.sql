-- Slugs only have to be unique within one source. While RAWG's rows are
-- still here, an IGDB game can carry a slug a RAWG row already has, and the
-- import would fail on it. Nothing routes by slug; the id is the address.

set search_path = pg_catalog, public;

alter table public.games drop constraint games_slug_key;

create unique index games_igdb_slug_key
    on public.games (slug)
    where igdb_id is not null;
