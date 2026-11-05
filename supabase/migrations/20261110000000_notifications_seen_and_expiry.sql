-- The bell counts what's new since it was last opened, not everything
-- unread, so opening it clears the badge. And notifications tidy
-- themselves away: once read or cleared, and two months old, they go.
--
-- prune_old_rows is redefined whole, as before, with notifications added.

set search_path = pg_catalog, public;

-- Null until the bell is first opened: everything unread is new.
alter table public.profiles add column notifications_seen_at timestamptz;

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
    emails int;
    notices int;
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

    -- Names and addresses, so no longer than the Emails page looks back.
    delete from public.email_messages
    where id in (
        select id from public.email_messages
        where sent_at < now() - interval '30 days'
        limit p_batch
    );
    get diagnostics emails = row_count;

    -- Read or cleared, and two months old. Anything unread stays, a friend
    -- request waiting on an answer included.
    delete from public.notifications
    where id in (
        select id from public.notifications
        where created_at < now() - interval '60 days'
          and (read_at is not null or archived_at is not null)
        limit p_batch
    );
    get diagnostics notices = row_count;

    return jsonb_build_object(
        'serverErrors', errors,
        'clientErrors', browser,
        'gameEvents', events,
        'emailMessages', emails,
        'notifications', notices
    );
end;
$$;

revoke execute on function public.prune_old_rows(int)
    from anon, authenticated, public;
