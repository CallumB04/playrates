-- Hype belongs to a backlog log, 1 to 5, and the backlog shelf sorts each
-- game by its most hyped backlog log.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('a7000000-0000-4000-8000-000000000001', 'h@test.test', '{"username":"hype_a"}');
insert into public.games (slug, title)
values ('hype-one', 'Hype One'), ('hype-two', 'Hype Two'), ('hype-played', 'Hype Played');

-- One game on two consoles, on the backlog on both.
insert into public.game_logs (user_id, game_id, status, hype, system_slug)
select 'a7000000-0000-4000-8000-000000000001', id, 'backlog', v.hype, v.system
from public.games, (values (2, 'android'), (5, 'atari-2600')) v (hype, system)
where slug = 'hype-two';
insert into public.game_logs (user_id, game_id, status, hype)
select 'a7000000-0000-4000-8000-000000000001', id, 'backlog', 3
from public.games where slug = 'hype-one';
insert into public.game_logs (user_id, game_id, status)
select 'a7000000-0000-4000-8000-000000000001', id, 'played'
from public.games where slug = 'hype-played';

select is(
    (select r.hype from game_log_rollups r join games g on g.id = r.game_id
     where g.slug = 'hype-two'),
    5::smallint,
    'a game on two consoles goes by its most hyped');

select is(
    (select r.hype from game_log_rollups r join games g on g.id = r.game_id
     where g.slug = 'hype-played'),
    null,
    'a game off the backlog has no hype to sort by');

select throws_ok(
    $$update game_logs set hype = 4
      where game_id = (select id from games where slug = 'hype-played')$$,
    '23514', null,
    'only a backlog log can be hyped');

select throws_ok(
    $$update game_logs set hype = 6
      where game_id = (select id from games where slug = 'hype-one')$$,
    '23514', null,
    'hype stops at five flames');

select throws_ok(
    $$update game_logs set status = 'playing'
      where game_id = (select id from games where slug = 'hype-one')$$,
    '23514', null,
    'a log moving on keeps no hype behind');

select * from finish();
rollback;
