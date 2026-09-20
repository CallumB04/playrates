-- Reviews with their author and the author's rating already attached.
--
-- Two problems, one view. The rating beside a review lives on that author's
-- game_logs row, and there is no foreign key between reviews and game_logs —
-- PostgREST can only embed and order across declared relationships, so the API
-- fetched a page of reviews and stitched ratings on afterwards. That orders
-- only the rows you happen to be looking at, which is why the sort was
-- date-only. It also cost a second round trip on every listing.
--
-- The author is joined here rather than embedded because a view carries no
-- foreign keys of its own, so `author:profiles!reviews_user_id_fkey(...)`
-- has nothing to resolve against.
--
-- Left joins throughout: a review can exist with no log at all, and the
-- reviews table's own header calls that out as a state the UI handles. An
-- inner join would silently drop those rows and shift the totals.
--
-- security_invoker is load-bearing, for the same reason it is on friend_edges
-- — without it the view runs as its owner and becomes a way around RLS.

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
    l.platform_slug,
    p.username        as author_username,
    p.avatar_url      as author_avatar_url,
    p.last_seen_at    as author_last_seen_at
from public.reviews r
left join public.game_logs l
    on l.user_id = r.user_id and l.game_id = r.game_id
left join public.profiles p
    on p.id = r.user_id;

-- A view inherits nothing from the base table's grants, and the RLS
-- migration's revoke only covered the tables that existed then.
revoke all on public.review_cards from anon, authenticated;

-- The log side of that join, looked up per author.
create index if not exists game_logs_user_game_idx
    on public.game_logs (user_id, game_id);
