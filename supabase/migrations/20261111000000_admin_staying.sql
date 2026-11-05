-- Whether people stay, for the admin, over any period rather than a fixed
-- run of signup weeks: how the people who joined in it got on, and a curve
-- of how many were still coming back each day after joining.
--
-- "Came back after N days" is any visit on day N or later, so the curve
-- only falls and a quiet weekend doesn't jag it. A member counts toward day
-- N only once it has passed for them, so a new signup isn't read as gone.
--
-- admin_cohorts stays for the admin pages already open; it goes once
-- nothing calls it.

set search_path = pg_catalog, public;

-- The people who joined between two days (inclusive, UTC), and how far
-- they got.
create or replace function public.admin_staying(p_from date, p_to date)
returns table (
    joined int,
    onboarded int,
    logged_three int,
    week_due int,
    back_week int,
    month_due int,
    back_month int,
    invited int,
    invited_week_due int,
    invited_back_week int
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with today as (
        select (now() at time zone 'utc')::date as d
    ),
    members as (
        select p.id,
               p.created_at,
               (p.created_at at time zone 'utc')::date as joined,
               p.onboarded_at is not null as onboarded,
               p.referred_by is not null as invited
        from public.profiles p
        where (p.created_at at time zone 'utc')::date between p_from and p_to
    ),
    marks as (
        select m.onboarded,
               m.invited,
               -- From the event log, which keeps a log that was later removed.
               (select count(distinct e.game_id)
                from public.activity_events e
                where e.actor_id = m.id
                  and e.kind = 'log_added'
                  and e.created_at < m.created_at + interval '1 day') >= 3
                   as logged_three,
               m.joined + 7 < t.d as week_due,
               exists (
                   select 1 from public.user_active_days a
                   where a.user_id = m.id and a.day >= m.joined + 7
               ) as back_week,
               m.joined + 30 < t.d as month_due,
               exists (
                   select 1 from public.user_active_days a
                   where a.user_id = m.id and a.day >= m.joined + 30
               ) as back_month
        from members m, today t
    )
    select count(*)::int,
           count(*) filter (where onboarded)::int,
           count(*) filter (where logged_three)::int,
           count(*) filter (where week_due)::int,
           count(*) filter (where week_due and back_week)::int,
           count(*) filter (where month_due)::int,
           count(*) filter (where month_due and back_month)::int,
           count(*) filter (where invited)::int,
           count(*) filter (where invited and week_due)::int,
           count(*) filter (where invited and week_due and back_week)::int
    from marks;
$$;

revoke execute on function public.admin_staying(date, date)
    from anon, authenticated, public;

-- For each day 1 to p_days after joining: of the people who joined between
-- the two days and are that far along, how many came back then or later.
-- The same for those who joined through an invite.
create or replace function public.admin_return_curve(
    p_from date,
    p_to date,
    p_days int
)
returns table (
    day int,
    due int,
    back int,
    invited_due int,
    invited_back int
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with today as (
        select (now() at time zone 'utc')::date as d
    ),
    members as (
        select p.id,
               (p.created_at at time zone 'utc')::date as joined,
               p.referred_by is not null as invited,
               -- Their last visit, which says at once whether they came
               -- back by any given day.
               (select max(a.day) from public.user_active_days a
                where a.user_id = p.id) as last_seen
        from public.profiles p
        where (p.created_at at time zone 'utc')::date between p_from and p_to
    )
    select n::int,
           count(*) filter (where m.joined + n < t.d)::int,
           count(*) filter (where m.joined + n < t.d
                              and m.last_seen >= m.joined + n)::int,
           count(*) filter (where m.invited and m.joined + n < t.d)::int,
           count(*) filter (where m.invited and m.joined + n < t.d
                              and m.last_seen >= m.joined + n)::int
    from generate_series(1, least(greatest(p_days, 1), 365)) n
    cross join today t
    left join members m on true
    group by n
    order by n;
$$;

revoke execute on function public.admin_return_curve(date, date, int)
    from anon, authenticated, public;
