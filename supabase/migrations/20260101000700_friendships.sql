-- Friendships and friend requests.
--
-- The old store kept two mirrored rows per relationship, one on each side,
-- written non-atomically. That allowed two failure modes seen in the old code:
-- a half-written friendship if the process died mid-write, and unbounded
-- duplicate rows because "add friend" never checked for an existing edge.
--
-- Here a relationship is exactly one row, with the pair ordered so that
-- (a, b) and (b, a) cannot both exist. Direction is carried by requested_by.
-- The API still returns the per-user shape the frontend expects, via the
-- friend_edges view below.

create table public.friendships (
    user_a_id uuid not null references public.profiles (id) on delete cascade,
    user_b_id uuid not null references public.profiles (id) on delete cascade,
    status text not null default 'pending',
    requested_by uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    primary key (user_a_id, user_b_id),
    -- canonical ordering: makes a duplicate reversed pair unrepresentable
    constraint friendships_ordered check (user_a_id < user_b_id),
    constraint friendships_status check (status in ('pending', 'accepted')),
    constraint friendships_requester check (
        requested_by in (user_a_id, user_b_id)
    )
);

create index friendships_user_b_idx on public.friendships (user_b_id);
create index friendships_accepted_a_idx
    on public.friendships (user_a_id) where status = 'accepted';

-- Directed expansion of the canonical rows, so a query can ask "who are this
-- user's friends" without caring which side of the pair they are on.
--
-- security_invoker matters: without it the view would execute as its owner and
-- become a way around row level security.
create view public.friend_edges
with (security_invoker = true) as
select
    user_a_id as user_id,
    user_b_id as friend_id,
    status,
    requested_by,
    created_at,
    updated_at
from public.friendships
union all
select
    user_b_id as user_id,
    user_a_id as friend_id,
    status,
    requested_by,
    created_at,
    updated_at
from public.friendships;

create trigger friendships_set_updated_at
    before update on public.friendships
    for each row execute function public.set_updated_at();
