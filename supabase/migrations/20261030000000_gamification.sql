-- Progress: XP for what people do, levels from XP, badges, a weekly streak,
-- quests, and tokens to spend in a shop.
--
-- XP is a ledger. Every award has a key, so each thing pays once (rating a
-- game, once per game), and deleting the thing deletes its award: making
-- and deleting to farm nets nothing. Triggers on the source tables write
-- it, so every write path is covered, the old routes and the RPCs too.
-- Badges, quests and the streak are worked out by the API from these.
--
-- As everywhere else, only the backend reads and writes these.

set search_path = pg_catalog, public;

-- ------------------------------------------------------------------ rules

create table public.xp_rules (
    source text primary key,
    xp int not null,
    -- Per day in the member's time zone; null for none.
    daily_cap int,
    -- Done by the member, as opposed to received (an upvote) or granted (a
    -- badge). Only these keep a streak going.
    active boolean not null default true
);

insert into public.xp_rules (source, xp, daily_cap, active) values
    ('shelve', 2, 40, true),
    ('play', 10, 150, true),
    ('finish', 20, 200, true),
    ('master', 40, 200, true),
    ('rate', 5, 75, true),
    ('review_short', 10, 125, true),
    ('review_long', 25, 125, true),
    ('review_upvote', 5, 100, false),
    ('thread', 10, 30, true),
    ('reply', 5, 50, true),
    ('post_upvote', 3, 60, false),
    ('friend', 15, 75, true),
    ('list', 20, 60, true),
    ('list_upvote', 5, 50, false),
    ('g25_complete', 100, null, true),
    ('g25_love', 5, 50, false),
    ('avatar', 20, null, true),
    ('bio', 10, null, true),
    ('background', 10, null, true),
    ('favourites', 15, null, true),
    -- Variable: the API passes the amount.
    ('streak', 0, null, false),
    ('quest', 0, null, false),
    ('badge', 0, null, false),
    ('referral_joined', 50, null, false),
    ('referral_active', 250, null, false),
    ('referral_welcome', 100, null, false);

-- ----------------------------------------------------------------- ledgers

create table public.xp_events (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    source text not null references public.xp_rules (source),
    key text not null,
    -- 0 once a daily cap is reached; kept, so quests and the streak count it.
    xp int not null,
    data jsonb not null default '{}',
    created_at timestamptz not null default now(),
    unique (user_id, key)
);

create index xp_events_user_time_idx on public.xp_events (user_id, created_at);
create index xp_events_user_source_idx
    on public.xp_events (user_id, source, created_at);
-- Revoking by a key that names its subject, whoever earned it.
create index xp_events_key_idx on public.xp_events (key);

create table public.token_events (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    source text not null,
    key text not null,
    amount int not null,
    created_at timestamptz not null default now(),
    unique (user_id, key)
);

create index token_events_user_idx on public.token_events (user_id, created_at);

create table public.user_badges (
    user_id uuid not null references public.profiles (id) on delete cascade,
    badge text not null,
    -- 1 bronze, 2 silver, 3 gold, 4 platinum.
    metal smallint not null check (metal between 1 and 4),
    unlocked_at timestamptz not null default now(),
    seen_at timestamptz,
    primary key (user_id, badge, metal)
);

create index user_badges_badge_idx on public.user_badges (badge, metal);

create table public.shop_items (
    item text primary key,
    kind text not null check (kind in ('cosmetic', 'slot', 'helper')),
    price int not null check (price > 0),
    -- Each one owned adds this to the next one's price.
    price_step int not null default 0,
    max_owned int not null default 1,
    active boolean not null default true
);

