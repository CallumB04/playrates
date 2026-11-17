-- Awards nights: a pick names one of its own category's nominees, the crowd's
-- counts add up, and none of it is reachable from the browser.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(22);

insert into auth.users (id, email, raw_user_meta_data)
values ('e1000000-0000-4000-8000-000000000001', 'e1@test.test', '{"username":"event_one"}'),
       ('e2000000-0000-4000-8000-000000000002', 'e2@test.test', '{"username":"event_two"}');

insert into public.games (slug, title)
values ('event-game-a', 'Event Game A'), ('event-game-b', 'Event Game B');

insert into public.events (slug, kind, name, starts_at)
values ('test-awards', 'awards', 'Test Awards', now() + interval '7 days');
insert into public.award_shows (event_id, picks_close_at)
select id, now() + interval '7 days' from public.events where slug = 'test-awards';

insert into public.award_categories (event_id, slug, name, headline)
select id, 'goty', 'Game of the Year', true from public.events where slug = 'test-awards'
union all
select id, 'score', 'Best Score', false from public.events where slug = 'test-awards';

insert into public.award_nominees (category_id, game_id, position)
select c.id, g.id, 0
from public.award_categories c, public.games g
where c.slug = 'goty' and g.slug in ('event-game-a', 'event-game-b');

insert into public.award_nominees (category_id, label, detail)
select id, 'A Composer', 'Event Game A' from public.award_categories where slug = 'score';

select throws_ok(
    $$insert into public.award_nominees (category_id)
      select id from public.award_categories where slug = 'score'$$,
    '23514',
    null,
    'a nominee needs a game or a name');

select throws_ok(
    $$insert into public.award_nominees (category_id, game_id)
      select c.id, g.id from public.award_categories c, public.games g
      where c.slug = 'goty' and g.slug = 'event-game-a'$$,
    '23505',
    null,
    'the same game can''t be nominated twice in one category');

insert into public.award_picks (user_id, category_id, nominee_id)
select 'e1000000-0000-4000-8000-000000000001', n.category_id, n.id
from public.award_nominees n join public.games g on g.id = n.game_id
where g.slug = 'event-game-a';

insert into public.award_picks (user_id, category_id, nominee_id)
select 'e2000000-0000-4000-8000-000000000002', n.category_id, n.id
from public.award_nominees n join public.games g on g.id = n.game_id
where g.slug = 'event-game-a';

select is(
    (select count(*)::int from public.award_picks
     where user_id in ('e1000000-0000-4000-8000-000000000001',
                       'e2000000-0000-4000-8000-000000000002')),
    2,
    'two members can pick the same nominee');

select throws_ok(
    $$insert into public.award_picks (user_id, category_id, nominee_id)
      select 'e1000000-0000-4000-8000-000000000001', s.id, n.id
      from public.award_categories s, public.award_nominees n
      join public.games g on g.id = n.game_id
      where s.slug = 'score' and g.slug = 'event-game-b'$$,
    '23503',
    null,
    'a pick can''t point at another category''s nominee');

select throws_ok(
    $$insert into public.award_picks (user_id, category_id, nominee_id)
      select 'e1000000-0000-4000-8000-000000000001', n.category_id, n.id
      from public.award_nominees n join public.games g on g.id = n.game_id
      where g.slug = 'event-game-b'$$,
    '23505',
    null,
    'one pick per member per category');

select is(
    (select picks from public.award_pick_counts(
        (select id from public.events where slug = 'test-awards')) c
     join public.award_nominees n on n.id = c.nominee_id
     join public.games g on g.id = n.game_id
     where g.slug = 'event-game-a'),
    2,
    'the counts add up each nominee''s picks');

select is(
    (select count(*)::int from public.award_pick_counts(
        (select id from public.events where slug = 'test-awards'))),
    1,
    'a nominee nobody picked isn''t listed');

delete from auth.users where id = 'e2000000-0000-4000-8000-000000000002';
select is(
    (select count(*)::int from public.award_picks
     where user_id in ('e1000000-0000-4000-8000-000000000001',
                       'e2000000-0000-4000-8000-000000000002')),
    1,
    'a deleted account takes its picks with it');

