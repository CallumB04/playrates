-- Shelves sort by when a game was added: a backlog or a wishlist has no
-- play dates or hours, so every other time-based sort leaves it in dashes.
--
-- The first log's, not the latest: logging a second console is not adding
-- the game.

set search_path = pg_catalog, public;

create or replace view public.game_log_rollups
with (security_invoker = true) as
select
    l.user_id,
    l.game_id,
    count(*)::int as log_count,
    max(l.id) as latest_log_id,
    array_agg(distinct l.status) as statuses,
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
    g.release_date as game_release_date,
    min(l.hours_to_beat) as hours_to_beat,
    min(l.created_at) as first_added_at
from public.game_logs l
join public.games g on g.id = l.game_id
group by l.user_id, l.game_id, g.id;

revoke all on public.game_log_rollups from anon, authenticated;
