-- Guarantees every auth user has a profile row.
--
-- Doing this in a trigger rather than from the backend closes the window where
-- a signup succeeds but the follow-up profile request fails, leaving an
-- account with no profile that every downstream query then has to handle.
--
-- The username comes from the signUp() metadata. If it is missing, malformed,
-- or already taken, we fall back to a generated one rather than raising —
-- raising here would abort the auth signup transaction and surface to the
-- client as an opaque 500. The real, validated rename path is
-- PATCH /profiles/me, which returns a proper 409, and the signup form checks
-- availability up front so the fallback is rarely hit.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    desired text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
    fallback text := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
    candidate text;
begin
    candidate := coalesce(desired, fallback);

    if candidate !~ '^[A-Za-z0-9_]{3,24}$'
        or exists (
            select 1 from public.profiles p where p.username = candidate::citext
        )
    then
        candidate := fallback;
    end if;

    insert into public.profiles (id, username) values (new.id, candidate::citext);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
