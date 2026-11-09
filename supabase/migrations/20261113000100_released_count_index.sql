-- "Newest" counts every released game, and with no index to count from it
-- read the whole table, anywhere from one to seven seconds. A partial index
-- holds just the dates it counts, small enough to stay in memory.
--
-- Counting from an index only skips the table for pages vacuum has marked
-- all-visible. Searches rewrite a few games at a time, which never reached
-- the default 20% that wakes autovacuum, so a quarter of the table had gone
-- unmarked for two weeks.

set search_path = pg_catalog, public;

create index if not exists games_released_family_safe_idx on public.games
    (release_date) where not has_sexual_content;

alter table public.games set (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_vacuum_insert_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.02
);
