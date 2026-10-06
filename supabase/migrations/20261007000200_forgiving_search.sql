-- Title search was a plain contains-match, so "witcher iii", "pokemon" and
-- "spider man" found nothing: the titles say "The Witcher 3", "Pokémon" and
-- "Spider-Man". Each title now carries a search key, and a search compares
-- keys: accents gone, punctuation and spaces gone, roman numerals as digits.
-- backend/src/lib/searchKey.ts builds the same key from what was typed.

set search_path = pg_catalog, public;

create extension if not exists unaccent with schema extensions;

create or replace function public.search_key(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public, extensions
as $$
    select coalesce(string_agg(
        case w
            when 'i' then '1' when 'ii' then '2' when 'iii' then '3'
            when 'iv' then '4' when 'v' then '5' when 'vi' then '6'
            when 'vii' then '7' when 'viii' then '8' when 'ix' then '9'
            when 'x' then '10'
            else w
        end, '' order by n), '')
    from regexp_split_to_table(
        btrim(regexp_replace(
            lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_text)),
            '[^a-z0-9]+', ' ', 'g')),
        ' ') with ordinality as t (w, n);
$$;

-- A plain column kept by a trigger rather than a generated one: adding a
-- generated column rewrites the whole table under a lock, and the site
-- would stall while it did. Existing rows are filled in batches afterwards.
alter table public.games add column search_title text;

create or replace function public.games_set_search_title()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.search_title := public.search_key(new.title);
    return new;
end;
$$;

create trigger games_set_search_title
    before insert or update of title on public.games
    for each row execute function public.games_set_search_title();
