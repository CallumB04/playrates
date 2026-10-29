-- Progress, third pass: a balance across the economy, played games only in
-- the counts, removals that no longer re-earn, a weekly task swap, and what
-- the daily job needs to nudge members back.

set search_path = pg_catalog, public;

-- ------------------------------------------------------------------ rules

-- A wishlist is one click a game, so it pays little and stops early, and
-- reactions received are passive, so they pay less than doing something.
-- Reviews are what a profile is for, so they pay more.
update public.xp_rules set xp = 1, daily_cap = 10 where source = 'shelve';
update public.xp_rules set xp = 15, daily_cap = 150 where source = 'review_short';
update public.xp_rules set xp = 30, daily_cap = 150 where source = 'review_long';
update public.xp_rules set xp = 3, daily_cap = 60 where source = 'review_upvote';
update public.xp_rules set xp = 2, daily_cap = 40 where source = 'post_upvote';
update public.xp_rules set xp = 3, daily_cap = 30 where source = 'list_upvote';
update public.xp_rules set xp = 3, daily_cap = 30 where source = 'g25_love';

-- Nobody has seen a level yet, so what is already in the ledger is priced
-- as it would be now, and the reveal shows one set of rules. A row a daily
-- cap cut short keeps what it had, if that is less.
update public.xp_events e
set xp = case when e.xp >= o.old then o.new else least(e.xp, o.new) end
from (values
    ('shelve', 2, 1),
    ('review_short', 10, 15),
    ('review_long', 25, 30),
    ('review_upvote', 5, 3),
    ('post_upvote', 3, 2),
    ('list_upvote', 5, 3),
    ('g25_love', 5, 3)
) as o (source, old, new)
where e.source = o.source
  and e.xp <> case when e.xp >= o.old then o.new else least(e.xp, o.new) end;

-- Badge XP by metal, as METAL_XP in shared/src/schemas/progress.ts has it.
update public.xp_events
set xp = case split_part(key, ':', 3)
    when '1' then 25 when '2' then 50 when '3' then 100 else 200 end
where source = 'badge'
  and xp > 0
  and key not like 'badge:founding_member:%'
  and xp <> case split_part(key, ':', 3)
    when '1' then 25 when '2' then 50 when '3' then 100 else 200 end;

-- Founding Member is for being early, which nobody did anything to earn: it
-- stays a badge and pays nothing. The trigger takes its XP back off each
-- total. Tokens already paid for it stay, as they may be spent.
delete from public.xp_events where key like 'badge:founding_member:%';

-- ---------------------------------------------------------------- revoking

-- A revoked award keeps its row at 0, marked, rather than going. Earning it
-- again restores the row as it was, with its first date, so taking a rating
-- off an old game and putting it back is not this week's rating: tasks, the
-- streak and the weekly board count nothing for it.
create or replace function public.revoke_xp(p_user uuid, p_key text)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
    update public.xp_events
    set xp = 0, data = data || '{"revoked": true}'
    where user_id = p_user and key = p_key and not data ? 'revoked';
$$;

create or replace function public.revoke_xp_key(p_key text)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
    update public.xp_events
    set xp = 0, data = data || '{"revoked": true}'
    where key = p_key and not data ? 'revoked';
$$;

-- As before, with ratings counted only on games played, and the last log
-- going revoking rather than deleting.
create or replace function public.xp_sync_game(p_user uuid, p_game bigint)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    s record;
    g text := p_game::text;
    d jsonb := jsonb_build_object('game', p_game);
begin
    select count(*) as n,
           coalesce(bool_or(status in ('backlog', 'wishlist')), false) as shelved,
           coalesce(bool_or(status in ('played', 'playing')), false) as played,
           coalesce(bool_or(played_status in ('finished', 'mastered')), false) as finished,
           coalesce(bool_or(played_status = 'mastered'), false) as mastered,
           coalesce(bool_or(rating is not null
                            and status in ('played', 'playing')), false) as rated
    into s
    from public.game_logs
    where user_id = p_user and game_id = p_game;

    if s.n = 0 then
        perform public.revoke_xp(p_user, 'shelve:' || g);
        perform public.revoke_xp(p_user, 'play:' || g);
        perform public.revoke_xp(p_user, 'finish:' || g);
        perform public.revoke_xp(p_user, 'master:' || g);
        perform public.revoke_xp(p_user, 'rate:' || g);
        return;
    end if;

    if s.shelved then
        perform public.award_xp(p_user, 'shelve', 'shelve:' || g, d);
    end if;
    if s.played then
        perform public.award_xp(p_user, 'play', 'play:' || g, d);
    else
        perform public.revoke_xp(p_user, 'play:' || g);
    end if;
    if s.finished then
        perform public.award_xp(p_user, 'finish', 'finish:' || g, d);
    else
        perform public.revoke_xp(p_user, 'finish:' || g);
    end if;
    if s.mastered then
        perform public.award_xp(p_user, 'master', 'master:' || g, d);
    else
        perform public.revoke_xp(p_user, 'master:' || g);
    end if;
    if s.rated then
        perform public.award_xp(p_user, 'rate', 'rate:' || g, d);
    else
        perform public.revoke_xp(p_user, 'rate:' || g);
    end if;
