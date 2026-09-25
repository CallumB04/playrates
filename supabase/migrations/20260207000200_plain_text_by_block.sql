-- Words as they read. Joining every text node with a space doubled the
-- space either side of a bold or italic word, so "a random stranger" was
-- stored as "a  random stranger" and a search for it missed. Runs within a
-- block now join directly, a line break reads as a space, and blocks are
-- separated by one, as toPlainText does in the app.

set search_path = pg_catalog, public;

create or replace function public.community_messages_plain_text()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.plain_text := (
        select string_agg(block_text, ' ')
        from (
            select (
                select string_agg(coalesce(inline ->> 'text', ' '), '')
                from jsonb_array_elements(coalesce(block -> 'content', '[]'::jsonb)) as inline
            ) as block_text
            from jsonb_array_elements(coalesce(new.body -> 'content', '[]'::jsonb)) as block
        ) as blocks
        where block_text is not null and btrim(block_text) <> ''
    );
    return new;
end;
$$;

update public.community_messages set body = body where body is not null;
