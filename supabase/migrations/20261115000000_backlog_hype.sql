-- How much someone wants to play a game on their backlog: 1 to 5 flames,
-- or none. Only a backlog log has it, as only a played log has an ending;
-- the API clears it as a log moves on, so the check never has to refuse.
--
-- The backlog shelf sorts by it, a game logged on more than one console
-- going by its most hyped backlog log. Appended to the rollup view, as
-- replacing one only allows new columns at the end.

set search_path = pg_catalog, public;

alter table public.game_logs
    add column if not exists hype smallint;

alter table public.game_logs
    add constraint game_logs_hype check (
        hype is null or (status = 'backlog' and hype between 1 and 5)
    );

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
    min(l.created_at) as first_added_at,
    max(
        case l.played_status
            when 'mastered' then 4
            when 'finished' then 3
            when 'shelved' then 2
            when 'retired' then 1
            else 0
        end
    ) filter (where l.status = 'played') as ending_rank,
    max(l.hype) filter (where l.status = 'backlog') as hype
from public.game_logs l
join public.games g on g.id = l.game_id
group by l.user_id, l.game_id, g.id;

revoke all on public.game_log_rollups from anon, authenticated;
