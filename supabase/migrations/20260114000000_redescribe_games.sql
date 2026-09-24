-- Descriptions were stored with every newline collapsed: the mapper tidied
-- whitespace with \s+, which takes the paragraph breaks along with the runs of
-- spaces. Every description in the catalogue arrived as one block of text.
--
-- The text cannot be repaired in place — the breaks are gone and the raw
-- payload is not kept — so the rows are marked unsynced and re-derive from
-- RAWG on the next view, the same way they arrived in the first place.
update public.games
set details_synced_at = null
where details_synced_at is not null;
