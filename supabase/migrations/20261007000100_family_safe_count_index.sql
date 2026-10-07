-- Every listing counts the games it can show, and for nearly everyone that
-- leaves out adult ones. Counting that way read the whole table, about
-- 100MB, on every page of the library and every row of the home page,
-- several at once, past the API's timeout. Counting this instead reads
-- about 2MB.

set search_path = pg_catalog, public;

create index games_family_safe_idx on public.games (id)
    where not has_sexual_content;

vacuum (analyze) public.games;
