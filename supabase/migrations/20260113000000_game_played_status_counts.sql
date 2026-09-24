-- The status breakdown on a game page counted the four top-level states and
-- stopped there, so the played bar — always the longest — said nothing about
-- how those plays ended.
--
-- Dropped and recreated rather than replaced: the return type changes, and
-- `create or replace` cannot widen it.
drop function if exists public.game_status_counts(bigint);

create function public.game_status_counts(p_game_id bigint)
returns table (
    played bigint,
    playing bigint,
    backlog bigint,
    wishlist bigint,
    finished bigint,
    mastered bigint,
    shelved bigint,
    retired bigint,
    total bigint
)
language sql
stable
set search_path = pg_catalog, public
as $$
    select
        count(*) filter (where status = 'played') as played,
        count(*) filter (where status = 'playing') as playing,
        count(*) filter (where status = 'backlog') as backlog,
        count(*) filter (where status = 'wishlist') as wishlist,
        -- Substatuses only mean anything on a played log, and a CHECK already
        -- guarantees that, but the filter says so out loud.
        count(*) filter (
            where status = 'played' and played_status = 'finished'
        ) as finished,
        count(*) filter (
            where status = 'played' and played_status = 'mastered'
        ) as mastered,
        count(*) filter (
            where status = 'played' and played_status = 'shelved'
        ) as shelved,
        count(*) filter (
            where status = 'played' and played_status = 'retired'
        ) as retired,
        count(*) as total
    from public.game_logs
    where game_id = p_game_id;
$$;

-- Dropping the function dropped its grants with it, and Postgres hands EXECUTE
-- to PUBLIC on a new one — which would leave this callable as
-- POST /rest/v1/rpc/... by anyone holding the anon key in the frontend bundle.
revoke execute on function public.game_status_counts(bigint)
    from anon, authenticated, public;
