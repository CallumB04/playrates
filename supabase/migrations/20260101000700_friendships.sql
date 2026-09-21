-- One row per relationship, with the pair ordered so (a, b) and (b, a) can't
-- both exist — a half-written friendship is impossible rather than unlikely.
-- Direction lives in requested_by. The view below expands each row back into
-- the two directed edges the API serves.

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

-- Lets a query ask "who are this user's friends" without caring which side of
-- the ordered pair they're on. security_invoker is load-bearing: without it the
-- view runs as its owner and becomes a way around RLS.
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
