-- The catalogue for sitemap.xml, a page at a time.
--
-- One JSON value rather than rows: PostgREST caps a response at 1000 rows,
-- and a sitemap page holds tens of thousands. Adult games are left out, as
-- their pages ask not to be indexed.

set search_path = pg_catalog, public;

create or replace function public.sitemap_games(p_offset int, p_limit int)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
    select coalesce(
        jsonb_agg(jsonb_build_array(g.id, g.updated_at::date) order by g.id),
        '[]'::jsonb)
    from (
        select id, updated_at
        from public.games
        where not has_sexual_content
        order by id
        offset p_offset
        limit p_limit
    ) g;
$$;

revoke execute on function public.sitemap_games(int, int)
    from anon, authenticated, public;
