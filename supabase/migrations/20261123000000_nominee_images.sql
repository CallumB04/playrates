-- A picture for a nominee that isn't a game: a person, a team, a show, a
-- mod. Optional; the card draws a mark of its category without one. Only
-- adds, so code already deployed reads the table as before.
set search_path = pg_catalog, public;

alter table public.award_nominees add column image_url text;
alter table public.award_nominees add constraint award_nominees_image_url
    check (image_url is null or (image_url ~ '^https://' and length(image_url) <= 500));

-- Where uploaded ones live. Public, as avatars are: drawn on a page anyone
-- can open. The limits are the API's own, restated so storage refuses
-- anything that arrives another way; with no policy, only the API writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 131072, array['image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
