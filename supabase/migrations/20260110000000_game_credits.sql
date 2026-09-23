-- Who made a game, who put it out, and the two other things worth printing
-- under a cover. Developers, publishers and the website are on RAWG's detail
-- endpoint only, so they arrive with the description on the first view of a
-- game rather than from the bulk import. The age rating is in both.
--
-- Arrays rather than a companies table and a join: nothing filters by
-- developer, and `content_tags` on this table already sets the precedent for
-- multi-valued data that is only ever read back whole. A "more from this
-- studio" page would be the reason to promote them.
alter table public.games
    add column developers text[] not null default '{}',
    add column publishers text[] not null default '{}',
    add column website text,
    -- RAWG's own wording, which is already display-ready: "Mature", "Everyone 10+".
    add column esrb_rating text;

alter table public.games
    add constraint games_website check (website is null or website ~ '^https?://');

-- The column gated the description alone; it now gates the whole detail
-- payload, which is one fetch and always has been.
alter table public.games
    rename column description_synced_at to details_synced_at;

-- Rows synced before this migration hold no credits, and their timestamp would
-- otherwise say there is nothing left to fetch. Clearing it costs one request
-- per game, on the first view, and refreshes the description while it is there.
update public.games set details_synced_at = null;
