-- The emails PlayRates sends itself: which ones each member wants, a log
-- that stops the same one going twice, and the two reads the API cannot do
-- through PostgREST (addresses live in auth.users).

set search_path = pg_catalog, public;

-- -------------------------------------------------------------- profiles

-- Sparse, like about_visibility: a key not there is on, so every member,
-- new or old, starts with every email on.
alter table public.profiles
    add column email_prefs jsonb not null default '{}';

-- ------------------------------------------------------------- email log

-- One row per email that went out under a key: a friend request that is
-- withdrawn and sent again within the day is not emailed twice, and the
-- welcome only ever once.
create table public.email_log (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    kind text not null,
    ref text not null,
    sent_at timestamptz not null default now(),
    unique (user_id, kind, ref)
);

alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;

-- --------------------------------------------------------- announcements

alter table public.announcements
    add column email_broadcast_id text,
    add column emailed_at timestamptz;

-- `a.*` in a view is fixed when the view is made, so it is made again to
-- carry the new columns.
drop view public.announcement_cards;

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

-- ---------------------------------------------------------------- reads

-- Members' confirmed addresses, with what they need to be emailed: an
-- address nobody has confirmed is never written to. Null ids is everyone.
create or replace function public.member_emails(p_ids uuid[])
returns table (id uuid, email text, username text, email_prefs jsonb)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select p.id, u.email::text, p.username, p.email_prefs
    from public.profiles p
    join auth.users u on u.id = p.id
    where u.email is not null
      and u.email_confirmed_at is not null
      and (p_ids is null or p.id = any (p_ids))
    order by p.id;
$$;

revoke execute on function public.member_emails(uuid[])
    from anon, authenticated, public;

-- Whose address this is, for a provider that only knows the address.
create or replace function public.member_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select p.id
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(u.email) = lower(p_email)
    limit 1;
$$;

revoke execute on function public.member_id_by_email(text)
    from anon, authenticated, public;

-- Every wishlisted game that comes out on the day, with its owner.
create or replace function public.wishlist_releases_on(p_day date)
returns table (
    user_id uuid, game_id bigint, title text, slug text, cover_url text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select l.user_id, g.id, g.title, g.slug::text,
           coalesce(g.box_art_url, g.cover_url)
    from public.game_logs l
    join public.games g on g.id = l.game_id
    where l.status = 'wishlist' and g.release_date = p_day
    order by l.user_id, g.title;
$$;

revoke execute on function public.wishlist_releases_on(date)
    from anon, authenticated, public;

-- ------------------------------------------------------------ email sends

-- What went out, counted, for the admin to see how near the day is to
-- Resend's allowance. Only the kind and when: no members, no addresses.
create table public.email_sends (
    id bigint generated always as identity primary key,
    kind text not null,
    status text not null check (status in ('sent', 'capped', 'failed')),
    recipients integer not null check (recipients > 0),
    -- Broadcasts go out through Resend's marketing side, which doesn't
    -- count against the daily allowance the rest share.
    transactional boolean not null default true,
    error text,
    sent_at timestamptz not null default now()
);

create index email_sends_sent_at on public.email_sends (sent_at);

alter table public.email_sends enable row level security;
revoke all on public.email_sends from anon, authenticated;

-- Takes up to p_count of the last 24 hours' allowance (no cap for null),
-- recording what was taken and what the cap turned away. One caller at a
-- time, so two sends at once can't both take the last slot.
create or replace function public.take_email_slots(
    p_kind text, p_count integer, p_cap integer, p_transactional boolean
)
returns table (id bigint, granted integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_used integer;
    v_granted integer := p_count;
    v_id bigint;
begin
    perform pg_advisory_xact_lock(hashtext('public.take_email_slots'));
    if p_cap is not null then
        select coalesce(sum(s.recipients), 0) into v_used
        from public.email_sends s
        where s.transactional and s.status = 'sent'
          and s.sent_at > now() - interval '24 hours';
        v_granted := least(p_count, greatest(p_cap - v_used, 0));
    end if;
    if v_granted > 0 then
        insert into public.email_sends (kind, status, recipients, transactional)
        values (p_kind, 'sent', v_granted, p_transactional)
        returning email_sends.id into v_id;
    end if;
    if v_granted < p_count then
        insert into public.email_sends (kind, status, recipients, transactional)
        values (p_kind, 'capped', p_count - v_granted, p_transactional);
    end if;
    return query select v_id, v_granted;
end;
$$;

revoke execute on function public.take_email_slots(text, integer, integer, boolean)
    from anon, authenticated, public;

-- Sends since p_since, added up by UTC day, kind and outcome.
create or replace function public.email_send_totals(p_since timestamptz)
returns table (
    day date, kind text, status text, transactional boolean,
    sends bigint, recipients bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select (s.sent_at at time zone 'utc')::date, s.kind, s.status,
           s.transactional, count(*), sum(s.recipients)
    from public.email_sends s
    where s.sent_at >= p_since
    group by 1, 2, 3, 4
    order by 1;
$$;

revoke execute on function public.email_send_totals(timestamptz)
    from anon, authenticated, public;
