import { Link } from "react-router-dom";
import type { Game } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import { buttonClass } from "../../../components/ui/buttonClass";
import GameCover from "../../../components/game/GameCover";
import type { SiteStats } from "../../../api";
import { formatCount } from "../../../lib/format";
import Skeleton from "../../../components/ui/Skeleton";
import {
    BRAND_MOTTO,
    BRAND_NAME,
    BRAND_PITCH_TEXT,
} from "../../../constants/brand";

interface SignedOutHeroProps {
    siteStats: SiteStats | undefined;
    /** Real box art, used as the hero image. Undefined while loading. */
    covers: Game[] | undefined;
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

            <p className="mt-4 max-w-[48ch] text-body leading-relaxed text-content-secondary sm:text-[17px]">
                <span className="text-content">{BRAND_MOTTO}.</span>{" "}
                {BRAND_PITCH_TEXT}
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
            {siteStats ? (
                <p className="mt-6 text-body-sm text-content-muted">
                    <span className="font-mono text-content">
                        {formatCount(siteStats.gameCount)}
                    </span>{" "}
                    games in the library, and{" "}
                    <span className="font-mono text-content">
                        {formatCount(siteStats.logCount)}
                    </span>{" "}
                    {siteStats.logCount === 1 ? "log" : "logs"} so far.
                </p>
            ) : (
                // The sentence's height, so the centred column doesn't shift.
                <div className="mt-6 flex h-5 items-center">
                    <Skeleton className="h-3 w-72 max-w-full" />
                </div>
            )}
        </div>

        {/* Leads on a phone, where the alternative is the brand name twice
            over. Each card steps by a share of the room left once one cover
            is accounted for, so the fan ends flush at any width. */}
        <div
            aria-hidden
            className="relative isolate order-first h-[170px] [--cover:84px] sm:h-[230px] sm:[--cover:116px] lg:order-none lg:h-[260px] lg:[--cover:126px] xl:h-[290px] xl:[--cover:140px]"
        >
            {/* Grey cards in the fan's own places until the art arrives. */}
            {FAN.slice(0, covers?.length ?? FAN.length).map((place, i) => {
                const game = covers?.[i];
                return (
                    <span
                        key={game?.id ?? i}
                        className="absolute top-1/2 w-(--cover)"
                        style={{
                            left: `calc((100% - var(--cover)) / 5 * ${i})`,
                            zIndex: i,
                            transform: `translateY(calc(-50% + ${place.drop}px)) rotate(${place.rotate}deg)`,
                        }}
                    >
                        {game ? (
                            <GameCover
                                coverUrl={game.coverUrl}
                                title={game.title}
                                className="aspect-3/4 w-full overflow-hidden rounded-md shadow-lifted"
                            />
                        ) : (
                            <Skeleton className="aspect-3/4 w-full rounded-md border border-subtle shadow-lifted" />
                        )}
                    </span>
                );
            })}
        </div>
    </div>
);

export default SignedOutHero;