select ok(
    not has_function_privilege('authenticated', 'public.award_pick_counts(bigint)', 'execute'),
    'the counts are not callable from the browser');

select ok(
    not has_table_privilege('authenticated', 'public.award_picks', 'select'),
    'picks are not readable from the browser');

select ok(
    not has_table_privilege('anon', 'public.events', 'select'),
    'events are not readable from the browser');

select throws_ok(
    $$insert into public.events (slug, kind, name, starts_at)
      values ('a-launch', 'launch', 'A Launch', now())$$,
    '23514',
    null,
    'an event is of a kind the site knows');

insert into public.events (slug, kind, name, starts_at)
values ('no-show-yet', 'awards', 'No Show Yet', now());
select throws_ok(
    $$insert into public.award_categories (event_id, slug, name)
      select id, 'x', 'X' from public.events where slug = 'no-show-yet'$$,
    '23503',
    null,
    'a category needs its awards night set up first');

-- Results badges: mark Event Game A the winner of Game of the Year.
update public.award_nominees n set won = true
from public.games g where g.id = n.game_id and g.slug = 'event-game-a'
  and n.category_id = (select id from public.award_categories where slug = 'goty');
select public.refresh_award_result_badges((select id from public.events where slug = 'test-awards'));
select is(
    (select count(*)::int from public.event_badges
     where badge = 'called-it' and user_id = 'e1000000-0000-4000-8000-000000000001'),
    1,
    'calling the headline award earns its badge');
select is(
    (select count(*)::int from public.event_badges where badge = 'sharp-eye'
     and event_id = (select id from public.events where slug = 'test-awards')),
    0,
    'half the winners counts from three decided, not one');
update public.award_nominees set won = false
where category_id = (select id from public.award_categories where slug = 'goty');
select public.refresh_award_result_badges((select id from public.events where slug = 'test-awards'));
select is(
    (select count(*)::int from public.event_badges
     where event_id = (select id from public.events where slug = 'test-awards')),
    0,
    'a winner taken back takes its badges with it');
select is(
    (select earned from public.event_badge_counts(
        (select id from public.events where slug = 'test-awards'))),
    null,
    'nobody has a badge to count');

-- A showcase: its reveals, and hype for them.
insert into public.events (slug, kind, name, starts_at)
values ('test-showcase', 'showcase', 'Test Showcase', now());
insert into public.showcase_events (event_id)
select id from public.events where slug = 'test-showcase';
insert into public.showcase_reveals (event_id, game_id, tag)
select e.id, g.id, 'premiere' from public.events e, public.games g
where e.slug = 'test-showcase' and g.slug = 'event-game-a';
insert into public.showcase_hype (user_id, reveal_id)
select 'e1000000-0000-4000-8000-000000000001', id from public.showcase_reveals;

select is(
    (select hype from public.showcase_hype_counts(
        (select id from public.events where slug = 'test-showcase'))),
    1,
    'hype is counted per reveal');

select throws_ok(
    $$insert into public.showcase_reveals (event_id, label, tag)
      select id, 'Something', 'rumour' from public.events where slug = 'test-showcase'$$,
    '23514',
    null,
    'a reveal is one of the kinds the site knows');

select throws_ok(
    $$insert into public.showcase_reveals (event_id, label, tag)
      select id, 'Something', 'premiere' from public.events where slug = 'test-awards'$$,
    '23503',
    null,
    'a reveal belongs to a showcase, not an awards night');

select ok(
    not has_function_privilege('authenticated', 'public.refresh_award_result_badges(bigint)', 'execute')
    and not has_function_privilege('authenticated', 'public.showcase_hype_counts(bigint)', 'execute')
    and not has_function_privilege('authenticated', 'public.event_badge_counts(bigint)', 'execute'),
    'none of the event functions is callable from the browser');

select ok(
    not has_table_privilege('authenticated', 'public.event_badges', 'select')
    and not has_table_privilege('authenticated', 'public.showcase_hype', 'select'),
    'badges and hype are not readable from the browser');

select * from finish();
rollback;
