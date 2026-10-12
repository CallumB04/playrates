-- The home page's setup checklist (a picture, a bio, a first log, a friend)
-- shows until it is done or put away. Put away is kept here rather than in
-- the browser, so closing it on a phone closes it on the laptop too.

set search_path = pg_catalog, public;

alter table public.profiles
    add column checklist_dismissed_at timestamptz;