end;
$$;

-- A rating on a wishlist or backlog game was paid before; it isn't now.
select public.revoke_xp(e.user_id, e.key)
from public.xp_events e
where e.source = 'rate'
  and not e.data ? 'revoked'
  and not exists (
      select 1 from public.game_logs l
      where l.user_id = e.user_id
        and l.game_id = (e.data ->> 'game')::bigint
        and l.rating is not null
        and l.status in ('played', 'playing'));

-- The streak's weeks, leaving out what was taken back.
create or replace function public.player_weeks(p_user uuid)
returns table (week date)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select distinct date_trunc('week',
        e.created_at at time zone coalesce(nullif(p.timezone, ''), 'UTC'))::date
    from public.xp_events e
    join public.xp_rules r on r.source = e.source and r.active
    join public.profiles p on p.id = e.user_id
    where e.user_id = p_user
      and not e.data ? 'revoked'
    order by 1 desc;
$$;

-- ----------------------------------------------------------------- metrics

-- As before, but a game counts once it's played or playing: wishlisting
-- or backlogging a hundred games earns no badge. `shelved` is every game
-- on any shelf, for getting started only. The 5 for an invite getting going
-- is REFERRAL.activeAfter in shared/src/schemas/progress.ts.
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
        'hours', (select coalesce(sum(least(coalesce(hours_played, 0), 1000)), 0)::int
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

-- -------------------------------------------------------------------- shop

-- Tasks pay more tokens now, so the shop asks more: a first small thing in
-- a couple of weeks, a frame in a month or two, the dearest over months.
update public.shop_items s
set price = p.price, price_step = p.step
from (values
    ('frame_neon', 120, 0),
    ('frame_pixel', 200, 0),
    ('frame_flame', 350, 0),
    ('frame_aurora', 600, 0),
    ('theme_retro', 150, 0),
    ('theme_night', 150, 0),
    ('theme_synthwave', 300, 0),
    ('font_terminal', 100, 0),
    ('font_pixel', 200, 0),
    ('font_bungee', 150, 0),
    ('font_marker', 150, 0),
    ('colour_ember', 75, 0),
    ('colour_mint', 75, 0),
    ('colour_rose', 75, 0),
    ('colour_sunset', 200, 0),
    ('colour_holo', 400, 0),
    ('react_goat', 100, 0),
    ('react_dead', 75, 0),
    ('react_hype', 75, 0),
    ('react_congrats', 75, 0),
    ('react_big_brain', 75, 0),
    ('react_sad', 75, 0),
    ('slot_showcase', 150, 75),
    ('slot_pinned_list', 150, 150),
    ('slot_pinned_review', 100, 50),
    ('streak_shield', 60, 0)
) as p (item, price, step)
where s.item = p.item;

-- As before, at the new price. backgroundPrice() in
-- shared/src/schemas/progress.ts is the same rule; keep the two together.
create or replace function public.buy_background(
    p_user uuid, p_game bigint, p_url text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    balance int;
    from_game int;
    credit int;
    cost int;
begin
    select tokens into balance from public.profiles where id = p_user for update;
    if exists (
        select 1 from public.user_backgrounds where user_id = p_user and url = p_url
    ) then
        raise exception 'owned';
    end if;
    select count(*) into from_game from public.user_backgrounds
    where user_id = p_user and game_id = p_game;
    select coalesce(quantity, 0) into credit from public.user_items
    where user_id = p_user and item = 'background_credit';
    credit := coalesce(credit, 0);

    if credit > 0 then
        cost := 0;
        update public.user_items set quantity = quantity - 1
        where user_id = p_user and item = 'background_credit';
    else
        cost := 25 + 10 * from_game;
        if balance < cost then
            raise exception 'insufficient_tokens';
        end if;
        insert into public.token_events (user_id, source, key, amount)
        values (p_user, 'purchase', 'background:' || gen_random_uuid(), -cost);
    end if;

    insert into public.user_backgrounds (user_id, game_id, url, price)
    values (p_user, p_game, p_url, cost);
    return jsonb_build_object('tokens', balance - cost, 'cost', cost);
end;
$$;

-- ------------------------------------------------------------------- tasks

-- The one free swap a week: which slot, and the task put in it. The key is
-- the week, so a second swap that week is refused by the table itself.
create table public.task_swaps (
    user_id uuid not null references public.profiles (id) on delete cascade,
    period text not null,
    slot smallint not null check (slot between 0 and 2),
    quest text not null,
    swapped_at timestamptz not null default now(),
    primary key (user_id, period)
);

alter table public.task_swaps enable row level security;
revoke all on public.task_swaps from anon, authenticated;

-- ------------------------------------------------------------------ nudges

-- What the daily job needs to decide who to nudge, for every member seen
-- since p_since, in one statement: their active weeks and shields for the
-- streak, and this week's and month's ledger by source, with the 8 weeks
-- before each (HABIT_WEEKS) that pick their tasks. Periods are each
-- member's own, from Monday and the 1st at local midnight, as periodsFor()
-- has them.
create or replace function public.nudge_candidates(
    p_since timestamptz, p_now timestamptz default now()
)
returns table (
    user_id uuid,
    timezone text,
    weeks date[],
    shields date[],
    spare int,
    week_counts jsonb,
    month_counts jsonb,
    week_habits jsonb,
    month_habits jsonb,
    swaps jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with bounds as (
        select p.id, z.zone,
               date_trunc('week', p_now at time zone z.zone) at time zone z.zone as week_start,
               date_trunc('month', p_now at time zone z.zone) at time zone z.zone as month_start
        from public.profiles p
        cross join lateral (select coalesce(nullif(p.timezone, ''), 'UTC') as zone) z
        where p.last_seen_at >= p_since
    )
    -- Each count reads the ledger by member and time, which its indexes
    -- serve; nothing here walks the whole table.
    select
        b.id,
        b.zone,
        array(
            select distinct date_trunc('week', e.created_at at time zone b.zone)::date
            from public.xp_events e
            join public.xp_rules r on r.source = e.source and r.active
            where e.user_id = b.id and not e.data ? 'revoked'),
        array(select s.week from public.streak_shields_used s where s.user_id = b.id),
        coalesce((select i.quantity from public.user_items i
                  where i.user_id = b.id and i.item = 'streak_shield'), 0),
        (select coalesce(jsonb_object_agg(source, n), '{}') from (
            select e.source, count(*) as n from public.xp_events e
            where e.user_id = b.id and not e.data ? 'revoked'
              and e.created_at >= b.week_start and e.created_at < p_now
            group by e.source) x),
        (select coalesce(jsonb_object_agg(source, n), '{}') from (
            select e.source, count(*) as n from public.xp_events e
            where e.user_id = b.id and not e.data ? 'revoked'
              and e.created_at >= b.month_start and e.created_at < p_now
            group by e.source) x),
        (select coalesce(jsonb_object_agg(source, n), '{}') from (
            select e.source, count(*) as n from public.xp_events e
            where e.user_id = b.id and not e.data ? 'revoked'
              and e.created_at >= b.week_start - interval '8 weeks'
              and e.created_at < b.week_start
            group by e.source) x),
        (select coalesce(jsonb_object_agg(source, n), '{}') from (
            select e.source, count(*) as n from public.xp_events e
            where e.user_id = b.id and not e.data ? 'revoked'
              and e.created_at >= b.month_start - interval '8 weeks'
              and e.created_at < b.month_start
            group by e.source) x),
        (select coalesce(jsonb_agg(jsonb_build_object(
                    'period', t.period, 'slot', t.slot, 'quest', t.quest)), '[]')
         from public.task_swaps t
         where t.user_id = b.id and t.swapped_at >= b.week_start)
    from bounds b;
$$;

-- Raises each notification once: one already under its key, read or not,
-- is left as it is, so a daily job can run again without nagging. Returns
-- how many were new.
create or replace function public.raise_notifications_once(p_rows jsonb)
returns int
language sql
security definer
set search_path = pg_catalog, public
as $$
    with added as (
        insert into public.notifications (user_id, kind, actor_id, data, dedupe_key)
        select (r ->> 'user_id')::uuid, r ->> 'kind', (r ->> 'actor_id')::uuid,
               coalesce(r -> 'data', '{}'), r ->> 'dedupe_key'
        from jsonb_array_elements(p_rows) r
        on conflict (user_id, dedupe_key) where dedupe_key is not null
        do nothing
        returning 1
    )
    select count(*)::int from added;
$$;

revoke execute on function
    public.revoke_xp(uuid, text), public.revoke_xp_key(text),
    public.xp_sync_game(uuid, bigint), public.player_weeks(uuid),
    public.player_metrics(uuid),
    public.buy_background(uuid, bigint, text),
    public.nudge_candidates(timestamptz, timestamptz),
    public.raise_notifications_once(jsonb)
    from anon, authenticated, public;
