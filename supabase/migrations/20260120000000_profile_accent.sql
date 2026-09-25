-- A colour of your own.
--
-- The avatar behind a username's initial has always been coloured by a hash
-- of that username, which is a decent first guess and nobody's choice. This
-- keeps the hash as the default and lets it be overridden: null still means
-- "whatever the username hashes to", so every profile that exists keeps the
-- colour it already had.
--
-- The chosen value is a slug, not a hue or a hex. The hue behind it lives in
-- shared/src/schemas/profileAccent.ts, so the avatar and the banner are drawn
-- from one number, and this constraint is the same list written where the
-- database can enforce it.

alter table public.profiles
    add column accent text;

alter table public.profiles
    add constraint profiles_accent check (
        accent is null
        or accent in (
            'violet', 'indigo', 'azure', 'teal', 'jade',
            'moss', 'amber', 'ember', 'rose', 'magenta'
        )
    );

comment on column public.profiles.accent is
    'Chosen profile colour. Null falls back to the hash of the username.';
