-- Six favourites rather than five: a row of six covers sits shorter on a
-- profile than five in the same width.

set search_path = pg_catalog, public;

alter table public.favourite_games
    drop constraint favourite_games_position_range;
alter table public.favourite_games
    add constraint favourite_games_position_range
        check (position between 0 and 5);
