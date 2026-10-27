-- A profile's About card and its favourite games.
--
-- The About fields each carry a visibility in about_visibility, keyed by
-- field: only the ones changed from the default are stored, and the API
-- applies the defaults. The checks hold what the API already validates, so
-- a value written some other way still cannot be a link to anywhere.

set search_path = pg_catalog, public;

alter table public.profiles
    add column pronouns text
        constraint profiles_pronouns_length check (char_length(pronouns) <= 30),
    add column location text
        constraint profiles_location_length check (char_length(location) <= 60),
    add column website text
        constraint profiles_website_is_web check (
            char_length(website) <= 200 and website ~* '^https?://'
        ),
    add column discord text
        constraint profiles_discord_username check (
            discord ~ '^[A-Za-z0-9_.]{2,32}(#[0-9]{4})?$'
        ),
    add column steam text
        constraint profiles_steam_is_steam check (
            steam ~ '^https://steamcommunity\.com/(id|profiles)/[A-Za-z0-9_-]+$'
        ),
    add column about_visibility jsonb not null default '{}'::jsonb
        constraint profiles_about_visibility_object check (
            jsonb_typeof(about_visibility) = 'object'
        );

-- Up to five, in the order their owner put them.
create table public.favourite_games (
    user_id uuid not null references public.profiles (id) on delete cascade,
    game_id bigint not null references public.games (id) on delete cascade,
    position smallint not null
        constraint favourite_games_position_range check (position between 0 and 4),
    created_at timestamptz not null default now(),
    primary key (user_id, position),
    constraint favourite_games_once unique (user_id, game_id)
);

create index favourite_games_game_id_idx on public.favourite_games (game_id);

alter table public.favourite_games enable row level security;
revoke all on public.favourite_games from anon, authenticated;

-- Replaces someone's favourites in one go, in the order given, so a save
-- that fails half way does not leave half a list.
create or replace function public.set_favourite_games(
    p_user_id uuid,
    p_game_ids bigint[]
)
returns void
language sql
set search_path = pg_catalog, public
as $$
    delete from public.favourite_games where user_id = p_user_id;
    insert into public.favourite_games (user_id, game_id, position)
    select p_user_id, game_id, (ordinality - 1)::smallint
    from unnest(p_game_ids) with ordinality as t (game_id, ordinality);
$$;

revoke execute on function public.set_favourite_games(uuid, bigint[])
    from anon, authenticated, public;
