-- Spoilers.
--
-- A review is plain text, so it is marked as a whole: contains_spoilers
-- hides the body until it is asked for. A community message marks the
-- spoiling part itself, as a spoiler mark in its Tiptap document, which
-- needs nothing here but one thing: the newest-replies list quoted
-- plain_text, which carries the spoiled words, so it hands back the body
-- instead and the API quotes it with the spoilers blanked.

set search_path = pg_catalog, public;

alter table public.reviews
    add column if not exists contains_spoilers boolean not null default false;

-- Appended, as create or replace requires of a view's new columns.
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
    r.contains_spoilers
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

drop function if exists public.community_latest_replies(int, boolean);

create function public.community_latest_replies(p_limit int, p_show_sexual boolean)
returns table (
    id bigint,
    thread_id bigint,
    thread_title text,
    body jsonb,
    created_at timestamptz,
    author_id uuid,
    author_username text,
    author_first_name text,
    author_avatar_url text,
    author_accent text
)
language sql
stable
set search_path = pg_catalog, public
as $$
    select
        m.id,
        t.id,
        t.title,
        m.body,
        m.created_at,
        m.author_id,
        p.username,
        p.first_name,
        p.avatar_url,
        p.accent
    from public.community_messages m
    join public.community_threads t on t.id = m.thread_id
    left join public.games g on g.id = t.game_id
    left join public.profiles p on p.id = m.author_id
    where not m.is_opening
      and m.deleted_at is null
      and t.subject_kind = 'game'
      and (p_show_sexual or not coalesce(g.has_sexual_content, false))
    order by m.created_at desc, m.id desc
    limit p_limit;
$$;

revoke execute on function public.community_latest_replies(int, boolean)
    from anon, authenticated, public;
