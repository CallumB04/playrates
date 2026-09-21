-- Ratings move from quarter points to half points.
--
-- Forty stops on a 0-10 control was more precision than anyone actually has an
-- opinion about, and it made the rating input hard to read: the gap between
-- 8.25 and 8.5 is not a judgement most people are making. Twenty stops is.
--
-- Existing quarter-point ratings round to the nearest half, away from zero, so
-- 8.25 becomes 8.5 and 8.75 becomes 9.0. numeric round() already rounds half
-- away from zero, so no tie-breaking is needed on top of it.

set search_path = pg_catalog, public;

-- Drop first: the update below would violate the old constraint on the way
-- through if any row were evaluated mid-statement.
alter table public.game_logs
    drop constraint game_logs_rating;

update public.game_logs
set rating = round(rating * 2) / 2
where rating is not null
  and mod(rating * 100, 50) <> 0;

alter table public.game_logs
    add constraint game_logs_rating check (
        rating is null
        or (rating >= 0 and rating <= 10 and mod(rating * 100, 50) = 0)
    );
