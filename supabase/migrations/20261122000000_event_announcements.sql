-- Announcements gain an "event" tone, for telling members an event is on:
-- the Announce button on an event opens the composer with it. Only widens
-- what the column accepts; the API still hands older tabs a tone they know.
set search_path = pg_catalog, public;

alter table public.announcements drop constraint announcements_tone;
alter table public.announcements add constraint announcements_tone
    check (tone in ('info', 'update', 'warning', 'celebration', 'event'));
