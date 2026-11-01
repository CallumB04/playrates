-- A game's figures follow its logs: the count by one each way, the
-- ratings recounted per person, and the sitemap date moved only by a
-- change to the page.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
values ('a1000000-0000-4000-8000-000000000001', 'a@test.test', '{"username":"rollup_a"}'),
       ('a2000000-0000-4000-8000-000000000002', 'b@test.test', '{"username":"rollup_b"}');
insert into public.games (slug, title, updated_at)
values ('rollup-one', 'Rollup One', '2020-01-01'),
       ('rollup-two', 'Rollup Two', '2020-01-01');

insert into public.game_logs (user_id, game_id, status)
select 'a1000000-0000-4000-8000-000000000001', id, 'backlog'
from public.games where slug = 'rollup-one';

select is((select log_count from games where slug = 'rollup-one'), 1, 'a log adds one');
select is((select updated_at::date from games where slug = 'rollup-one'), '2020-01-01'::date,
    'a log alone leaves the sitemap date');

insert into public.game_logs (user_id, game_id, status, rating)
select 'a2000000-0000-4000-8000-000000000002', id, 'played', 8
from public.games where slug = 'rollup-one';
select results_eq(
    $$select log_count, rating_count, avg_rating from games where slug = 'rollup-one'$$,
    $$values (2, 1, 8.00::numeric)$$,
    'a rated log counts and rates');
select isnt((select updated_at::date from games where slug = 'rollup-one'), '2020-01-01'::date,
    'a new rating moves the sitemap date');

update public.game_logs set game_id = (select id from games where slug = 'rollup-two')
where user_id = 'a2000000-0000-4000-8000-000000000002';
select results_eq(
    $$select slug, log_count, rating_count from games where slug like 'rollup-%' order by slug$$,
    $$values ('rollup-one'::citext, 1, 0), ('rollup-two'::citext, 1, 1)$$,
    'moving a log moves its count and its rating');

delete from public.game_logs where user_id in (
    'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002');
select results_eq(
    $$select log_count, rating_count from games where slug like 'rollup-%' order by slug$$,
    $$values (0, 0), (0, 0)$$,
    'deleting the logs takes them back off');

-- The quiet flag is put back as it was, not switched off.
select set_config('playrates.quiet_update', 'on', true);
insert into public.game_logs (user_id, game_id, status)
select 'a1000000-0000-4000-8000-000000000001', id, 'backlog'
from public.games where slug = 'rollup-two';
select is(current_setting('playrates.quiet_update', true), 'on',
    'a caller''s own quiet update is left on');
select is((select log_count from games where slug = 'rollup-two'), 1, 'and still counted');

select * from finish();
rollback;
