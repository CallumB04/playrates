-- The title rule, widened where it was leaking.
--
-- Whole-word matching was too brittle for the way these titles are written:
-- Softporn Adventure, Porntris, Boobserman and Magical MILFs all went round
-- it, and every one of them came back from a search by someone who had
-- explicit content switched off.
--
-- Three kinds of match now. Anywhere in the title, for words that are never
-- innocent. At the start of a word, for stems that take suffixes — sexy,
-- boobs, nudity, lewdness. Whole word for the two that collide with ordinary
-- English: "milf" sits inside Milford, "xxx" inside Asterix & Obelix XXXL.
--
-- It errs towards hiding, and two well-reviewed games are caught: The Sexy
-- Brutale and Drunken Robot Pornography. That is the accepted price. Anyone
-- who opts in still sees them, and the alternative is a child being shown a
-- game called Hentai Girl.

update public.games
set has_sexual_content = true
where not has_sexual_content
  and (
      title ~* 'hentai|futanari|nukige|nsfw|bdsm|porn|ecchi|eroge'
      or title ~* '\m(sex|boob|lewd|nude|nudit)'
      or title ~* '\mmilfs?\M'
      or title ~* '\mxxx\M'
  );
