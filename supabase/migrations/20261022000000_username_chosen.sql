-- When the account's owner picked its username. Null means nobody has: a
-- Google or Discord signup arrives with a generated name, and the app asks
-- for a real one before anything else.
alter table public.profiles
    add column if not exists username_chosen_at timestamptz;

-- Everyone here so far typed theirs at signup.
update public.profiles
set username_chosen_at = created_at
where username_chosen_at is null;

-- Only an email signup's metadata is ours: the username field on the signup
-- form. A provider's metadata is whatever that provider sends, and a name
-- lifted from someone's Google or Discord account is not one they chose here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
    desired text := case
        when new.raw_app_meta_data ->> 'provider' = 'email'
            then nullif(btrim(new.raw_user_meta_data ->> 'username'), '')
    end;
    fallback text := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
    chosen boolean := desired is not null;
    candidate text;
begin
    candidate := coalesce(desired, fallback);

    if candidate !~ '^[A-Za-z0-9_]{3,24}$'
        or exists (
            select 1 from public.profiles p where p.username = candidate::extensions.citext
        )
    then
        candidate := fallback;
        chosen := false;
    end if;

    insert into public.profiles (id, username, username_chosen_at)
    values (
        new.id,
        candidate::extensions.citext,
        case when chosen then now() end
    );
    return new;
end;
$$;
