-- The weekly digest's rows now carry each game's cover and each friend's
-- picture, which the email shows beside them: the box art where there is
-- one, as every other cover the site shows. New keys only: code that
-- reads the old ones carries on as it was.

set search_path = pg_catalog, public;

create or replace function public.weekly_digest(
    p_since timestamptz, p_from date, p_to date
)
returns table (
    user_id uuid, friends jsonb, releases jsonb, logged int
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with pairs as (
        select user_a_id as user_id, user_b_id as friend_id
        from public.friendships where status = 'accepted'
        union all
        select user_b_id, user_a_id
        from public.friendships where status = 'accepted'
    ),
    friend_logs as (
        select pr.user_id,
               jsonb_build_object(
                   'username', f.username,
                   'gameId', g.id,
                   'title', g.title,
                   'status', l.status,
                   'rating', l.rating,
                   'coverUrl', coalesce(g.box_art_url, g.cover_url),
                   'avatarUrl', f.avatar_url
               ) as item,
               row_number() over (
                   partition by pr.user_id order by l.updated_at desc
               ) as n
        from pairs pr
        join public.profiles m on m.id = pr.user_id
        join public.profiles f on f.id = pr.friend_id
        join public.game_logs l on l.user_id = pr.friend_id
        join public.games g on g.id = l.game_id
        where l.updated_at >= p_since
          and l.status <> 'wishlist'
          and f.profile_visibility in ('everyone', 'friends')
          and (m.show_sexual_content or not g.has_sexual_content)
    ),
    releases as (
        select l.user_id,
               jsonb_agg(
                   jsonb_build_object(
                       'gameId', g.id,
                       'title', g.title,
                       'releaseDate', g.release_date,
                       'coverUrl', coalesce(g.box_art_url, g.cover_url)
                   )
                   order by g.release_date, g.title
               ) as items
        from public.game_logs l
        join public.games g on g.id = l.game_id
        join public.profiles m on m.id = l.user_id
        where l.status = 'wishlist'
          and g.release_date between p_from and p_to
          and (m.show_sexual_content or not g.has_sexual_content)
        group by l.user_id
    ),
    own as (
        select l.user_id, count(*)::int as logged
        from public.game_logs l
        where l.created_at >= p_since and l.status <> 'wishlist'
        group by l.user_id
    ),
    friends as (
        select user_id, jsonb_agg(item order by n) as items
        from friend_logs
        where n <= 6
        group by user_id
    )
    select p.id,
           coalesce(fr.items, '[]'::jsonb),
           coalesce(r.items, '[]'::jsonb),
           coalesce(o.logged, 0)
    from public.profiles p
    left join friends fr on fr.user_id = p.id
    left join releases r on r.user_id = p.id
    left join own o on o.user_id = p.id
    where fr.items is not null or r.items is not null or o.logged > 0;
$$;

revoke execute on function public.weekly_digest(timestamptz, date, date)
    from anon, authenticated, public;
