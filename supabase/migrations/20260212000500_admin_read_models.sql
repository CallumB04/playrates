-- What the admin dashboard reads. Views to join the event logs to the names
-- and covers they refer to, and functions for the aggregates, so the numbers
-- are one round trip rather than a count per tile.
--
-- Everything here is reached only through the API's admin routes, on the
-- service-role key; anon and authenticated get nothing.

set search_path = pg_catalog, public;

-- Feeds ------------------------------------------------------------------------

create view public.admin_activity_feed
with (security_invoker = true) as
select
    e.id,
    e.kind,
    e.actor_id,
    e.game_id,
    e.subject_id,
    e.data,
    e.created_at,
    p.username as actor_username,
    p.avatar_url as actor_avatar_url,
    p.accent as actor_accent,
    g.title as game_title,
    coalesce(g.box_art_url, g.cover_url) as game_cover_url,
    sp.username as subject_username,
    m.plain_text as message_excerpt
from public.activity_events e
left join public.profiles p on p.id = e.actor_id
left join public.games g on g.id = e.game_id
left join public.profiles sp
    on e.kind like 'friend\_%' and sp.id::text = e.subject_id
left join public.community_messages m
    -- the case keeps a uuid subject from ever reaching the cast
    on m.id = case when e.kind like 'message\_%' then e.subject_id::bigint end;

revoke all on public.admin_activity_feed from anon, authenticated;

create view public.admin_game_feed
with (security_invoker = true) as
select
    e.id,
    e.kind,
    e.game_id,
    e.source,
    e.actor_id,
    e.data,
    e.created_at,
    g.title as game_title,
    g.slug as game_slug,
    coalesce(g.box_art_url, g.cover_url) as game_cover_url,
    g.is_trending as game_is_trending,
    g.rawg_id as game_rawg_id,
    p.username as actor_username
from public.game_events e
left join public.games g on g.id = e.game_id
left join public.profiles p on p.id = e.actor_id;

revoke all on public.admin_game_feed from anon, authenticated;

create view public.admin_user_directory
with (security_invoker = true) as
select
    p.id,
    p.username,
    p.avatar_url,
    p.accent,
    p.is_admin,
    p.created_at,
    p.last_seen_at,
    p.onboarded_at,
    (select count(*) from public.game_logs l where l.user_id = p.id) as log_count,
    (select count(*) from public.reviews r where r.user_id = p.id) as review_count,
    (select count(*) from public.community_messages m
        where m.author_id = p.id and m.deleted_at is null) as message_count,
    (select count(*) from public.friendships f
        where f.status = 'accepted' and p.id in (f.user_a_id, f.user_b_id)) as friend_count,
    (select count(*) from public.user_active_days d
        where d.user_id = p.id) as active_day_count
from public.profiles p;

revoke all on public.admin_user_directory from anon, authenticated;

-- Aggregates -------------------------------------------------------------------

