-- Average achievement completion, rather than the share of players at 100%.
--
-- "How many people got everything" answers a narrower question than most
-- people are asking: on a game with three hundred achievements the figure is
-- near zero however far a typical player actually gets. The mean tells you
-- what completion normally looks like.
--
-- Clamped to 1 per log before averaging. achievements_completed is a
-- user-entered number with no constraint tying it to achievements_total, so a
-- single fat-fingered row could otherwise push the average above 100%.

set search_path = pg_catalog, public;

-- The OUT parameters change, so this is a different row type and Postgres
-- will not let `create or replace` through.
drop function if exists public.game_playrates_stats(bigint);

create function public.game_playrates_stats(p_game_id bigint)
returns table (
    avg_hours_played numeric,
    avg_hours_to_beat numeric,
    avg_completion numeric,
    achievement_tracked_count int
)
language sql
stable
set search_path = pg_catalog, public
as $$
    select
        round(avg(hours_played) filter (where hours_played is not null), 1),
        round(avg(hours_to_beat) filter (where hours_to_beat is not null), 1),
        avg(
            least(
                coalesce(achievements_completed, 0)::numeric
                    / nullif(achievements_total, 0),
                1
            )
        ) filter (where achievements_total > 0),
        count(*) filter (where achievements_total > 0)::int
    from public.game_logs
    where game_id = p_game_id;
$$;

revoke execute on function public.game_playrates_stats(bigint)
    from anon, authenticated, public;
