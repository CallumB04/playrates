-- Two preferences the settings page was showing but could not store.
--
-- `timezone` is what timestamps render in. Date-only columns (start_date,
-- finish_date) are deliberately not affected: a day you picked is that day
-- wherever you read it back.
--
-- `hide_online` suppresses presence. The column is the opt-out rather than an
-- opt-in "show presence", so the default is the permissive one and existing
-- rows need no backfill.
--
-- No CHECK on the zone name: a check constraint cannot hold a subquery, so
-- pg_timezone_names is out of reach here. The API validates against the
-- runtime's own zone list before writing.

set search_path = pg_catalog, public;

alter table public.profiles
    add column if not exists timezone text not null default 'UTC',
    add column if not exists hide_online boolean not null default false;

comment on column public.profiles.timezone is
    'IANA zone name. Timestamps render in this; date-only columns do not.';

comment on column public.profiles.hide_online is
    'When true, the API reports this profile as offline to everyone.';
