-- "Adult" becomes "sexual content", and stops being a lie.
--
-- is_adult was set from RAWG's ESRB slug being either "adults-only" or
-- "mature". Mature is the 17+ rating carried by most large releases — Kingdom
-- Come, The Witcher, Red Dead — so the flag was mostly marking violence. It
-- caught 3,888 of 100,009 games, where RAWG's genuine Adults Only catalogue is
-- a couple of dozen titles.
--
-- The honest signal is RAWG's own tags, which name the thing directly. We now
-- store them so the classification can be re-derived without another fetch,
-- and the flag is recomputed from tags plus Adults Only alone.
--
-- Existing values are reset rather than migrated: nothing in the row can tell
-- Adults Only from Mature after the fact, and ~99% of what is flagged today is
-- a false positive. Games reclassify as they re-sync.

set search_path = pg_catalog, public;

alter table public.games
    rename column is_adult to has_sexual_content;

alter table public.games
    add column if not exists content_tags text[] not null default '{}';

update public.games
set has_sexual_content = false
where has_sexual_content;

comment on column public.games.has_sexual_content is
    'Sexual content, from RAWG tags or an Adults Only rating. Not a violence flag.';
comment on column public.games.content_tags is
    'RAWG tag slugs, kept so has_sexual_content can be re-derived in place.';

-- Hidden unless the viewer asks for it. Signed-out visitors get the default.
alter table public.profiles
    add column if not exists show_sexual_content boolean not null default false;

comment on column public.profiles.show_sexual_content is
    'Opt-in. Off means games flagged has_sexual_content are filtered out.';

-- The catalogue filters on this for every listing, so it pays for itself.
create index if not exists games_sexual_content_idx
    on public.games (has_sexual_content)
    where has_sexual_content;
