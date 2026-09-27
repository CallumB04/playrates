-- A running record of what people do, for the admin dashboard.
--
-- Written by triggers rather than the services, so every path that changes
-- these tables is covered: the API, the import scripts, a hand-run statement.
--
-- No foreign keys. This is a log, and it should outlive what it describes: an
-- account that goes keeps its history, and a trigger never has to insert a
-- reference to a row that the same statement is deleting.
--
-- Deletes that only happen because an account went (its logs, reviews,
-- friendships, cascading away) are skipped. "account_deleted" says it once.

set search_path = pg_catalog, public;

create table public.activity_events (
    id bigint generated always as identity primary key,
    actor_id uuid,
    kind text not null,
    game_id bigint,
    -- The row the event is about: a review id, a thread id, a friend's id.
    subject_id text,
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),

    constraint activity_events_kind_format check (kind ~ '^[a-z][a-z0-9_]*$')
);

create index activity_events_feed_idx
    on public.activity_events (created_at desc, id desc);

create index activity_events_actor_idx
    on public.activity_events (actor_id, created_at desc, id desc);

create index activity_events_kind_idx
    on public.activity_events (kind, created_at desc, id desc);

alter table public.activity_events enable row level security;
revoke all on public.activity_events from anon, authenticated;

create or replace function public.profile_exists(p_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
    select exists (select 1 from public.profiles where id = p_id);
$$;

revoke execute on function public.profile_exists(uuid)
    from anon, authenticated, public;

-- Profiles ---------------------------------------------------------------------

-- security definer throughout: a signup inserts its profile from the auth
-- schema's role, which has no grant on this table.
create or replace function public.activity_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    changed text[];
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.id, 'signup', new.id::text,
                jsonb_build_object('username', new.username));
    elsif tg_op = 'DELETE' then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (old.id, 'account_deleted', old.id::text,
                jsonb_build_object('username', old.username));
    else
        -- The heartbeat writes last_seen_at every two minutes; only what a
        -- person chose to change counts.
        changed := array_remove(array[
            case when new.username is distinct from old.username then 'username' end,
            case when new.avatar_url is distinct from old.avatar_url then 'avatar' end,
            case when new.bio is distinct from old.bio then 'bio' end
        ], null);
        if cardinality(changed) > 0 then
            insert into public.activity_events (actor_id, kind, subject_id, data)
            values (new.id, 'profile_updated', new.id::text,
                    jsonb_build_object(
                        'fields', to_jsonb(changed),
                        'username', new.username,
                        'previousUsername',
                        case when 'username' = any(changed) then old.username end
                    ));
        end if;
    end if;
    return null;
end;
$$;

create trigger profiles_activity
    after insert or update or delete on public.profiles
    for each row execute function public.activity_from_profiles();

-- Game logs --------------------------------------------------------------------

create or replace function public.activity_from_game_logs()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
        values (new.user_id, 'log_added', new.game_id, new.id::text,
                jsonb_build_object(
                    'status', new.status,
                    'playedStatus', new.played_status,
                    'rating', new.rating
                ));
    elsif tg_op = 'DELETE' then
        if public.profile_exists(old.user_id) then
            insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
            values (old.user_id, 'log_removed', old.game_id, old.id::text,
                    jsonb_build_object('status', old.status));
        end if;
    elsif new.status is distinct from old.status
       or new.played_status is distinct from old.played_status
       or new.rating is distinct from old.rating then
        insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
        values (new.user_id, 'log_updated', new.game_id, new.id::text,
                jsonb_build_object(
                    'from', jsonb_build_object(
                        'status', old.status,
                        'playedStatus', old.played_status,
                        'rating', old.rating),
                    'to', jsonb_build_object(
                        'status', new.status,
                        'playedStatus', new.played_status,
                        'rating', new.rating)
                ));
    end if;
    return null;
end;
$$;

create trigger game_logs_activity
    after insert or update or delete on public.game_logs
    for each row execute function public.activity_from_game_logs();

-- Reviews ----------------------------------------------------------------------

