-- When a game was actually played, as opposed to when its row was last
-- written. "Recently played" sorted on updated_at, which moves every time a
-- rating or a note is edited — correcting a typo on a 2019 log pushed it to
-- the top of the shelf.
--
-- greatest() ignores nulls, so a log with only a start date still sorts by it,
-- and only a log with neither comes back null.
alter table public.game_logs
    add column last_played date generated always as (
        greatest(start_date, finish_date)
    ) stored;

create index game_logs_user_last_played_idx
    on public.game_logs (user_id, last_played desc nulls last);
