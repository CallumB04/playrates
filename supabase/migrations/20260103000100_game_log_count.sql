-- A real count of PlayRates logs per game.
--
-- The catalogue's "popular" sort has been ordering by rawg_added_count, which
-- is RAWG's added-to-collection figure rather than anything our users did — so
-- the UI had to call it "most tracked" to stay honest. This column is ours, so
-- the sort can mean what it says.
--
-- Maintained by a trigger rather than by the API. game_logs rows also
-- disappear through ON DELETE CASCADE when a profile or a game is deleted, and
-- the application never sees those; a row-level trigger does.

alter table public.games
    add column log_count int not null default 0;

create or replace function public.games_sync_log_count()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        update public.games
            set log_count = log_count + 1
            where id = new.game_id;
    elsif tg_op = 'DELETE' then
        update public.games
            set log_count = greatest(log_count - 1, 0)
            where id = old.game_id;
    elsif new.game_id is distinct from old.game_id then
        -- A log can't currently move between games, but the counter should
        -- not silently drift if that ever changes.
        update public.games
            set log_count = greatest(log_count - 1, 0)
            where id = old.game_id;
        update public.games
            set log_count = log_count + 1
            where id = new.game_id;
    end if;
    return null;
end;
$$;

create trigger game_logs_sync_log_count
    after insert or delete or update of game_id on public.game_logs
    for each row execute function public.games_sync_log_count();

-- One-shot backfill for everything logged before the trigger existed.
update public.games g
    set log_count = c.n
    from (
        select game_id, count(*) as n from public.game_logs group by game_id
    ) as c
    where c.game_id = g.id;

-- Composite, because the id tiebreaker does even more work here than it does
-- for rawg_added_count: almost every row in a 100k catalogue sits at zero.
create index games_log_count_idx on public.games (log_count desc, id);
