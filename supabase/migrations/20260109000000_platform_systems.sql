-- Platforms at two levels.
--
-- `platforms` stays the family — what the marks under a cover show and what
-- the library filters by. It was missing most of what RAWG actually returns:
-- Mac, Linux, Web and every retro maker were dropped on import, and all of
-- Nintendo collapsed into `nintendo-switch`, so NES titles claimed to be
-- Switch games.
--
-- `platform_systems` is the individual machine, which is what someone wants
-- when recording what they played on. RAWG's listing response already carries
-- these alongside the parent platforms, so the finer data costs no extra
-- requests.

-- The PC families are storefronts rather than machines, and stay as they are:
-- which of them a game belongs to depends on its stores, not its platforms.
insert into public.platforms (slug, display_name, sort_order) values
    ('nintendo',        'Nintendo',            70),
    ('mac',             'Mac',                 90),
    ('linux',           'Linux',              100),
    ('web',             'Browser',            110),
    ('sega',            'SEGA',               120),
    ('atari',           'Atari',              130),
    ('commodore-amiga', 'Commodore / Amiga',  140),
    ('neo-geo',         'Neo Geo',            150),
    ('3do',             '3DO',                160)
on conflict (slug) do nothing;

-- Regroup the originals around them: the PC storefronts first, then consoles
-- by how likely someone is to be logging one.
update public.platforms set sort_order = 10 where slug = 'steam';
update public.platforms set sort_order = 20 where slug = 'pc-game-pass';
update public.platforms set sort_order = 30 where slug = 'other-pc';
update public.platforms set sort_order = 40 where slug = 'playstation';
update public.platforms set sort_order = 50 where slug = 'xbox';
update public.platforms set sort_order = 60 where slug = 'nintendo-switch';
update public.platforms set sort_order = 80 where slug = 'mobile';

-- "Playstation" everywhere else in the world is "PlayStation".
update public.platforms set display_name = 'PlayStation' where slug = 'playstation';

create table public.platform_systems (
    slug text primary key,
    display_name text not null,
    platform_slug text not null references public.platforms (slug) on delete restrict,
    sort_order int not null default 100,

    constraint platform_systems_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create index platform_systems_platform_idx
    on public.platform_systems (platform_slug);

-- Slugs match RAWG's own where there is one, so the mapper stays a lookup
-- rather than a translation. The three PC rows are the exception: a storefront
-- is both the family and the only "system" we can name from a RAWG payload.
insert into public.platform_systems (slug, display_name, platform_slug, sort_order) values
    ('steam',              'Steam',                'steam',            10),
    ('pc-game-pass',       'PC Game Pass',         'pc-game-pass',     10),
    ('other-pc',           'PC',                   'other-pc',         10),

    ('playstation5',       'PlayStation 5',        'playstation',      10),
    ('playstation4',       'PlayStation 4',        'playstation',      20),
    ('playstation3',       'PlayStation 3',        'playstation',      30),
    ('playstation2',       'PlayStation 2',        'playstation',      40),
    ('playstation1',       'PlayStation',          'playstation',      50),
    ('ps-vita',            'PS Vita',              'playstation',      60),
    ('psp',                'PSP',                  'playstation',      70),

    ('xbox-series-x',      'Xbox Series X|S',      'xbox',             10),
    ('xbox-one',           'Xbox One',             'xbox',             20),
    ('xbox360',            'Xbox 360',             'xbox',             30),
    ('xbox-old',           'Xbox',                 'xbox',             40),

    ('nintendo-switch',    'Nintendo Switch',      'nintendo-switch',  10),

    ('wii-u',              'Wii U',                'nintendo',         10),
    ('wii',                'Wii',                  'nintendo',         20),
    ('gamecube',           'GameCube',             'nintendo',         30),
    ('nintendo-64',        'Nintendo 64',          'nintendo',         40),
    ('snes',               'SNES',                 'nintendo',         50),
    ('nes',                'NES',                  'nintendo',         60),
    ('nintendo-3ds',       'Nintendo 3DS',         'nintendo',         70),
    ('nintendo-ds',        'Nintendo DS',          'nintendo',         80),
    ('nintendo-dsi',       'Nintendo DSi',         'nintendo',         90),
    ('game-boy-advance',   'Game Boy Advance',     'nintendo',        100),
    ('game-boy-color',     'Game Boy Color',       'nintendo',        110),
    ('game-boy',           'Game Boy',             'nintendo',        120),

    ('ios',                'iOS',                  'mobile',           10),
    ('android',            'Android',              'mobile',           20),

    ('macos',              'macOS',                'mac',              10),
    ('macintosh',          'Classic Mac OS',       'mac',              20),
    ('apple-ii',           'Apple II',             'mac',              30),

    ('linux',              'Linux',                'linux',            10),
    ('web',                'Browser',              'web',              10),

    ('dreamcast',          'Dreamcast',            'sega',             10),
    ('sega-saturn',        'Saturn',               'sega',             20),
    ('genesis',            'Genesis / Mega Drive', 'sega',             30),
    ('sega-cd',            'Sega CD',              'sega',             40),
    ('sega-32x',           'Sega 32X',             'sega',             50),
    ('sega-master-system', 'Master System',        'sega',             60),
    ('game-gear',          'Game Gear',            'sega',             70),

    ('jaguar',             'Atari Jaguar',         'atari',            10),
    ('atari-lynx',         'Atari Lynx',           'atari',            20),
    ('atari-7800',         'Atari 7800',           'atari',            30),
    ('atari-5200',         'Atari 5200',           'atari',            40),
    ('atari-2600',         'Atari 2600',           'atari',            50),
    ('atari-xegs',         'Atari XEGS',           'atari',            60),
    ('atari-st',           'Atari ST',             'atari',            70),
    ('atari-8-bit',        'Atari 8-bit',          'atari',            80),
    ('atari-flashback',    'Atari Flashback',      'atari',            90),

    ('commodore-amiga',    'Commodore / Amiga',    'commodore-amiga',  10),
    ('neogeo',             'Neo Geo',              'neo-geo',          10),
    ('3do',                '3DO',                  '3do',              10);

-- Alongside game_platforms rather than replacing it: the library filters and
-- the marks under a cover work in families, and deriving one from the other on
-- every read costs a join for no gain.
create table public.game_systems (
    game_id bigint not null references public.games (id) on delete cascade,
    system_slug text not null references public.platform_systems (slug) on delete restrict,

    primary key (game_id, system_slug)
);

create index game_systems_system_idx
    on public.game_systems (system_slug);

-- The exact machine, where the logger named one. platform_slug stays the
-- family and stays authoritative for stats and filters, so every existing view
-- and aggregate is untouched.
alter table public.game_logs
    add column system_slug text references public.platform_systems (slug) on delete set null;

-- Old logs against a family with exactly one system lose nothing by being
-- moved across. The rest (playstation, xbox, mobile) are genuinely ambiguous
-- and stay null rather than being guessed at.
update public.game_logs
set system_slug = platform_slug
where platform_slug in ('steam', 'pc-game-pass', 'other-pc', 'nintendo-switch');

alter table public.platform_systems enable row level security;
alter table public.game_systems enable row level security;

revoke all on public.platform_systems from anon, authenticated;
revoke all on public.game_systems from anon, authenticated;
