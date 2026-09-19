-- Extensions used by the PlayRates schema.
--
--   citext   case-insensitive text, for usernames and slugs. Lets us enforce
--            "no two users called Callum and callum" with a plain unique index
--            instead of a functional index on lower().
--   pg_trgm  trigram indexes, for the substring title search the library page
--            performs (currently done client-side over the whole catalogue).

--   pgcrypto crypt()/gen_salt(), used by supabase/seed.sql to create local dev
--            accounts. Supabase enables it by default; declared here so a
--            `db reset` on a bare Postgres still works.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;
