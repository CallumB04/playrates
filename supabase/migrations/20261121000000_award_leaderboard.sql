-- An event keeps its scoring to itself: an awards night ranks who called
-- the most winners, and badges stay for the site as a whole. Event badges
-- go, unused by any deployed code.
set search_path = pg_catalog, public;

drop function if exists public.refresh_award_result_badges(bigint);
drop function if exists public.event_badge_counts(bigint);
drop table if exists public.event_badges;

-- Every pick in an event, by category.
create index if not exists award_picks_category_idx
    on public.award_picks (category_id);

-- What everyone who picked scored: winners called each.
create function public.award_scores(p_event bigint)
returns table (user_id uuid, called int)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select p.user_id, count(*) filter (where n.won)::int
    from public.award_picks p
    join public.award_categories c on c.id = p.category_id
    join public.award_nominees n on n.id = p.nominee_id
    where c.event_id = p_event
    group by p.user_id;
$$;

-- An awards night's leaderboard, by score rather than by person, so a
-- tie is one line: the top p_tiers scores, how many reached each, and up
-- to p_per_tier of them in name order. Whose names the viewer may see is
-- the API's to decide, by the profile gate's rule.
create function public.award_leaderboard(
    p_event bigint,
    p_tiers int,
    p_per_tier int
)
returns table (called int, players int, voters int, user_id uuid)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with scores as (
        select s.user_id, s.called, pr.username
        from public.award_scores(p_event) s
        join public.profiles pr on pr.id = s.user_id
    ),
    tiers as (
        select called, count(*)::int as players
        from scores
        group by called
        order by called desc
        limit p_tiers
    ),
    named as (
        select user_id, called,
               row_number() over (partition by called order by username) as n
        from scores
        where called in (select called from tiers)
    )
    select t.called, t.players,
           (select count(*)::int from scores) as voters,
           nm.user_id
    from tiers t
    left join named nm on nm.called = t.called and nm.n <= p_per_tier
    order by t.called desc, nm.n;
$$;

-- Where one member stands: their score, and their place counting everyone
-- who scored more, so a tie shares it.
create function public.award_standing(p_event bigint, p_user uuid)
returns table (called int, rank int, voters int)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with scores as (select * from public.award_scores(p_event))
    select s.called,
           (select count(*)::int from scores x where x.called > s.called) + 1,
           (select count(*)::int from scores)
    from scores s
    where s.user_id = p_user;
$$;

revoke execute on function public.award_scores(bigint)
    from anon, authenticated, public;
revoke execute on function public.award_leaderboard(bigint, int, int)
    from anon, authenticated, public;
revoke execute on function public.award_standing(bigint, uuid)
    from anon, authenticated, public;
