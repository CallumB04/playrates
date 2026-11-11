import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { igdbSized, type Game } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";
import Skeleton from "../../../components/ui/Skeleton";
import {
    BRAND_MOTTO,
    BRAND_NAME,
    BRAND_PITCH_TEXT,
} from "../../../constants/brand";
import { useGames, useSiteStats } from "../../../hooks/queries/useGames";
import { formatCount } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import { returnTo } from "../lib/returnTo";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

/* Five covers fanned on an arc, the middle one lifted: a shelf held out,
   not a grid. The tilt is on the inner card, so the cards can deal in one
   after another without the arrival undoing it. */
const DECK = [
    { rotate: -9, drop: 16 },
    { rotate: -4, drop: 5 },
    { rotate: 0, drop: 0 },
    { rotate: 4, drop: 5 },
    { rotate: 9, drop: 16 },
];

const CoverDeck = ({ games }: { games: Game[] | undefined }) => (
    <div
        aria-hidden
        className="flex stagger justify-center [--cover:72px] sm:[--cover:96px] lg:justify-start lg:pl-3 lg:[--cover:128px] xl:[--cover:140px]"
    >
        {DECK.map((place, i) => {
            const game = games?.[i];
            return (
                <span
                    key={game?.id ?? i}
                    className={cn(
                        "w-(--cover) shrink-0",
                        i > 0 && "-ml-4 sm:-ml-6 lg:-ml-8",
                        i === 2 ? "z-10" : i === 1 || i === 3 ? "z-[5]" : ""
                    )}
                >
                    <span
                        className="block"
                        style={{
                            transform: `translateY(${place.drop}px) rotate(${place.rotate}deg)${i === 2 ? " scale(1.07)" : ""}`,
                        }}
                    >
                        {game ? (
                            <GameCover
                                coverUrl={game.coverUrl}
                                title={game.title}
                                className="aspect-3/4 w-full overflow-hidden rounded-md shadow-lifted ring-1 ring-content-on-media/10"
                            />
                        ) : (
                            <Skeleton className="aspect-3/4 w-full rounded-md" />
                        )}
                    </span>
                </span>
            );
        })}
    </div>
);

/** How long each game's art holds before the next takes over. */
const ART_HOLDS_MS = 7000;

const artProps = (url: string) => ({
    src: igdbSized(url, "1080p"),
    srcSet: `${igdbSized(url, "screenshot_big")} 889w, ${igdbSized(url, "720p")} 1280w, ${igdbSized(url, "1080p")} 1920w`,
    sizes: "(min-width: 1024px) 55vw, 100vw",
});

/**
 * The trending games' art, one after another: each fades in over the last,
 * drifting slowly as it does. The next is loaded before it's shown, so a
 * change is never a blank; the cycle rests while the tab is hidden, and
 * with reduced motion one picture simply stays.
 */
const ArtCycle = ({ arts }: { arts: string[] }) => {
    const still = usePrefersReducedMotion();
    const [shown, setShown] = useState<{ on: number; under: number | null }>({
        on: 0,
        under: null,
    });
    const on = useRef(0);

    useEffect(() => {
        if (still || arts.length < 2) return;
        let live = true;
        const id = window.setInterval(() => {
            if (document.hidden) return;
            const next = (on.current + 1) % arts.length;
            const img = new Image();
            Object.assign(img, artProps(arts[next]!));
            void img
                .decode()
                .catch(() => undefined)
                .then(() => {
                    if (!live) return;
                    setShown({ on: next, under: on.current });
                    on.current = next;
                });
        }, ART_HOLDS_MS);
        return () => {
            live = false;
            window.clearInterval(id);
        };
    }, [arts, still]);

    if (arts.length === 0) return null;
    return (
        <span aria-hidden className="absolute inset-0 -z-20 opacity-70">
            {[shown.under, shown.on].map(
                (i) =>
                    i !== null &&
                    arts[i] && (
                        <img
                            key={arts[i]}
                            {...artProps(arts[i])}
                            alt=""
                            decoding="async"
                            className="absolute inset-0 size-full animate-art-in object-cover"
                        />
                    )
            )}
        </span>
    );
};

/** The mark and the name, as the footer has them, in white over the art. */
const Lockup = () => (
    <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-2.5 rounded-sm lift hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-on-media"
    >
        <img
            src="/favicon.svg"
            alt=""
            className="size-8 rounded-[8px] shadow-plate"
        />
        <span className="font-display text-xl font-bold">{BRAND_NAME}</span>
    </Link>
);

