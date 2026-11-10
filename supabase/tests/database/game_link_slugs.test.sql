-- Each game's copy of its genre and platform slugs, which the library
-- filters on, follows the link tables whatever writes them.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(13);

insert into public.genres (slug, name)
values ('slugs-moba', 'Slugs MOBA'), ('slugs-arcade', 'Slugs Arcade')
on conflict do nothing;
insert into public.platforms (slug, display_name)
values ('slugs-box', 'Slugs Box'), ('slugs-station', 'Slugs Station')
on conflict do nothing;
insert into public.games (slug, title) values ('slugs-game', 'Slugs Game');

insert into public.game_genres (game_id, genre_slug)
select id, g from public.games, unnest(array['slugs-moba', 'slugs-arcade']) g
where slug = 'slugs-game';
select is(
    (select genre_slugs from public.games where slug = 'slugs-game'),
    array['slugs-arcade', 'slugs-moba'],
    'adding genres copies them onto the game, in order');

insert into public.game_platforms (game_id, platform_slug)
select id, 'slugs-box' from public.games where slug = 'slugs-game';
select is(
    (select platform_slugs from public.games where slug = 'slugs-game'),
    array['slugs-box'],
    'adding a platform copies it onto the game');

delete from public.game_genres
where genre_slug = 'slugs-moba'
  and game_id = (select id from public.games where slug = 'slugs-game');
select is(
    (select genre_slugs from public.games where slug = 'slugs-game'),
    array['slugs-arcade'],
    'removing a genre takes it off the game');

update public.game_platforms set platform_slug = 'slugs-station'
where game_id = (select id from public.games where slug = 'slugs-game');
select is(
    (select platform_slugs from public.games where slug = 'slugs-game'),
    array['slugs-station'],
    'changing a link changes the copy');

delete from public.game_platforms
where game_id = (select id from public.games where slug = 'slugs-game');
select is(
    (select platform_slugs from public.games where slug = 'slugs-game'),
    '{}'::text[],
    'a game with no platforms left has none');

select ok(
    not has_function_privilege('authenticated', 'public.games_sync_link_slugs()', 'execute'),
    'the sync is not callable from the browser');

-- The library's totals for a genre or platform.
insert into public.games (slug, title, has_sexual_content, release_date)
values ('slugs-adult', 'Slugs Adult', true, '2020-01-01'),
       ('slugs-soon', 'Slugs Soon', false, '2999-01-01');
insert into public.game_genres (game_id, genre_slug)
select id, 'slugs-moba' from public.games where slug in ('slugs-adult', 'slugs-soon');
insert into public.game_platforms (game_id, platform_slug)
select id, 'slugs-box' from public.games where slug in ('slugs-game', 'slugs-soon');

select is(
    public.count_linked_games('slugs-moba', null, false),
    1::bigint,
    'counts a genre, leaving out explicit games for someone who has them off');
select is(
    public.count_linked_games('slugs-moba', null, true),
    2::bigint,
    'counts them for someone who has them on');
select is(
    public.count_linked_games('slugs-moba', 'slugs-box', false),
    1::bigint,
    'counts games in both a genre and on a platform');
select is(
    public.count_linked_games(null, 'slugs-box', false, current_date),
    0::bigint,
    'counts only released games when asked to');
select is(
    public.count_linked_games(null, 'slugs-box', false, null, current_date),
    1::bigint,
    'counts only upcoming games when asked to');
select is(
    public.count_linked_games('it''s', null, true),
    0::bigint,
    'takes a quote in a slug as text, not as SQL');
select ok(
    not has_function_privilege('authenticated',
        'public.count_linked_games(text, text, boolean, date, date)', 'execute'),
    'the count is not callable from the browser');

select * from finish();
rollback;
