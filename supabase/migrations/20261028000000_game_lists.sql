-- Lists of games someone puts together: a name, a few words on it, the
-- games in an order, four of their covers for its picture, who may see it
-- and a colour. Other people can upvote one.
--
-- As everywhere else, only the backend reads and writes these.

set search_path = pg_catalog, public;

create table public.game_lists (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    name text not null,
    description text not null default '',
    visibility text not null default 'everyone',
    -- An accent slug; the app holds the list of them. None until chosen.
    colour text,
    ranked boolean not null default false,
    -- The covers its owner picked. Null is the first four games.
    cover_game_ids bigint[],
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint game_lists_name_length
        check (char_length(btrim(name)) between 1 and 80),
    constraint game_lists_description_length
        check (char_length(description) <= 500),
    constraint game_lists_visibility
        check (visibility in ('everyone', 'friends', 'private')),
    constraint game_lists_colour_slug
        check (colour is null or colour ~ '^[a-z]+$'),
    constraint game_lists_cover_count
        check (cover_game_ids is null or cardinality(cover_game_ids) <= 4)
);

create index game_lists_user_idx
    on public.game_lists (user_id, updated_at desc);

create trigger game_lists_set_updated_at
    before update on public.game_lists
    for each row execute function public.set_updated_at();

create table public.game_list_items (
    list_id bigint not null references public.game_lists (id) on delete cascade,
    game_id bigint not null references public.games (id) on delete cascade,
    position integer not null,
    added_at timestamptz not null default now(),
    primary key (list_id, game_id)
);

create index game_list_items_order_idx
    on public.game_list_items (list_id, position);
-- For a game's page: the lists it's in.
create index game_list_items_game_idx on public.game_list_items (game_id);

create table public.game_list_votes (
    list_id bigint not null references public.game_lists (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (list_id, user_id)
);

create index game_list_votes_user_idx on public.game_list_votes (user_id);

alter table public.game_lists enable row level security;
alter table public.game_list_items enable row level security;
alter table public.game_list_votes enable row level security;
revoke all on public.game_lists from anon, authenticated;
revoke all on public.game_list_items from anon, authenticated;
revoke all on public.game_list_votes from anon, authenticated;

-- A list as its card shows it. The counts are derived, as a review's votes
-- are, so they can't drift; the first four games stand in for covers its
-- owner hasn't picked.
create view public.game_list_cards
with (security_invoker = true)
as
select
    l.*,
    coalesce(items.game_count, 0)::int as game_count,
    coalesce(votes.vote_count, 0)::int as vote_count,
    coalesce(items.first_game_ids, '{}') as first_game_ids
from public.game_lists l
left join lateral (
    select
        count(*) as game_count,
        (array_agg(i.game_id order by i.position))[1:4] as first_game_ids
    from public.game_list_items i
    where i.list_id = l.id
) items on true
left join lateral (
    select count(*) as vote_count
    from public.game_list_votes v
    where v.list_id = l.id
) votes on true;

revoke all on public.game_list_cards from anon, authenticated;

-- A list's games and their order, in one statement. A game that stays keeps
-- when it was added; one that's new is added now.
create or replace function public.set_game_list_items(
    p_list_id bigint,
    p_game_ids bigint[]
)
returns void
language sql
set search_path = pg_catalog, public
as $$
    with gone as (
        delete from public.game_list_items
        where list_id = p_list_id
        returning game_id, added_at
    )
    insert into public.game_list_items (list_id, game_id, position, added_at)
    select p_list_id, t.game_id, (t.ordinality - 1)::integer,
           coalesce(gone.added_at, now())
    from unnest(p_game_ids) with ordinality as t (game_id, ordinality)
    left join gone on gone.game_id = t.game_id;
$$;

revoke execute on function public.set_game_list_items(bigint, bigint[])
    from anon, authenticated, public;

-- A list gone, its upvote milestone goes with it, as a review's does.
create or replace function public.game_list_clear_notifications()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    delete from public.notifications
    where dedupe_key = 'list_upvotes:' || old.id;
    return null;
end;
$$;

revoke execute on function public.game_list_clear_notifications()
    from anon, authenticated, public;

create trigger game_lists_clear_notifications
    after delete on public.game_lists
    for each row execute function public.game_list_clear_notifications();

-- A list can be reported, like a review or a thread.
alter table public.content_reports
    drop constraint content_reports_target_type;
alter table public.content_reports
    add constraint content_reports_target_type check (
        target_type in ('thread', 'message', 'review', 'profile', 'list'));
