-- As before, without the 1000 a log the hours used to be held to: the
-- hours badges add up what each game says, however much that is.
create or replace function public.player_metrics(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with logs as (
        select l.*, g.release_date
        from public.game_logs l
        join public.games g on g.id = l.game_id
        where l.user_id = p_user
    ),
    played as (select * from logs where status in ('played', 'playing'))
    select jsonb_build_object(
        'logged', (select count(distinct game_id) from played),
        'shelved', (select count(distinct game_id) from logs),
        'rated', (select count(distinct game_id) from played where rating is not null),
        'hours', (select coalesce(sum(coalesce(hours_played, 0)), 0)::int
                  from played),
        'finished', (select count(distinct game_id) from logs
                     where played_status in ('finished', 'mastered')),
        'mastered', (select count(distinct game_id) from logs where played_status = 'mastered'),
        'backlogSlain', (select count(distinct game_id) from public.activity_events
                         where actor_id = p_user and kind = 'log_updated'
                           and data -> 'from' ->> 'status' = 'backlog'
                           and data -> 'to' ->> 'status' in ('played', 'playing')),
        'genres', (select count(distinct gg.genre_slug) from played p
                   join public.game_genres gg on gg.game_id = p.game_id),
        'systems', (select count(distinct system_slug) from played
                    where system_slug is not null),
        'decades', (select count(distinct floor(extract(year from release_date) / 10))
                    from played where release_date is not null),
        'reviews', (select count(*) from public.reviews
                    where user_id = p_user and char_length(btrim(body)) >= 40),
        'reviewUpvotes', (select count(*) from public.review_votes v
                          join public.reviews r on r.id = v.review_id
                          where r.user_id = p_user),
        'posts', (select count(*) from public.community_messages
                  where author_id = p_user and deleted_at is null),
        'postUpvotes', (select count(*) from public.community_message_votes v
                        join public.community_messages m on m.id = v.message_id
                        where m.author_id = p_user),
        'lists', (select count(*) from public.game_lists l
                  where l.user_id = p_user
                    and (select count(*) from public.game_list_items i
                         where i.list_id = l.id) >= 5),
        'listUpvotes', (select count(*) from public.game_list_votes v
                        join public.game_lists l on l.id = v.list_id
                        where l.user_id = p_user),
        'gaming25', (select (count(*) >= 25)::int from public.gaming_25_picks
                     where user_id = p_user),
        'gaming25Loves', (select count(*) from public.gaming_25_loves
                          where owner_id = p_user),
        'friends', (select count(*) from public.friendships
                    where status = 'accepted'
                      and (user_a_id = p_user or user_b_id = p_user)),
        'referrals', (select count(*) from public.profiles p
                      where p.referred_by = p_user
                        and (select count(distinct game_id) from public.game_logs
                             where user_id = p.id
                               and status in ('played', 'playing')) >= 5),
        'quests', (select count(*) from public.xp_events
                   where user_id = p_user and source = 'quest'),
        'founding', (select ((select count(*) from public.profiles o
                              where o.created_at < me.created_at) < 100)::int
                     from public.profiles me where me.id = p_user),
        'binge', (select coalesce(max(n), 0) from (
                      select count(distinct game_id) as n from played
                      group by created_at::date) d),
        'perfectScore', (select exists (
                            select 1 from public.reviews r
                            join public.game_logs l on l.id = r.log_id
                            where r.user_id = p_user and l.rating = 10
                              and l.status in ('played', 'playing')
                              and r.created_at::date = l.updated_at::date)::int),
        'retiredVeteran', (select exists (
                              select 1 from logs
                              where played_status = 'retired'
                                and hours_played >= 100)::int)
    );
$$;
