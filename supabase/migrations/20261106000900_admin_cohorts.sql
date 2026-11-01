-- Whether people stay, for the admin: each signup week, and what share of
-- it got started, logged three games on day one, and came back a week and
-- a month later. And the same for those who joined through an invite.
--
-- "Came back" is any visit in a week-long window (days 7 to 13, 30 to 36)
-- rather than on one exact day, which a weekend would decide. A member
-- counts toward a window only once it has closed, so a young week isn't
-- read as people leaving.

set search_path = pg_catalog, public;

create or replace function public.admin_cohorts(p_weeks int default 8)
returns table (
    week date,
    signed_up int,
    onboarded int,
    logged_three int,
    week_due int,
    back_week int,
    month_due int,
    back_month int,
    referred int,
    referred_onboarded int,
    referred_going int,
    referred_week_due int,
    referred_back_week int
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with bounds as (
        select (now() at time zone 'utc')::date as today,
               date_trunc('week', now() at time zone 'utc')::date as this_week
    ),
    weeks as (
        select (b.this_week - 7 * n)::date as week
        from bounds b, generate_series(0, greatest(p_weeks, 1) - 1) n
    ),
    members as (
        select p.id,
               p.created_at,
               (p.created_at at time zone 'utc')::date as joined,
               date_trunc('week', p.created_at at time zone 'utc')::date as week,
               p.onboarded_at is not null as onboarded,
               p.referred_by is not null as referred
        from public.profiles p
        where p.created_at >= (select min(week) from weeks)
    ),
    marks as (
        select m.week,
               m.onboarded,
               m.referred,
               -- From the event log, which keeps a log that was later removed.
               (select count(distinct e.game_id)
                from public.activity_events e
                where e.actor_id = m.id
                  and e.kind = 'log_added'
                  and e.created_at < m.created_at + interval '1 day') >= 3
                   as logged_three,
               -- The Recruiter badge's line for a friend who got going.
               (select count(distinct g.game_id)
                from public.game_logs g
                where g.user_id = m.id
                  and g.status in ('played', 'playing')) >= 5
                   as going,
               m.joined + 13 < b.today as week_due,
               exists (
                   select 1 from public.user_active_days d
                   where d.user_id = m.id
                     and d.day between m.joined + 7 and m.joined + 13
               ) as back_week,
               m.joined + 36 < b.today as month_due,
               exists (
                   select 1 from public.user_active_days d
                   where d.user_id = m.id
                     and d.day between m.joined + 30 and m.joined + 36
               ) as back_month
        from members m, bounds b
    )
    select w.week,
           count(k.week)::int,
           count(*) filter (where k.onboarded)::int,
           count(*) filter (where k.logged_three)::int,
           count(*) filter (where k.week_due)::int,
           count(*) filter (where k.week_due and k.back_week)::int,
           count(*) filter (where k.month_due)::int,
           count(*) filter (where k.month_due and k.back_month)::int,
           count(*) filter (where k.referred)::int,
           count(*) filter (where k.referred and k.onboarded)::int,
           count(*) filter (where k.referred and k.going)::int,
           count(*) filter (where k.referred and k.week_due)::int,
           count(*) filter (where k.referred and k.week_due and k.back_week)::int
    from weeks w
    left join marks k on k.week = w.week
    group by w.week
    order by w.week desc;
$$;

revoke execute on function public.admin_cohorts(int)
    from anon, authenticated, public;
