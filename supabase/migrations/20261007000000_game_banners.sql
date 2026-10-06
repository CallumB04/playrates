-- The picture across the top of a game page. Its own column because the
-- best one there isn't the best one for a link preview: IGDB's first
-- artwork is often the game's logo, which suits a preview and makes a poor
-- banner, where a screenshot shows the game itself.

set search_path = pg_catalog, public;

alter table public.games add column banner_url text;

-- Rewrites the banner of many games in one statement, for when the rule
-- that picks it changes. Takes [{ "id", "banner_url" }] and returns how
-- many rows changed.
create or replace function public.set_game_banners(p_rows jsonb)
returns int
language sql
set search_path = pg_catalog, public
as $$
    with changed as (
        update public.games g
        set banner_url = r.banner_url
        from jsonb_to_recordset(p_rows) as r (id bigint, banner_url text)
        where g.id = r.id and g.banner_url is distinct from r.banner_url
        returning 1
    )
    select count(*)::int from changed;
$$;

revoke execute on function public.set_game_banners(jsonb)
    from anon, authenticated, public;
