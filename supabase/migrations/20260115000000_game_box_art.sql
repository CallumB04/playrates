-- Portrait cover art, kept apart from RAWG's image rather than replacing it.
--
-- Every image RAWG serves is landscape: its background_image is key art or a
-- screenshot at 16:9, and the grid shows covers at 3:4, so each one is a
-- centre crop that throws most of the width away. Steam publishes the real
-- portrait capsule at a public path, so a game on Steam can have its actual
-- cover.
--
-- Its own column because the two have different lifetimes: a re-import
-- rewrites cover_url from RAWG on every pass, and would take the box art with
-- it if they shared one.
alter table public.games
    add column box_art_url text;

alter table public.games
    add constraint games_box_art_url check (
        box_art_url is null or box_art_url ~ '^https?://'
    );

-- Rows already carrying a description were synced before box art existed, so
-- they would never look for it. Cleared, they pick it up on the next view.
update public.games set details_synced_at = null where details_synced_at is not null;
