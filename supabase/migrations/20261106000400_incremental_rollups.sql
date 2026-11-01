-- Two triggers kept a game's figures by recounting from scratch on every
-- log written: log_count counted all of the game's logs, and the ratings
-- recount wrote the same figures back when a log changed but its rating
-- didn't. Each write also moved games.updated_at, which the sitemap gives
-- search engines as when the page changed.
--
-- log_count now adds or takes one, without touching updated_at (a count
-- isn't the page changing), and the ratings write only what moved.

set search_path = pg_catalog, public;

create or replace function public.games_sync_log_count()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    was text := current_setting('playrates.quiet_update', true);
begin
    -- Quiet for these updates only, then back as it was: the ratings
    -- recount after this, in the same transaction, does change the page.
    perform set_config('playrates.quiet_update', 'on', true);

    if tg_op in ('DELETE', 'UPDATE') then
        update public.games
        set log_count = greatest(log_count - 1, 0)
        where id = old.game_id;
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
        update public.games
        set log_count = log_count + 1
        where id = new.game_id;
    end if;

    perform set_config('playrates.quiet_update', coalesce(was, ''), true);
    return null;
end;
$$;

-- The trigger fires on an UPDATE only when game_id changes (see its
-- definition), so an UPDATE is always a move from one game to another.

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
    where g.id = stats.id
      -- A log written with its rating unchanged leaves the game alone.
      and (g.avg_rating, g.rating_count)
          is distinct from (stats.mean, stats.total);

    return null;
end;
$$;

-- Counted afresh once, so the running count starts from the truth, without
-- telling the sitemap every corrected game changed.
select set_config('playrates.quiet_update', 'on', true);

update public.games g
set log_count = coalesce(counts.n, 0)
from public.games g2
left join (
    select game_id, count(*)::int as n
    from public.game_logs
    group by game_id
) counts on counts.game_id = g2.id
where g.id = g2.id
  and g.log_count is distinct from coalesce(counts.n, 0);
