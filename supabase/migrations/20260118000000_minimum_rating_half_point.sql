-- Zero is not a rating, it is the absence of one.
--
-- The scale people are shown starts at 0.5 and the meter has twenty segments
-- to match, but the check constraint allowed 0, the keyboard could reach it,
-- and a 0 then counted as a rating: it dragged the average down and took a
-- bar on the distribution plate that no pointer could ever fill. An unrated
-- log already has a way to say so, which is null.

update public.game_logs
set rating = null
where rating = 0;

alter table public.game_logs
    drop constraint game_logs_rating;

alter table public.game_logs
    add constraint game_logs_rating check (
        rating is null
        or (rating >= 0.5 and rating <= 10 and mod(rating * 100, 50) = 0)
    );

-- The rollup counts and averages only rows where rating is not null, so any
-- game that held a zero is now one rating lighter. Recount those from scratch
-- rather than trusting a counter that was maintained against the old rule.
update public.games g
set avg_rating = stats.mean,
    rating_count = stats.total
from (
    select
        g2.id,
        (select round(avg(rating), 2)
         from public.game_logs l
         where l.game_id = g2.id and l.rating is not null) as mean,
        (select count(*)::int
         from public.game_logs l
         where l.game_id = g2.id and l.rating is not null) as total
    from public.games g2
) stats
where g.id = stats.id
  and (g.avg_rating is distinct from stats.mean
       or g.rating_count is distinct from stats.total);

-- With 0.5 the floor, ceil(rating * 2) lands in 1..20 on its own and the
-- guard that kept a zero on the scale has nothing left to catch.
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
            -- Bucket i is the ratings in (i/2, (i+1)/2]: 0.5 first, 10 last.
            ceil(rating * 2)::int as bucket
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
