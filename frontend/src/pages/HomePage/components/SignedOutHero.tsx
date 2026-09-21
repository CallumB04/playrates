import { Link } from "react-router-dom";
import type { Game } from "@playrates/shared";
import Button, { buttonClass } from "../../../components/ui/Button";
import GameCover from "../../../components/game/GameCover";
import type { SiteStats } from "../../../api";
import { formatCount } from "../../../lib/format";
import { BRAND_MOTTO, BRAND_NAME } from "../../../constants/brand";

interface SignedOutHeroProps {
    siteStats: SiteStats | undefined;
    /** Real box art, used as the hero image. */
    covers: Game[];
    onStart: () => void;
}

/*
 * Fanned rather than gridded. Six covers at alternating tilts read as a shelf
 * someone keeps; six square-on read as a product grid.
 *
 * The tilt and the drop are one inline transform rather than utility classes,
 * because `translate-y-3` and the `-translate-y-1/2` that centres the stack
 * both write the same custom property — whichever Tailwind emitted last won,
 * so one cover ignored the centring entirely and sat apart from the rest.
 */
const FAN = [
    { rotate: -6, drop: 6 },
    { rotate: 3, drop: -8 },
    { rotate: -2, drop: 9 },
    { rotate: 6, drop: -6 },
    { rotate: -3, drop: 4 },
    { rotate: 2, drop: -9 },
];

/**
 * The pitch.
 *
 * This used to put a card of community figures for one game beside the
 * headline, which said nothing to someone who has never heard of the game and
 * read as a dashboard widget dropped into a landing page. The library is the
 * more honest hero image: it is the actual product, and it is the thing a
 * visitor is deciding whether they want.
 */
const SignedOutHero = ({ siteStats, covers, onStart }: SignedOutHeroProps) => (
    <div className="grid items-center gap-10 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14">
        <div>
            <h1 className="font-display text-hero text-content">
                {BRAND_NAME}
            </h1>

            <p className="mt-4 max-w-[48ch] text-[17px] leading-relaxed text-content-secondary">
                <span className="text-content">{BRAND_MOTTO}.</span> Log what
                you play, rate it out of ten, and keep your backlog, wishlist
                and history in one place. Free, and yours to export.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={onStart}>
                    Start your library
                </Button>
                <Link
                    to="/library"
                    className={buttonClass("secondary", undefined, "lg")}
                >
                    Browse the library
                </Link>
            </div>

            {/* One sentence, not a dashboard. Three figures in a definition
                list is a stats widget; this is a claim about the place. */}
            <p className="mt-6 text-body-sm text-content-muted">
                <span className="font-mono text-content">
                    {formatCount(siteStats?.gameCount ?? 0)}
                </span>{" "}
                games in the library, and{" "}
                <span className="font-mono text-content">
                    {formatCount(siteStats?.logCount ?? 0)}
                </span>{" "}
                {siteStats?.logCount === 1 ? "log" : "logs"} so far.
            </p>
        </div>

        <div
            aria-hidden
            className="relative isolate hidden h-[260px] lg:block xl:h-[290px]"
        >
            {covers.slice(0, 6).map((game, i) => (
                <span
                    key={game.id}
                    className="absolute top-1/2 w-[126px] xl:w-[140px]"
                    style={{
                        left: `${i * 15}%`,
                        zIndex: i,
                        transform: `translateY(calc(-50% + ${FAN[i]!.drop}px)) rotate(${FAN[i]!.rotate}deg)`,
                    }}
                >
                    <GameCover
                        coverUrl={game.coverUrl}
                        title={game.title}
                        className="aspect-3/4 w-full overflow-hidden rounded-md shadow-lifted"
                    />
                </span>
            ))}
        </div>
    </div>
);

export default SignedOutHero;
