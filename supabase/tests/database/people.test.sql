-- Taste matches and a game's fans: only profiles open to everyone, and
-- friends left out of matches.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('e1000000-0000-4000-8000-000000000001', 'e1@test.test', '{}'),
       ('e2000000-0000-4000-8000-000000000002', 'e2@test.test', '{}'),
       ('e3000000-0000-4000-8000-000000000003', 'e3@test.test', '{}'),
       ('e4000000-0000-4000-8000-000000000004', 'e4@test.test', '{}');
insert into public.games (slug, title)
select 'people-' || n, 'People ' || n from generate_series(1, 3) n;

-- Everyone rates the same three games alike; 3 is private, 4 a friend.
insert into public.game_logs (user_id, game_id, status, rating)
select u.id, g.id, 'played', 9
from (values ('e1000000-0000-4000-8000-000000000001'::uuid),
             ('e2000000-0000-4000-8000-000000000002'),
             ('e3000000-0000-4000-8000-000000000003'),
             ('e4000000-0000-4000-8000-000000000004')) u(id),
     public.games g
where g.slug like 'people-%';
update public.profiles set profile_visibility = 'private'
where id = 'e3000000-0000-4000-8000-000000000003';
insert into public.friendships (user_a_id, user_b_id, status, requested_by)
values ('e1000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000004',
        'accepted', 'e1000000-0000-4000-8000-000000000001');

select results_eq(
    $$select id, shared, agreement
      from taste_matches('e1000000-0000-4000-8000-000000000001', 50)
      where id::text like 'e%'$$,
    $$values ('e2000000-0000-4000-8000-000000000002'::uuid, 3, 100)$$,
    'a match leaves out the private profile and the friend');

select results_eq(
    $$select id from game_fans((select id from games where slug = 'people-1'), 50)
      where id::text like 'e%' order by id$$,
    $$values ('e1000000-0000-4000-8000-000000000001'::uuid),
             ('e2000000-0000-4000-8000-000000000002'::uuid),
             ('e4000000-0000-4000-8000-000000000004'::uuid)$$,
    'fans leave out the private profile');

update public.game_logs set rating = 7
where user_id = 'e2000000-0000-4000-8000-000000000002';
select is(
    (select count(*)::int from game_fans((select id from games where slug = 'people-1'), 50)
     where id = 'e2000000-0000-4000-8000-000000000002'),
    0, 'a 7 is not rated highly');

select ok(not has_function_privilege('authenticated', 'public.taste_matches(uuid, int)', 'execute'),
    'members cannot ask for anyone''s matches directly');
select ok(not has_table_privilege('anon', 'public.member_ratings', 'select'),
    'the ratings view is not open');

select * from finish();
rollback;
