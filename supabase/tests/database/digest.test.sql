-- The weekly digest shows a friend's logs only where their profile lets
-- friends see it, and an adult game only to whoever chose to see them.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data)
values ('d1000000-0000-4000-8000-000000000001', 'd1@test.test', '{"username":"digest_me"}'),
       ('d2000000-0000-4000-8000-000000000002', 'd2@test.test', '{"username":"digest_open"}'),
       ('d3000000-0000-4000-8000-000000000003', 'd3@test.test', '{"username":"digest_shut"}');
insert into public.games (slug, title, has_sexual_content, release_date, cover_url)
values ('digest-plain', 'Digest Plain', false, null, 'https://images.igdb.com/igdb/image/upload/t_cover_big/plain.jpg'),
       ('digest-adult', 'Digest Adult', true, null, null),
       ('digest-soon', 'Digest Soon', false, current_date + 3, 'https://images.igdb.com/igdb/image/upload/t_cover_big/soon.jpg');

insert into public.friendships (user_a_id, user_b_id, status, requested_by)
values ('d1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'accepted', 'd1000000-0000-4000-8000-000000000001'),
       ('d1000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000003', 'accepted', 'd1000000-0000-4000-8000-000000000001');
update public.profiles set profile_visibility = 'private'
where id = 'd3000000-0000-4000-8000-000000000003';

insert into public.game_logs (user_id, game_id, status)
select 'd2000000-0000-4000-8000-000000000002', id, 'played'
from public.games where slug in ('digest-plain', 'digest-adult');
insert into public.game_logs (user_id, game_id, status)
select 'd3000000-0000-4000-8000-000000000003', id, 'played'
from public.games where slug = 'digest-plain';
insert into public.game_logs (user_id, game_id, status)
select 'd1000000-0000-4000-8000-000000000001', id, 'wishlist'
from public.games where slug = 'digest-soon';

create temp table seen as
select * from weekly_digest(now() - interval '7 days', current_date + 1, current_date + 7)
where user_id = 'd1000000-0000-4000-8000-000000000001';

select results_eq(
    $$select item ->> 'username' = (select username::text from profiles
                                    where id = 'd2000000-0000-4000-8000-000000000002'),
             item ->> 'title'
      from seen, jsonb_array_elements(friends) item$$,
    $$values (true, 'Digest Plain')$$,
    'a private friend and an adult game stay out');
select is((select jsonb_array_length(releases) from seen), 1,
    'a wishlisted game out this week is in');
select is((select logged from seen), 0, 'a wishlist add is not a logged game');
select is(
    (select item ->> 'coverUrl' from seen, jsonb_array_elements(friends) item),
    'https://images.igdb.com/igdb/image/upload/t_cover_big/plain.jpg',
    'a friend''s game comes with its cover');
select ok(
    (select releases -> 0 ->> 'coverUrl' from seen) like '%soon.jpg'
        and (select bool_and(item ? 'avatarUrl') from seen, jsonb_array_elements(friends) item),
    'a release comes with its cover, and a friend with their picture');

update public.profiles set show_sexual_content = true
where id = 'd1000000-0000-4000-8000-000000000001';
select is(
    (select jsonb_array_length(friends) from weekly_digest(now() - interval '7 days', current_date + 1, current_date + 7)
     where user_id = 'd1000000-0000-4000-8000-000000000001'),
    2, 'an adult game shows to whoever chose to see them');

select ok(not has_function_privilege('authenticated',
    'public.weekly_digest(timestamptz, date, date)', 'execute'),
    'members cannot read anyone''s digest');

select * from finish();
rollback;
