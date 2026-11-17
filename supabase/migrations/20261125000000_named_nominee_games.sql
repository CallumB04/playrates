-- A named nominee can carry the game it's there for: a mod and the game it
-- runs in, a team and the game it plays. Two teams can play the same game, so
-- only an unnamed nominee, the game itself, stays once to a category.

set search_path = pg_catalog, public;

create unique index if not exists award_nominees_one_unnamed_game
    on public.award_nominees (category_id, game_id)
    where game_id is not null and label is null;

drop index if exists public.award_nominees_one_game;
