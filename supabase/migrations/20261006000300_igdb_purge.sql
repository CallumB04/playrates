-- What the move to IGDB uses to clear RAWG's rows out, in the database
-- rather than as lists of ids over the API.

set search_path = pg_catalog, public;

-- Deletes up to p_limit games that came from RAWG and that nobody has
-- logged, reviewed or started a thread on, and says how many went. Their
-- platform, system and genre links cascade with them. Games someone has
-- touched are never deleted: they are matched to IGDB and kept.
create or replace function public.purge_unlinked_games(p_limit int)
returns int
language sql
set search_path = pg_catalog, public
as $$
    with gone as (
        delete from public.games
        where id in (
            select g.id from public.games g
            where g.igdb_id is null
              and not exists (select 1 from public.game_logs l where l.game_id = g.id)
              and not exists (select 1 from public.reviews r where r.game_id = g.id)
              and not exists (select 1 from public.community_threads t where t.game_id = g.id)
            limit p_limit
        )
        returning 1
    )
    select count(*)::int from gone;
$$;

revoke execute on function public.purge_unlinked_games(int)
    from anon, authenticated, public;

-- Game events about games that no longer exist, up to p_limit at a time.
create or replace function public.purge_orphan_game_events(p_limit int)
returns int
language sql
set search_path = pg_catalog, public
as $$
    with gone as (
        delete from public.game_events
        where id in (
            select e.id from public.game_events e
            where e.game_id is not null
              and not exists (select 1 from public.games g where g.id = e.game_id)
            limit p_limit
        )
        returning 1
    )
    select count(*)::int from gone;
$$;

revoke execute on function public.purge_orphan_game_events(int)
    from anon, authenticated, public;
