-- People counted once.
--
-- With a log per platform, counting rows counts consoles. Someone who logged
-- a game on PS4 and PS5 is still one player, one vote in the average, and one
-- figure for hours (their total) and time to beat (their quickest). Admin and
-- site totals keep counting logs: for running the site, a log is a log.
--
-- While everyone has one log per game, every figure here equals the old one.

set search_path = pg_catalog, public;

-- The status a person's logs of one game add up to: the one on the cover, and
-- the bucket they count in. Playing beats everything because it is what they
-- are doing now; a played run beats a backlog entry on another console.
-- Mirrored by headlineOf in shared/src/logs/rollup.ts.
create or replace function public.log_rank(p_status text, p_played_status text)
returns int
language sql
immutable
set search_path = pg_catalog, public
as $$
    select case
        when p_status = 'playing' then 1
        when p_status = 'played' then case p_played_status
            when 'mastered' then 2
            when 'finished' then 3
            when 'retired' then 4
            when 'shelved' then 5
            else 6
        end
        when p_status = 'backlog' then 7
        else 8
    end;
$$;

revoke execute on function public.log_rank(text, text)
    from anon, authenticated, public;

-- Counters --------------------------------------------------------------------

-- Recounted rather than nudged by one: whether a new log adds a player depends
-- on that person's other logs, and a recount can't drift.
create or replace function public.games_sync_log_count()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    affected bigint[];
begin
    affected := case tg_op
        when 'INSERT' then array[new.game_id]
        when 'DELETE' then array[old.game_id]
        else array[old.game_id, new.game_id]
    end;

    update public.games g
    set log_count = (
        select count(distinct l.user_id)::int
        from public.game_logs l
        where l.game_id = g.id
    )
    where g.id = any(affected);

    return null;
end;
$$;

create or replace function public.games_recount_ratings()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    affected bigint[];
begin
    /* An UPDATE can move a rating between two games, so both ends are
       recounted rather than only the new one. */
    affected := case tg_op
        when 'INSERT' then array[new.game_id]
        when 'DELETE' then array[old.game_id]
        else array[old.game_id, new.game_id]
    end;

    update public.games g
    set avg_rating = stats.mean,
        rating_count = stats.total
    from (
        select
            g2.id,
            round(avg(p.mean), 2) as mean,
            count(p.mean)::int as total
        from public.games g2
        left join (
            select game_id, avg(rating) as mean
            from public.game_logs
            where game_id = any(affected) and rating is not null
            group by game_id, user_id
        ) p on p.game_id = g2.id
        where g2.id = any(affected)
        group by g2.id
    ) stats
    where g.id = stats.id;

    return null;
end;
$$;

-- Game page figures -----------------------------------------------------------

create or replace function public.game_rating_summary(p_game_id bigint)
returns table (
    average numeric,
    total bigint,
    buckets bigint[]
)
language sql
stable
set search_path = pg_catalog, public
as $$
    with rated as (
        select
            avg(rating) as rating,
            -- Bucket i is the ratings in (i/2, (i+1)/2]: 0.5 first, 10 last.
            -- A mean of 7.25 lands in 7.5, rounding up as a single 7.25 would.
            ceil(avg(rating) * 2)::int as bucket
        from public.game_logs
        where game_id = p_game_id and rating is not null
        group by user_id
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

-- One bucket per person, so the bars add up to the number of players.
create or replace function public.game_status_counts(p_game_id bigint)
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
    with headline as (
        select distinct on (user_id) status, played_status
        from public.game_logs
        where game_id = p_game_id
        order by user_id, public.log_rank(status, played_status), id
    )
    select
        count(*) filter (where status = 'played') as played,
        count(*) filter (where status = 'playing') as playing,
        count(*) filter (where status = 'backlog') as backlog,
        count(*) filter (where status = 'wishlist') as wishlist,
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
    from headline;
$$;

-- A person's hours are their total across consoles, their time to beat their
-- quickest, and their completion their best: trophy lists differ by console.
create or replace function public.game_playrates_stats(p_game_id bigint)
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
    with people as (
        select
            sum(hours_played) as hours_played,
            min(hours_to_beat) as hours_to_beat,
            -- Clamped to 1: achievements_completed is typed in by hand.
            max(
                least(
                    coalesce(achievements_completed, 0)::numeric
                        / nullif(achievements_total, 0),
                    1
                )
            ) filter (where achievements_total > 0) as completion
        from public.game_logs
        where game_id = p_game_id
        group by user_id
    )
    select
        round(avg(hours_played), 1),
        round(avg(hours_to_beat), 1),
        avg(completion),
        count(completion)::int
    from people;
$$;

-- Shelves ---------------------------------------------------------------------

-- A person's logs of one game as one row, for filtering and sorting a shelf
-- of games rather than of logs. A game sits on every shelf one of its logs
-- belongs to, so statuses is an array to test membership against.
create or replace view public.game_log_rollups
with (security_invoker = true) as
select
    l.user_id,
    l.game_id,
    count(*)::int as log_count,
    max(l.id) as latest_log_id,
    array_agg(distinct l.status) as statuses,
    -- 'none' stands in for a played log without an ending, which the
    -- ending filter asks for by that name.
    coalesce(
        array_agg(distinct coalesce(l.played_status, 'none'))
            filter (where l.status = 'played'),
        '{}'
    ) as played_endings,
    avg(l.rating) as rating,
    sum(l.hours_played) as hours_played,
    max(l.completion) as completion,
    max(l.last_played) as last_played,
    max(l.updated_at) as updated_at,
    g.title as game_title,
    g.avg_rating as game_avg_rating,
    g.critic_score as game_critic_score,
    g.release_date as game_release_date
from public.game_logs l
join public.games g on g.id = l.game_id
group by l.user_id, l.game_id, g.id;

revoke all on public.game_log_rollups from anon, authenticated;

-- A member's figures. Shelf counts are games, matching the shelves, which
-- list each game once: a game with a played log and a backlog log counts on
-- both. Hours are summed over every log; the average rating is over games,
-- each game rated by the mean of its logs.
create or replace function public.user_log_stats(p_user_id uuid, p_year int default null)
returns table (
    log_count int,
    game_count int,
    played int,
    playing int,
    backlog int,
    wishlist int,
    hours_played numeric,
    average_rating numeric,
    rated_games int
)
language sql
stable
set search_path = pg_catalog, public
as $$
    with logs as (
        select *
        from public.game_logs
        where user_id = p_user_id
          and (p_year is null
               or (updated_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
                   and updated_at < make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')))
    ),
    games as (
        select
            game_id,
            bool_or(status = 'played') as played,
            bool_or(status = 'playing') as playing,
            bool_or(status = 'backlog') as backlog,
            bool_or(status = 'wishlist') as wishlist,
            avg(rating) as rating
        from logs
        group by game_id
    )
    select
        (select count(*)::int from logs),
        count(*)::int,
        count(*) filter (where played)::int,
        count(*) filter (where playing)::int,
        count(*) filter (where backlog)::int,
        count(*) filter (where wishlist)::int,
        (select sum(hours_played) from logs),
        avg(rating),
        count(rating)::int
    from games;
$$;

revoke execute on function public.user_log_stats(uuid, int)
    from anon, authenticated, public;
