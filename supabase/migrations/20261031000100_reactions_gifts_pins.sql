-- Reactions in place of the plain upvote, pinned reviews, and gifts.
--
-- A vote becomes a reaction: each row says which, and every vote there is
-- now is an upvote. One per person per thing still, so everything that
-- counts votes (XP, badges, milestones, sorts) counts reactions unchanged.

set search_path = pg_catalog, public;

-- ------------------------------------------------------------- reactions

alter table public.review_votes
    add column reaction text not null default 'upvote';
alter table public.community_message_votes
    add column reaction text not null default 'upvote';
alter table public.game_list_votes
    add column reaction text not null default 'upvote';

-- ------------------------------------------------------------------ shop

alter table public.shop_items drop constraint shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check
    check (kind in ('cosmetic', 'name', 'reaction', 'slot', 'helper'));

-- Reactions past the ones levels bring, one at a time.
insert into public.shop_items (item, kind, price, price_step, max_owned) values
    ('react_goat', 'reaction', 60, 0, 1),
    ('react_dead', 'reaction', 40, 0, 1),
    ('react_hype', 'reaction', 40, 0, 1),
    ('react_congrats', 'reaction', 40, 0, 1),
    ('react_big_brain', 'reaction', 40, 0, 1),
    ('react_sad', 'reaction', 40, 0, 1),
    -- None free: the first is the feature.
    ('slot_pinned_review', 'slot', 60, 40, 3);

-- -------------------------------------------------------------- profiles

alter table public.profiles
    add column pinned_reviews bigint[] not null default '{}',
    -- The main column's cards, as their owner ordered them; empty for the
    -- default order.
    add column section_order text[] not null default '{}';

-- ----------------------------------------------------------------- gifts

-- One member buys an item for another, in one transaction: the giver's
-- tokens, at the price the recipient would pay, into the recipient's
-- items. Friendship is checked by the API, which knows it.
create or replace function public.gift_item(
    p_giver uuid, p_recipient uuid, p_item text
)
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

    return jsonb_build_object('tokens', balance - cost, 'cost', cost);
end;
$$;

revoke execute on function public.gift_item(uuid, uuid, text)
    from anon, authenticated, public;

-- ----------------------------------------------------------------- admin

-- Progress across every member, for the admin's Progress view: how XP and
-- tokens flow, where levels sit, what sells, and what gets used.
create or replace function public.admin_progress()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select jsonb_build_object(
        'members', (select count(*) from public.profiles),
        'xps', (select coalesce(jsonb_agg(xp), '[]') from public.profiles),
        'xp_last_week', (
            select coalesce(sum(xp), 0) from public.xp_events
            where created_at > now() - interval '7 days'
        ),
        'tokens_held', (select coalesce(sum(tokens), 0) from public.profiles),
        'tokens_earned', (
            select coalesce(sum(amount), 0) from public.token_events where amount > 0
        ),
        'tokens_spent', (
            select coalesce(-sum(amount), 0) from public.token_events
            where source = 'purchase'
        ),
        'tokens_gifted', (
            select coalesce(-sum(amount), 0) from public.token_events
            where source = 'gift'
        ),
        'top', (
            select coalesce(jsonb_agg(t), '[]') from (
                select username, avatar_url, accent, xp from public.profiles
                order by xp desc, username limit 10
            ) t
        ),
        'xp_by_source', (
            select coalesce(jsonb_agg(s), '[]') from (
                select source, sum(xp) as xp, count(*) as events
                from public.xp_events
                where created_at > now() - interval '30 days'
                group by source
            ) s
        ),
        'badges', (select coalesce(jsonb_agg(b), '[]') from public.badge_holders() b),
        -- Purchases are keyed buy:<item>:<id> or background:<id>, and gifts
        -- gift:<item>:<id>: the item is the key's second part.
        'shop', (
            select coalesce(jsonb_agg(s), '[]') from (
                select
                    case when key like 'background:%' then 'background'
                         else split_part(key, ':', 2) end as item,
                    count(*) as sold,
                    -sum(amount) as tokens
                from public.token_events
                where source in ('purchase', 'gift') and amount < 0
                group by 1
            ) s
        ),
        'reactions', (
            select coalesce(jsonb_agg(r), '[]') from (
                select reaction, count(*) as count from (
                    select reaction from public.review_votes
                    union all select reaction from public.community_message_votes
                    union all select reaction from public.game_list_votes
                ) v group by reaction
            ) r
        ),
        'tasks_week', (
            select count(*) from public.xp_events
            where source = 'quest' and created_at >= date_trunc('week', now())
        ),
        'tasks_month', (
            select count(*) from public.xp_events
            where source = 'quest' and created_at >= date_trunc('month', now())
        ),
        'referrals_joined', (
            select count(*) from public.profiles where referred_by is not null
        ),
        'referrals_active', (
            select count(*) from public.xp_events where source = 'referral_active'
        ),
        'setup_done', (select count(*) from public.xp_events where key = 'setup'),
        'reveal_waiting', (
            select count(*) from public.profiles where revealed_at is null
        )
    );
$$;

revoke execute on function public.admin_progress() from anon, authenticated, public;
