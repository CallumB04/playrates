-- The played shelf's ending sort: mastered, finished, shelved, retired,
-- then played with no ending, each game by its best played log.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data)
values ('e1000000-0000-4000-8000-000000000001', 'e@test.test', '{"username":"ending_a"}');
insert into public.games (slug, title)
values ('ending-mastered', 'Ending Mastered'),
       ('ending-finished', 'Ending Finished'),
       ('ending-shelved', 'Ending Shelved'),
       ('ending-retired', 'Ending Retired'),
       ('ending-none', 'Ending None'),
       ('ending-two', 'Ending Two'),
       ('ending-backlog', 'Ending Backlog');

insert into public.game_logs (user_id, game_id, status, played_status)
select 'e1000000-0000-4000-8000-000000000001', g.id, 'played', v.ending
from (values ('ending-mastered', 'mastered'), ('ending-finished', 'finished'),
             ('ending-shelved', 'shelved'), ('ending-retired', 'retired'),
             ('ending-none', null)) v (slug, ending)
join public.games g on g.slug = v.slug;

-- One game on two consoles: retired on one, finished on the other.
insert into public.game_logs (user_id, game_id, status, played_status, system_slug)
select 'e1000000-0000-4000-8000-000000000001', id, 'played', v.ending, v.system
from public.games, (values ('retired', 'android'), ('finished', 'atari-2600')) v (ending, system)
where slug = 'ending-two';

insert into public.game_logs (user_id, game_id, status)
select 'e1000000-0000-4000-8000-000000000001', id, 'backlog'
from public.games where slug = 'ending-backlog';

select results_eq(
    $$select g.slug::text from game_log_rollups r join games g on g.id = r.game_id
      where r.user_id = 'e1000000-0000-4000-8000-000000000001'
        and r.ending_rank is not null and g.slug <> 'ending-two'
      order by r.ending_rank desc$$,
    $$values ('ending-mastered'), ('ending-finished'), ('ending-shelved'),
             ('ending-retired'), ('ending-none')$$,
    'endings rank mastered, finished, shelved, retired, then none');

select is(
    (select r.ending_rank from game_log_rollups r join games g on g.id = r.game_id
     where g.slug = 'ending-two'),
    3,
    'a game played on two consoles goes by its best ending');

select is(
    (select r.ending_rank from game_log_rollups r join games g on g.id = r.game_id
     where g.slug = 'ending-backlog'),
    null,
    'a game never played has no ending to rank');

select * from finish();
rollback;