/** Out of the flow, back to wherever you came in from. */
const Close = ({ className }: { className?: string }) => {
    const navigate = useNavigate();
    const { state } = useLocation();
    return (
        <button
            type="button"
            aria-label="Close"
            onClick={() => navigate(returnTo(state))}
            className={cn(
                "grid size-11 cursor-pointer place-items-center rounded-full lift focus-visible:outline-2 focus-visible:outline-offset-2",
                className
            )}
        >
            <X size={20} aria-hidden />
        </button>
    );
};

/**
 * The join pages, full screen. On a wide screen the trending game's art
 * fills one side, with what PlayRates is over it, and the step sits on the
 * other, held still while the art side stays put. On a phone the art is a
 * band at the top and the step rises over it as a sheet, so the form starts
 * well above the fold.
 */
const JoinShell = ({ children }: { children: ReactNode }) => {
    const { data: trending } = useGames({
        trending: true,
        limit: 6,
        count: false,
    });
    const { data: stats } = useSiteStats();
    const games = trending?.data;
    const arts = (games ?? []).flatMap((game) =>
        game.artworkUrl ? [game.artworkUrl] : []
    );

    return (
        <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-surface lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-1">
            <section
                aria-label="About PlayRates"
                // Dark in both themes: it's a picture, and words on a
                // picture need the dark to sit on.
                className="relative isolate flex min-h-[230px] flex-col overflow-hidden bg-surface-media px-5 pt-[calc(--spacing(3)+env(safe-area-inset-top))] pb-14 text-content-on-media sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:px-14 lg:pt-10 lg:pb-12"
            >
                <ArtCycle arts={arts} />
                {/* Darkest where the words are: the top and foot, and the
                    left on a wide screen. */}
                <span
                    aria-hidden
                    className="absolute inset-0 -z-10 bg-linear-to-b from-overlay-tile via-overlay-tile/45 to-overlay-tile lg:via-overlay-tile/30"
                />
                <span
                    aria-hidden
                    className="absolute inset-0 -z-10 hidden bg-linear-to-r from-overlay-tile/80 via-transparent to-transparent lg:block"
                />

                <div className="flex items-center justify-between">
                    <Lockup />
                    <Close className="text-content-on-media hover:bg-content-on-media/10 focus-visible:outline-content-on-media lg:hidden" />
                </div>

                {/* On a phone, only the motto under the mark: the covers and
                    the pitch are for a screen with room for them. */}
                <div className="flex flex-1 flex-col justify-end gap-6 pt-10 lg:justify-center lg:gap-12 lg:pt-0">
                    <div>
                        <h2 className="max-w-[14ch] font-display text-[28px] leading-[1.05] sm:text-[40px] lg:text-[56px] xl:text-[64px]">
                            {BRAND_MOTTO}.
                        </h2>
                        <p className="mt-5 hidden max-w-[44ch] text-body leading-relaxed text-content-on-media/75 lg:block">
                            {BRAND_PITCH_TEXT}
                        </p>
                    </div>
                    <div className="hidden lg:block">
                        <CoverDeck games={games} />
                    </div>
                </div>

                <p className="hidden text-body-sm text-content-on-media/65 lg:block">
                    {stats ? (
                        <>
                            <span className="font-mono text-content-on-media">
                                {formatCount(stats.gameCount)}
                            </span>{" "}
                            games in the library, and{" "}
                            <span className="font-mono text-content-on-media">
                                {formatCount(stats.logCount)}
                            </span>{" "}
                            {stats.logCount === 1 ? "log" : "logs"} so far.
                        </>
                    ) : (
                        <Skeleton className="h-3 w-64 max-w-full" />
                    )}
                </p>
            </section>

            {/* On a phone, a sheet risen over the foot of the art. */}
            <div className="relative -mt-7 flex flex-col rounded-t-[28px] bg-surface shadow-sheet lg:mt-0 lg:rounded-none lg:shadow-none">
                <div className="hidden justify-end px-8 pt-8 lg:flex">
                    <Close className="text-content-secondary hover:bg-surface-hover hover:text-content focus-visible:outline-brand" />
                </div>
                <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col px-5 pt-8 pb-10 sm:px-0 lg:justify-center lg:py-10">
                    {children}
                </div>
                <p className="pb-[calc(--spacing(6)+env(safe-area-inset-bottom))] text-center text-label-sm text-content-muted">
                    <Link to="/terms" className="hover:text-content">
                        Terms
                    </Link>
                    <span aria-hidden className="mx-2">
                        ·
                    </span>
                    <Link to="/privacy" className="hover:text-content">
                        Privacy
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default JoinShell;
