-- Who each email went to, and what became of it. email_sends counts sends
-- for the allowance and says nobody's name; this is the admin's answer to
-- "did they get it?", one row per recipient, followed by Resend's webhook
-- and kept a month.

set search_path = pg_catalog, public;

create table public.email_messages (
    id bigint generated always as identity primary key,
    -- Null only when the address isn't a member's.
    user_id uuid references public.profiles (id) on delete cascade,
    to_address text not null,
    kind text not null,
    subject text not null,
    status text not null check (status in (
        'capped', 'failed', 'sent', 'delayed', 'delivered',
        'bounced', 'suppressed', 'complained'
    )),
    -- Resend's id for the email, which its webhook names it by. A
    -- broadcast's recipients have none, and are found by broadcast_id and
    -- address instead.
    resend_id text unique,
    broadcast_id text,
    -- Why it failed or bounced, as the provider put it.
    detail text,
    sent_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index email_messages_recent_idx
    on public.email_messages (sent_at desc, id desc);
create index email_messages_user_idx
    on public.email_messages (user_id, id desc);
create index email_messages_broadcast_idx
    on public.email_messages (broadcast_id, lower(to_address))
    where broadcast_id is not null;

alter table public.email_messages enable row level security;
revoke all on public.email_messages from anon, authenticated;

-- What Resend said became of an email. Only ever moves forward: webhooks
-- arrive out of order, and a late "delayed" mustn't undo "delivered". The
-- rows it changed, none for an email that isn't PlayRates' own.
create or replace function public.record_email_event(
    p_resend_id text,
    p_broadcast_id text,
    p_to text,
    p_status text,
    p_detail text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_rank constant jsonb := '{"sent": 0, "delayed": 1, "delivered": 2,
        "bounced": 3, "suppressed": 3, "failed": 3, "complained": 3}';
    v_count integer;
begin
    if not v_rank ? p_status then
        return 0;
    end if;
    update public.email_messages m
    set status = p_status,
        detail = coalesce(left(p_detail, 500), m.detail),
        updated_at = now()
    where (
            m.resend_id = p_resend_id
            or (m.resend_id is null
                and p_broadcast_id is not null
                and m.broadcast_id = p_broadcast_id
                and lower(m.to_address) = lower(p_to))
          )
      and (v_rank ->> m.status)::int < (v_rank ->> p_status)::int;
    get diagnostics v_count = row_count;
    return v_count;
end;
$$;

revoke execute on function public.record_email_event(text, text, text, text, text)
    from anon, authenticated, public;

-- -------------------------------------------------------------- retention

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

    return jsonb_build_object(
        'serverErrors', errors,
        'clientErrors', browser,
        'gameEvents', events,
        'emailMessages', emails
    );
end;
$$;

revoke execute on function public.prune_old_rows(int)
    from anon, authenticated, public;
