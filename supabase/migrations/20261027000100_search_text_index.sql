-- For the typo match in search_games, after search_text was filled.

set search_path = pg_catalog, public;

create index if not exists games_search_text_trgm_idx
    on public.games using gin (search_text extensions.gin_trgm_ops);
