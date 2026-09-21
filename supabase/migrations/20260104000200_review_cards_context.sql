-- review_cards gains the hours played and the game it is about.
--
-- Two things the UI could not show without a second round trip per review:
--
-- Hours played, because "9.0" from someone who put 80 hours in is a different
-- claim from "9.0" after two. It comes off the same game_logs row the rating
-- already comes from, so it costs nothing to carry.
--
-- The game's title, slug and cover, so a review can be rendered anywhere —
-- a profile, a site-wide feed — and link back to the game it is about. A view
-- carries no foreign keys of its own, so this cannot be embedded from the
-- caller's side; it has to be joined here.
--
-- security_invoker stays load-bearing: without it the view runs as its owner
-- and becomes a way around RLS.

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
    l.platform_slug,
    p.username        as author_username,
    p.avatar_url      as author_avatar_url,
    p.last_seen_at    as author_last_seen_at,
    g.title           as game_title,
    g.slug            as game_slug,
    g.cover_url       as game_cover_url
from public.reviews r
left join public.game_logs l
    on l.user_id = r.user_id and l.game_id = r.game_id
left join public.profiles p
    on p.id = r.user_id
-- Inner: a review cannot exist without its game, the FK says so.
join public.games g
    on g.id = r.game_id;

revoke all on public.review_cards from anon, authenticated;

-- The site-wide feed reads newest-first across every game.
create index if not exists reviews_public_recent_idx
    on public.reviews (created_at desc, id desc)
    where is_public;
