-- Each word once. In lax mode $.** unwraps arrays as it descends, so it
-- reaches every text node twice and plain_text held each message doubled.

set search_path = pg_catalog, public;

create or replace function public.community_messages_plain_text()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.plain_text := (
        select string_agg(value #>> '{}', ' ')
        from jsonb_path_query(new.body, 'strict $.**.text') as value
    );
    return new;
end;
$$;

update public.community_messages set body = body where body is not null;
