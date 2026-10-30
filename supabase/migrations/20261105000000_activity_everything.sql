-- The activity log, caught up with v1.1: lists, Gaming 25, progress, the
-- shop, gifts, referrals, emails, reports and announcements, and which
-- reaction a vote was. Triggers, as the rest of the log is, so every path
-- that writes is covered.

set search_path = pg_catalog, public;

-- ------------------------------------------------------------ reactions

-- Which reaction, and a swap from one to another counts too: the vote is
-- upserted, so a swap is an update, which only inserts used to log.
create or replace function public.activity_from_review_votes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'UPDATE' and new.reaction is not distinct from old.reaction then
        return null;
    end if;
    insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
    select new.user_id, 'review_upvoted', r.game_id, r.id::text,
           jsonb_build_object('authorId', r.user_id, 'reaction', new.reaction)
    from public.reviews r
    where r.id = new.review_id;
    return null;
end;
$$;

drop trigger review_votes_activity on public.review_votes;
create trigger review_votes_activity
    after insert or update of reaction on public.review_votes
    for each row execute function public.activity_from_review_votes();

create or replace function public.activity_from_community_message_votes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'UPDATE' and new.reaction is not distinct from old.reaction then
        return null;
    end if;
    insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
    select new.user_id, 'message_upvoted', t.game_id, m.id::text,
           jsonb_build_object(
               'threadId', m.thread_id,
               'threadTitle', t.title,
               'authorId', m.author_id,
               'reaction', new.reaction
           )
    from public.community_messages m
    join public.community_threads t on t.id = m.thread_id
    where m.id = new.message_id;
    return null;
end;
$$;

drop trigger community_message_votes_activity on public.community_message_votes;
create trigger community_message_votes_activity
    after insert or update of reaction on public.community_message_votes
    for each row execute function public.activity_from_community_message_votes();

-- ----------------------------------------------------------------- lists

create or replace function public.activity_from_game_lists()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    changed text[];
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.user_id, 'list_created', new.id::text,
                jsonb_build_object('name', new.name,
                                   'visibility', new.visibility));
    elsif tg_op = 'DELETE' then
        if public.profile_exists(old.user_id) then
            insert into public.activity_events (actor_id, kind, subject_id, data)
            values (old.user_id, 'list_deleted', old.id::text,
                    jsonb_build_object('name', old.name));
        end if;
    else
        -- Its covers and its updated_at move with every game added.
        changed := array_remove(array[
            case when new.name is distinct from old.name then 'name' end,
            case when new.description is distinct from old.description then 'description' end,
            case when new.visibility is distinct from old.visibility then 'visibility' end,
            case when new.ranked is distinct from old.ranked then 'ranking' end,
            case when new.colour is distinct from old.colour then 'colour' end
        ], null);
        if cardinality(changed) > 0 then
            insert into public.activity_events (actor_id, kind, subject_id, data)
            values (new.user_id, 'list_updated', new.id::text,
                    jsonb_build_object('name', new.name,
                                       'visibility', new.visibility,
                                       'fields', to_jsonb(changed)));
        end if;
    end if;
    return null;
end;
$$;

create trigger game_lists_activity
    after insert or update or delete on public.game_lists
    for each row execute function public.activity_from_game_lists();

-- Saving a list's order deletes its games and puts them back, each with
-- the day it was first added. So a game is new only if it was added in this
-- transaction, and gone only if it's still gone once the transaction ends:
-- that check waits for the commit.
create or replace function public.activity_from_game_list_items()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.added_at < now() then
        return null;
    end if;
    insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
    select l.user_id, 'list_game_added', new.game_id, l.id::text,
           jsonb_build_object('name', l.name)
    from public.game_lists l
    where l.id = new.list_id;
    return null;
end;
$$;

create trigger game_list_items_activity
    after insert on public.game_list_items
    for each row execute function public.activity_from_game_list_items();

create or replace function public.activity_from_game_list_items_gone()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if exists (
        select 1 from public.game_list_items
        where list_id = old.list_id and game_id = old.game_id
    ) then
        return null;
    end if;
    -- Gone with its list or its owner, nothing: that says it.
    insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
    select l.user_id, 'list_game_removed', old.game_id, l.id::text,
           jsonb_build_object('name', l.name)
    from public.game_lists l
    where l.id = old.list_id and public.profile_exists(l.user_id);
    return null;
