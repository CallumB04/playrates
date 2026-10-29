-- A profile can wear a picture from a game its owner has logged, across the
-- top of the page where the colour band is otherwise.
--
-- The pictures on offer are a game's screenshots and artworks. They are
-- fetched from IGDB the first time anyone asks for them and kept here, so
-- only games somebody chose from cost a column's worth: null is "not asked
-- yet", an empty array is "IGDB has none".

set search_path = pg_catalog, public;

alter table public.games add column backdrops jsonb;

alter table public.games add constraint games_backdrops_is_array
    check (backdrops is null or jsonb_typeof(backdrops) = 'array');

-- The picture itself, and the game it came from. Left in place if the game
-- goes, since the picture is still the one its owner chose.
alter table public.profiles
    add column background_url text,
    add column background_game_id bigint
        references public.games (id) on delete set null;

-- For the foreign key's on delete, which otherwise scans every profile.
create index profiles_background_game_id_idx
    on public.profiles (background_game_id)
    where background_game_id is not null;
