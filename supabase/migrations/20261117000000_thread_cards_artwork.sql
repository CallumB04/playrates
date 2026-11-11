-- A thread's game brings its artwork as well as its cover, so the trending
-- cards can set the game's own picture behind them. Added at the end, so
-- the view is replaced in place and every column before it is unchanged.
set search_path = pg_catalog, public;

create or replace view public.community_thread_cards
with (security_invoker = true) as
select
    t.id,
    t.subject_kind,
    t.game_id,
    t.title,
    t.author_id,
    t.created_at,
    t.last_activity_at,
    g.title           as game_title,
    g.slug            as game_slug,
    coalesce(g.box_art_url, g.cover_url) as game_cover_url,
    coalesce(g.has_sexual_content, false) as game_has_sexual_content,
    p.username        as author_username,
    p.first_name      as author_first_name,
    p.avatar_url      as author_avatar_url,
    p.accent          as author_accent,
    s.message_count::int,
    s.contributor_count::int,
    s.recent_message_count::int,
    coalesce(c.contributors, '[]'::jsonb) as contributors,
    g.banner_url      as game_banner_url
from public.community_threads t
left join public.games g
    on g.id = t.game_id
left join public.profiles p
    on p.id = t.author_id
cross join lateral (
    select
        count(*) as message_count,
        count(distinct m.author_id) as contributor_count,
        count(*) filter (
            where m.created_at > now() - interval '14 days'
        ) as recent_message_count
    from public.community_messages m
    where m.thread_id = t.id and m.deleted_at is null
) s
-- The faces on a card: whoever posted most recently, four at most.
left join lateral (
    select jsonb_agg(
        jsonb_build_object(
            'username', pp.username,
            'avatar_url', pp.avatar_url,
            'accent', pp.accent
        )
        order by x.last_posted_at desc
    ) as contributors
    from (
        select m.author_id, max(m.created_at) as last_posted_at
        from public.community_messages m
        where m.thread_id = t.id
          and m.deleted_at is null
          and m.author_id is not null
        group by m.author_id
        order by last_posted_at desc
        limit 4
    ) x
    join public.profiles pp on pp.id = x.author_id
) c on true;

revoke all on public.community_thread_cards from anon, authenticated;
