-- A deep page of the library skips past every game before it, and each
-- one skipped was read from the table to check the content flag and the
-- genre and platform filters: page 400 of A to Z read ten thousand rows,
-- and ran into the API's timeout. Each sort's index now carries those
-- columns too, so a page is found in the index alone, however deep.
-- Built beside the old ones, which the next migration drops: dropping
-- locks reads of games, and should be quick when it does.

set search_path = pg_catalog, public;

create index if not exists games_logged_covering_idx on public.games
    (log_count desc nulls last, igdb_rating_count desc nulls last, id)
    include (has_sexual_content, genre_slugs, platform_slugs);

create index if not exists games_rating_covering_idx on public.games
    (avg_rating desc nulls last, rating_count desc nulls last, id)
    include (has_sexual_content, genre_slugs, platform_slugs);

create index if not exists games_title_covering_idx on public.games
    (title, id)
    include (has_sexual_content, genre_slugs, platform_slugs);

create index if not exists games_released_covering_idx on public.games
    (release_date desc nulls last, id)
    include (has_sexual_content, genre_slugs, platform_slugs);

create index if not exists games_critic_covering_idx on public.games
    (critic_score desc nulls last, id)
    include (has_sexual_content, genre_slugs, platform_slugs);

analyze public.games;
