-- Game search, ranked and more forgiving. It was a contains-match on the
-- spaceless search key, ordered by popularity alone, so "gta" and "botw"
-- found nothing, "wild hunt witcher" found nothing, "witchr" found nothing,
-- and an exact title could sit below a more popular one that merely held it.
--
-- Now, best first:
--   0. the title, or one of IGDB's alternative names for it, is the query
--   1. the title or an alternative name contains the query
--   2. the title contains every word of it, in any order
--   3. only when those are thin: titles close to it, typos and all
-- with IGDB's rating count deciding within each. backend/src/lib/gameMatch.ts
-- states the same rules for the tests.

set search_path = pg_catalog, public;

/* search_key's words before they are joined: the same normalising, kept
   apart, so a query can be matched a word at a time. */
create or replace function public.search_words(p_text text)
returns text[]
language sql
immutable
parallel safe
set search_path = pg_catalog, public, extensions
as $$
    select coalesce(array_agg(
        case w
            when 'i' then '1' when 'ii' then '2' when 'iii' then '3'
            when 'iv' then '4' when 'v' then '5' when 'vi' then '6'
            when 'vii' then '7' when 'viii' then '8' when 'ix' then '9'
            when 'x' then '10'
            else w
        end order by n) filter (where w <> ''), '{}')
    from regexp_split_to_table(
        btrim(regexp_replace(
            lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_text)),
            '[^a-z0-9]+', ' ', 'g')),
        ' ') with ordinality as t (w, n);
$$;

/* IGDB's other names for a game: acronyms ("GTA V", "BotW"), other spellings
   and titles in other languages. search_alt holds their keys, space apart,
   so a key can match within one name but never across two. search_text is
   the title's words with spaces kept, which the typo match compares against:
   trigrams of a spaceless key run across word ends and blur it. */
alter table public.games
    add column if not exists alt_names text[] not null default '{}',
    add column if not exists search_alt text not null default '',
    add column if not exists search_text text;

create or replace function public.games_set_search_title()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.search_title := public.search_key(new.title);
    new.search_text := array_to_string(public.search_words(new.title), ' ');
    new.search_alt := coalesce((
        select string_agg(distinct k, ' ')
        from unnest(new.alt_names) as a (name)
        cross join lateral public.search_key(a.name) as k
        -- a short key is all that's left of a name in another script
        where length(k) >= 3 and k <> new.search_title
    ), '');
    return new;
end;
$$;

drop trigger if exists games_set_search_title on public.games;
create trigger games_set_search_title
    before insert or update of title, alt_names on public.games
    for each row execute function public.games_set_search_title();

/* updated_at is what the sitemap tells search engines changed. A bulk
   rewrite of what only search reads changes no page, so it can ask to leave
   the date alone, for its own transaction only. */
create or replace function public.games_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if current_setting('playrates.quiet_update', true) = 'on' then
        return new;
    end if;
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
    before update on public.games
    for each row execute function public.games_set_updated_at();

-- search_text's index follows in the next migration, once existing rows
-- have been filled in batches: one update of every game would hold each
-- row's lock until the end, and logging a game would wait on it.
create index if not exists games_search_alt_trgm_idx
    on public.games using gin (search_alt extensions.gin_trgm_ops);

/* Writes IGDB's alternative names for many games at once, for the backfill
   and its refreshes. Takes [{ "id", "alt_names" }] and returns how many
   rows changed. */
create or replace function public.set_game_alt_names(p_rows jsonb)
returns int
language plpgsql
set search_path = pg_catalog, public
as $$
declare
    v_changed int;
begin
    perform set_config('playrates.quiet_update', 'on', true);
    update public.games g
    set alt_names = r.alt_names
    from jsonb_to_recordset(p_rows) as r (id bigint, alt_names text[])
    where g.id = r.id and g.alt_names is distinct from r.alt_names;
    get diagnostics v_changed = row_count;
    return v_changed;
end;
$$;

revoke execute on function public.set_game_alt_names(jsonb)
    from anon, authenticated, public;

/* Each rule is its own select, so each can use its index, and each keeps
   only its best p_limit: the best p_limit overall are among them. */
create or replace function public.search_games(
    p_query text,
    p_limit int,
    p_include_sexual boolean
)
returns table (id bigint, tier smallint)
language plpgsql
stable
set search_path = pg_catalog, public, extensions
as $$
declare
    v_words text[] := public.search_words(p_query);
    v_key text := array_to_string(v_words, '');
    v_longest text;
begin
    -- Nothing but punctuation has no key: the title as typed.
    if v_key = '' then
        return query
        select g.id, 1::smallint
        from public.games g
        where g.title ilike '%' || replace(replace(replace(p_query,
                  '\', '\\'), '%', '\%'), '_', '\_') || '%'
          and (p_include_sexual or not g.has_sexual_content)
        order by g.igdb_rating_count desc nulls last, g.id
        limit p_limit;
        return;
    end if;

    -- One or two characters make no trigrams: from the start, as before.
    if length(v_key) < 3 then
        return query
        select g.id, (case when g.search_title = v_key then 0 else 1 end)::smallint
        from public.games g
        where g.search_title like v_key || '%'
          and (p_include_sexual or not g.has_sexual_content)
        order by 2, g.igdb_rating_count desc nulls last, g.id
        limit p_limit;
        return;
    end if;

    select w into v_longest from unnest(v_words) as w
    order by length(w) desc limit 1;

    return query
    with strict as (
        (select g.id, 0::smallint as tier, 1::real as closeness,
                g.igdb_rating_count as popularity
         from public.games g
         where (g.search_title = v_key
                or ' ' || g.search_alt || ' ' like '% ' || v_key || ' %')
           and (p_include_sexual or not g.has_sexual_content)
         order by g.igdb_rating_count desc nulls last
         limit p_limit)
        union all
        (select g.id, 1::smallint, 1::real, g.igdb_rating_count
         from public.games g
         where (g.search_title like '%' || v_key || '%'
                or g.search_alt like '%' || v_key || '%')
           and (p_include_sexual or not g.has_sexual_content)
         order by g.igdb_rating_count desc nulls last
         limit p_limit)
        union all
        (select g.id, 2::smallint, 1::real, g.igdb_rating_count
         from public.games g
         where cardinality(v_words) > 1
           -- the longest word finds candidates through the index
           and g.search_title like '%' || v_longest || '%'
           and g.search_title like all (
               select '%' || w || '%' from unnest(v_words) as w)
           and (p_include_sexual or not g.has_sexual_content)
         order by g.igdb_rating_count desc nulls last
         limit p_limit)
    ),
    -- Only when the exact rules come up thin: a typo shouldn't bury a hit.
    close as (
        select g.id, 3::smallint as tier,
               word_similarity(array_to_string(v_words, ' '), g.search_text)
                   as closeness,
               g.igdb_rating_count as popularity
        from public.games g
        where (select count(distinct s.id) from strict s) < 8
          and g.search_text %> array_to_string(v_words, ' ')
          and (p_include_sexual or not g.has_sexual_content)
        order by 3 desc, g.igdb_rating_count desc nulls last
        limit p_limit
    ),
    hits as (
        select * from strict
        union all
        select * from close
    )
    select h.id, min(h.tier)::smallint
    from hits h
    group by h.id
    order by min(h.tier), max(h.closeness) desc,
             max(h.popularity) desc nulls last, h.id
    limit p_limit;
end;
$$;

revoke execute on function public.search_games(text, int, boolean)
    from anon, authenticated, public;
