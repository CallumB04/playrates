-- One row per person per day they used PlayRates, for daily, weekly and
-- monthly active users. last_seen_at alone only says who is active now.
--
-- The heartbeat already runs every two minutes while a tab is open, so the
-- day is marked in the same call rather than by a job.

set search_path = pg_catalog, public;

create table public.user_active_days (
    user_id uuid not null references public.profiles (id) on delete cascade,
    -- UTC, like every series on the dashboard.
    day date not null,

    primary key (user_id, day)
);

create index user_active_days_day_idx on public.user_active_days (day);

alter table public.user_active_days enable row level security;
revoke all on public.user_active_days from anon, authenticated;

create or replace function public.touch_last_seen(p_user_id uuid)
returns void
language sql
set search_path = pg_catalog, public
as $$
    update public.profiles set last_seen_at = now() where id = p_user_id;

    insert into public.user_active_days (user_id, day)
    select p_user_id, (now() at time zone 'utc')::date
    where exists (select 1 from public.profiles where id = p_user_id)
    on conflict do nothing;
$$;

revoke execute on function public.touch_last_seen(uuid)
    from anon, authenticated, public;

-- A start on history: every day someone did something the activity log can
-- see, plus the last day each person was seen.
insert into public.user_active_days (user_id, day)
select distinct e.actor_id, (e.created_at at time zone 'utc')::date
from public.activity_events e
join public.profiles p on p.id = e.actor_id
union
select id, (last_seen_at at time zone 'utc')::date
from public.profiles
where last_seen_at is not null
on conflict do nothing;
