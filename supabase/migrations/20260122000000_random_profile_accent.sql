-- The brand is not a profile colour, and nobody starts on a default.
--
-- Wearing the brand made a profile read as official rather than as somebody's
-- choice, and it meant every account that had never opened the picker looked
-- identical. New accounts are dealt one of the thirteen at random instead, so
-- a fresh profile arrives looking like a person.
--
-- Everyone still on the brand is dealt one now. That is every profile that
-- never chose; the ones that did keep what they picked.

create or replace function public.random_profile_accent()
returns text
language sql
volatile
set search_path = pg_catalog
as $$
    select (array[
        'ember', 'amber', 'lime', 'moss', 'jade', 'teal', 'azure',
        'indigo', 'violet', 'plum', 'magenta', 'rose', 'crimson'
    ])[floor(random() * 13) + 1];
$$;

comment on function public.random_profile_accent() is
    'One profile colour, picked at random. The column default for profiles.accent.';

-- Out of the way first: the rows below are being written to a list the old
-- constraint does not have, and the brand it does have is going.
alter table public.profiles
    drop constraint profiles_accent;

alter table public.profiles
    alter column accent drop default;

-- Volatile, so this is evaluated per row rather than once for the update.
update public.profiles
set accent = public.random_profile_accent()
where accent = 'playrates';

alter table public.profiles
    alter column accent set default public.random_profile_accent();

alter table public.profiles
    add constraint profiles_accent check (
        accent in (
            'ember', 'amber', 'lime', 'moss', 'jade', 'teal', 'azure',
            'indigo', 'violet', 'plum', 'magenta', 'rose', 'crimson'
        )
    );

comment on column public.profiles.accent is
    'Profile colour. Dealt at random on signup; see shared/src/schemas/profileAccent.ts.';
