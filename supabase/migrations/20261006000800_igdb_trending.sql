-- Trending from IGDB: the games most visited on IGDB lately, refreshed
-- daily, in IGDB's order. trending_rank keeps that order; is_trending
-- stays the flag everything else reads.

set search_path = pg_catalog, public;

alter table public.games add column trending_rank int;

-- Replaces the trending set with these games, ranked in the order given.
create or replace function public.set_trending(p_ids bigint[])
returns void
language sql
set search_path = pg_catalog, public
as $$
    update public.games
    set is_trending = false, trending_rank = null
    where (is_trending or trending_rank is not null)
      and not (id = any(p_ids));

    update public.games g
    set is_trending = true, trending_rank = r.rank
    from unnest(p_ids) with ordinality as r(id, rank)
    where g.id = r.id;
$$;

revoke execute on function public.set_trending(bigint[])
    from anon, authenticated, public;
