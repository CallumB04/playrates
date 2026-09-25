-- The two lists beside the community's threads: the games with the most
-- messages over the trending window, and the newest replies anywhere.
--
-- Both are aggregates or joins across tables that PostgREST cannot express,
-- so they are functions. Patch notes are left out of both, as they are of
-- trending, and explicit games stay out unless the viewer has opted in.

set search_path = pg_catalog, public;

create function public.community_trending_games(p_limit int, p_show_sexual boolean)
returns table (
    game_id bigint,
    title text,
    cover_url text,
    recent_message_count int
)
language sql
stable
set search_path = pg_catalog, public
as $$
    select
        g.id,
        g.title,
        coalesce(g.box_art_url, g.cover_url),
        count(m.id)::int
    from public.community_threads t
    join public.games g on g.id = t.game_id
    join public.community_messages m
        on m.thread_id = t.id
       and m.deleted_at is null
       and m.created_at > now() - interval '14 days'
    where t.subject_kind = 'game'
      and (p_show_sexual or not g.has_sexual_content)
    group by g.id
    -- The latest message breaks ties, so the busier-lately game leads.
    order by count(m.id) desc, max(m.created_at) desc, g.id
    limit p_limit;
$$;

revoke execute on function public.community_trending_games(int, boolean)
    from anon, authenticated, public;

-- Replies, not openings: a new thread already shows at the top of the list.
create function public.community_latest_replies(p_limit int, p_show_sexual boolean)
returns table (
    id bigint,
    thread_id bigint,
    thread_title text,
    plain_text text,
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
        m.plain_text,
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
