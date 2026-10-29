-- Which part of a profile's background picture shows: the backdrop is far
-- wider than it is tall, so most of the picture is cropped away, and the
-- owner picks where. 0 is the top edge, 100 the bottom; null is the
-- default the app applies.

set search_path = pg_catalog, public;

alter table public.profiles
    add column background_position smallint
        constraint profiles_background_position_range
        check (background_position between 0 and 100);
