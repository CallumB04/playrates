-- Telling people when their message or review reaches 5, 10, 20, 50, 100 or
-- 250 upvotes.
--
-- One notification per message or review, raised again in place at each new
-- milestone. It only ever moves up: the WHERE on the conflict is what stops
-- an upvote taken back and given again at 5 from announcing 5 twice. Kept in
-- one statement so two votes landing together cannot both see the old
-- milestone.

set search_path = pg_catalog, public;

create function public.raise_upvote_milestone(
    p_user_id uuid,
    p_kind text,
    p_dedupe_key text,
    p_milestone int,
    p_data jsonb
)
returns void
language sql
set search_path = pg_catalog, public
as $$
    insert into public.notifications (user_id, kind, data, dedupe_key)
    values (
        p_user_id,
        p_kind,
        p_data || jsonb_build_object('milestone', p_milestone),
        p_dedupe_key
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null
    do update set
        data = excluded.data,
        read_at = null,
        archived_at = null,
        created_at = now()
    where coalesce((notifications.data ->> 'milestone')::int, 0) < p_milestone;
$$;

revoke execute on function public.raise_upvote_milestone(uuid, text, text, int, jsonb)
    from anon, authenticated, public;

-- A milestone on a thread that is gone goes with its other notifications.
create or replace function public.community_thread_clear_notifications()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    delete from public.notifications
    where kind in (
        'community_reply',
        'community_thread_activity',
        'community_upvote_milestone'
    )
      and data ->> 'threadId' = old.id::text;
    return old;
end;
$$;

-- And a review's with the review, however it goes: deleted by its author,
-- or taken with the log it was written from.
create or replace function public.review_clear_notifications()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    delete from public.notifications
    where dedupe_key = 'review_upvotes:' || old.id;
    return old;
end;
$$;

create trigger reviews_clear_notifications
    after delete on public.reviews
    for each row execute function public.review_clear_notifications();
