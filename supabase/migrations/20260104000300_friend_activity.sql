-- What your friends have been logging, as one query.
--
-- Without this the only route is: list friendships, extract the other party
-- from each, then fetch that person's logs — one request per friend, fanned
-- out in application code, with no way to order or page across the result.
--
-- The view is per-log rather than per-friendship so the feed can be ordered by
-- when something happened and paged normally. friend_edges already resolves
-- "the other party" for a viewer, so this builds on it rather than repeating
-- the user_a/user_b unwrapping.
--
-- security_invoker for the same reason as every other view here: without it
-- this runs as its owner and hands out every log in the table.

set search_path = pg_catalog, public;

create view public.friend_activity
with (security_invoker = true) as
select
    e.user_id      as viewer_id,
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
    p.last_seen_at  as actor_last_seen_at,
    g.title         as game_title,
    g.cover_url     as game_cover_url
from public.friend_edges e
join public.game_logs l
    on l.user_id = e.friend_id
join public.profiles p
    on p.id = l.user_id
join public.games g
    on g.id = l.game_id
where e.status = 'accepted';

revoke all on public.friend_activity from anon, authenticated;

-- The feed orders by recency within one viewer's set of friends.
create index if not exists game_logs_user_updated_idx
    on public.game_logs (user_id, updated_at desc);
