-- A review of any length is a review: one word pays its XP and counts
-- towards the badges and the setup step.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data)
values ('a7100000-0000-4000-8000-000000000001', 'r@test.test', '{"username":"short_review"}');
insert into public.games (slug, title) values ('short-review', 'Short Review');
insert into public.game_logs (user_id, game_id, status)
select 'a7100000-0000-4000-8000-000000000001', id, 'played'
from public.games where slug = 'short-review';
insert into public.reviews (user_id, game_id, log_id, body)
select l.user_id, l.game_id, l.id, 'good'
from public.game_logs l
where l.user_id = 'a7100000-0000-4000-8000-000000000001';

select ok(
    (select xp > 0 from xp_events
     where user_id = 'a7100000-0000-4000-8000-000000000001'
       and key like 'review:%'),
    'a one-word review pays');

select is(
    (player_metrics('a7100000-0000-4000-8000-000000000001') ->> 'reviews')::int,
    1,
    'and counts as a review');

delete from public.reviews
where user_id = 'a7100000-0000-4000-8000-000000000001';

select is(
    (select xp from xp_events
     where user_id = 'a7100000-0000-4000-8000-000000000001'
       and key like 'review:%'),
    0,
    'taking it down takes its XP back');

select * from finish();
rollback;
