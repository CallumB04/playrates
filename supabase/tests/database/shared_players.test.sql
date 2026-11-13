-- People who play what you play: games logged in common, public profiles
-- only, friends and adult games left out.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
    ('a7200000-0000-4000-8000-000000000001', 'sp1@test.test', '{"username":"sp_me"}'),
    ('a7300000-0000-4000-8000-000000000002', 'sp2@test.test', '{"username":"sp_open"}'),
    ('a7400000-0000-4000-8000-000000000003', 'sp3@test.test', '{"username":"sp_closed"}'),
    ('a7500000-0000-4000-8000-000000000004', 'sp4@test.test', '{"username":"sp_adult"}');
update profiles set profile_visibility = 'private'
where id = 'a7400000-0000-4000-8000-000000000003';

insert into games (slug, title, has_sexual_content) values
    ('sp-one', 'SP One', false),
    ('sp-two', 'SP Two', false),
    ('sp-adult', 'SP Adult', true);

-- Me: both plain games and the adult one. Open: both plain. Closed: one.
-- Adult: only the adult game.
insert into game_logs (user_id, game_id, status)
select u, g.id, 'played'
from (values
    ('a7200000-0000-4000-8000-000000000001'::uuid, 'sp-one'),
    ('a7200000-0000-4000-8000-000000000001'::uuid, 'sp-two'),
    ('a7200000-0000-4000-8000-000000000001'::uuid, 'sp-adult'),
    ('a7300000-0000-4000-8000-000000000002'::uuid, 'sp-one'),
    ('a7300000-0000-4000-8000-000000000002'::uuid, 'sp-two'),
    ('a7400000-0000-4000-8000-000000000003'::uuid, 'sp-one'),
    ('a7500000-0000-4000-8000-000000000004'::uuid, 'sp-adult')
) v (u, slug)
join games g on g.slug = v.slug;

select is(
    (select array_agg(id)
     from shared_players('a7200000-0000-4000-8000-000000000001')),
    array['a7300000-0000-4000-8000-000000000002'::uuid],
    'finds a public profile with games in common, and no one else');

select is(
    (select shared from shared_players('a7200000-0000-4000-8000-000000000001')
     where id = 'a7300000-0000-4000-8000-000000000002'),
    2,
    'counts the games in common');

select is(
    (select count(*)::int from shared_players('a7200000-0000-4000-8000-000000000001')
     where id = 'a7500000-0000-4000-8000-000000000004'),
    0,
    'an adult game is no common ground');

insert into friendships (user_a_id, user_b_id, requested_by, status)
values ('a7200000-0000-4000-8000-000000000001', 'a7300000-0000-4000-8000-000000000002',
        'a7200000-0000-4000-8000-000000000001', 'accepted');

select is(
    (select count(*)::int from shared_players('a7200000-0000-4000-8000-000000000001')),
    0,
    'leaves out friends, found already');

select * from finish();
rollback;
