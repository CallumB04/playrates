-- Search reads inside lists. Messages can hold bulleted and numbered lists
-- now, and plain_text only looked one level into a document, so a list's
-- words were never found.
--
-- A node's words, recursively: text as written, runs within a paragraph or
-- heading joined directly, everything else (documents, lists, list items)
-- joined by a space. plpgsql rather than sql because it calls itself, which
-- an sql function cannot before it exists.

set search_path = pg_catalog, public;

create or replace function public.rich_text_plain(p_node jsonb)
returns text
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
    v_type text := p_node ->> 'type';
    v_joiner text;
begin
    if v_type = 'text' then
        return p_node ->> 'text';
    elsif v_type = 'hardBreak' then
        return ' ';
    end if;

    v_joiner := case when v_type in ('paragraph', 'heading') then '' else ' ' end;
    return (
        select nullif(btrim(string_agg(part, v_joiner order by ord)), '')
        from (
            select public.rich_text_plain(child) as part, ord
            from jsonb_array_elements(coalesce(p_node -> 'content', '[]'::jsonb))
                with ordinality as children(child, ord)
        ) as parts
        where part is not null
    );
end;
$$;

create or replace function public.community_messages_plain_text()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.plain_text := case
        when new.body is null then null
        else public.rich_text_plain(new.body)
    end;
    return new;
end;
$$;

update public.community_messages set body = body where body is not null;
