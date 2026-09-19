-- The games catalogue.
--
-- Games are sourced from RAWG and cached here, so the app never depends on
-- RAWG being up to render a page. `rawg_id` is nullable and unique: a
-- hand-added game has no upstream id, and Postgres allows multiple NULLs in a
-- unique index, so `on conflict (rawg_id)` upserts still work.

create table public.games (
    id bigint generated always as identity primary key,
    rawg_id bigint unique,
    slug extensions.citext not null unique,
    title text not null,
    description text not null default '',
    cover_url text,
    release_date date,
    is_adult boolean not null default false,
    -- was `trending`; still a local flag rather than anything RAWG provides
    is_trending boolean not null default false,
    popularity numeric(10, 4),
    hours_to_beat numeric(6, 1),
    -- untouched upstream payload, so columns can be re-derived without refetching
    raw jsonb,
    synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint games_title_len check (char_length(title) between 1 and 300),
    constraint games_cover_url check (
        cover_url is null or cover_url ~ '^https?://'
    ),
    constraint games_hours_to_beat check (
        hours_to_beat is null or hours_to_beat >= 0
    )
);

-- substring title search, matching the existing client-side filter semantics
create index games_title_trgm_idx
    on public.games using gin (title extensions.gin_trgm_ops);
create index games_trending_idx on public.games (is_trending) where is_trending;
create index games_release_idx on public.games (release_date desc nulls last);
-- nulls first so never-synced rows are picked up by the refresh job
create index games_synced_at_idx on public.games (synced_at nulls first);

create trigger games_set_updated_at
    before update on public.games
    for each row execute function public.set_updated_at();

-- Replaces `games.platforms text[]`. A join table means we can filter the
-- library by platform in SQL instead of downloading the whole catalogue.
create table public.game_platforms (
    game_id bigint not null references public.games (id) on delete cascade,
    platform_slug text not null references public.platforms (slug) on delete restrict,

    primary key (game_id, platform_slug)
);

create index game_platforms_platform_idx
    on public.game_platforms (platform_slug);
