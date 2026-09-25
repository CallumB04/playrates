-- Carry the profile colour into the feeds.
--
-- The colour reached the profile page and nowhere else, because these two
-- views select a profile's picture but not its colour. A generated avatar in
-- a review list or a friend feed fell back, so the same person could be rose
-- on their own page and the fallback everywhere else — which reads as a bug
-- rather than as a fallback.
--
-- Recreated rather than replaced: the column belongs next to the rest of the
-- author, not appended after the game.

set search_path = pg_catalog, public;

drop view if exists public.review_cards;

create view public.review_cards
with (security_invoker = true) as
select
    r.id,
    r.user_id,
    r.game_id,
    r.body,
    r.is_public,
    r.created_at,
    r.updated_at,
    l.rating,
    l.hours_played,
    l.status,
    l.played_status,
    l.platform_slug,
    p.username        as author_username,
    p.first_name      as author_first_name,
    p.avatar_url      as author_avatar_url,
    p.accent          as author_accent,
    p.last_seen_at    as author_last_seen_at,
    g.title           as game_title,
    g.slug            as game_slug,
    g.cover_url       as game_cover_url,
    coalesce(v.vote_count, 0)::int as vote_count
from public.reviews r
left join public.game_logs l
    on l.user_id = r.user_id and l.game_id = r.game_id
left join public.profiles p
    on p.id = r.user_id
join public.games g
    on g.id = r.game_id
left join (
    select review_id, count(*) as vote_count
    from public.review_votes
    group by review_id
) v on v.review_id = r.id;

revoke all on public.review_cards from anon, authenticated;

drop view if exists public.friend_activity;

create view public.friend_activity
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
