-- Rewrites the series of many games in one statement, for when the rule
-- that picks a game's series changes. Takes [{ "id", "series_id",
-- "series_name" }] and returns how many rows changed.

set search_path = pg_catalog, public;

create or replace function public.set_game_series(p_rows jsonb)
returns int
language sql
set search_path = pg_catalog, public
as $$
    with changed as (
        update public.games g
        set series_id = r.series_id, series_name = r.series_name
        from jsonb_to_recordset(p_rows)
            as r (id bigint, series_id bigint, series_name text)
        where g.id = r.id
        returning 1
    )
    select count(*)::int from changed;
$$;

revoke execute on function public.set_game_series(jsonb)
    from anon, authenticated, public;
