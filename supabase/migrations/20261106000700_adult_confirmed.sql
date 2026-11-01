-- Showing sexually explicit games now asks a member to confirm they're 18
-- or over, once, and keeps when they did. Accounts are open from 13, and
-- the setting was a single switch. Members who already have it on keep it;
-- they're asked if they switch it off and on again.

set search_path = pg_catalog, public;

alter table public.profiles
    add column adult_confirmed_at timestamptz;
