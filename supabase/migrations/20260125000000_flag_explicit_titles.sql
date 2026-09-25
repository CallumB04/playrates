-- Flag what the title says outright.
--
-- has_sexual_content was derived from RAWG's ESRB rating and its tags, both
-- of which are contributed rather than curated, and both of which miss: of
-- the 308 games with "Hentai" in the name, 66 carried no tag marking them at
-- all. Search handed those to everyone, whatever their setting — the filter
-- was working and the flag underneath it was wrong.
--
-- The title is the one thing such a game is never coy about, so it is read as
-- well. Whole words only: "sex" must not match Essex, Sussex or Middlesex.
-- "sexy" is deliberately absent — it catches The Sexy Brutale, an 83-rated
-- puzzle game, and the word is too weak a signal to be worth that.
--
-- This only ever sets the flag. A game already marked stays marked, so
-- nothing a tag caught is lost, and the same pattern lives in
-- backend/src/providers/games/rawg/rawg.mapper.ts for everything imported
-- from here on.

update public.games
set has_sexual_content = true
where not has_sexual_content
  and (
      title ~* '\m(hentai|eroge|ecchi|futanari|nukige|xxx|nsfw|milf|bdsm|boobs|lewd|nude|nudes|nudity|sex|sexual)\M'
      -- A prefix: no innocent word starts with it, and whole-word matching
      -- let Porntris through.
      or title ~* '\mporn'
  );
