-- Reviews by a private account read as "a private account" away from its
-- profile: no name, picture or log details. The API decides per viewer, as a
-- friend may see a friends-only author, so the view carries the setting.

set search_path = pg_catalog, public;

create or replace view public.review_cards
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
    coalesce(g.box_art_url, g.cover_url) as game_cover_url,
    coalesce(v.vote_count, 0)::int as vote_count,
    g.has_sexual_content as game_has_sexual_content,
    r.contains_spoilers,
    r.log_id,
    l.system_slug,
    p.profile_visibility as author_profile_visibility
from public.reviews r
left join public.game_logs l
    on l.id = r.log_id
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
