-- Two reads that timed out against the API's 8 second limit.
--
-- The games sitemap pages 40,000 games at a time by offset. The family-safe
-- index held the ids but not updated_at, so every row was fetched from the
-- table just for its date: page 3 took six seconds. Carrying updated_at in
-- the index answers it from the index alone (40ms measured).
--
-- A one or two character title search ("br") makes no trigrams, so the
-- trigram index cannot serve it and every title was read, twice with the
-- count. Those terms now match from the start of the title, which a btree
-- in pattern order answers directly.

set search_path = pg_catalog, public;

drop index if exists public.games_family_safe_idx;
create index games_family_safe_idx on public.games (id)
    include (updated_at)
    where not has_sexual_content;

create index if not exists games_search_title_prefix_idx
    on public.games (search_title text_pattern_ops);

analyze public.games;
