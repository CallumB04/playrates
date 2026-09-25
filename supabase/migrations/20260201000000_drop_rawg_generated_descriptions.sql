-- RAWG writes a description of its own for a game that has none, assembled
-- from its fields and addressed to its users: "Most rawgers rated the game as
-- "Exceptional"." The mapper now recognises it and stores nothing instead,
-- so the page shows its empty state; these are the rows stored before that.
--
-- The pattern is a net, not the rule. It is broader than the mapper, which
-- only drops a description when every sentence is the template's, so the rows
-- are blanked and re-derived rather than judged here: a real description the
-- net catches comes back on the same view that re-derives it. Blanked as well
-- as unsynced because a re-derive that finds nothing answers that first
-- request with the row's old text.
update public.games
set description = '', details_synced_at = null
where description ~* '(rawgers|on RAWG\.|It came out on|It was originally released in|You can purchase the game on|The game is sold via)';
