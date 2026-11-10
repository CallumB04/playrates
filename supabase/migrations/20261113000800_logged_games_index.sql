-- The admin's most-logged games read games_log_count_idx, a full index of
-- every game's log count, 8 MB and scanned eight times since September.
-- Only the few hundred games anyone has logged can be most logged, so the
-- index now holds just those, and the query asks for just those. The rest
-- of the function is as it was.

set search_path = pg_catalog, public;

create index if not exists games_logged_idx on public.games (log_count desc, id)
    where log_count > 0;

CREATE OR REPLACE FUNCTION public.admin_metric_detail(p_metric text, p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
    if p_metric = 'users' then
        return jsonb_build_object(
            'lastSeen', (
                select jsonb_build_object(
                    'online', count(*) filter (where last_seen_at > now() - interval '5 minutes'),
                    'today', count(*) filter (where last_seen_at > now() - interval '1 day'),
                    'week', count(*) filter (where last_seen_at > now() - interval '7 days'),
                    'month', count(*) filter (where last_seen_at > now() - interval '30 days'),
                    'total', count(*)
                )
                from public.profiles
            ),
            'onboarded', (select count(*) from public.profiles where onboarded_at is not null),
            'mostActive', coalesce((
                select jsonb_agg(row_to_json(t) order by t.count desc)
                from (
                    select p.username, p.avatar_url as "avatarUrl", p.accent, count(*) as count
                    from public.activity_events e
                    join public.profiles p on p.id = e.actor_id
                    where e.created_at >= p_from and e.created_at < p_to
                    group by p.id
                    order by count(*) desc
                    limit 8
                ) t
            ), '[]'::jsonb)
        );
    elsif p_metric = 'logs' then
        return jsonb_build_object(
            'byStatus', coalesce((
                select jsonb_object_agg(status, n)
                from (select status, count(*) as n from public.game_logs group by status) s
            ), '{}'::jsonb),
            'byPlayedStatus', coalesce((
                select jsonb_object_agg(played_status, n)
                from (select played_status, count(*) as n from public.game_logs
                      where played_status is not null group by played_status) s
            ), '{}'::jsonb),
            'ratedShare', (
                select round(avg((rating is not null)::int)::numeric, 3)
                from public.game_logs
            ),
            'averageRating', (
                select round(avg(rating)::numeric, 2) from public.game_logs
            ),
            'topGames', coalesce((
                select jsonb_agg(row_to_json(t) order by t.count desc)
                from (
                    select g.id, g.title, coalesce(g.box_art_url, g.cover_url) as "coverUrl",
                           count(*) as count
                    from public.activity_events e
                    join public.games g on g.id = e.game_id
                    where e.kind = 'log_added'
                      and e.created_at >= p_from and e.created_at < p_to
                    group by g.id
                    order by count(*) desc
                    limit 8
                ) t
            ), '[]'::jsonb)
        );
    elsif p_metric = 'reviews' then
        return jsonb_build_object(
            'public', (select count(*) from public.reviews where is_public),
            'private', (select count(*) from public.reviews where not is_public),
            'spoilers', (select count(*) from public.reviews where contains_spoilers),
            'upvotes', (
                select count(*) from public.activity_events
                where kind = 'review_upvoted'
                  and created_at >= p_from and created_at < p_to
            ),
            'topGames', coalesce((
                select jsonb_agg(row_to_json(t) order by t.count desc)
                from (
                    select g.id, g.title, coalesce(g.box_art_url, g.cover_url) as "coverUrl",
                           count(*) as count
                    from public.activity_events e
                    join public.games g on g.id = e.game_id
                    where e.kind = 'review_posted'
                      and e.created_at >= p_from and e.created_at < p_to
                    group by g.id
                    order by count(*) desc
                    limit 8
                ) t
            ), '[]'::jsonb)
        );
    elsif p_metric = 'community' then
        return jsonb_build_object(
            'upvotes', (
                select count(*) from public.activity_events
                where kind = 'message_upvoted'
                  and created_at >= p_from and created_at < p_to
            ),
            'replies', (
                select count(*) from public.activity_events
                where kind = 'message_posted' and (data ->> 'isReply')::boolean
                  and created_at >= p_from and created_at < p_to
            ),
            'topThreads', coalesce((
                select jsonb_agg(row_to_json(t) order by t.count desc)
                from (
                    select th.id, th.title, count(*) as count
                    from public.activity_events e
                    join public.community_threads th
                      on th.id = (e.data ->> 'threadId')::bigint
                    where e.kind = 'message_posted'
                      and e.created_at >= p_from and e.created_at < p_to
                    group by th.id
                    order by count(*) desc
                    limit 8
                ) t
            ), '[]'::jsonb)
        );
    elsif p_metric = 'games' then
        -- One pass over the catalogue rather than a count per figure: with
        -- six of them over 130k rows this ran into the API's 8s timeout.
        return (
            select jsonb_build_object(
                'total', count(*),
                'withCover', count(*) filter (where cover_url is not null),
                'withBoxArt', count(*) filter (where box_art_url is not null),
                'withDescription', count(*) filter (where description <> ''),
                'fromIgdb', count(*) filter (where igdb_id is not null),
                'trending', count(*) filter (where is_trending)
            )
            from public.games
        ) || jsonb_build_object(
            'added', (
                select count(*) from public.game_events
                where kind = 'game_added'
                  and created_at >= p_from and created_at < p_to
            ),
            -- games_logged_idx answers this without touching the table.
            'mostLogged', coalesce((
                select jsonb_agg(row_to_json(t) order by t.count desc)
                from (
                    select id, title, coalesce(box_art_url, cover_url) as "coverUrl",
                           log_count as count
                    from public.games
                    where log_count > 0
                    order by log_count desc, id
                    limit 8
                ) t
            ), '[]'::jsonb)
        );
    end if;

    raise exception 'unknown metric %', p_metric using errcode = '22023';
end;
$function$;

revoke execute on function public.admin_metric_detail(text, timestamptz, timestamptz)
    from anon, authenticated, public;

drop index if exists public.games_log_count_idx;
