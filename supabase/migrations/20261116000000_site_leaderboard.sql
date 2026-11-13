-- The site's leaderboard: everyone with XP to show, ranked by what they
-- earned since p_since (or ever, when null), and the viewer wherever they
-- stand. It returns the top p_top, then the viewer with p_around either
-- side, so the board never sends the whole ranking. Whose names the viewer
-- may see is the API's to decide, by the profile gate's rule.
set search_path = pg_catalog, public;

create or replace function public.site_leaderboard(
    p_since timestamptz,
    p_viewer uuid,
    p_top int,
    p_around int
)
returns table (user_id uuid, xp bigint, rank bigint, total bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with earned as (
        select e.user_id, sum(e.xp)::bigint as xp
        from public.xp_events e
        where p_since is not null
          and e.created_at >= p_since
          -- The launch's reveal handed out badges at once: not this week's.
          and not e.data ? 'launch'
        group by e.user_id
    ),
    players as (
        select p.id, p.username,
               case when p_since is null then p.xp::bigint
                    else coalesce(earned.xp, 0) end as xp
        from public.profiles p
        left join earned on earned.user_id = p.id
    ),
    ranked as (
        select id, xp,
               row_number() over (order by xp desc, username) as rank,
               -- Players are those who earned something: you at nought
               -- have a place, but aren't one more of them.
               count(*) filter (where xp > 0) over () as total
        from players
        -- Nothing earned is nothing to rank, except where you stand.
        where xp > 0 or id = p_viewer
    ),
    me as (select rank from ranked where id = p_viewer)
    select r.id, r.xp, r.rank, r.total
    from ranked r
    where r.rank <= p_top
       or abs(r.rank - (select rank from me)) <= p_around
    order by r.rank;
$$;

revoke execute on function public.site_leaderboard(timestamptz, uuid, int, int)
    from anon, authenticated, public;

-- The week's and the month's boards read every event since a date.
create index if not exists xp_events_time_idx
    on public.xp_events (created_at);