create or replace function public.activity_from_reviews()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
        values (new.user_id, 'review_posted', new.game_id, new.id::text,
                jsonb_build_object(
                    'isPublic', new.is_public,
                    'containsSpoilers', new.contains_spoilers,
                    'excerpt', left(new.body, 200)
                ));
    elsif tg_op = 'DELETE' then
        if public.profile_exists(old.user_id) then
            insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
            values (old.user_id, 'review_removed', old.game_id, old.id::text,
                    jsonb_build_object('excerpt', left(old.body, 200)));
        end if;
    elsif new.body is distinct from old.body
       or new.is_public is distinct from old.is_public
       or new.contains_spoilers is distinct from old.contains_spoilers then
        insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
        values (new.user_id, 'review_edited', new.game_id, new.id::text,
                jsonb_build_object(
                    'isPublic', new.is_public,
                    'containsSpoilers', new.contains_spoilers,
                    'excerpt', left(new.body, 200)
                ));
    end if;
    return null;
end;
$$;

create trigger reviews_activity
    after insert or update or delete on public.reviews
    for each row execute function public.activity_from_reviews();

create or replace function public.activity_from_review_votes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
    select new.user_id, 'review_upvoted', r.game_id, r.id::text,
           jsonb_build_object('authorId', r.user_id)
    from public.reviews r
    where r.id = new.review_id;
    return null;
end;
$$;

create trigger review_votes_activity
    after insert on public.review_votes
    for each row execute function public.activity_from_review_votes();

-- Community --------------------------------------------------------------------

create or replace function public.activity_from_community_threads()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
        values (new.author_id, 'thread_created', new.game_id, new.id::text,
                jsonb_build_object(
                    'title', new.title,
                    'subjectKind', new.subject_kind
                ));
    else
        insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
        values (old.author_id, 'thread_removed', old.game_id, old.id::text,
                jsonb_build_object('title', old.title));
    end if;
    return null;
end;
$$;

create trigger community_threads_activity
    after insert or delete on public.community_threads
    for each row execute function public.activity_from_community_threads();

-- An opening message is the thread's own words, and thread_created already
-- said it. Hard deletes only happen with the whole thread, which says so too.
create or replace function public.activity_from_community_messages()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_kind text;
begin
    if tg_op = 'INSERT' then
        if new.is_opening then
            return null;
        end if;
        v_kind := 'message_posted';
    elsif new.deleted_at is not null and old.deleted_at is null then
        v_kind := 'message_deleted';
    elsif new.edited_at is distinct from old.edited_at then
        v_kind := 'message_edited';
    else
        return null;
    end if;

    insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
    select new.author_id, v_kind, t.game_id, new.id::text,
           jsonb_build_object(
               'threadId', new.thread_id,
               'threadTitle', t.title,
               'isReply', new.parent_id is not null,
               'isOpening', new.is_opening
           )
    from public.community_threads t
    where t.id = new.thread_id;
    return null;
end;
$$;

create trigger community_messages_activity
    after insert or update on public.community_messages
    for each row execute function public.activity_from_community_messages();

create or replace function public.activity_from_community_message_votes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
    select new.user_id, 'message_upvoted', t.game_id, m.id::text,
           jsonb_build_object(
               'threadId', m.thread_id,
               'threadTitle', t.title,
               'authorId', m.author_id
           )
    from public.community_messages m
    join public.community_threads t on t.id = m.thread_id
    where m.id = new.message_id;
    return null;
end;
$$;

create trigger community_message_votes_activity
    after insert on public.community_message_votes
    for each row execute function public.activity_from_community_message_votes();

-- Friendships ------------------------------------------------------------------

