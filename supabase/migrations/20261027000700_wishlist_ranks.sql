-- Someone's wishlist, in the order they want the games, as on Steam.
--
-- One rank per wishlisted game, not per console: a game wished for on two
-- consoles is one place in the list. The trigger keeps it in step with the
-- logs, so every way a game is logged keeps the order right, and a game
-- newly wished for goes to the bottom. Ranks are read from the order, so a
-- gap left by a game that leaves the list needs no closing.

set search_path = pg_catalog, public;

create table public.wishlist_ranks (
    user_id uuid not null references public.profiles (id) on delete cascade,
    game_id bigint not null references public.games (id) on delete cascade,
    position integer not null,
    created_at timestamptz not null default now(),
    primary key (user_id, game_id)
);

create index wishlist_ranks_order_idx
    on public.wishlist_ranks (user_id, position, created_at);
create index wishlist_ranks_game_id_idx on public.wishlist_ranks (game_id);

alter table public.wishlist_ranks enable row level security;
revoke all on public.wishlist_ranks from anon, authenticated;

create or replace function public.wishlist_ranks_sync()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    -- A game that has just become wished for takes the bottom place, unless
    -- it already has one from another console.
    if tg_op in ('INSERT', 'UPDATE') and new.status = 'wishlist' then
        insert into public.wishlist_ranks (user_id, game_id, position)
        select new.user_id, new.game_id, coalesce(max(position) + 1, 0)
        from public.wishlist_ranks
        where user_id = new.user_id
        on conflict (user_id, game_id) do nothing;
    end if;

    -- The last wish for a game gone, its place goes with it.
    if tg_op in ('UPDATE', 'DELETE') and old.status = 'wishlist'
        and not exists (
            select 1 from public.game_logs
            where user_id = old.user_id
              and game_id = old.game_id
              and status = 'wishlist'
        )
    then
        delete from public.wishlist_ranks
        where user_id = old.user_id and game_id = old.game_id;
    end if;

    return null;
end;
$$;

create trigger game_logs_wishlist_ranks
    after insert or delete or update of status, game_id on public.game_logs
    for each row execute function public.wishlist_ranks_sync();

-- Rewrites someone's order in one statement, in the order given.
create or replace function public.set_wishlist_order(
    p_user_id uuid,
    p_game_ids bigint[]
)
returns void
language sql
set search_path = pg_catalog, public
as $$
    update public.wishlist_ranks r
    set position = (t.ordinality - 1)::integer
    from unnest(p_game_ids) with ordinality as t (game_id, ordinality)
    where r.user_id = p_user_id and r.game_id = t.game_id;
$$;

revoke execute on function public.set_wishlist_order(uuid, bigint[])
    from anon, authenticated, public;
revoke execute on function public.wishlist_ranks_sync()
    from anon, authenticated, public;

-- The wishlists there are already, in the order their games were added.
insert into public.wishlist_ranks (user_id, game_id, position, created_at)
select
    user_id,
    game_id,
    (row_number() over (partition by user_id order by first_added, game_id) - 1)::integer,
    first_added
from (
    select user_id, game_id, min(created_at) as first_added
    from public.game_logs
    where status = 'wishlist'
    group by user_id, game_id
) wished;
