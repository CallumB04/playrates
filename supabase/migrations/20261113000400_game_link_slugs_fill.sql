-- Fills the genre and platform copies for games that were here before the
-- trigger. The live catalogue was filled in batches first, since one pass
-- over a hundred thousand rows outlasts the timeout and holds every write
-- to games while it runs; there this only checks. Elsewhere it does the
-- work.

set search_path = pg_catalog, public;

-- Without bumping updated_at, which the sitemap reports as each game's
-- last change, or the change log, which has nothing to say.
alter table public.games disable trigger games_set_updated_at;
alter table public.games disable trigger games_events;

update public.games g
set genre_slugs = s.genre_slugs,
    platform_slugs = s.platform_slugs
from (
    select g2.id,
           coalesce(gs.slugs, '{}') as genre_slugs,
           coalesce(ps.slugs, '{}') as platform_slugs
    from public.games g2
    left join (
        select game_id, array_agg(genre_slug order by genre_slug) as slugs
        from public.game_genres group by game_id
    ) gs on gs.game_id = g2.id
    left join (
        select game_id, array_agg(platform_slug order by platform_slug) as slugs
        from public.game_platforms group by game_id
    ) ps on ps.game_id = g2.id
) s
where g.id = s.id
  and (g.genre_slugs is distinct from s.genre_slugs
       or g.platform_slugs is distinct from s.platform_slugs);

alter table public.games enable trigger games_set_updated_at;
alter table public.games enable trigger games_events;

analyze public.games;
