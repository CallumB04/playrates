-- One row per thing a user should be told about.
--
-- Designed to take kinds it has never heard of: `kind` is open text rather
-- than an enum or a CHECK list, and `data` carries whatever a kind needs that
-- isn't the actor. Adding a notification type is then a shared schema entry
-- and a renderer, with no migration. The column stays honest without a CHECK
-- because its only writer is a repository whose draft type is the shared
-- kind union.
--
-- No policies, same as every other table here: all access goes through the
-- Express API on the service-role key.

create table public.notifications (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    kind text not null,
    -- Who caused it. Null for anything the system raised on its own.
    actor_id uuid references public.profiles (id) on delete cascade,
    data jsonb not null default '{}'::jsonb,
    -- Identifies the *thing*, not the row: re-raising the same notification
    -- updates the one already sitting in the inbox instead of stacking a
    -- second copy. Null opts a kind out of that.
    dedupe_key text,
    read_at timestamptz,
    archived_at timestamptz,
    created_at timestamptz not null default now(),

    constraint notifications_kind_format check (kind ~ '^[a-z][a-z0-9_]*$'),
    -- An actor cannot notify themselves; every kind so far is about someone else.
    constraint notifications_actor_not_self check (actor_id is distinct from user_id)
);

create unique index notifications_dedupe_idx
    on public.notifications (user_id, dedupe_key)
    where dedupe_key is not null;

-- The bell: newest first, archived rows excluded.
create index notifications_inbox_idx
    on public.notifications (user_id, created_at desc)
    where archived_at is null;

-- The archive tab, ordered by when it was put away rather than raised.
create index notifications_archive_idx
    on public.notifications (user_id, archived_at desc)
    where archived_at is not null;

-- The badge count, which runs on every page load.
create index notifications_unread_idx
    on public.notifications (user_id)
    where read_at is null and archived_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;

-- Everyone gets a welcome. A trigger rather than a backend call for the same
-- reason handle_new_user is one: signup happens in auth, not through the API,
-- so there is no request to hang it off.
create or replace function public.notify_welcome()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.notifications (user_id, kind, dedupe_key)
    values (new.id, 'welcome', 'welcome')
    on conflict do nothing;
    return new;
end;
$$;

create trigger profiles_notify_welcome
    after insert on public.profiles
    for each row execute function public.notify_welcome();

-- Existing accounts get theirs too. created_at defaults to now(): it is being
-- delivered now, and dating it to signup would bury it under everything else.
insert into public.notifications (user_id, kind, dedupe_key)
select id, 'welcome', 'welcome' from public.profiles
on conflict do nothing;
