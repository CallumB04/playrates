-- Community: threads, the messages in them, and upvotes on those messages.
--
-- A thread is about something. Today that is always a game, but it will not
-- stay that way, so the subject is a kind plus one nullable column per kind
-- rather than a polymorphic (kind, id) pair: each column keeps a real foreign
-- key, and a new kind is a new column and a widened CHECK. The one kind that
-- is not a game is the PlayRates patch notes, a single official thread only
-- an admin can post to.
--
-- A thread opens with a message, and that opening message is what the thread
-- *says*: it is never edited, and it goes only when the whole thread does.
-- Replies nest one level deep. The rule that a reply's parent is a top-level
-- message lives in the service, since a CHECK cannot see another row.
--
-- Deleting a reply is soft. A reply that others answered keeps its place as
-- "[deleted]", so the answers under it still read as answers.
--
-- Leaving PlayRates does not take a conversation with it: authors are set
-- null rather than cascaded, and the thread shows them as a deleted account.
--
-- Counts are derived in a view rather than stored, like review votes, so they
-- cannot drift from the rows behind them. No policies, as everywhere else:
-- all access goes through the API on the service-role key.

set search_path = pg_catalog, public;

-- Admin ----------------------------------------------------------------------

alter table public.profiles
    add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
    'Can post patch notes and remove any community thread or message.';

update public.profiles set is_admin = true where username = 'calbgyn';

-- Threads --------------------------------------------------------------------

create table public.community_threads (
    id bigint generated always as identity primary key,
    subject_kind text not null,
    game_id bigint references public.games (id) on delete cascade,
    title text not null,
    author_id uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    -- Bumped by trigger on every new message; "active" sorts by it.
    last_activity_at timestamptz not null default now(),

    constraint community_threads_subject_kind
        check (subject_kind in ('game', 'patch_notes')),
    constraint community_threads_game_subject
        check ((subject_kind = 'game') = (game_id is not null)),
    constraint community_threads_title_len
        check (char_length(title) between 3 and 120)
);

-- There is one patch-notes thread, not one per release.
create unique index community_threads_one_patch_notes
    on public.community_threads (subject_kind)
    where subject_kind = 'patch_notes';

create index community_threads_game_idx
    on public.community_threads (game_id, last_activity_at desc)
    where game_id is not null;

create index community_threads_activity_idx
    on public.community_threads (last_activity_at desc);

alter table public.community_threads enable row level security;
revoke all on public.community_threads from anon, authenticated;

-- Messages -------------------------------------------------------------------

create table public.community_messages (
    id bigint generated always as identity primary key,
    thread_id bigint not null
        references public.community_threads (id) on delete cascade,
    parent_id bigint references public.community_messages (id) on delete cascade,
    author_id uuid references public.profiles (id) on delete set null,
    -- Tiptap's document JSON, checked against an allowlist by the API before
    -- it gets here. Null once deleted.
    body jsonb,
    is_opening boolean not null default false,
    created_at timestamptz not null default now(),
    edited_at timestamptz,
    deleted_at timestamptz,

    constraint community_messages_body_until_deleted
        check ((deleted_at is null) = (body is not null)),
    constraint community_messages_opening_is_top_level
        check (not is_opening or parent_id is null)
);

create unique index community_messages_one_opening
    on public.community_messages (thread_id)
    where is_opening;

create index community_messages_thread_idx
    on public.community_messages (thread_id, created_at);

-- "Threads this person has posted in", newest first.
create index community_messages_author_idx
    on public.community_messages (author_id, created_at desc)
    where deleted_at is null;

-- Trending counts the last two weeks across every thread.
create index community_messages_recent_idx
    on public.community_messages (created_at desc)
    where deleted_at is null;

alter table public.community_messages enable row level security;
revoke all on public.community_messages from anon, authenticated;

create or replace function public.community_bump_thread_activity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    update public.community_threads
    set last_activity_at = new.created_at
    where id = new.thread_id;
    return new;
end;
$$;

