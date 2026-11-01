-- Finding people: those who rate games the way you do, and those who
-- rated a game highly. Only profiles open to everyone take part, as their
-- ratings already show to anyone who looks.

set search_path = pg_catalog, public;

-- A member's rating of a game: their logs on different consoles averaged.
create or replace view public.member_ratings
with (security_invoker = true) as
    select user_id, game_id, avg(rating) as rating
    from public.game_logs
    where rating is not null
    group by user_id, game_id;

revoke all on public.member_ratings from anon, authenticated;

-- Agreement is how close two ratings of the same game sit, out of 100,
-- averaged over the games both rated. Three in common at least, and more
-- in common counts for more, so two games' perfect match doesn't beat
-- twenty close ones. Friends are left out: they're found already.
create or replace function public.taste_matches(p_user uuid, p_limit int default 12)
returns table (
    id uuid, username text, avatar_url text, accent text, bio text,
    last_seen_at timestamptz, shared int, agreement int
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with mine as (
        select game_id, rating from public.member_ratings where user_id = p_user
    ),
    theirs as (
        select r.user_id,
               count(*) as shared,
               avg(1 - abs(r.rating - m.rating) / 10) as agreement
        from public.member_ratings r
        join mine m on m.game_id = r.game_id
        where r.user_id <> p_user
        group by r.user_id
        having count(*) >= 3
    )
    select p.id, p.username::text, p.avatar_url, p.accent, p.bio,
           p.last_seen_at, t.shared::int, round(t.agreement * 100)::int
    from theirs t
    join public.profiles p on p.id = t.user_id
    where p.profile_visibility = 'everyone'
      and not exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and f.user_a_id = least(p_user, p.id)
            and f.user_b_id = greatest(p_user, p.id)
      )
    order by t.agreement * ln(1 + t.shared) desc, p.username
    limit greatest(p_limit, 0);
$$;

-- Who rated a game 8 or more, highest first.
create or replace function public.game_fans(p_game bigint, p_limit int default 8)
returns table (
    id uuid, username text, avatar_url text, accent text, bio text,
    last_seen_at timestamptz, rating numeric
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select p.id, p.username::text, p.avatar_url, p.accent, p.bio,
           p.last_seen_at, round(r.rating, 2)
    from public.member_ratings r
    join public.profiles p on p.id = r.user_id
    where r.game_id = p_game
      and r.rating >= 8
      and p.profile_visibility = 'everyone'
    order by r.rating desc, p.last_seen_at desc
    limit greatest(p_limit, 0);
$$;

revoke execute on function public.taste_matches(uuid, int)
    from anon, authenticated, public;
revoke execute on function public.game_fans(bigint, int)
    from anon, authenticated, public;