insert into public.shop_items (item, kind, price, price_step, max_owned) values
    ('frame_neon', 'cosmetic', 60, 0, 1),
    ('frame_pixel', 'cosmetic', 80, 0, 1),
    ('frame_flame', 'cosmetic', 150, 0, 1),
    ('frame_aurora', 'cosmetic', 250, 0, 1),
    ('theme_retro', 'cosmetic', 80, 0, 1),
    ('theme_night', 'cosmetic', 80, 0, 1),
    ('theme_synthwave', 'cosmetic', 120, 0, 1),
    ('effect_sheen', 'cosmetic', 150, 0, 1),
    ('effect_glow', 'cosmetic', 100, 0, 1),
    ('layout_shelf', 'cosmetic', 60, 0, 1),
    ('layout_spotlight', 'cosmetic', 120, 0, 1),
    ('slot_showcase', 'slot', 100, 50, 3),
    ('slot_pinned_list', 'slot', 100, 100, 2),
    -- Held, and spent as they're used.
    ('streak_shield', 'helper', 40, 0, 2),
    ('quest_reroll', 'helper', 20, 0, 3);

create table public.user_items (
    user_id uuid not null references public.profiles (id) on delete cascade,
    item text not null references public.shop_items (item),
    quantity int not null default 0 check (quantity >= 0),
    acquired_at timestamptz not null default now(),
    primary key (user_id, item)
);

-- A bought shield, spent on the week it covered.
create table public.streak_shields_used (
    user_id uuid not null references public.profiles (id) on delete cascade,
    week date not null,
    primary key (user_id, week)
);

create table public.quest_rerolls (
    user_id uuid not null references public.profiles (id) on delete cascade,
    period text not null,
    slot smallint not null,
    seed text not null,
    primary key (user_id, period, slot)
);

alter table public.xp_rules enable row level security;
alter table public.xp_events enable row level security;
alter table public.token_events enable row level security;
alter table public.user_badges enable row level security;
alter table public.shop_items enable row level security;
alter table public.user_items enable row level security;
alter table public.streak_shields_used enable row level security;
alter table public.quest_rerolls enable row level security;
revoke all on public.xp_rules, public.xp_events, public.token_events,
    public.user_badges, public.shop_items, public.user_items,
    public.streak_shields_used, public.quest_rerolls
    from anon, authenticated;

-- ---------------------------------------------------------------- profiles

alter table public.profiles
    add column xp int not null default 0,
    add column tokens int not null default 0,
    add column frame text,
    add column card_theme text,
    add column showcase_badges text[] not null default '{}',
    add column showcase_layout text not null default 'row',
    add column effects text[] not null default '{}',
    add column pinned_lists bigint[] not null default '{}',
    add column referred_by uuid references public.profiles (id) on delete set null,
    add column xp_seen_event_id bigint not null default 0,
    -- Null for members who were here before progress, until their reveal.
    add column revealed_at timestamptz;

alter table public.profiles alter column revealed_at set default now();

create index profiles_referred_by_idx on public.profiles (referred_by)
    where referred_by is not null;

-- Totals kept beside the ledgers, so a level can be read wherever a
-- profile is.
create or replace function public.xp_events_total()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        update public.profiles set xp = xp + new.xp where id = new.user_id;
    elsif tg_op = 'UPDATE' then
        update public.profiles set xp = xp + new.xp - old.xp
        where id = new.user_id;
    else
        update public.profiles set xp = greatest(0, xp - old.xp)
        where id = old.user_id;
    end if;
    return null;
end;
$$;

create trigger xp_events_total
    after insert or update or delete on public.xp_events
    for each row execute function public.xp_events_total();

create or replace function public.token_events_total()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        update public.profiles set tokens = tokens + new.amount
        where id = new.user_id;
    else
        update public.profiles set tokens = tokens - old.amount
        where id = old.user_id;
    end if;
    return null;
end;
$$;

create trigger token_events_total
    after insert or delete on public.token_events
    for each row execute function public.token_events_total();

-- --------------------------------------------------------- award, revoke

