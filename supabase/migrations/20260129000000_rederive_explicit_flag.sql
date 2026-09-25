-- What the filter is actually for.
--
-- It is meant to keep pornography off a page a child might be looking at. It
-- is not meant to hide games that contain a sex scene: Red Dead Redemption
-- has one, and Red Dead Redemption is fine — the M rating is what tells a
-- parent about that, and it is on the page.
--
-- RAWG's "sexual-content" tag does not make that distinction. It is on 4,880
-- games, among them Halo Infinite, Sekiro, Persona 5 Royal, Spider-Man: Miles
-- Morales and Mass Effect, all of which were hidden from everyone who had not
-- opted in. Fifty-five games rated 70+ were behind the filter; after this,
-- seven are, and six of those are visual novels with an adult release.
--
-- So the flag is re-derived from scratch rather than added to. It had also
-- accumulated rows flagged by rules that no longer exist — Grand Theft Auto
-- IV and F.E.A.R. were both marked with nothing left to explain why.
--
-- What counts now: an Adults Only rating, a tag that names the thing outright,
-- or a title that does. Minus a short list of games those get wrong, each one
-- checked by hand.

update public.games
set has_sexual_content = (
    lower(btrim(title)) not in (
        'the sexy brutale',
        'ghost master',
        'genesis noir',
        'dream daddy: a dad dating simulator',
        'forgotten memories: remastered edition',
        'vampire: the masquerade - redemption'
    )
    and (
        coalesce(esrb_rating = 'Adults Only', false)
        or coalesce(
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
where has_sexual_content is distinct from (
    lower(btrim(title)) not in (
        'the sexy brutale',
        'ghost master',
        'genesis noir',
        'dream daddy: a dad dating simulator',
        'forgotten memories: remastered edition',
        'vampire: the masquerade - redemption'
    )
    and (
        coalesce(esrb_rating = 'Adults Only', false)
        or coalesce(
            content_tags && array['hentai', 'eroge', 'erotic', 'nsfw', 'adult', 'pornographic'],
            false
        )
        or title ~* 'hentai|futanari|nukige|nsfw|bdsm|porn|ecchi|eroge|erotic|ahegao|lewd|boob|pussy|nude|nudit'
        or title ~* '(?<!es)(?<!us)(?<!dle)sex'
        or title ~* 'milf(?!ord)'
        or title ~* '(?<![a-z])xxx(?![a-z])'
        or title ~* 'adults?[ -]*(only|game|sim|film|content|version)'
    )
);
