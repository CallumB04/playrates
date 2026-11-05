-- The admin's "Do people stay": how a period's signups got on, and the
-- curve of how many were still coming back each day after joining.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data)
values ('d1000000-0000-4000-8000-000000000001', 'd1@test.test', '{"username":"staying_a"}'),
       ('d2000000-0000-4000-8000-000000000002', 'd2@test.test', '{"username":"staying_b"}'),
       ('d3000000-0000-4000-8000-000000000003', 'd3@test.test', '{"username":"staying_c"}');

-- A long time ago, where nothing else joined. A came back on day 8 and no
-- more; B, whom A invited, on day 45; C never came back.
update public.profiles set created_at = '2020-01-01 12:00+00'
where id in ('d1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002');
update public.profiles set created_at = '2020-01-02 12:00+00'
where id = 'd3000000-0000-4000-8000-000000000003';
update public.profiles set referred_by = 'd1000000-0000-4000-8000-000000000001'
where id = 'd2000000-0000-4000-8000-000000000002';
delete from public.user_active_days where user_id in (
    'd1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002',
    'd3000000-0000-4000-8000-000000000003');
insert into public.user_active_days (user_id, day)
values ('d1000000-0000-4000-8000-000000000001', '2020-01-09'),
       ('d2000000-0000-4000-8000-000000000002', '2020-02-15');

select results_eq(
    $$select joined, week_due, back_week, month_due, back_month
      from admin_staying('2020-01-01', '2020-01-02')$$,
    $$values (3, 3, 2, 3, 1)$$,
    'a visit on day 7 or later is back after a week; day 30 or later, a month');
select results_eq(
    $$select invited, invited_week_due, invited_back_week
      from admin_staying('2020-01-01', '2020-01-02')$$,
    $$values (1, 1, 1)$$,
    'those who joined through an invite are counted apart too');
select is(
    (select joined from admin_staying('2020-01-02', '2020-01-02')), 1,
    'only the days asked for count');

select results_eq(
    $$select due, back from admin_return_curve('2020-01-01', '2020-01-02', 60)
      where day in (8, 9, 45, 46) order by day$$,
    $$values (3, 2), (3, 1), (3, 1), (3, 0)$$,
    'the curve counts each still coming back on that day or later');
select results_eq(
    $$select invited_due, invited_back from admin_return_curve('2020-01-01', '2020-01-02', 60)
      where day = 45$$,
    $$values (1, 1)$$,
    'and the invited on their own');
select is(
    (select count(*)::int from admin_return_curve('2020-01-01', '2020-01-02', 60)), 60,
    'a row for every day asked for');

-- Someone who joined today isn't a day along yet: not counted as gone.
update public.profiles set created_at = now()
where id = 'd3000000-0000-4000-8000-000000000003';
select is(
    (select due from admin_return_curve(
        (now() at time zone 'utc')::date, (now() at time zone 'utc')::date, 1)), 0,
    'a day not yet over for anyone counts no one');

select ok(not has_function_privilege('authenticated',
    'public.admin_staying(date, date)', 'execute'),
    'members cannot read it');
select ok(not has_function_privilege('authenticated',
    'public.admin_return_curve(date, date, int)', 'execute'),
    'nor the curve');

select * from finish();
rollback;
