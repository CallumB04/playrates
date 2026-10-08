-- Who can see a person's games: their shelves, their logs and the figures
-- worked out from them. Everyone, their friends, or only them.
--
-- Everyone by default, so nobody's profile changes under them. The API is
-- the gate (no role but the service role reads these tables); the activity
-- feed is filtered here because it is the one place another person's logs
-- arrive without going through their profile.

set search_path = pg_catalog, public;

alter table public.profiles
    add column games_visibility text not null default 'everyone'
        constraint profiles_games_visibility_check
        check (games_visibility in ('everyone', 'friends', 'private'));

-- Friends still see a friends-only person's activity; only "only me" leaves
-- the feed.
create or replace view public.friend_activity
with (security_invoker = true) as
select
    e.user_id       as viewer_id,
    l.id            as log_id,
    l.user_id,
    l.game_id,
    l.status,
    l.played_status,
    l.rating,
    l.hours_played,
    l.updated_at,
    p.username      as actor_username,
    p.avatar_url    as actor_avatar_url,
    p.accent        as actor_accent,
    p.last_seen_at  as actor_last_seen_at,
    g.title         as game_title,
    coalesce(g.box_art_url, g.cover_url) as game_cover_url,
    g.has_sexual_content as game_has_sexual_content,
    l.system_slug
from public.friend_edges e
join public.game_logs l
    on l.user_id = e.friend_id
join public.profiles p
    on p.id = l.user_id
join public.games g
    on g.id = l.game_id
where e.status = 'accepted'
  and p.games_visibility <> 'private';

revoke all on public.friend_activity from anon, authenticated;
