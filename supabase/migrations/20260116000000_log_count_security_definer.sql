-- Closing an account has to survive the cascade, whoever is running it.
--
-- Deleting an account deletes the auth.users row and the cascade reaches
-- game_logs, firing both of the games counters. GoTrue runs that delete as
-- supabase_auth_admin, which holds no privileges on public.games, so the
-- counter that runs as its invoker hit "permission denied for table games".
-- Auth reports that back as "Database error deleting user" and the whole
-- transaction rolls back, so the account survives every attempt.
--
-- games_recount_ratings was already security definer; this is its twin
-- catching up. Body unchanged.

create or replace function public.games_sync_log_count()
returns trigger
language plpgsql
security definer
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

-- Nobody calls a trigger function directly, and it now runs as its owner.
revoke execute on function public.games_sync_log_count()
    from anon, authenticated, public;
