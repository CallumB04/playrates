-- People who play what you play: those who have logged games you have
-- logged, most in common first, for someone too new to have a taste
-- match (that needs three ratings in common). Public profiles only, as
-- their games are theirs to show; friends left out, as they're found
-- already. Adult games count for nothing here and are never named.

set search_path = pg_catalog, public;

create or replace function public.shared_players(p_user uuid, p_limit int default 6)
returns table (
    id uuid, username text, avatar_url text, accent text, bio text,
    last_seen_at timestamptz, shared int, game_ids bigint[]
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with mine as (
        select distinct l.game_id
        from public.game_logs l
        join public.games g on g.id = l.game_id
        where l.user_id = p_user
          and l.status in ('played', 'playing')
          and not g.has_sexual_content
    ),
    theirs as (
        select l.user_id,
               count(distinct l.game_id) as shared,
               (array_agg(distinct l.game_id))[1:3] as game_ids
        from public.game_logs l
        join mine m on m.game_id = l.game_id
        where l.user_id <> p_user
          and l.status in ('played', 'playing')
        group by l.user_id
    )
    select p.id, p.username::text, p.avatar_url, p.accent, p.bio,
           p.last_seen_at, t.shared::int, t.game_ids
    from theirs t
    join public.profiles p on p.id = t.user_id
    where p.profile_visibility = 'everyone'
      and not exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and f.user_a_id = least(p_user, p.id)
            and f.user_b_id = greatest(p_user, p.id)
      )
    order by t.shared desc, p.last_seen_at desc nulls last, p.username
    limit greatest(p_limit, 0);
$$;

revoke execute on function public.shared_players(uuid, int)
    from anon, authenticated, public;
