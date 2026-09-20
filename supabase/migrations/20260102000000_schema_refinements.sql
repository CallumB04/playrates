-- Field naming, presentation concerns, and the columns the bulk RAWG import
-- needs.
--
-- `raw` is dropped: a full RAWG payload is ~11 KB, so 100k games would exceed
-- the whole database allowance. Everything useful is extracted into columns
-- below — anything missed costs an API call to get back.

-- ---------------------------------------------------------------------------
-- Naming
-- ---------------------------------------------------------------------------

alter table public.profiles rename column picture_url to avatar_url;
alter table public.profiles rename constraint profiles_picture_url to profiles_avatar_url;

-- `popularity` held RAWG's ratings_count, which is not what the name suggests.
-- External figures are prefixed so they cannot be confused with a PlayRates
-- rating, which is a different scale and comes from our own users.
alter table public.games rename column popularity to rawg_rating_count;

-- game_logs.hours_to_beat is the user's own estimate; this column is RAWG's
-- average playtime. Same name, different meaning, so the game one is renamed.
alter table public.games rename column hours_to_beat to playtime_hours;
alter table public.games rename constraint games_hours_to_beat to games_playtime_hours;

-- ---------------------------------------------------------------------------
-- Presentation belongs in code
-- ---------------------------------------------------------------------------

-- Which icon represents a platform is a frontend decision, and tying it to a
-- specific icon library means changing library means writing a migration.
alter table public.platforms drop column icon_class;

-- ---------------------------------------------------------------------------
-- Columns the import fills
-- ---------------------------------------------------------------------------

alter table public.games drop column raw;

alter table public.games
    add column metacritic int,
    -- RAWG's own 0-5 community score, distinct from a PlayRates rating
    add column rawg_rating numeric(3, 2),
    -- how many RAWG users have added the game to a collection; the best
    -- available proxy for "does anyone actually play this", and what the
    -- import orders by
    add column rawg_added_count int,
    -- null until the description has been backfilled from the detail endpoint,
    -- which the list endpoint does not return
    add column description_synced_at timestamptz;

alter table public.games
    add constraint games_metacritic check (
        metacritic is null or metacritic between 0 and 100
    ),
    add constraint games_rawg_rating check (
        rawg_rating is null or rawg_rating between 0 and 5
    );

-- the import orders by this, and the library falls back to it for "popular"
create index games_added_count_idx
    on public.games (rawg_added_count desc nulls last);

-- finds games still missing a description, cheaply
create index games_needs_description_idx
    on public.games (rawg_added_count desc)
    where description_synced_at is null;

-- Genres. Extracted now because the list endpoint returns them for free, and
-- without `raw` recovering them later means re-fetching every game.

create table public.genres (
    slug text primary key,
    name text not null,

    constraint genres_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create table public.game_genres (
    game_id bigint not null references public.games (id) on delete cascade,
    genre_slug text not null references public.genres (slug) on delete cascade,

    primary key (game_id, genre_slug)
);

create index game_genres_genre_idx on public.game_genres (genre_slug);

-- RAWG's genre list is small and stable, so it is seeded rather than
-- discovered. The import inserts any it has not seen.
insert into public.genres (slug, name) values
    ('action', 'Action'),
    ('indie', 'Indie'),
    ('adventure', 'Adventure'),
    ('role-playing-games-rpg', 'RPG'),
    ('strategy', 'Strategy'),
    ('shooter', 'Shooter'),
    ('casual', 'Casual'),
    ('simulation', 'Simulation'),
    ('puzzle', 'Puzzle'),
    ('arcade', 'Arcade'),
    ('platformer', 'Platformer'),
    ('racing', 'Racing'),
    ('massively-multiplayer', 'Massively Multiplayer'),
    ('sports', 'Sports'),
    ('fighting', 'Fighting'),
    ('family', 'Family'),
    ('board-games', 'Board Games'),
    ('educational', 'Educational'),
    ('card', 'Card')
on conflict (slug) do nothing;

alter table public.genres enable row level security;
alter table public.game_genres enable row level security;

revoke all on public.genres from anon, authenticated;
revoke all on public.game_genres from anon, authenticated;
