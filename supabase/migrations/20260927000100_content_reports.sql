-- Reports of threads, messages, reviews and profiles, for the admin queue.
--
-- The Online Safety Act expects anyone posting here to have a way to flag
-- what shouldn't be, and the terms promise it is looked at. This is where it
-- lands.
--
-- target_id is text because targets are keyed differently: bigint ids for
-- posts and reviews, a uuid for a profile. No foreign keys, so a report
-- outlives what it was about: the queue has to show that it was removed.

set search_path = pg_catalog, public;

create table public.content_reports (
    id bigint generated always as identity primary key,
    reporter_id uuid references public.profiles (id) on delete set null,
    target_type text not null,
    target_id text not null,
    reason text not null,
    details text,
    status text not null default 'open',
    created_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by uuid references public.profiles (id) on delete set null,

    constraint content_reports_target_type check (
        target_type in ('thread', 'message', 'review', 'profile')),
    constraint content_reports_reason check (
        reason in ('spam', 'harassment', 'hate', 'sexual', 'illegal', 'other')),
    constraint content_reports_status check (
        status in ('open', 'resolved', 'dismissed')),
    constraint content_reports_details_length check (
        char_length(details) <= 1000)
);

-- One open report per person per thing. Reporting it again adds nothing; a
-- fresh report after it was dealt with is a new one.
create unique index content_reports_one_open_idx
    on public.content_reports (reporter_id, target_type, target_id)
    where status = 'open';

create index content_reports_queue_idx
    on public.content_reports (status, created_at desc, id desc);

create index content_reports_target_idx
    on public.content_reports (target_type, target_id);

alter table public.content_reports enable row level security;
revoke all on public.content_reports from anon, authenticated;

-- Tidying what the advisors flag. Trigger functions refuse to run outside a
-- trigger, so these were never callable in earnest; they are simply not API.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.notify_welcome() from anon, authenticated, public;
alter function public.set_updated_at() set search_path = pg_catalog, public;
