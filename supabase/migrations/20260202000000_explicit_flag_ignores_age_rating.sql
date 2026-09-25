-- An Adults Only rating no longer hides a game on its own.
--
-- RAWG's age ratings are contributed, not the ESRB's own. It has Kingdom Come:
-- Deliverance II as Adults Only; it is an M-rated RPG, and it was hidden from
-- everyone with explicit content switched off. Only four games in the
-- catalogue carry the rating, and it caught none a tag or a title did not:
-- the two it caught by itself were the two it had wrong, and one of those —
-- Vampire: The Masquerade - Redemption — was already on the list of games
-- checked by hand, there only to undo this rule. It comes off that list.
--
-- Only rows rated Adults Only can change, so only those are re-derived, with
-- the same tags, titles and exceptions as the mapper.
update public.games
set has_sexual_content = (
    lower(btrim(title)) not in (
        'the sexy brutale',
        'ghost master',
        'genesis noir',
        'dream daddy: a dad dating simulator',
        'forgotten memories: remastered edition'
    )
    and (
        coalesce(
            content_tags && array['hentai', 'eroge', 'erotic', 'nsfw', 'adult', 'pornographic'],
            false
        )
        or title ~* 'hentai|futanari|nukige|nsfw|bdsm|porn|ecchi|eroge|erotic|ahegao|lewd|boob|pussy|nude|nudit'
        or title ~* '(?<!es)(?<!us)(?<!dle)sex'
        or title ~* 'milf(?!ord)'
        or title ~* '(?<![a-z])xxx(?![a-z])'
        or title ~* 'adults?[ -]*(only|game|sim|film|content|version)'
    )
)
where esrb_rating = 'Adults Only';
