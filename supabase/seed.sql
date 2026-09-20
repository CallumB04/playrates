-- Local development fixtures only. `supabase db reset` runs this after the
-- migrations against the local stack; it never reaches a linked remote project.
--
-- Reference data like the platforms list is not here — that's in a migration,
-- because it has to exist everywhere. For a realistic catalogue use
-- `npm run seed:games -w backend`.

-- Two dev accounts. Password for both: password123
insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    -- GoTrue reads these into non-nullable Go strings, so leaving them NULL
    -- makes every sign-in fail with "Database error querying schema"
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
)
values
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'dev@playrates.test',
        extensions.crypt('password123', extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"username":"devuser"}'::jsonb,
        now(),
        now(),
        '', '', '', '', '', '', '', ''
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'friend@playrates.test',
        extensions.crypt('password123', extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"username":"friendlyuser"}'::jsonb,
        now(),
        now(),
        '', '', '', '', '', '', '', ''
    );

-- profiles rows are created by the on_auth_user_created trigger; fill in the
-- parts the trigger cannot know
update public.profiles
set bio = 'Local development account.'
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles
set bio = 'The other local account, for testing friend requests.'
where id = '22222222-2222-2222-2222-222222222222';

-- A handful of games so the library and home pages have something to render.
insert into public.games (
    rawg_id, slug, title, description, release_date, is_trending, playtime_hours
)
values
    (3328,  'the-witcher-3-wild-hunt', 'The Witcher 3: Wild Hunt',
     'An open world RPG following Geralt of Rivia.', '2015-05-18', true,  51.5),
    (4200,  'portal-2', 'Portal 2',
     'A first-person puzzle game about thinking with portals.', '2011-04-18', true, 8.5),
    (5286,  'tomb-raider', 'Tomb Raider',
     'Survival action adventure reboot of the series.', '2013-03-05', false, 12.0),
    (13536, 'portal', 'Portal',
     'The original puzzle game that started it all.', '2007-10-09', false, 3.0),
    (5679,  'the-elder-scrolls-v-skyrim', 'The Elder Scrolls V: Skyrim',
     'Open world fantasy RPG set in the province of Skyrim.', '2011-11-11', true, 34.0),
    (28,    'red-dead-redemption-2', 'Red Dead Redemption 2',
     'An epic tale of life in America at the dawn of the modern age.', '2018-10-26', false, 49.0);

insert into public.game_platforms (game_id, platform_slug)
select g.id, p.slug
from public.games g
cross join (values ('steam'), ('playstation'), ('xbox')) as p (slug)
where g.rawg_id in (3328, 4200, 5286, 13536, 5679, 28);

-- One logged game with a rating and a public review, so the profile and game
-- pages have populated states to look at.
insert into public.game_logs (
    user_id, game_id, status, played_status, rating, hours_played, platform_slug
)
select
    '11111111-1111-1111-1111-111111111111',
    id,
    'played',
    'finished',
    9.25,
    60.5,
    'steam'
from public.games where rawg_id = 3328;

insert into public.reviews (user_id, game_id, body, is_public)
select
    '11111111-1111-1111-1111-111111111111',
    id,
    'Still the benchmark for open world side quests.',
    true
from public.games where rawg_id = 3328;

-- An accepted friendship between the two dev accounts. Note the ordered pair:
-- user_a_id must sort before user_b_id.
insert into public.friendships (user_a_id, user_b_id, status, requested_by)
values (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'accepted',
    '11111111-1111-1111-1111-111111111111'
);

-- a couple of genres so the join table has something in it locally
insert into public.game_genres (game_id, genre_slug)
select g.id, 'action'
from public.games g
where g.rawg_id in (3328, 28, 5679);

insert into public.game_genres (game_id, genre_slug)
select g.id, 'puzzle'
from public.games g
where g.rawg_id in (4200, 13536);
