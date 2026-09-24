-- Every profile starts in the PlayRates colour, and says so.
--
-- The first cut kept null meaning "derive a hue from the username". A hash is
-- a colour nobody chose and nobody can read off the palette, and it made null
-- ambiguous: no choice, or a choice we could not draw? Both are gone. Every
-- existing profile is set to the brand, the column defaults to it, and it is
-- not null, so there is one answer everywhere.

-- The constraint has to go first: the rows being written would fail the old
-- list, and the new list is what they are being written to.
alter table public.profiles
    drop constraint profiles_accent;

update public.profiles
set accent = 'playrates'
where accent is null;

alter table public.profiles
    alter column accent set default 'playrates',
    alter column accent set not null;

alter table public.profiles
    add constraint profiles_accent check (
        accent in (
            'playrates',
            'ember', 'amber', 'lime', 'moss', 'jade', 'teal', 'azure',
            'indigo', 'violet', 'plum', 'magenta', 'rose', 'crimson'
        )
    );

comment on column public.profiles.accent is
    'Profile colour. Defaults to the brand; see shared/src/schemas/profileAccent.ts.';
