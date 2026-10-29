-- The first name now shows by default, where it used to start hidden. The
-- default lives in the code, read wherever about_visibility has no say, so
-- changing it would show the name of everyone who never chose. They were
-- told it started hidden; this writes that down for them, so the new
-- default only reaches accounts made from here on.

set search_path = pg_catalog, public;

-- Nobody chose anything here; it shouldn't read as an edit.
alter table public.profiles disable trigger profiles_set_updated_at;

update public.profiles
set about_visibility = about_visibility || '{"firstName": "private"}'::jsonb
where not (about_visibility ? 'firstName');

alter table public.profiles enable trigger profiles_set_updated_at;
