-- Achievement completion as a column rather than a division at read time, so
-- a shelf can be ordered by it in SQL. Stored rather than computed per query:
-- the shelf is paginated, so the sort has to happen in the database.
--
-- Null where there is nothing to divide — a log with no achievements recorded
-- is not 0% complete, and sorting has to be able to tell those apart.
alter table public.game_logs
    add column completion numeric generated always as (
        case
            when achievements_total > 0
            then achievements_completed::numeric / achievements_total
        end
    ) stored;

-- The shelf always filters by user first, so the sort columns ride along
-- behind that rather than standing on their own.
create index game_logs_user_completion_idx
    on public.game_logs (user_id, completion desc nulls last);
create index game_logs_user_rating_idx
    on public.game_logs (user_id, rating desc nulls last);
