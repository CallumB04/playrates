-- Somewhere to keep profile pictures.
--
-- Public, because an avatar is drawn on a profile page anyone can open and a
-- signed URL per face per page load would be a lot of round trips for an
-- image that is not a secret.
--
-- The limits are the ones the API enforces on the way in, restated here so
-- storage refuses anything that somehow arrives another way. The API holds
-- the service-role key and that bypasses RLS, so writes need no policy; with
-- no policy at all, nobody else can write, which is the intent.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 131072, array['image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
