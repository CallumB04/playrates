-- Where a member's devices take push notifications: one row per browser
-- that said yes. The endpoint is the push service's address for it; the
-- keys encrypt what is sent there. Gone with the account.

set search_path = pg_catalog, public;

create table public.push_subscriptions (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamptz not null default now(),
    constraint push_subscriptions_endpoint check (endpoint ~ '^https://')
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- As raise_notifications_once, but saying which went in, so whatever
-- follows a new notification (a push) follows only those. The old one
-- stays for the deployed app until it moves over.
create or replace function public.raise_notifications_once_new(p_rows jsonb)
returns table (user_id uuid, kind text, dedupe_key text)
language sql
security definer
set search_path = pg_catalog, public
as $$
    insert into public.notifications (user_id, kind, actor_id, data, dedupe_key)
    select (r ->> 'user_id')::uuid, r ->> 'kind', (r ->> 'actor_id')::uuid,
           coalesce(r -> 'data', '{}'), r ->> 'dedupe_key'
    from jsonb_array_elements(p_rows) r
    on conflict (user_id, dedupe_key) where dedupe_key is not null
    do nothing
    returning user_id, kind, dedupe_key;
$$;

revoke execute on function public.raise_notifications_once_new(jsonb)
    from anon, authenticated, public;
