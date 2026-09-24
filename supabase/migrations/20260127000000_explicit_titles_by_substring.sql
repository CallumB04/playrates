-- The title rule again, this time by substring.
--
-- Anchoring to word boundaries kept leaking: Softporn Adventure, Porntris,
-- Boobserman, Milfylicious, QLewds and Simusex all went round it, and every
-- one came back from a search run with explicit content switched off.
--
-- So the words match anywhere, and the collisions with ordinary English are
-- carved out by hand instead: the -sex counties, Milford, Asterix & Obelix
-- XXXL. "adult" counts only in a phrase — Adult Only, adult sim — because on
-- its own it means grown-up, and matching it bare hid jigsaw puzzles, a
-- colouring book and a game called Normal Human Adult Person.
--
-- Sets the flag only, never clears it, so nothing a tag caught is lost. The
-- same pattern is in backend/src/providers/games/rawg/rawg.mapper.ts for
-- everything imported from here on.

update public.games
set has_sexual_content = true
where not has_sexual_content
  and (
      title ~* 'hentai|futanari|nukige|nsfw|bdsm|porn|ecchi|eroge|erotic|ahegao|lewd|boob|pussy|nude|nudit'
      or title ~* '(?<!es)(?<!us)(?<!dle)sex'
      or title ~* 'milf(?!ord)'
      or title ~* '(?<![a-z])xxx(?![a-z])'
      or title ~* 'adults?[ -]*(only|game|sim|film|content|version)'
  );
