import { Link } from "react-router-dom";
import type { Game } from "@playrates/shared";
import Button, { buttonClass } from "../../../components/ui/Button";
import GameCover from "../../../components/game/GameCover";
import type { SiteStats } from "../../../api";
import { formatCount } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface SignedOutHeroProps {
    siteStats: SiteStats | undefined;
    /** Real box art, used as the hero image. */
    covers: Game[];
    onStart: () => void;
}

/* Fanned rather than gridded. Six covers at alternating tilts read as a shelf
   someone keeps; six covers square-on read as a product grid. */
const TILT = [
    "-rotate-6 translate-y-3",
    "rotate-3 -translate-y-2",
    "-rotate-2 translate-y-4",
    "rotate-6 -translate-y-1",
    "-rotate-3 translate-y-2",
    "rotate-2 -translate-y-3",
];

/**
 * The pitch.
 *
 * This used to put a card of community figures for one game beside the
 * headline, which said nothing to someone who has never heard of the game and
 * read as a dashboard widget dropped into a landing page. The catalogue is the
 * more honest hero image: it is the actual product, and it is the thing a
 * visitor is deciding whether they want.
 */
const SignedOutHero = ({ siteStats, covers, onStart }: SignedOutHeroProps) => (
    <div className="grid items-center gap-10 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14">
        <div>
            <h1 className="max-w-[16ch] font-display text-hero text-content">
                Keep a record of everything you play.
            </h1>

            <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-content-secondary">
                Rate to the half point, track the hours, and let the backlog be
                honest with you. Your library is a page worth linking to, not a
                spreadsheet you hide.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={onStart}>
                    Start your library
                </Button>
                <Link
                    to="/library"
                    className={buttonClass("secondary", undefined, "lg")}
                >
                    Browse the catalogue
                </Link>
            </div>

            {/* One sentence, not a dashboard. Three figures in a definition
                list is a stats widget; this is a claim about the place. */}
            <p className="mt-6 text-body-sm text-content-muted">
                <span className="font-mono text-content">
                    {formatCount(siteStats?.gameCount ?? 0)}
                </span>{" "}
                games catalogued, and{" "}
                <span className="font-mono text-content">
                    {formatCount(siteStats?.logCount ?? 0)}
                </span>{" "}
                {siteStats?.logCount === 1 ? "log" : "logs"} kept so far. Free,
                and yours to export.
            </p>
        </div>

        <div
            aria-hidden
            className="relative hidden h-[300px] lg:block xl:h-[340px]"
        >
            {covers.slice(0, 6).map((game, i) => (
                <span
                    key={game.id}
                    className={cn(
                        "absolute top-1/2 w-[148px] -translate-y-1/2 xl:w-[164px]",
                        TILT[i]
                    )}
                    style={{ left: `${i * 15}%`, zIndex: i }}
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
