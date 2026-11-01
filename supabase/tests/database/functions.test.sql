-- The functions changed for speed answer as before, and none is open to
-- the browser roles.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
values ('b1000000-0000-4000-8000-000000000001', 'c@test.test', '{"username":"search_a"}');
insert into public.games (slug, title, has_sexual_content)
values ('fn-safe', 'Lighthouse Keeper', false),
       ('fn-adult', 'Lighthouse After Dark', true);
insert into public.community_threads (author_id, game_id, title, subject_kind)
select 'b1000000-0000-4000-8000-000000000001', id, 'Best route?', 'game'
from games where slug = 'fn-safe';

-- The sitemap: family-safe games only.
select ok(
    (select bool_and((e ->> 0)::bigint <> (select id from games where slug = 'fn-adult'))
     from jsonb_array_elements(public.sitemap_games(0, 100000)) e),
    'the sitemap leaves adult games out');
select ok(
    exists (select 1 from jsonb_array_elements(public.sitemap_games(0, 100000)) e
            where (e ->> 0)::bigint = (select id from games where slug = 'fn-safe')),
    'and lists the rest');

-- Community search, by thread title and by the game's title.
select is((select count(*) from public.community_thread_search('best route'))::int, 1,
    'finds a thread by its title');
select is((select count(*) from public.community_thread_search('lighthouse keep'))::int, 1,
    'finds a thread by its game');
select is((select count(*) from public.community_thread_search('100%'))::int, 0,
    'a typed % is looked for, not a wildcard');

-- Pruning takes old errors only.
insert into public.server_errors (status, code, method, path, message, created_at)
values (500, 'internal_error', 'GET', '/old', 'old', now() - interval '100 days'),
       (500, 'internal_error', 'GET', '/new', 'new', now());
select public.prune_old_rows();
select results_eq($$select path from server_errors where path in ('/old', '/new')$$,
    $$values ('/new')$$, 'pruning keeps the recent error');

select ok(not has_function_privilege('anon', 'public.prune_old_rows(int)', 'execute'),
    'anon cannot prune');
select ok(not has_function_privilege('authenticated',
    'public.activity_from_game_lists()', 'execute'),
    'the activity triggers are not RPCs');

select * from finish();
rollback;
