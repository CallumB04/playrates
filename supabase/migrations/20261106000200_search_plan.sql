-- search_games took 300-450ms for a common title, against a few ms for
-- each of its queries written out: inside the function they were planned
-- once for any search term, so the trigram indexes couldn't be costed
-- against the term actually typed. Planned per call, each rule uses its
-- index for the term in hand. Planning costs a few ms; it saved hundreds.

set search_path = pg_catalog, public;

alter function public.search_games(text, int, boolean)
    set plan_cache_mode = force_custom_plan;