create or replace function public.activity_from_friendships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    other uuid;
begin
    if tg_op = 'INSERT' then
        other := case when new.requested_by = new.user_a_id
                      then new.user_b_id else new.user_a_id end;
        insert into public.activity_events (actor_id, kind, subject_id)
        values (new.requested_by,
                case when new.status = 'accepted'
                     then 'friend_accepted' else 'friend_requested' end,
                other::text);
    elsif tg_op = 'DELETE' then
        if public.profile_exists(old.user_a_id)
           and public.profile_exists(old.user_b_id) then
            insert into public.activity_events (actor_id, kind, subject_id, data)
            values (old.requested_by, 'friend_removed',
                    (case when old.requested_by = old.user_a_id
                          then old.user_b_id else old.user_a_id end)::text,
                    jsonb_build_object('wasAccepted', old.status = 'accepted'));
        end if;
    elsif new.status = 'accepted' and old.status <> 'accepted' then
        -- The one who accepted is the one who did not ask.
        other := new.requested_by;
        insert into public.activity_events (actor_id, kind, subject_id)
        values (case when new.requested_by = new.user_a_id
                     then new.user_b_id else new.user_a_id end,
                'friend_accepted', other::text);
    end if;
    return null;
end;
$$;

create trigger friendships_activity
    after insert or update or delete on public.friendships
    for each row execute function public.activity_from_friendships();

revoke execute on function public.activity_from_profiles() from anon, authenticated, public;
revoke execute on function public.activity_from_game_logs() from anon, authenticated, public;
revoke execute on function public.activity_from_reviews() from anon, authenticated, public;
revoke execute on function public.activity_from_review_votes() from anon, authenticated, public;
revoke execute on function public.activity_from_community_threads() from anon, authenticated, public;
revoke execute on function public.activity_from_community_messages() from anon, authenticated, public;
revoke execute on function public.activity_from_community_message_votes() from anon, authenticated, public;
revoke execute on function public.activity_from_friendships() from anon, authenticated, public;

-- History ----------------------------------------------------------------------

-- What already exists, dated to when it happened, so the feed and the charts
-- start at the beginning. Only creations can be recovered; edits and deletes
-- are recorded from here on. `backfilled` marks a row whose data is the row as
-- it stands now rather than as it was then.
insert into public.activity_events (actor_id, kind, game_id, subject_id, data, created_at)
select actor_id, kind, game_id, subject_id, data || '{"backfilled": true}', created_at
from (
    select id as actor_id, 'signup' as kind, null::bigint as game_id,
           id::text as subject_id,
           jsonb_build_object('username', username) as data, created_at
    from public.profiles

    union all
    select user_id, 'log_added', game_id, id::text,
           jsonb_build_object('status', status, 'playedStatus', played_status,
                              'rating', rating),
           created_at
    from public.game_logs

    union all
    select user_id, 'review_posted', game_id, id::text,
           jsonb_build_object('isPublic', is_public,
                              'containsSpoilers', contains_spoilers,
                              'excerpt', left(body, 200)),
           created_at
    from public.reviews

    union all
    select v.user_id, 'review_upvoted', r.game_id, r.id::text,
           jsonb_build_object('authorId', r.user_id), v.created_at
    from public.review_votes v
    join public.reviews r on r.id = v.review_id

    union all
    select author_id, 'thread_created', game_id, id::text,
           jsonb_build_object('title', title, 'subjectKind', subject_kind),
           created_at
    from public.community_threads

    union all
    select m.author_id, 'message_posted', t.game_id, m.id::text,
           jsonb_build_object('threadId', m.thread_id, 'threadTitle', t.title,
                              'isReply', m.parent_id is not null,
                              'isOpening', false),
           m.created_at
    from public.community_messages m
    join public.community_threads t on t.id = m.thread_id
    where not m.is_opening

    union all
    select v.user_id, 'message_upvoted', t.game_id, m.id::text,
           jsonb_build_object('threadId', m.thread_id, 'threadTitle', t.title,
                              'authorId', m.author_id),
           v.created_at
    from public.community_message_votes v
    join public.community_messages m on m.id = v.message_id
    join public.community_threads t on t.id = m.thread_id

    union all
    select requested_by, 'friend_requested', null,
           (case when requested_by = user_a_id then user_b_id else user_a_id end)::text,
           '{}'::jsonb, created_at
    from public.friendships

    union all
    select case when requested_by = user_a_id then user_b_id else user_a_id end,
           'friend_accepted', null, requested_by::text, '{}'::jsonb, updated_at
    from public.friendships
    where status = 'accepted'
) history
order by created_at;
