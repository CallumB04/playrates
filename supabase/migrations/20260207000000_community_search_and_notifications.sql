-- Searching threads, and telling people when their threads move.
--
-- Search reads a message's words, not its JSON, so every message keeps a
-- plain_text copy, kept by trigger so no writer can forget it. Search is
-- substring rather than full-text: people search for "hollow kni" while
-- typing, and a stemmer would not find that.
--
-- A thread's author hears about new messages as one notification per thread
-- that counts up while unread and moves to the top of the inbox with each
-- new message. Once read, the next message starts a fresh count. That is a
-- read-modify-write, so it happens here in one statement rather than in the
-- API, where two messages at once would each read the same count.

set search_path = pg_catalog, public;

-- Plain text -----------------------------------------------------------------

alter table public.community_messages
    add column if not exists plain_text text;

create or replace function public.community_messages_plain_text()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    -- Every "text" key in a Tiptap document is a text node's words.
    new.plain_text := (
        select string_agg(value #>> '{}', ' ')
        from jsonb_path_query(new.body, 'lax $.**.text') as value
    );
    return new;
end;
$$;

create trigger community_messages_keep_plain_text
    before insert or update of body on public.community_messages
    for each row execute function public.community_messages_plain_text();

update public.community_messages set body = body where body is not null;

-- Search ---------------------------------------------------------------------

-- Game threads whose title, game or any standing message contains the term.
-- The term is escaped, so a % or _ someone types is looked for literally.
create function public.community_thread_search(p_query text)
returns setof bigint
language sql
stable
set search_path = pg_catalog, public
as $$
    with term as (
        select '%' || replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    )
    select t.id
    from public.community_threads t
    left join public.games g on g.id = t.game_id
    cross join term
    where t.subject_kind = 'game'
      and (
          t.title ilike term.pattern
          or g.title ilike term.pattern
          or exists (
              select 1 from public.community_messages m
              where m.thread_id = t.id
                and m.deleted_at is null
                and m.plain_text ilike term.pattern
          )
      );
$$;

revoke execute on function public.community_thread_search(text)
    from anon, authenticated, public;

-- Thread activity ------------------------------------------------------------

-- Counts up while unread, starts again at one once read or archived. The
-- predicate is repeated so ON CONFLICT can infer the partial dedupe index.
create function public.bump_community_thread_activity(
    p_user_id uuid,
    p_dedupe_key text,
    p_data jsonb
)
returns void
language sql
set search_path = pg_catalog, public
as $$
    insert into public.notifications (user_id, kind, data, dedupe_key)
    values (
        p_user_id,
        'community_thread_activity',
        p_data || '{"count": 1}'::jsonb,
        p_dedupe_key
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null
    do update set
        data = case
            when notifications.read_at is null and notifications.archived_at is null
                then excluded.data || jsonb_build_object(
                    'count',
                    coalesce((notifications.data ->> 'count')::int, 0) + 1
                )
            else excluded.data
        end,
        read_at = null,
        archived_at = null,
        created_at = now();
$$;

revoke execute on function public.bump_community_thread_activity(uuid, text, jsonb)
    from anon, authenticated, public;

-- A notification about a thread that is gone would open onto a 404.
create or replace function public.community_thread_clear_notifications()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    delete from public.notifications
    where kind in ('community_reply', 'community_thread_activity')
      and data ->> 'threadId' = old.id::text;
    return old;
end;
$$;

create trigger community_threads_clear_notifications
    after delete on public.community_threads
    for each row execute function public.community_thread_clear_notifications();