-- New things per bucket, counted from the activity log so deleted rows still
-- count for the day they were made. `active` is distinct people in the
-- bucket; `active_week` is distinct people in the seven days ending on it,
-- which for a weekly bucket is the same thing.
create or replace function public.admin_series(
    p_from date,
    p_to date,
    p_bucket text
)
returns table (
    bucket date,
    signups int,
    logs int,
    reviews int,
    threads int,
    messages int,
    active int,
    active_week int
)
language sql
stable
set search_path = pg_catalog, public
as $$
    with buckets as (
        select b::date as bucket
        from generate_series(
            date_trunc(p_bucket, p_from::timestamp),
            p_to::timestamp,
            ('1 ' || p_bucket)::interval
        ) b
    ),
    events as (
        select date_trunc(p_bucket, (created_at at time zone 'utc'))::date as bucket,
               count(*) filter (where kind = 'signup') as signups,
               count(*) filter (where kind = 'log_added') as logs,
               count(*) filter (where kind = 'review_posted') as reviews,
               count(*) filter (where kind = 'thread_created') as threads,
               count(*) filter (where kind = 'message_posted') as messages
        from public.activity_events
        where created_at >= date_trunc(p_bucket, p_from::timestamp) at time zone 'utc'
          and created_at < (p_to + 1)::timestamp at time zone 'utc'
          and kind in ('signup', 'log_added', 'review_posted',
                       'thread_created', 'message_posted')
        group by 1
    ),
    active as (
        select date_trunc(p_bucket, day::timestamp)::date as bucket,
               count(distinct user_id) as active
        from public.user_active_days
        where day >= date_trunc(p_bucket, p_from::timestamp)::date and day <= p_to
        group by 1
    )
    select
        b.bucket,
        coalesce(e.signups, 0)::int,
        coalesce(e.logs, 0)::int,
        coalesce(e.reviews, 0)::int,
        coalesce(e.threads, 0)::int,
        coalesce(e.messages, 0)::int,
        coalesce(a.active, 0)::int,
        case when p_bucket = 'week' then coalesce(a.active, 0)::int
        else (
            select count(distinct d.user_id)::int
            from public.user_active_days d
            where d.day between b.bucket - 6 and b.bucket
        ) end
    from buckets b
    left join events e on e.bucket = b.bucket
    left join active a on a.bucket = b.bucket
    order by b.bucket;
$$;

revoke execute on function public.admin_series(date, date, text)
    from anon, authenticated, public;

-- The totals that are true right now, rather than per period.
create or replace function public.admin_totals()
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
    select jsonb_build_object(
        'users', (select count(*) from public.profiles),
        'onboarded', (select count(*) from public.profiles where onboarded_at is not null),
        'logs', (select count(*) from public.game_logs),
        'reviews', (select count(*) from public.reviews),
        'threads', (select count(*) from public.community_threads),
        'messages', (select count(*) from public.community_messages
                     where deleted_at is null and not is_opening),
        'games', (select count(*) from public.games),
        'friendships', (select count(*) from public.friendships where status = 'accepted'),
        'online', (select count(*) from public.profiles
                   where last_seen_at > now() - interval '5 minutes'),
        'dau', (select count(distinct user_id) from public.user_active_days
                where day = (now() at time zone 'utc')::date),
        'wau', (select count(distinct user_id) from public.user_active_days
                where day > (now() at time zone 'utc')::date - 7),
        'mau', (select count(distinct user_id) from public.user_active_days
                where day > (now() at time zone 'utc')::date - 30)
    );
$$;

revoke execute on function public.admin_totals()
    from anon, authenticated, public;

-- The deeper look behind each tile. One function per metric would be five
-- near-copies; one that branches keeps the period handling in one place.
create or replace function public.admin_metric_detail(
    p_metric text,
    p_from timestamptz,
    p_to timestamptz
)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
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
                    from public.community_messages m
                    join public.community_threads th on th.id = m.thread_id
                    where m.created_at >= p_from and m.created_at < p_to
                      and m.deleted_at is null
                    group by th.id
                    order by count(*) desc
                    limit 8
                ) t
            ), '[]'::jsonb)
        );
    elsif p_metric = 'games' then
        return jsonb_build_object(
            'added', (
                select count(*) from public.game_events
                where kind = 'game_added'
                  and created_at >= p_from and created_at < p_to
            ),
            'withCover', (select count(*) from public.games where cover_url is not null),
            'withBoxArt', (select count(*) from public.games where box_art_url is not null),
            'withDescription', (select count(*) from public.games where description <> ''),
            'detailsSynced', (select count(*) from public.games where details_synced_at is not null),
            'trending', (select count(*) from public.games where is_trending),
            'mostLogged', coalesce((
                select jsonb_agg(row_to_json(t) order by t.count desc)
                from (
                    select id, title, coalesce(box_art_url, cover_url) as "coverUrl",
                           log_count as count
                    from public.games
                    order by log_count desc
                    limit 8
                ) t
            ), '[]'::jsonb)
        );
    end if;

    raise exception 'unknown metric %', p_metric using errcode = '22023';
end;
$$;

revoke execute on function public.admin_metric_detail(text, timestamptz, timestamptz)
    from anon, authenticated, public;