-- One award, paid once per key. A daily cap is counted in the member's own
-- day; past it the row still goes in, at 0. An award for a key already paid
-- only ever raises it (a review grown past 200 characters).
create or replace function public.award_xp(
    p_user uuid,
    p_source text,
    p_key text,
    p_data jsonb default '{}',
    p_xp int default null,
    p_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    rule record;
    amount int;
    zone text;
    earned int;
begin
    if p_user is null then
        return;
    end if;
    select xp, daily_cap into rule from public.xp_rules where source = p_source;
    amount := coalesce(p_xp, rule.xp, 0);

    if rule.daily_cap is not null and amount > 0 then
        select coalesce(nullif(timezone, ''), 'UTC') into zone
        from public.profiles where id = p_user;
        select coalesce(sum(xp), 0) into earned
        from public.xp_events
        where user_id = p_user
          and source = p_source
          and key <> p_key
          and (created_at at time zone zone)::date
              = (p_at at time zone zone)::date;
        amount := greatest(0, least(amount, rule.daily_cap - earned));
    end if;

    insert into public.xp_events (user_id, source, key, xp, data, created_at)
    values (p_user, p_source, p_key, amount, coalesce(p_data, '{}'), p_at)
    on conflict (user_id, key) do update
        set xp = excluded.xp, source = excluded.source, data = excluded.data
        where excluded.xp > public.xp_events.xp;
end;
$$;

create or replace function public.revoke_xp(p_user uuid, p_key text)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
    delete from public.xp_events where user_id = p_user and key = p_key;
$$;

-- For keys that name their subject, whoever was paid: a vote's key holds
-- the voted thing and the voter, so it's unique without the owner.
create or replace function public.revoke_xp_key(p_key text)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
    delete from public.xp_events where key = p_key;
$$;

create or replace function public.award_tokens(
    p_user uuid,
    p_source text,
    p_key text,
    p_amount int
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
    insert into public.token_events (user_id, source, key, amount)
    values (p_user, p_source, p_key, p_amount)
    on conflict (user_id, key) do nothing;
$$;

-- -------------------------------------------------------------- triggers

-- A game's XP follows its logs, all consoles together: shelved once put on
-- a shelf, then played, finished, mastered and rated as long as some log
-- says so. A shelving stays paid; the rest go if the logs stop saying it,
-- and everything goes with the last log.
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
           coalesce(bool_or(rating is not null), false) as rated
    into s
    from public.game_logs
    where user_id = p_user and game_id = p_game;

    if s.n = 0 then
        delete from public.xp_events
        where user_id = p_user
          and key in ('shelve:' || g, 'play:' || g, 'finish:' || g,
                      'master:' || g, 'rate:' || g);
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

create or replace function public.xp_from_game_logs()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op <> 'INSERT' then
        perform public.xp_sync_game(old.user_id, old.game_id);
    end if;
    if tg_op <> 'DELETE' then
        perform public.xp_sync_game(new.user_id, new.game_id);
    end if;
    return null;
end;
$$;

create trigger game_logs_xp
    after insert or update or delete on public.game_logs
    for each row execute function public.xp_from_game_logs();

-- A game's review, worth more past 200 characters; under 40 isn't one.
create or replace function public.xp_from_reviews()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    who uuid := coalesce(new.user_id, old.user_id);
    game bigint := coalesce(new.game_id, old.game_id);
    longest int;
begin
    select max(char_length(btrim(body))) into longest
    from public.reviews where user_id = who and game_id = game;

    if longest is null or longest < 40 then
        perform public.revoke_xp(who, 'review:' || game);
    else
        perform public.award_xp(
            who,
            case when longest >= 200 then 'review_long' else 'review_short' end,
            'review:' || game,
            jsonb_build_object('game', game));
    end if;
    return null;
end;
$$;

create trigger reviews_xp
    after insert or update of body or delete on public.reviews
    for each row execute function public.xp_from_reviews();

-- Votes pay the one voted for, never the voter. One voter counts for four
-- a week at most, so two friends can't trade upvotes into levels.
create or replace function public.xp_from_review_votes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    author uuid;
    recent int;
begin
    if tg_op = 'DELETE' then
        perform public.revoke_xp_key(
            'review_vote:' || old.review_id || ':' || old.user_id);
        return null;
    end if;
    select user_id into author from public.reviews where id = new.review_id;
    select count(*) into recent from public.xp_events
    where user_id = author and source = 'review_upvote' and xp > 0
      and data ->> 'voter' = new.user_id::text
      and created_at > now() - interval '7 days';
    perform public.award_xp(
        author, 'review_upvote',
        'review_vote:' || new.review_id || ':' || new.user_id,
        jsonb_build_object('voter', new.user_id, 'review', new.review_id),
        case when recent >= 4 then 0 end);
    return null;
end;
$$;

create trigger review_votes_xp
    after insert or delete on public.review_votes
    for each row execute function public.xp_from_review_votes();

create or replace function public.xp_from_community_threads()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'DELETE' then
        perform public.revoke_xp_key('thread:' || old.id);
    elsif new.subject_kind = 'game' then
        perform public.award_xp(new.author_id, 'thread', 'thread:' || new.id,
            jsonb_build_object('thread', new.id));
    end if;
    return null;
end;
$$;

create trigger community_threads_xp
    after insert or delete on public.community_threads
    for each row execute function public.xp_from_community_threads();

-- Replies only: the opening message is the thread's.
create or replace function public.xp_from_community_messages()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'DELETE' then
        perform public.revoke_xp_key('reply:' || old.id);
    elsif tg_op = 'UPDATE' then
        if new.deleted_at is not null and old.deleted_at is null then
            perform public.revoke_xp_key('reply:' || new.id);
        end if;
    elsif not new.is_opening then
        perform public.award_xp(new.author_id, 'reply', 'reply:' || new.id,
            jsonb_build_object('message', new.id));
    end if;
    return null;
end;
$$;

create trigger community_messages_xp
    after insert or update of deleted_at or delete on public.community_messages
    for each row execute function public.xp_from_community_messages();

create or replace function public.xp_from_community_message_votes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    author uuid;
begin
    if tg_op = 'DELETE' then
        perform public.revoke_xp_key(
            'post_vote:' || old.message_id || ':' || old.user_id);
        return null;
    end if;
    select author_id into author from public.community_messages
    where id = new.message_id;
    perform public.award_xp(
        author, 'post_upvote',
        'post_vote:' || new.message_id || ':' || new.user_id,
        jsonb_build_object('voter', new.user_id, 'message', new.message_id));
    return null;
end;
$$;

create trigger community_message_votes_xp
    after insert or delete on public.community_message_votes
    for each row execute function public.xp_from_community_message_votes();

create or replace function public.xp_from_friendships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'DELETE' then
        perform public.revoke_xp(old.user_a_id, 'friend:' || old.user_b_id);
        perform public.revoke_xp(old.user_b_id, 'friend:' || old.user_a_id);
    elsif new.status = 'accepted'
        and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
        perform public.award_xp(new.user_a_id, 'friend',
            'friend:' || new.user_b_id, jsonb_build_object('friend', new.user_b_id));
        perform public.award_xp(new.user_b_id, 'friend',
            'friend:' || new.user_a_id, jsonb_build_object('friend', new.user_a_id));
    end if;
    return null;
end;
$$;

create trigger friendships_xp
    after insert or update of status or delete on public.friendships
    for each row execute function public.xp_from_friendships();

-- A list pays once it reaches five games, and goes with the list.
create or replace function public.xp_from_game_list_items()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    owner uuid;
    n int;
begin
    select user_id into owner from public.game_lists where id = new.list_id;
    select count(*) into n from public.game_list_items where list_id = new.list_id;
    if n >= 5 then
        perform public.award_xp(owner, 'list', 'list:' || new.list_id,
            jsonb_build_object('list', new.list_id));
    end if;
    return null;
end;
$$;

create trigger game_list_items_xp
    after insert on public.game_list_items
    for each row execute function public.xp_from_game_list_items();

create or replace function public.xp_from_game_lists()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    perform public.revoke_xp_key('list:' || old.id);
    return null;
end;
$$;

create trigger game_lists_xp
    after delete on public.game_lists
    for each row execute function public.xp_from_game_lists();

create or replace function public.xp_from_game_list_votes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    owner uuid;
begin
    if tg_op = 'DELETE' then
        perform public.revoke_xp_key(
            'list_vote:' || old.list_id || ':' || old.user_id);
        return null;
    end if;
    select user_id into owner from public.game_lists where id = new.list_id;
    perform public.award_xp(owner, 'list_upvote',
        'list_vote:' || new.list_id || ':' || new.user_id,
        jsonb_build_object('voter', new.user_id, 'list', new.list_id));
    return null;
end;
$$;

create trigger game_list_votes_xp
    after insert or delete on public.game_list_votes
    for each row execute function public.xp_from_game_list_votes();

-- Paid once all 25 are filled; clearing a cell later keeps it.
create or replace function public.xp_from_gaming_25_picks()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if (select count(*) from public.gaming_25_picks
        where user_id = new.user_id) >= 25 then
        perform public.award_xp(new.user_id, 'g25_complete', 'g25');
    end if;
    return null;
end;
$$;

create trigger gaming_25_picks_xp
    after insert or update on public.gaming_25_picks
    for each row execute function public.xp_from_gaming_25_picks();

create or replace function public.xp_from_gaming_25_loves()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'DELETE' then
        perform public.revoke_xp_key(
            'g25_love:' || old.owner_id || ':' || old.user_id);
    else
        perform public.award_xp(new.owner_id, 'g25_love',
            'g25_love:' || new.owner_id || ':' || new.user_id,
            jsonb_build_object('lover', new.user_id));
    end if;
    return null;
end;
$$;

create trigger gaming_25_loves_xp
    after insert or delete on public.gaming_25_loves
    for each row execute function public.xp_from_gaming_25_loves();

create or replace function public.xp_from_favourite_games()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if (select count(*) from public.favourite_games
        where user_id = new.user_id) >= 6 then
        perform public.award_xp(new.user_id, 'favourites', 'favourites');
    end if;
    return null;
end;
$$;

create trigger favourite_games_xp
    after insert on public.favourite_games
    for each row execute function public.xp_from_favourite_games();

-- Filling in a profile pays once a part; emptying it again keeps it.
create or replace function public.xp_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.avatar_url is not null and old.avatar_url is null then
        perform public.award_xp(new.id, 'avatar', 'avatar');
    end if;
    if btrim(coalesce(new.bio, '')) <> '' and btrim(coalesce(old.bio, '')) = '' then
        perform public.award_xp(new.id, 'bio', 'bio');
    end if;
    if new.background_url is not null and old.background_url is null then
        perform public.award_xp(new.id, 'background', 'background');
    end if;
    return null;
end;
$$;

create trigger profiles_xp
    after update of avatar_url, bio, background_url on public.profiles
    for each row execute function public.xp_from_profiles();

-- --------------------------------------------------------------- reading

-- Every count a badge is measured by, in one call.
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
        'logged', (select count(distinct game_id) from logs),
        'rated', (select count(distinct game_id) from logs where rating is not null),
        'hours', (select coalesce(sum(least(coalesce(hours_played, 0), 1000)), 0)::int from logs),
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
                             where user_id = p.id) >= 5),
        'quests', (select count(*) from public.xp_events
                   where user_id = p_user and source = 'quest'),
        'founding', (select ((select count(*) from public.profiles o
                              where o.created_at < me.created_at) < 100)::int
                     from public.profiles me where me.id = p_user),
        'binge', (select coalesce(max(n), 0) from (
                      select count(distinct game_id) as n from logs
                      group by created_at::date) d),
        'perfectScore', (select exists (
                            select 1 from public.reviews r
                            join public.game_logs l on l.id = r.log_id
                            where r.user_id = p_user and l.rating = 10
                              and r.created_at::date = l.updated_at::date)::int),
        'retiredVeteran', (select exists (
                              select 1 from logs
                              where played_status = 'retired'
                                and hours_played >= 100)::int)
    );
