-- Every auth user gets a profile row. A trigger rather than a backend call, so
-- there's no window where an auth user exists without a profile.
--
-- Username comes from the signUp() metadata. Missing, malformed or taken falls
-- back to a generated name instead of raising — raising would abort the signup
-- transaction and reach the client as an opaque 500. PATCH /profiles/me is the
-- validated rename path, and signup checks availability up front.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Security definer functions need an explicit search_path so a caller can't
-- shadow what they reference. It can't be empty: citext lives in extensions,
-- and the type, its cast and its = operator all resolve through the path.
set search_path = pg_catalog, public, extensions
as $$
declare
    desired text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
    fallback text := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
    candidate text;
begin
    candidate := coalesce(desired, fallback);

    if candidate !~ '^[A-Za-z0-9_]{3,24}$'
        or exists (
            select 1 from public.profiles p where p.username = candidate::extensions.citext
        )
    then
        candidate := fallback;
    end if;

    insert into public.profiles (id, username) values (new.id, candidate::extensions.citext);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
