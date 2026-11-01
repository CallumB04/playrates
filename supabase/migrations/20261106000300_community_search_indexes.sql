-- Community search read every thread and, for each, every message: fine at
-- two threads, not at two thousand. Each place a term can match is now
-- its own lookup through a trigram index, and only the threads found are
-- looked at. Same arguments and answer as before.

set search_path = pg_catalog, public, extensions;

create index if not exists community_threads_title_trgm_idx
    on public.community_threads using gin (title gin_trgm_ops);

create index if not exists community_messages_plain_text_trgm_idx
    on public.community_messages using gin (plain_text gin_trgm_ops)
    where deleted_at is null;

create or replace function public.community_thread_search(p_query text)
returns setof bigint
language sql
stable
set search_path = pg_catalog, public
-- Planned for the term in hand, so the trigram indexes are costed for it.
set plan_cache_mode = force_custom_plan
as $$
    with term as (
        select '%' || replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    ),
    found as (
        select t.id
        from public.community_threads t, term
        where t.title ilike term.pattern
        union
        select t.id
        from public.games g
        join public.community_threads t on t.game_id = g.id, term
        where g.title ilike term.pattern
        union
        select m.thread_id
        from public.community_messages m, term
        where m.deleted_at is null
          and m.plain_text ilike term.pattern
    )
    select t.id
    from public.community_threads t
    join found on found.id = t.id
    where t.subject_kind = 'game';
$$;

revoke execute on function public.community_thread_search(text)
    from anon, authenticated, public;
