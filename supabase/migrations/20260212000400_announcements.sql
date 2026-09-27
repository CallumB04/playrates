-- Announcements: one message from PlayRates to everyone, delivered as a
-- notification in each inbox.
--
-- The announcement is kept once here, and each copy carries it in `data`, so
-- the bell renders it like any other kind. The copies share a dedupe key,
-- which is how the history counts who has read it and how retracting takes
-- every copy back at once.
--
-- Only people with an account when it goes out receive it; nobody who signs
-- up later is sent last month's news.

set search_path = pg_catalog, public;

create table public.announcements (
    id bigint generated always as identity primary key,
    tone text not null,
    title text not null,
    body text not null,
    link_path text,
    sent_by uuid references public.profiles (id) on delete set null,
    recipient_count int not null default 0,
    created_at timestamptz not null default now(),
    retracted_at timestamptz,

    constraint announcements_tone
        check (tone in ('info', 'update', 'warning', 'celebration')),
    -- The API holds the tighter limits the bell was laid out for; these only
    -- stop anything absurd.
    constraint announcements_title_len check (char_length(title) between 1 and 120),
    constraint announcements_body_len check (char_length(body) between 1 and 400),
    -- In-app only: a path, never another site.
    constraint announcements_link_path
        check (link_path is null or link_path ~ '^/([^/].*)?$')
);

create index announcements_created_idx on public.announcements (created_at desc);

alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;

-- Reach and read counts, and retraction, look copies up by key across every
-- inbox; the existing dedupe index leads with user_id.
create index notifications_announcement_idx
    on public.notifications (dedupe_key)
    where kind = 'announcement';

create or replace function public.broadcast_announcement(p_id bigint)
returns int
language plpgsql
set search_path = pg_catalog, public
as $$
declare
    sent int;
begin
    insert into public.notifications (user_id, kind, data, dedupe_key)
    select p.id, 'announcement',
           jsonb_build_object(
               'announcementId', a.id,
               'tone', a.tone,
               'title', a.title,
               'body', a.body,
               'link', a.link_path
           ),
           'announcement:' || a.id
    from public.announcements a
    cross join public.profiles p
    where a.id = p_id and a.retracted_at is null
    on conflict do nothing;

    get diagnostics sent = row_count;

    update public.announcements
    set recipient_count = recipient_count + sent
    where id = p_id;

    return sent;
end;
$$;

revoke execute on function public.broadcast_announcement(bigint)
    from anon, authenticated, public;

create view public.announcement_cards
with (security_invoker = true) as
select
    a.*,
    coalesce(n.read_count, 0) as read_count
from public.announcements a
left join lateral (
    select count(*) filter (where read_at is not null) as read_count
    from public.notifications
    where kind = 'announcement' and dedupe_key = 'announcement:' || a.id
) n on true;

revoke all on public.announcement_cards from anon, authenticated;
