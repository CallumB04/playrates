-- The admin's game feed names each game's IGDB id. Added at the end, as a
-- view can only grow that way in place; part two drops the RAWG one.

set search_path = pg_catalog, public;

create or replace view public.admin_game_feed
with (security_invoker = true) as
select
    e.id,
    e.kind,
    e.game_id,
    e.source,
    e.actor_id,
    e.data,
    e.created_at,
    g.title as game_title,
    g.slug as game_slug,
    coalesce(g.box_art_url, g.cover_url) as game_cover_url,
    g.is_trending as game_is_trending,
    g.rawg_id as game_rawg_id,
    p.username as actor_username,
    g.igdb_id as game_igdb_id
from public.game_events e
left join public.games g on g.id = e.game_id
left join public.profiles p on p.id = e.actor_id;

revoke all on public.admin_game_feed from anon, authenticated;
