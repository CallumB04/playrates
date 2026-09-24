-- Put each rating in its own bar on the distribution plate.
--
-- width_bucket(rating, 0, 10, 20) is 1-based over half-open intervals starting
-- at zero, so bucket 1 was [0, 0.5) and every real rating landed one bar to the
-- right of where it reads: 9.5 drew in the twentieth bar, against the 10 tick.
-- Worse, it returns 21 for exactly 10.0, and folding that back into 20 sat the
-- only perfect score on top of the 9.5s.
--
-- Ratings are multiples of 0.5, so bucket i is simply the ratings in
-- (i/2, (i+1)/2] — 0.5 in the first bar, 10.0 in the twentieth. A rating of 0
-- is allowed by the check constraint but has no bar of its own; it joins the
-- 0.5s rather than falling off the end.

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
            greatest(ceil(rating * 2)::int, 1) as bucket
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
