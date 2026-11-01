-- Errors from the app in people's browsers: a crash a page's error boundary
-- caught, or one nothing did. Kept like server_errors, for the admin's
-- Health page, and pruned with them after 90 days.

set search_path = pg_catalog, public;

create table public.client_errors (
    id bigint generated always as identity primary key,
    message text not null,
    stack text,
    -- The page, path only: a query string can carry a token.
    path text not null,
    user_agent text,
    -- Which deploy was running, to tell an old tab from a new bug.
    build text,
    user_id uuid,
    created_at timestamptz not null default now()
);

create index client_errors_recent_idx
    on public.client_errors (created_at desc, id desc);

alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;

create or replace function public.prune_old_rows(p_batch int default 5000)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    errors int;
    browser int;
    events int;
begin
    -- Errors are for fixing what broke lately; three months is plenty.
    delete from public.server_errors
    where id in (
        select id from public.server_errors
        where created_at < now() - interval '90 days'
        limit p_batch
    );
    get diagnostics errors = row_count;

    delete from public.client_errors
    where id in (
        select id from public.client_errors
        where created_at < now() - interval '90 days'
        limit p_batch
    );
    get diagnostics browser = row_count;

    -- The admin's game feed looks back months, not years.
    delete from public.game_events
    where id in (
        select id from public.game_events
        where created_at < now() - interval '2 years'
        limit p_batch
    );
    get diagnostics events = row_count;

    return jsonb_build_object(
        'serverErrors', errors,
        'clientErrors', browser,
        'gameEvents', events
    );
end;
$$;

revoke execute on function public.prune_old_rows(int)
    from anon, authenticated, public;

-- Closing an account clears its link to these too, as to its server errors.
create or replace function public.erase_account_traces(p_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
    delete from public.activity_events
    where actor_id = p_id or subject_id = p_id::text;

    -- The searches stay for the catalogue's history, but no longer say whose.
    update public.game_events set actor_id = null where actor_id = p_id;

    update public.server_errors set user_id = null where user_id = p_id;
    update public.client_errors set user_id = null where user_id = p_id;
$$;

revoke execute on function public.erase_account_traces(uuid)
    from anon, authenticated, public;
