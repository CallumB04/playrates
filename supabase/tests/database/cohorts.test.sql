-- The admin's cohorts: who got started, logged three on day one, and came
-- back, counted only once each window has closed.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(7);

create temp table before as
select sum(signed_up) signed_up, sum(logged_three) logged_three,
       sum(week_due) week_due, sum(back_week) back_week,
       sum(referred) referred, sum(referred_going) referred_going,
       sum(referred_week_due) referred_week_due
from admin_cohorts(8);

insert into auth.users (id, email, raw_user_meta_data)
values ('c1000000-0000-4000-8000-000000000001', 'c1@test.test', '{"username":"cohort_a"}'),
       ('c2000000-0000-4000-8000-000000000002', 'c2@test.test', '{"username":"cohort_b"}'),
       ('c3000000-0000-4000-8000-000000000003', 'c3@test.test', '{"username":"cohort_c"}');
insert into public.games (slug, title)
select 'cohort-' || n, 'Cohort ' || n from generate_series(1, 5) n;

-- A joined three weeks ago, logged three games in the first hours, and
-- came back on day eight. B, whom A invited, joined the same day, played
-- five games, and never came back. C joined yesterday.
update public.profiles set created_at = now() - interval '20 days'
where id in ('c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002');
update public.profiles set referred_by = 'c1000000-0000-4000-8000-000000000001'
where id = 'c2000000-0000-4000-8000-000000000002';
update public.profiles set created_at = now() - interval '1 day'
where id = 'c3000000-0000-4000-8000-000000000003';

insert into public.activity_events (actor_id, kind, game_id, created_at)
select 'c1000000-0000-4000-8000-000000000001', 'log_added', g.id,
       now() - interval '20 days' + interval '2 hours'
from public.games g where g.slug in ('cohort-1', 'cohort-2', 'cohort-3');
insert into public.user_active_days (user_id, day)
values ('c1000000-0000-4000-8000-000000000001',
        ((now() - interval '20 days') at time zone 'utc')::date + 8);
insert into public.game_logs (user_id, game_id, status)
select 'c2000000-0000-4000-8000-000000000002', g.id, 'played'
from public.games g where g.slug like 'cohort-%';

create temp table after as
select sum(signed_up) signed_up, sum(logged_three) logged_three,
       sum(week_due) week_due, sum(back_week) back_week,
       sum(referred) referred, sum(referred_going) referred_going,
       sum(referred_week_due) referred_week_due
from admin_cohorts(8);

select is((select a.signed_up - b.signed_up from after a, before b), 3::bigint,
    'every signup in the weeks shown counts');
select is((select a.logged_three - b.logged_three from after a, before b), 1::bigint,
    'three logs on day one count, from the event log');
select is((select a.week_due - b.week_due from after a, before b), 2::bigint,
    'only members whose second week has ended count toward coming back');
select is((select a.back_week - b.back_week from after a, before b), 1::bigint,
    'a visit in the second week counts as coming back');
select is((select a.referred - b.referred from after a, before b), 1::bigint,
    'an invited member counts as referred');
select is((select a.referred_going - b.referred_going from after a, before b), 1::bigint,
    'five played games is getting going');
select ok(not has_function_privilege('authenticated', 'public.admin_cohorts(int)', 'execute'),
    'members cannot read the cohorts');

select * from finish();
rollback;