$$;

-- The weeks, from Monday in the member's zone, with something they did.
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
    order by 1 desc;
$$;

-- XP each of these people earned since a moment, for the leaderboard. The
-- badges a launch reveal hands out for a member's history aren't this
-- week's doing, so they don't count.
create or replace function public.xp_since(p_users uuid[], p_since timestamptz)
returns table (user_id uuid, xp bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select u, coalesce((select sum(e.xp) from public.xp_events e
                        where e.user_id = u and e.created_at >= p_since
                          and not e.data ? 'launch'), 0)
    from unnest(p_users) as u;
$$;

-- How many hold each badge at each metal or better.
create or replace function public.badge_holders()
returns table (badge text, metal smallint, holders bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select badge, metal, count(distinct user_id)
    from public.user_badges
    group by badge, metal;
$$;

-- -------------------------------------------------------------------- shop

-- One purchase, all or nothing. The profile row is locked first, so two
-- purchases at once can't both spend the same tokens.
create or replace function public.buy_item(p_user uuid, p_item text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    it record;
    balance int;
    have int;
    cost int;
begin
    select * into it from public.shop_items where item = p_item and active;
    if not found then
        raise exception 'unknown_item';
    end if;
    select tokens into balance from public.profiles where id = p_user for update;
    select coalesce(quantity, 0) into have from public.user_items
    where user_id = p_user and item = p_item;
    have := coalesce(have, 0);
    if have >= it.max_owned then
        raise exception 'max_owned';
    end if;
    -- Slots grow dearer as you buy them; helpers don't.
    cost := it.price + it.price_step * case when it.kind = 'slot' then have else 0 end;
    if balance < cost then
        raise exception 'insufficient_tokens';
    end if;

    insert into public.token_events (user_id, source, key, amount)
    values (p_user, 'purchase', 'buy:' || p_item || ':' || gen_random_uuid(), -cost);
    insert into public.user_items (user_id, item, quantity)
    values (p_user, p_item, 1)
    on conflict (user_id, item) do update
        set quantity = public.user_items.quantity + 1, acquired_at = now();

    return jsonb_build_object('tokens', balance - cost, 'owned', have + 1);
end;
$$;

create or replace function public.use_item(p_user uuid, p_item text)
returns int
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    left_over int;
begin
    update public.user_items set quantity = quantity - 1
    where user_id = p_user and item = p_item and quantity > 0
    returning quantity into left_over;
    if not found then
        raise exception 'none_left';
    end if;
    return left_over;
end;
$$;

revoke execute on function
    public.xp_events_total(), public.token_events_total(),
    public.award_xp(uuid, text, text, jsonb, int, timestamptz),
    public.revoke_xp(uuid, text), public.revoke_xp_key(text),
    public.award_tokens(uuid, text, text, int),
    public.xp_sync_game(uuid, bigint),
    public.xp_from_game_logs(), public.xp_from_reviews(),
    public.xp_from_review_votes(), public.xp_from_community_threads(),
    public.xp_from_community_messages(), public.xp_from_community_message_votes(),
    public.xp_from_friendships(), public.xp_from_game_list_items(),
    public.xp_from_game_lists(), public.xp_from_game_list_votes(),
    public.xp_from_gaming_25_picks(), public.xp_from_gaming_25_loves(),
    public.xp_from_favourite_games(), public.xp_from_profiles(),
    public.player_metrics(uuid), public.player_weeks(uuid),
    public.xp_since(uuid[], timestamptz), public.badge_holders(),
    public.buy_item(uuid, text), public.use_item(uuid, text)
    from anon, authenticated, public;

-- ---------------------------------------------------------------- backfill

-- What members did before this, paid at its own time and without daily
-- caps: their history counts in full. The same keys the triggers use, so
-- nothing pays twice from here on.
insert into public.xp_events (user_id, source, key, xp, data, created_at)
select user_id, source, key, r.xp, data, at
from (
    select user_id, 'shelve' as source, 'shelve:' || game_id as key,
           jsonb_build_object('game', game_id, 'backfill', true) as data,
           min(created_at) as at
    from public.game_logs where status in ('backlog', 'wishlist')
    group by user_id, game_id
    union all
    select user_id, 'play', 'play:' || game_id,
           jsonb_build_object('game', game_id, 'backfill', true), min(created_at)
    from public.game_logs where status in ('played', 'playing')
    group by user_id, game_id
    union all
    select user_id, 'finish', 'finish:' || game_id,
           jsonb_build_object('game', game_id, 'backfill', true), min(updated_at)
    from public.game_logs where played_status in ('finished', 'mastered')
    group by user_id, game_id
    union all
    select user_id, 'master', 'master:' || game_id,
           jsonb_build_object('game', game_id, 'backfill', true), min(updated_at)
    from public.game_logs where played_status = 'mastered'
    group by user_id, game_id
    union all
    select user_id, 'rate', 'rate:' || game_id,
           jsonb_build_object('game', game_id, 'backfill', true), min(updated_at)
    from public.game_logs where rating is not null
    group by user_id, game_id
    union all
    select user_id,
           case when max(char_length(btrim(body))) >= 200
                then 'review_long' else 'review_short' end,
           'review:' || game_id,
           jsonb_build_object('game', game_id, 'backfill', true), min(created_at)
    from public.reviews
    group by user_id, game_id
    having max(char_length(btrim(body))) >= 40
    union all
    select r.user_id, 'review_upvote', 'review_vote:' || v.review_id || ':' || v.user_id,
           jsonb_build_object('voter', v.user_id, 'review', v.review_id, 'backfill', true),
           r.created_at
    from public.review_votes v join public.reviews r on r.id = v.review_id
    union all
    select author_id, 'thread', 'thread:' || id,
           jsonb_build_object('thread', id, 'backfill', true), created_at
    from public.community_threads
    where author_id is not null and subject_kind = 'game'
    union all
    select author_id, 'reply', 'reply:' || id,
           jsonb_build_object('message', id, 'backfill', true), created_at
    from public.community_messages
    where author_id is not null and not is_opening and deleted_at is null
    union all
    select m.author_id, 'post_upvote', 'post_vote:' || v.message_id || ':' || v.user_id,
           jsonb_build_object('voter', v.user_id, 'message', v.message_id, 'backfill', true),
           m.created_at
    from public.community_message_votes v
    join public.community_messages m on m.id = v.message_id
    where m.author_id is not null
    union all
    select user_a_id, 'friend', 'friend:' || user_b_id,
           jsonb_build_object('friend', user_b_id, 'backfill', true), updated_at
    from public.friendships where status = 'accepted'
    union all
    select user_b_id, 'friend', 'friend:' || user_a_id,
           jsonb_build_object('friend', user_a_id, 'backfill', true), updated_at
    from public.friendships where status = 'accepted'
    union all
    select l.user_id, 'list', 'list:' || l.id,
           jsonb_build_object('list', l.id, 'backfill', true), l.created_at
    from public.game_lists l
    where (select count(*) from public.game_list_items i where i.list_id = l.id) >= 5
    union all
    select l.user_id, 'list_upvote', 'list_vote:' || v.list_id || ':' || v.user_id,
           jsonb_build_object('voter', v.user_id, 'list', v.list_id, 'backfill', true),
           v.created_at
    from public.game_list_votes v join public.game_lists l on l.id = v.list_id
    union all
    select user_id, 'g25_complete', 'g25',
           jsonb_build_object('backfill', true), max(updated_at)
    from public.gaming_25_picks
    group by user_id having count(*) >= 25
    union all
    select owner_id, 'g25_love', 'g25_love:' || owner_id || ':' || user_id,
           jsonb_build_object('lover', user_id, 'backfill', true), created_at
    from public.gaming_25_loves
    union all
    select user_id, 'favourites', 'favourites',
           jsonb_build_object('backfill', true), max(created_at)
    from public.favourite_games
    group by user_id having count(*) >= 6
    union all
    select id, 'avatar', 'avatar', jsonb_build_object('backfill', true), created_at
    from public.profiles where avatar_url is not null
    union all
    select id, 'bio', 'bio', jsonb_build_object('backfill', true), created_at
    from public.profiles where btrim(coalesce(bio, '')) <> ''
    union all
    select id, 'background', 'background', jsonb_build_object('backfill', true), created_at
    from public.profiles where background_url is not null
) h
join public.xp_rules r using (source)
where h.user_id is not null
on conflict (user_id, key) do nothing;

-- The history is the reveal's to show, not a stream of toasts.
update public.profiles p
set xp_seen_event_id = coalesce(
    (select max(id) from public.xp_events e where e.user_id = p.id), 0);
