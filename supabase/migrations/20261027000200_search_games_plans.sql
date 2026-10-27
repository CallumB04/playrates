-- search_games, planned so it can't walk the catalogue. Ordered by
-- popularity with a limit, Postgres would read games in popularity order
-- through games_known_idx and filter each, which for a rare match meant all
-- hundred thousand: "gta" took twenty seconds. Each rule now collects its
-- matches through its own index first, and only those are sorted. The exact
-- rule's match on one whole alternative name gets an indexable contains in
-- front of it, for the same reason. A one or two character prefix is the
-- exception: its statistics are good enough to plan from, given the prefix.

set search_path = pg_catalog, public;

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

    /* One or two characters make no trigrams: from the start, as before.
       Planned with the prefix itself, by EXECUTE, so the column's own
       statistics say how common it is: "a" starts thousands of titles and
       is best found walking the most popular, "zz" a handful, best found
       through the prefix index. A plan made blind to the prefix suits
       neither. */
    if length(v_key) < 3 then
        return query execute
            'select h.id, min(h.tier)::smallint
             from (
                 (select g.id, 0 as tier, g.igdb_rating_count as popularity
                  from public.games g
                  where g.search_title = $1
                    and ($3 or not g.has_sexual_content)
                  limit $4)
                 union all
                 -- by popularity alone, so the index order can serve it
                 (select g.id, 1, g.igdb_rating_count
                  from public.games g
                  where g.search_title like $2
                    and ($3 or not g.has_sexual_content)
                  order by g.igdb_rating_count desc nulls last, g.id
                  limit $4)
             ) h
             group by h.id
             order by min(h.tier), max(h.popularity) desc nulls last, h.id
             limit $4'
            using v_key, v_key || '%', p_include_sexual, p_limit;
        return;
    end if;

    select w into v_longest from unnest(v_words) as w
    order by length(w) desc limit 1;

    return query
    with exact as materialized (
        select g.id, g.igdb_rating_count as popularity
        from public.games g
        where (g.search_title = v_key
               -- the contains finds candidates through the index; the
               -- spaces then hold it to one whole name
               or (g.search_alt like '%' || v_key || '%'
                   and ' ' || g.search_alt || ' ' like '% ' || v_key || ' %'))
          and (p_include_sexual or not g.has_sexual_content)
    ),
    within as materialized (
        select g.id, g.igdb_rating_count as popularity
        from public.games g
        where (g.search_title like '%' || v_key || '%'
               or g.search_alt like '%' || v_key || '%')
          and (p_include_sexual or not g.has_sexual_content)
    ),
    every_word as materialized (
        select g.id, g.igdb_rating_count as popularity
        from public.games g
        where cardinality(v_words) > 1
          -- the longest word finds candidates through the index
          and g.search_title like '%' || v_longest || '%'
          and g.search_title like all (
              select '%' || w || '%' from unnest(v_words) as w)
          and (p_include_sexual or not g.has_sexual_content)
    ),
    strict as (
        (select e.id, 0::smallint as tier, 1::real as closeness, e.popularity
         from exact e
         order by e.popularity desc nulls last limit p_limit)
        union all
        (select c.id, 1::smallint, 1::real, c.popularity
         from within c
         order by c.popularity desc nulls last limit p_limit)
        union all
        (select a.id, 2::smallint, 1::real, a.popularity
         from every_word a
         order by a.popularity desc nulls last limit p_limit)
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