end;
$$;

create constraint trigger game_list_items_gone_activity
    after delete on public.game_list_items
    deferrable initially deferred
    for each row execute function public.activity_from_game_list_items_gone();

create or replace function public.activity_from_game_list_votes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.activity_events (actor_id, kind, subject_id, data)
    select new.user_id, 'list_loved', l.id::text,
           jsonb_build_object('name', l.name, 'ownerId', l.user_id)
    from public.game_lists l
    where l.id = new.list_id;
    return null;
end;
$$;

create trigger game_list_votes_activity
    after insert on public.game_list_votes
    for each row execute function public.activity_from_game_list_votes();

-- ------------------------------------------------------------- Gaming 25

create or replace function public.activity_from_gaming_25_picks()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'DELETE' then
        if public.profile_exists(old.user_id) then
            insert into public.activity_events (actor_id, kind, game_id, data)
            values (old.user_id, 'g25_unpicked', old.game_id,
                    jsonb_build_object('category', old.category));
        end if;
    elsif tg_op = 'INSERT' or new.game_id is distinct from old.game_id then
        insert into public.activity_events (actor_id, kind, game_id, data)
        values (new.user_id, 'g25_picked', new.game_id,
                jsonb_build_object('category', new.category));
    end if;
    return null;
end;
$$;

create trigger gaming_25_picks_activity
    after insert or update or delete on public.gaming_25_picks
    for each row execute function public.activity_from_gaming_25_picks();

create or replace function public.activity_from_gaming_25_loves()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.activity_events (actor_id, kind, subject_id)
    values (new.user_id, 'g25_loved', new.owner_id::text);
    return null;
end;
$$;

create trigger gaming_25_loves_activity
    after insert on public.gaming_25_loves
    for each row execute function public.activity_from_gaming_25_loves();

-- -------------------------------------------------------------- progress

-- The ledgers mark the moments: a task, a week's streak, getting started,
-- a finished Gaming 25, an invite that got going. Inserts only: a key paid
-- again is an update, and not news.
create or replace function public.activity_from_xp_events()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.source = 'quest' then
        -- quest:<period>:<task>
        insert into public.activity_events (actor_id, kind, data)
        values (new.user_id, 'task_done',
                jsonb_build_object('period', split_part(new.key, ':', 2),
                                   'quest', split_part(new.key, ':', 3),
                                   'xp', new.xp));
    elsif new.source = 'streak' then
        insert into public.activity_events (actor_id, kind, data)
        values (new.user_id, 'streak_kept',
                jsonb_build_object('week', split_part(new.key, ':', 2),
                                   'xp', new.xp));
    elsif new.source = 'setup' then
        insert into public.activity_events (actor_id, kind, data)
        values (new.user_id, 'setup_done', jsonb_build_object('xp', new.xp));
    elsif new.source = 'g25_complete' then
        insert into public.activity_events (actor_id, kind, data)
        values (new.user_id, 'g25_completed', jsonb_build_object('xp', new.xp));
    elsif new.source = 'referral_active' then
        -- ref:<who was invited>:active
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.user_id, 'referral_active', split_part(new.key, ':', 2),
                jsonb_build_object('xp', new.xp));
    end if;
    return null;
end;
$$;

create trigger xp_events_activity
    after insert on public.xp_events
    for each row execute function public.activity_from_xp_events();

create or replace function public.activity_from_user_badges()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.activity_events (actor_id, kind, data)
    values (new.user_id, 'badge_earned',
            jsonb_build_object('badge', new.badge, 'metal', new.metal));
    return null;
end;
$$;

create trigger user_badges_activity
    after insert on public.user_badges
    for each row execute function public.activity_from_user_badges();

create or replace function public.activity_from_task_swaps()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.activity_events (actor_id, kind, data)
    values (new.user_id, 'task_swapped',
            jsonb_build_object('period', new.period, 'quest', new.quest));
    return null;
end;
$$;

create trigger task_swaps_activity
    after insert on public.task_swaps
    for each row execute function public.activity_from_task_swaps();

-- ------------------------------------------------------------------ shop

