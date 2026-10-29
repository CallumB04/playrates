-- The Gaming 25: one game for each of 25 categories, shown as a 5×5 grid on
-- its owner's profile and shared as a picture. Other people can love one.
--
-- The categories themselves live in the app, keyed, so they can be reworded
-- or swapped without a migration. As everywhere else, only the backend
-- reads and writes these.

set search_path = pg_catalog, public;

-- One per person, made with their first pick. It is what loves point at,
-- and its updated_at versions the shared picture's URL.
create table public.gaming_25s (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.gaming_25_picks (
    user_id uuid not null references public.gaming_25s (user_id) on delete cascade,
    category text not null,
    game_id bigint not null references public.games (id) on delete cascade,
    updated_at timestamptz not null default now(),
    primary key (user_id, category),
    constraint gaming_25_picks_category_key
        check (category ~ '^[a-z][a-z0-9_]{0,47}$')
);

create index gaming_25_picks_game_idx on public.gaming_25_picks (game_id);

create table public.gaming_25_loves (
    owner_id uuid not null references public.gaming_25s (user_id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (owner_id, user_id)
);

create index gaming_25_loves_user_idx on public.gaming_25_loves (user_id);

alter table public.gaming_25s enable row level security;
alter table public.gaming_25_picks enable row level security;
alter table public.gaming_25_loves enable row level security;
revoke all on public.gaming_25s from anon, authenticated;
revoke all on public.gaming_25_picks from anon, authenticated;
revoke all on public.gaming_25_loves from anon, authenticated;

-- A grid as its card shows it, with its owner. Counts are derived, as a
-- list's votes are, so they can't drift.
create view public.gaming_25_cards
with (security_invoker = true)
as
select
    g.user_id,
    g.created_at,
    g.updated_at,
    coalesce(picks.pick_count, 0)::int as pick_count,
    coalesce(loves.love_count, 0)::int as love_count,
    picks.centre_game_id,
    p.username as owner_username,
    p.avatar_url as owner_avatar_url,
    p.accent as owner_accent,
    p.profile_visibility as owner_visibility
from public.gaming_25s g
join public.profiles p on p.id = g.user_id
left join lateral (
    select
        count(*) as pick_count,
        max(k.game_id) filter (where k.category = 'all_time_favourite')
            as centre_game_id
    from public.gaming_25_picks k
    where k.user_id = g.user_id
) picks on true
left join lateral (
    select count(*) as love_count
    from public.gaming_25_loves l
    where l.owner_id = g.user_id
) loves on true;

revoke all on public.gaming_25_cards from anon, authenticated;

-- One cell, set or cleared, with the grid made on the way if it's the
-- first and its updated_at moved either way, so the picture's URL changes.
create or replace function public.set_gaming_25_pick(
    p_user_id uuid,
    p_category text,
    p_game_id bigint
)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    insert into public.gaming_25s (user_id)
    values (p_user_id)
    on conflict (user_id) do update set updated_at = now();

    if p_game_id is null then
        delete from public.gaming_25_picks
        where user_id = p_user_id and category = p_category;
    else
        insert into public.gaming_25_picks (user_id, category, game_id)
        values (p_user_id, p_category, p_game_id)
        on conflict (user_id, category)
            do update set game_id = excluded.game_id, updated_at = now();
    end if;
end;
$$;

revoke execute on function public.set_gaming_25_pick(uuid, text, bigint)
    from anon, authenticated, public;
