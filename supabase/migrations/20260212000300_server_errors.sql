-- Every 5xx the API returns, so a failure shows on the admin dashboard
-- instead of only in the host's function logs.

set search_path = pg_catalog, public;

create table public.server_errors (
    id bigint generated always as identity primary key,
    status int not null,
    code text not null,
    method text not null,
    path text not null,
    message text not null,
    request_id text,
    user_id uuid,
    stack text,
    created_at timestamptz not null default now()
);

create index server_errors_feed_idx
    on public.server_errors (created_at desc, id desc);

alter table public.server_errors enable row level security;
revoke all on public.server_errors from anon, authenticated;
