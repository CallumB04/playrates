-- The visibility setting covers the whole profile now, not just its games:
-- reviews, friends and threads too. Only the card with the name, picture and
-- bio stays public. Renamed to say so; friend_activity follows the rename.

set search_path = pg_catalog, public;

alter table public.profiles
    rename column games_visibility to profile_visibility;

alter table public.profiles
    rename constraint profiles_games_visibility_check
    to profiles_profile_visibility_check;
