-- A birthday, given once in Edit profile, so the About card can say how old
-- someone is and stay right every year. Only the age it makes ever leaves
-- the API, and only to whoever the member lets see it; the date is theirs.
--
-- Who sees the age, when they joined and when they were last on sit in
-- about_visibility with the other About fields, under "age", "joined" and
-- "lastSeen". Their defaults live in the code, so nothing is written here.

set search_path = pg_catalog, public;

alter table public.profiles add column birth_date date;
