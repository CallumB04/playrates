-- Somewhere to log a game played on a machine the list doesn't name: Other
-- PC beside Steam and Game Pass (an Epic or GOG copy), and Other console
-- for a console. Which games offer them is decided in shared/src/schemas/
-- game.ts, as Game Pass is.
--
-- The PC that non-Steam PC games fall back to was already a console of its
-- own, called "PC", which read as one more choice beside Steam rather than
-- the rest of them. It takes the family's name.
--
-- Also: Switch 2 went in with a sort order of 5, missing the family's 6000
-- the others carry, so it listed first of every console, ahead of Steam.

set search_path = pg_catalog, public;

insert into public.platforms (slug, display_name, sort_order)
values ('other-console', 'Other console', 170)
on conflict (slug) do nothing;

insert into public.platform_systems (slug, display_name, platform_slug, sort_order)
values ('other-console', 'Other console', 'other-console', 17010)
on conflict (slug) do nothing;

update public.platform_systems set display_name = 'Other PC' where slug = 'other-pc';

update public.platform_systems set sort_order = 6005 where slug = 'nintendo-switch-2';
