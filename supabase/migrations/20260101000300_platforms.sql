-- Platforms a game can be played on.
--
-- This is reference data, not fixture data, so it belongs in a migration and
-- ships to every environment. It replaces the hardcoded `gamePlatforms` array
-- in the frontend and gives game_logs.platform_slug a real foreign key, which
-- closes the "platform is any string the client sends" hole.

create table public.platforms (
    slug text primary key,
    display_name text not null,
    icon_class text not null,
    sort_order int not null default 100,

    constraint platforms_slug_format check (slug ~ '^[a-z0-9-]+$')
);

insert into public.platforms (slug, display_name, icon_class, sort_order) values
    ('steam',           'Steam',           'fab fa-steam',         10),
    ('pc-game-pass',    'PC Game Pass',    'fab fa-xbox',          20),
    ('xbox',            'Xbox',            'fab fa-xbox',          30),
    ('playstation',     'Playstation',     'fab fa-playstation',   40),
    ('nintendo-switch', 'Nintendo Switch', 'fas fa-gamepad',       50),
    ('other-pc',        'Other PC',        'fas fa-desktop',       60),
    ('mobile',          'Mobile',          'fas fa-mobile-screen', 70);
