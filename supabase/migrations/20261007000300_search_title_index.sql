-- The search keys are filled in; matching inside them needs the same kind
-- of index the titles had.

set search_path = pg_catalog, public;

create index if not exists games_search_title_trgm_idx
    on public.games using gin (search_title extensions.gin_trgm_ops);