-- A level's tokens mark the level, once each; a purchase's key names the
-- item; an admin's grant is the admin source. Backgrounds and gifts are
-- told where they're recorded, below.
create or replace function public.activity_from_token_events()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.source = 'level' then
        insert into public.activity_events (actor_id, kind, data)
        values (new.user_id, 'level_up',
                jsonb_build_object('level', split_part(new.key, ':', 2)::int,
                                   'tokens', new.amount));
    elsif new.source = 'purchase' and new.key like 'buy:%' then
        insert into public.activity_events (actor_id, kind, data)
        values (new.user_id, 'item_bought',
                jsonb_build_object('item', split_part(new.key, ':', 2),
                                   'tokens', -new.amount));
    elsif new.source = 'admin' then
        insert into public.activity_events (actor_id, kind, data)
        values (new.user_id, 'tokens_granted',
                jsonb_build_object('tokens', new.amount));
    end if;
    return null;
end;
$$;

create trigger token_events_activity
    after insert on public.token_events
    for each row execute function public.activity_from_token_events();

create or replace function public.activity_from_user_backgrounds()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.activity_events (actor_id, kind, game_id, data)
    values (new.user_id, 'background_bought', new.game_id,
            jsonb_build_object('tokens', new.price));
    return null;
end;
$$;

create trigger user_backgrounds_activity
    after insert on public.user_backgrounds
    for each row execute function public.activity_from_user_backgrounds();

-- The gift's ledger row is the giver's alone, so it's told here, where both
-- ends are known.
create or replace function public.gift_item(p_giver uuid, p_recipient uuid, p_item text)
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
    select tokens into balance from public.profiles where id = p_giver for update;
    select coalesce(quantity, 0) into have from public.user_items
    where user_id = p_recipient and item = p_item;
    have := coalesce(have, 0);
    if have >= it.max_owned then
        raise exception 'max_owned';
    end if;
    cost := it.price + it.price_step * case when it.kind = 'slot' then have else 0 end;
    if balance < cost then
        raise exception 'insufficient_tokens';
    end if;

    insert into public.token_events (user_id, source, key, amount)
    values (p_giver, 'gift', 'gift:' || p_item || ':' || gen_random_uuid(), -cost);
    insert into public.user_items (user_id, item, quantity)
    values (p_recipient, p_item, 1)
    on conflict (user_id, item) do update
        set quantity = public.user_items.quantity + 1, acquired_at = now();
    insert into public.activity_events (actor_id, kind, subject_id, data)
    values (p_giver, 'gift_sent', p_recipient::text,
            jsonb_build_object('item', p_item, 'tokens', cost));

    return jsonb_build_object('tokens', balance - cost, 'cost', cost);
end;
$$;

-- --------------------------------------------------------------- profiles

