-- The site's leaderboard: everyone with XP, the top few and then the
-- viewer's stretch. Whose names show is the API's call, not this one's.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data)
values ('b1000000-0000-4000-8000-000000000001', 'b1@test.test', '{"username":"board_one"}'),
       ('b2000000-0000-4000-8000-000000000002', 'b2@test.test', '{"username":"board_two"}'),
       ('b3000000-0000-4000-8000-000000000003', 'b3@test.test', '{"username":"board_private"}'),
       ('b4000000-0000-4000-8000-000000000004', 'b4@test.test', '{"username":"board_viewer"}');
update public.profiles set profile_visibility = 'everyone'
where id in ('b1000000-0000-4000-8000-000000000001',
             'b2000000-0000-4000-8000-000000000002');
update public.profiles set profile_visibility = 'private'
where id in ('b3000000-0000-4000-8000-000000000003',
             'b4000000-0000-4000-8000-000000000004');

-- Earned now: since the transaction began, so no seeded member's XP counts.
insert into public.xp_events (user_id, source, key, xp)
values ('b1000000-0000-4000-8000-000000000001', 'rate', 'board:1', 300),
       ('b2000000-0000-4000-8000-000000000002', 'rate', 'board:2', 100),
       ('b3000000-0000-4000-8000-000000000003', 'rate', 'board:3', 900);

select results_eq(
    $$select user_id, xp from site_leaderboard(now(), null, 5, 2)$$,
    $$values ('b3000000-0000-4000-8000-000000000003'::uuid, 900::bigint),
             ('b1000000-0000-4000-8000-000000000001'::uuid, 300::bigint),
             ('b2000000-0000-4000-8000-000000000002'::uuid, 100::bigint)$$,
    'everyone by what they earned, a private profile in its place');

select is(
    (select rank from site_leaderboard(now(), 'b3000000-0000-4000-8000-000000000003', 5, 2)
     where user_id = 'b3000000-0000-4000-8000-000000000003'),
    1::bigint,
    'a private profile still sees its own place');

select is(
    (select rank from site_leaderboard(now(), 'b4000000-0000-4000-8000-000000000004', 5, 2)
     where user_id = 'b4000000-0000-4000-8000-000000000004'),
    4::bigint,
    'a viewer who earned nothing stands at the foot');

select results_eq(
    $$select rank from site_leaderboard(now(), 'b4000000-0000-4000-8000-000000000004', 1, 0)$$,
    $$values (1::bigint), (4::bigint)$$,
    'the top, then only the viewer''s stretch');

select is(
    (select count(*) from site_leaderboard(now(), null, 5, 2)
     where xp = 0),
    0::bigint,
    'nobody who earned nothing is ranked for a visitor');

select is(
    (select distinct total from site_leaderboard(now(), 'b4000000-0000-4000-8000-000000000004', 5, 2)),
    3::bigint,
    'only those who earned something count as players');

select ok(
    not has_function_privilege('authenticated',
        'public.site_leaderboard(timestamptz, uuid, int, int)', 'execute'),
    'a browser can''t call it: only the API ranks');

select * from finish();
rollback;
