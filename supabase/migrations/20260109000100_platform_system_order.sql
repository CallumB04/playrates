-- Systems seeded their sort_order per family, which left the API ordering by
-- family slug alphabetically: Portal listed Linux and macOS ahead of Steam.
--
-- Fold the family's own order into each system's, so one `order by sort_order`
-- gives the sequence the families already agreed on. Families are 10 apart and
-- no family holds more than a dozen machines, so the ranges cannot collide.
update public.platform_systems ps
set sort_order = p.sort_order * 100 + ps.sort_order
from public.platforms p
where p.slug = ps.platform_slug;
