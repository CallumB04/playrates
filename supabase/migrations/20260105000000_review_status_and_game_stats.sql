-- Reviews carry the state they were written in, and games gain their own
-- figures rather than borrowing RAWG's.
--
-- A 9.0 from someone who finished a game reads differently from a 9.0 from
-- someone who shelved it at four hours. Both were already on the game_logs row
-- the rating comes from; the view just wasn't carrying them.
--
-- game_playrates_stats replaces the RAWG figures with playtime, time to beat
-- and achievement completion taken from this site's own logs.

set search_path = pg_catalog, public;

drop view if exists public.review_cards;

create view public.review_cards
with (security_invoker = true) as
select
    r.id,
    r.user_id,
    r.game_id,
    r.body,
    r.is_public,
    r.created_at,
    r.updated_at,
    l.rating,
    l.hours_played,
    l.status,
    l.played_status,
    l.platform_slug,
    p.username        as author_username,
    p.avatar_url      as author_avatar_url,
    p.last_seen_at    as author_last_seen_at,
    g.title           as game_title,
    g.slug            as game_slug,
    g.cover_url       as game_cover_url
from public.reviews r
left join public.game_logs l
    on l.user_id = r.user_id and l.game_id = r.game_id
left join public.profiles p
    on p.id = r.user_id
join public.games g
    on g.id = r.game_id;

revoke all on public.review_cards from anon, authenticated;

/*
 * PlayRates' own figures for one game.
 *
 * Averages ignore nulls rather than treating a missing value as zero: someone
 * who logged a game without recording hours should not drag the average down.
 * The achievement share counts only logs that recorded a total, since a log
 * with no achievement data is not a player who failed to complete them.
 */
create or replace function public.game_playrates_stats(p_game_id bigint)
returns table (
    avg_hours_played numeric,
    avg_hours_to_beat numeric,
    completionist_count int,
    achievement_tracked_count int
)
language sql
stable
set search_path = pg_catalog, public
as $$
    select
        round(avg(hours_played) filter (where hours_played is not null), 1),
        round(avg(hours_to_beat) filter (where hours_to_beat is not null), 1),
        count(*) filter (
            where achievements_total > 0
              and achievements_completed >= achievements_total
        )::int,
        count(*) filter (where achievements_total > 0)::int
    from public.game_logs
    where game_id = p_game_id;
$$;

-- Functions grant EXECUTE to PUBLIC by default, and the RLS migration's
-- revoke only covered the tables that existed then.
revoke execute on function public.game_playrates_stats(bigint)
    from anon, authenticated, public;

-- The averages scan one game's logs; the partial index keeps that cheap once
-- a popular game has thousands.
create index if not exists game_logs_game_hours_idx
    on public.game_logs (game_id)
    where hours_played is not null;

-- Metacritic becomes a sort option, and a null score must sort last rather
-- than first.
create index if not exists games_metacritic_idx
    on public.games (metacritic desc nulls last, id);

-- "Most logged" falls back to RAWG's tracker count for everything with no
-- logs yet, which is almost the whole catalogue. Without the composite the
-- tiebreaker is a full sort.
create index if not exists games_logged_then_tracked_idx
    on public.games (log_count desc, rawg_added_count desc nulls last, id);