create trigger community_messages_bump_thread
    after insert on public.community_messages
    for each row execute function public.community_bump_thread_activity();

-- Votes ----------------------------------------------------------------------

-- One row per person per message, so a second vote collides rather than
-- counting twice. Self-votes are refused by the service, as on reviews.
create table public.community_message_votes (
    message_id bigint not null
        references public.community_messages (id) on delete cascade,
    user_id uuid not null
        references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),

    primary key (message_id, user_id)
);

create index community_message_votes_user_idx
    on public.community_message_votes (user_id);

alter table public.community_message_votes enable row level security;
revoke all on public.community_message_votes from anon, authenticated;

-- Views ----------------------------------------------------------------------

-- A thread as a list shows it. recent_message_count is what trending ranks
-- on: messages in the last fourteen days, the same window everywhere.
create view public.community_thread_cards
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
    coalesce(c.contributors, '[]'::jsonb) as contributors
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

create view public.community_message_cards
with (security_invoker = true) as
select
    m.id,
    m.thread_id,
    m.parent_id,
    m.author_id,
    m.body,
    m.is_opening,
    m.created_at,
    m.edited_at,
    m.deleted_at,
    p.username        as author_username,
    p.first_name      as author_first_name,
    p.avatar_url      as author_avatar_url,
    p.accent          as author_accent,
    coalesce(v.vote_count, 0)::int as vote_count
from public.community_messages m
left join public.profiles p
    on p.id = m.author_id
left join (
    select message_id, count(*) as vote_count
    from public.community_message_votes
    group by message_id
) v on v.message_id = m.id;

revoke all on public.community_message_cards from anon, authenticated;

-- Functions ------------------------------------------------------------------

-- A thread and its opening message land together or not at all. PostgREST
-- runs each call in one transaction, which two separate inserts would not be.
create function public.create_community_thread(
    p_author_id uuid,
    p_subject_kind text,
    p_game_id bigint,
    p_title text,
    p_body jsonb
)
returns bigint
language plpgsql
set search_path = pg_catalog, public
as $$
declare
    v_thread_id bigint;
begin
    insert into public.community_threads (subject_kind, game_id, title, author_id)
    values (p_subject_kind, p_game_id, p_title, p_author_id)
    returning id into v_thread_id;

    insert into public.community_messages (thread_id, author_id, body, is_opening)
    values (v_thread_id, p_author_id, p_body, true);

    return v_thread_id;
end;
$$;

revoke execute on function public.create_community_thread(uuid, text, bigint, text, jsonb)
    from anon, authenticated, public;

-- Messages per day for the last fourteen days, oldest first, zero-filled so
-- the sparkline always has fourteen bars. Days are UTC.
create function public.community_thread_activity(p_thread_id bigint)
returns table (day date, message_count int)
language sql
stable
set search_path = pg_catalog, public
as $$
    select d::date as day, count(m.id)::int as message_count
    from generate_series(
        (now() at time zone 'utc')::date - 13,
        (now() at time zone 'utc')::date,
        interval '1 day'
    ) d
    left join public.community_messages m
        on m.thread_id = p_thread_id
       and m.deleted_at is null
       and (m.created_at at time zone 'utc')::date = d::date
    group by d
    order by d;
$$;

revoke execute on function public.community_thread_activity(bigint)
    from anon, authenticated, public;

-- Storage --------------------------------------------------------------------

-- Pictures in messages. Public for the same reason avatars are; the limits
-- restate what the API enforces so storage refuses anything that arrives
-- another way.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-images', 'community-images', true, 1048576, array['image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Patch notes ----------------------------------------------------------------

-- The official thread, opened with a placeholder for the launch notes that
-- the admin writes over.
select public.create_community_thread(
    (select id from public.profiles where username = 'calbgyn'),
    'patch_notes',
    null,
    'PlayRates patch notes',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"v1.0 — Launch"}]},{"type":"paragraph","content":[{"type":"text","text":"Patch notes coming soon."}]}]}'::jsonb
);
