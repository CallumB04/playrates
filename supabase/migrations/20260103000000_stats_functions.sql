-- Game stats aggregated in SQL rather than in the API process.
--
-- Reducing in JS meant selecting every matching game_logs row, and PostgREST
-- caps a response at 1000, so any game past a thousand logs reported wrong
-- numbers. These aggregate over indexed columns and return a single row.

-- Average, count and the 20 half-point buckets the distribution plate draws.
create or replace function public.game_rating_summary(p_game_id bigint)
returns table (
    average numeric,
    total bigint,
    buckets bigint[]
)
language sql
stable
-- Pinned so a caller can't shadow what this resolves.
set search_path = pg_catalog, public
as $$
    with rated as (
        select
            rating,
            -- width_bucket returns 21 for exactly 10.0, which the rating check
            -- constraint allows. Fold it into the top bucket rather than
            -- losing it off the end of the array.
            least(width_bucket(rating, 0, 10, 20), 20) as bucket
        from public.game_logs
        where game_id = p_game_id and rating is not null
    )
    select
        round(avg(rating), 2) as average,
        count(*) as total,
        (
            -- A row per bucket, so empty buckets are zeros rather than gaps.
            select coalesce(array_agg(coalesce(c.n, 0) order by b.i), '{}')
            from generate_series(1, 20) as b(i)
            left join (
                select bucket, count(*) as n from rated group by bucket
            ) as c on c.bucket = b.i
        ) as buckets
    from rated;
$$;

-- The four status counts. The game page's headline "logged by N" is derived
-- from these, so the 1000-row cap was truncating the total as well as the
-- breakdown.
create or replace function public.game_status_counts(p_game_id bigint)
returns table (
    played bigint,
    playing bigint,
    backlog bigint,
    wishlist bigint,
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
        count(*) as total
    from public.game_logs
    where game_id = p_game_id;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC, and the revoke block in
-- the RLS migration only covers tables and sequences. Without this, both of
-- these are reachable as POST /rest/v1/rpc/... by anyone holding the anon key
-- that ships in the frontend bundle — the exact hole that migration closes.
-- The API calls them on the service-role key, which is unaffected.
revoke execute on function public.game_rating_summary(bigint)
    from anon, authenticated, public;
revoke execute on function public.game_status_counts(bigint)
    from anon, authenticated, public;
