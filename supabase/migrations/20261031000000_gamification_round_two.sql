-- Progress, second pass: name styles in place of profile effects and
-- showcase layouts, no more task swaps, a smaller free showcase, a reward
-- for getting started, and profile backgrounds bought one picture at a
-- time once a member reaches the level for them.

set search_path = pg_catalog, public;

-- ------------------------------------------------------------------ shop

alter table public.shop_items drop constraint shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check
    check (kind in ('cosmetic', 'name', 'slot', 'helper'));

insert into public.shop_items (item, kind, price, price_step, max_owned) values
    ('font_terminal', 'name', 60, 0, 1),
    ('font_pixel', 'name', 100, 0, 1),
    ('font_bungee', 'name', 80, 0, 1),
    ('font_marker', 'name', 80, 0, 1),
    ('colour_ember', 'name', 40, 0, 1),
    ('colour_mint', 'name', 40, 0, 1),
    ('colour_rose', 'name', 40, 0, 1),
    ('colour_sunset', 'name', 120, 0, 1),
    ('colour_holo', 'name', 150, 0, 1);

-- Kept as rows, since ledgers name them, but no longer sold.
update public.shop_items set active = false
where item in (
    'effect_sheen', 'effect_glow', 'layout_shelf', 'layout_spotlight',
    'quest_reroll'
);

-- Four free, so the fourth slot bought takes it to eight as before.
update public.shop_items set max_owned = 4 where item = 'slot_showcase';

-- A free background, granted at the level that opens them. Never on sale.
insert into public.shop_items (item, kind, price, price_step, max_owned, active)
values ('background_credit', 'helper', 1, 0, 1, false);

drop table public.quest_rerolls;

-- -------------------------------------------------------------- profiles

alter table public.profiles
    add column name_font text,
    add column name_colour text;

-- ----------------------------------------------------------- backgrounds

-- Each picture a member owns, from the game it belongs to.
create table public.user_backgrounds (
    user_id uuid not null references public.profiles (id) on delete cascade,
    game_id bigint not null references public.games (id) on delete cascade,
    url text not null,
    price int not null default 0,
    acquired_at timestamptz not null default now(),
    primary key (user_id, url)
);

create index user_backgrounds_game_idx
    on public.user_backgrounds (user_id, game_id);

alter table public.user_backgrounds enable row level security;
revoke all on public.user_backgrounds from anon, authenticated;

-- A picture already worn stays its owner's.
insert into public.user_backgrounds (user_id, game_id, url)
select id, background_game_id, background_url
from public.profiles
where background_url is not null and background_game_id is not null
on conflict do nothing;

-- Once a member reaches the level: one free picture, once.
create or replace function public.grant_background_credit(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.token_events (user_id, source, key, amount)
    values (p_user, 'background_unlock', 'background_unlock', 0)
    on conflict (user_id, key) do nothing;
    if not found then
        return false;
    end if;
    insert into public.user_items (user_id, item, quantity)
    values (p_user, 'background_credit', 1)
    on conflict (user_id, item) do update
        set quantity = public.user_items.quantity + 1, acquired_at = now();
    return true;
end;
$$;

-- One picture: the free credit if there is one, otherwise tokens, a little
-- more for each picture already owned from the same game. The price rule is
-- backgroundPrice() in shared/src/schemas/progress.ts; keep the two together.
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
        cost := 15 + 5 * from_game;
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

revoke execute on function
    public.grant_background_credit(uuid),
    public.buy_background(uuid, bigint, text)
    from anon, authenticated, public;

-- ----------------------------------------------------------------- setup

-- Paid once, by the API, when every getting-started step is done.
insert into public.xp_rules (source, xp, daily_cap, active)
values ('setup', 150, null, false);
