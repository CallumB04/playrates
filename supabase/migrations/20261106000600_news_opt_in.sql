-- News emails are opt-in from now on. UK rules (PECR) let a site email its
-- members about itself only if the chance to say no came where the address
-- was given, and sign-up gave none. The sign-up form now has an unticked
-- box; this reads it. A Google or Discord sign-up has no box, so it starts
-- with news off too. Members who joined before keep what they had.

set search_path = pg_catalog, public;

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
    wants_news boolean := coalesce(new.raw_user_meta_data ->> 'news', '') = 'true';
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

    insert into public.profiles (id, username, username_chosen_at, email_prefs)
    values (
        new.id,
        candidate::extensions.citext,
        case when chosen then now() end,
        case when wants_news then '{}'::jsonb else '{"news": false}'::jsonb end
    );
    return new;
end;
$$;
