-- Logs that only ever grew. Run by the daily cron, a batch at a time so
-- no run holds its locks for long, and catching up over a few days after
-- a backlog.
--
-- Left alone on purpose: xp_events (each row is XP paid; deleting one
-- lowers the total and lets it be paid again) and activity_events (a badge
-- and the admin's year-on-year series read all of it).

set search_path = pg_catalog, public;

create or replace function public.prune_old_rows(p_batch int default 5000)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    errors int;
    events int;
begin
    -- Errors are for fixing what broke lately; three months is plenty.
    delete from public.server_errors
    where id in (
        select id from public.server_errors
        where created_at < now() - interval '90 days'
        limit p_batch
    );
    get diagnostics errors = row_count;

    -- The admin's game feed looks back months, not years.
    delete from public.game_events
    where id in (
        select id from public.game_events
        where created_at < now() - interval '2 years'
        limit p_batch
    );
    get diagnostics events = row_count;

    return jsonb_build_object('serverErrors', errors, 'gameEvents', events);
end;
$$;

revoke execute on function public.prune_old_rows(int)
    from anon, authenticated, public;
