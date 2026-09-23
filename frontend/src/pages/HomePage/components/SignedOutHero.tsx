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
 * Six covers at alternating tilts, so it reads as a shelf rather than a grid.
 *
 * The tilt and the drop are one inline transform: `translate-y-*` and the
 * `-translate-y-1/2` that centres the stack write the same custom property,
 * so as utility classes one would silently win.
 */
const FAN = [
    { rotate: -6, drop: 6 },
    { rotate: 3, drop: -8 },
    { rotate: -2, drop: 9 },
    { rotate: 6, drop: -6 },
    { rotate: -3, drop: 4 },
    { rotate: 2, drop: -9 },
];

/** The pitch, with real box art as the hero image. */
const SignedOutHero = ({ siteStats, covers, onStart }: SignedOutHeroProps) => (
    <div className="grid items-center gap-10 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14">
        <div>
            <h1 className="font-display text-hero text-content">
                {BRAND_NAME}
            </h1>

            <p className="mt-4 max-w-[48ch] text-[17px] leading-relaxed text-content-secondary">
                <span className="text-content">{BRAND_MOTTO}.</span> Log, rate
                and review the games you’ve played, manage your backlog and
                wishlist, and interact with your friends and the community.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                    size="lg"
                    onClick={onStart}
                    className="w-full sm:w-auto"
                >
                    Join PlayRates
                </Button>
                <Link
                    to="/library"
                    className={buttonClass(
                        "secondary",
                        "w-full sm:w-auto",
                        "lg"
                    )}
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

        {/* Leads on a phone, where the alternative is the brand name twice
            over. Each card steps by a share of the room left once one cover
            is accounted for, so the fan ends flush at any width. */}
        <div
            aria-hidden
            className="relative isolate order-first h-[170px] [--cover:84px] sm:h-[230px] sm:[--cover:116px] lg:order-none lg:h-[260px] lg:[--cover:126px] xl:h-[290px] xl:[--cover:140px]"
        >
            {covers.slice(0, 6).map((game, i) => (
                <span
                    key={game.id}
                    className="absolute top-1/2 w-(--cover)"
                    style={{
                        left: `calc((100% - var(--cover)) / 5 * ${i})`,
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