-- Everything a member chooses about their profile now, not only the name,
-- picture and bio; finishing setting up; who invited them; and which emails
-- they turned off or on, as its own kind, since that's what's watched.
create or replace function public.activity_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    changed text[];
    off text[];
    back_on text[];
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.id, 'signup', new.id::text,
                jsonb_build_object('username', new.username));
        return null;
    elsif tg_op = 'DELETE' then
        perform public.erase_account_traces(old.id);
        -- That an account went, and nothing about whose.
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (null, 'account_deleted', null, '{}'::jsonb);
        return null;
    end if;

    if new.onboarded_at is not null and old.onboarded_at is null then
        insert into public.activity_events (actor_id, kind, subject_id)
        values (new.id, 'onboarded', new.id::text);
    end if;

    if new.referred_by is not null and old.referred_by is null then
        insert into public.activity_events (actor_id, kind, subject_id)
        values (new.id, 'referral_joined', new.referred_by::text);
    end if;

    if new.email_prefs is distinct from old.email_prefs then
        select coalesce(array_agg(k), '{}') into off
        from jsonb_object_keys(new.email_prefs) k
        where new.email_prefs ->> k = 'false'
          and coalesce(old.email_prefs ->> k, 'true') <> 'false';
        select coalesce(array_agg(k), '{}') into back_on
        from jsonb_object_keys(old.email_prefs) k
        where old.email_prefs ->> k = 'false'
          and coalesce(new.email_prefs ->> k, 'true') <> 'false';
        if cardinality(off) + cardinality(back_on) > 0 then
            insert into public.activity_events (actor_id, kind, subject_id, data)
            values (new.id, 'email_prefs_changed', new.id::text,
                    jsonb_build_object('off', to_jsonb(off),
                                       'on', to_jsonb(back_on)));
        end if;
    end if;

    -- The heartbeat writes last_seen_at every two minutes, and progress
    -- moves xp and tokens: only what a person chose to change counts.
    changed := array_remove(array[
        case when new.username is distinct from old.username then 'username' end,
        case when new.avatar_url is distinct from old.avatar_url then 'avatar' end,
        case when new.bio is distinct from old.bio then 'bio' end,
        case when new.first_name is distinct from old.first_name then 'first name' end,
        case when new.accent is distinct from old.accent then 'colour' end,
        case when new.background_url is distinct from old.background_url
              or new.background_position is distinct from old.background_position
             then 'background' end,
        case when new.frame is distinct from old.frame then 'frame' end,
        case when new.card_theme is distinct from old.card_theme then 'card theme' end,
        case when new.name_font is distinct from old.name_font
              or new.name_colour is distinct from old.name_colour
             then 'name style' end,
        case when new.showcase_badges is distinct from old.showcase_badges
              or new.showcase_layout is distinct from old.showcase_layout
             then 'showcase' end,
        case when new.pinned_reviews is distinct from old.pinned_reviews then 'pinned reviews' end,
        case when new.pinned_lists is distinct from old.pinned_lists then 'pinned lists' end,
        case when new.section_order is distinct from old.section_order then 'layout' end,
        case when new.pronouns is distinct from old.pronouns
              or new.location is distinct from old.location
              or new.website is distinct from old.website
              or new.discord is distinct from old.discord
              or new.steam is distinct from old.steam
             then 'about' end,
        case when new.profile_visibility is distinct from old.profile_visibility
              or new.about_visibility is distinct from old.about_visibility
              or new.hide_online is distinct from old.hide_online
              or new.hide_from_search is distinct from old.hide_from_search
             then 'privacy' end
    ], null);
    if cardinality(changed) > 0 then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.id, 'profile_updated', new.id::text,
                jsonb_build_object(
                    'fields', to_jsonb(changed),
                    'username', new.username,
                    'previousUsername',
                    case when 'username' = any(changed) then old.username end
                ));
    end if;
    return null;
end;
$$;

-- ------------------------------------------------------ reports and news

create or replace function public.activity_from_content_reports()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.reporter_id, 'report_filed', new.id::text,
                jsonb_build_object('targetType', new.target_type,
                                   'reason', new.reason));
    elsif new.status is distinct from old.status and new.status <> 'open' then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.resolved_by, 'report_resolved', new.id::text,
                jsonb_build_object('targetType', new.target_type,
                                   'status', new.status));
    end if;
    return null;
end;
$$;

create trigger content_reports_activity
    after insert or update on public.content_reports
    for each row execute function public.activity_from_content_reports();

create or replace function public.activity_from_announcements()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.sent_by, 'announcement_sent', new.id::text,
                jsonb_build_object('title', new.title,
                                   'patchNotes', new.patch_note_message_id is not null));
    elsif new.retracted_at is not null and old.retracted_at is null then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.sent_by, 'announcement_retracted', new.id::text,
                jsonb_build_object('title', new.title));
    elsif new.emailed_at is not null and old.emailed_at is null then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.sent_by, 'announcement_emailed', new.id::text,
                jsonb_build_object('title', new.title));
    end if;
    return null;
end;
$$;

create trigger announcements_activity
    after insert or update on public.announcements
    for each row execute function public.activity_from_announcements();

-- ------------------------------------------------------------ the feed

-- The other person, for every kind that's about one: a friend, who got a
-- gift, whose Gaming 25 was loved, who invited or was invited.
create or replace view public.admin_activity_feed
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
    on e.kind ~ '^(friend_|gift_sent$|g25_loved$|referral_)'
   and sp.id::text = e.subject_id
left join public.community_messages m
    on m.id = case when e.kind like 'message\_%' then e.subject_id::bigint end;

-- How much of each kind, for the filters' counts.
create or replace function public.admin_activity_counts(
    p_since timestamptz, p_user uuid, p_game bigint
)
returns table (kind text, events bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select e.kind, count(*)
    from public.activity_events e
    where (p_since is null or e.created_at >= p_since)
      and (p_user is null or e.actor_id = p_user)
      and (p_game is null or e.game_id = p_game)
    group by e.kind;
$$;

revoke execute on function public.admin_activity_counts(timestamptz, uuid, bigint)
    from anon, authenticated, public;

create index if not exists activity_events_game_idx
    on public.activity_events (game_id, created_at desc, id desc)
    where game_id is not null;
