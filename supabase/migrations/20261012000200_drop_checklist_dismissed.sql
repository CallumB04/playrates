-- The setup checklist moved from a home page card into the account menu,
-- where it stays until its four steps are done rather than being put away.
-- Nothing reads the column it was put away with, and nothing released ever
-- did.

set search_path = pg_catalog, public;

alter table public.profiles drop column if exists checklist_dismissed_at;
