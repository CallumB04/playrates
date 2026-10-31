-- sitemap_games took ~1.8s a page live, against ~180ms for the same query
-- written out. Planned once for any offset and limit, it couldn't count on
-- the small slice the partial index hands over. Planned per call, it can.

set search_path = pg_catalog, public;

alter function public.sitemap_games(int, int)
    set plan_cache_mode = force_custom_plan;
