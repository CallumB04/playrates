-- "Highest rated" sorts by PlayRates ratings, not RAWG's 0-5 community score.
--
-- An average can't be computed per row at query time across 126k games, so it
-- rolls up onto games by trigger, the same way log_count does. Rated logs
-- only: a log with no rating is not a zero.

set search_path = pg_catalog, public;

alter table public.games
    add column if not exists avg_rating numeric(4, 2),
    add column if not exists rating_count int not null default 0;

comment on column public.games.avg_rating is
    'Mean of PlayRates ratings. Null where nobody has rated it.';

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
            id,
            (select round(avg(rating), 2)
             from public.game_logs l
             where l.game_id = g2.id and l.rating is not null) as mean,
            (select count(*)::int
             from public.game_logs l
             where l.game_id = g2.id and l.rating is not null) as total
        from public.games g2
        where g2.id = any(affected)
    ) stats
    where g.id = stats.id;

    return null;
end;
$$;

revoke execute on function public.games_recount_ratings()
    from anon, authenticated, public;

drop trigger if exists game_logs_sync_rating on public.game_logs;

-- Fires on the rating changing as well as on rows appearing and vanishing:
-- editing a score has to move the average, and cascaded deletes never reach
-- application code.
create trigger game_logs_sync_rating
    after insert or delete or update of rating, game_id
    on public.game_logs
    for each row
    execute function public.games_recount_ratings();

-- Backfill what already exists.
update public.games g
set avg_rating = stats.mean,
    rating_count = stats.total
from (
    select
        game_id as id,
        round(avg(rating), 2) as mean,
        count(*)::int as total
    from public.game_logs
    where rating is not null
    group by game_id
) stats
where g.id = stats.id;

/* Ordering needs the count as a second key: one 10.0 should not outrank a
   game fifty people settled at 9.2. */
create index if not exists games_avg_rating_idx
    on public.games (avg_rating desc nulls last, rating_count desc, id);
