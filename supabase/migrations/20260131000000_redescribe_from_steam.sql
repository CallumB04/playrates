-- Games on Steam now take their description from the store page, and look for
-- box art under Steam's hashed asset paths as well as the predictable one.
--
-- RAWG's copy of a Steam description arrives flattened on newer listings: one
-- paragraph, every heading run into the sentence after it. Wuthering Waves'
-- read "an expansive worldEmbrace high degrees of freedom". Steam still has the
-- structure. Recent releases also keep their portrait art under a hashed folder
-- the old lookup never tried, which is why those showed a cropped screenshot.
--
-- As with 20260114000000, the stored text cannot be mended in place, so the
-- rows are marked unsynced and re-derive on their next view. Box art already
-- found is kept either way: refreshFromExternal only writes one it has.
update public.games
set details_synced_at = null
where details_synced_at is not null;
