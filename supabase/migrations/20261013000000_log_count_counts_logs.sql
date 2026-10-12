-- games.log_count counts logs again, not people.
--
-- 20261008000100 made it count each person once, so the home page called it
-- "players" while the library, sorting by the same figure, called it "logs".
-- It is shown as logs everywhere now, and someone with a log on two consoles
-- has two logs. The game page's player count is figured separately and still
-- counts people.

set search_path = pg_catalog, public;

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
        select count(*)::int
        from public.game_logs l
        where l.game_id = g.id
    )
    where g.id = any(affected);

    return null;
end;
$$;

-- Only games someone has logged twice change.
update public.games g
set log_count = counts.n
from (
    select game_id, count(*)::int as n
    from public.game_logs
    group by game_id
) counts
where counts.game_id = g.id
  and g.log_count is distinct from counts.n;
