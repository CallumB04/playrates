import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import type { SetupStepKey } from "@playrates/shared";
import ArtBackdrop from "../../game/ArtBackdrop";
import GameCover from "../../game/GameCover";
import XpBar from "../../progress/XpBar";
import Button from "../../ui/Button";
import { cardClass } from "../../ui/cardClass";
import Skeleton from "../../ui/Skeleton";
import XpLabel from "../../journey/XpLabel";
import { STEP_META } from "../../journey/setupStepMeta";
import { logOnShelf } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { useMyShelf } from "../../../hooks/queries/useGameLogs";
import { useProgress, useXpRules } from "../../../hooks/queries/useProgress";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import { useSetupSteps } from "../../../hooks/useSetupSteps";
import { burst, tokenColours } from "../../../lib/particles";
import { cn } from "../../../lib/cn";
import StepFrame from "./StepFrame";
import type { StepProps } from "./stepProps";

/** What to offer next, the ones that try something new first. */
const NEXT: SetupStepKey[] = ["review", "friend", "post", "favourites"];
const OFFERED = 3;

/**
 * The end of the welcome: their own games' art behind where they've got
 * to, and the few things worth doing next, each opening the real thing.
 */
const DoneStep = ({
    titleId,
    preview,
    onPick,
    onFinish,
}: StepProps & {
    /** Off to a setup step, out of the welcome. */
    onPick: (step: SetupStepKey) => void;
    onFinish: () => void;
}) => {
    const user = useAuth().user!;
    const { data: progress } = useProgress();
    const { data: shelf } = useMyShelf("played", { limit: 4 });
    const steps = useSetupSteps();
    const rules = useXpRules().data;
    const canvas = useRef<HTMLCanvasElement>(null);
    const still = usePrefersReducedMotion();

    useEffect(() => {
        if (still || !canvas.current) return;
        return burst(canvas.current, {
            colours: tokenColours([
                "--medal-gold",
                "--brand",
                "--accent",
                "--love",
                "--status-playing",
            ]),
            origin: { x: 0.5, y: 0.2 },
            count: 90,
        });
    }, [still]);

    const games = (shelf?.data ?? []).flatMap((entry) => {
        const log = logOnShelf(entry, "played");
        return log?.game ? [log.game] : [];
    });
    const lead = games.find((g) => g.artworkUrl) ?? games[0];
    const left = new Set(
        (steps ?? []).filter((s) => !s.done).map((s) => s.key)
    );
    const offered = preview
        ? []
        : NEXT.filter((key) => left.has(key)).slice(0, OFFERED);
    const xpOf = (key: SetupStepKey) =>
        rules?.find((r) => r.source === STEP_META[key].xpSource)?.xp;

    return (
        <>
            <canvas
                ref={canvas}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 size-full"
            />
            <StepFrame
                titleId={titleId}
                title={`You’re set, ${user.firstName || user.username}`}
                primary={<Button onClick={onFinish}>Let’s go</Button>}
            >
                {/* Where they've got to, over the art of what they've
                    played. */}
                <div
                    className={cardClass(
                        "relative isolate flex items-center gap-4 overflow-hidden p-4 sm:p-5",
                        { padding: "none" }
                    )}
                >
                    <ArtBackdrop url={lead?.artworkUrl} />
                    <div className="min-w-0 flex-1">
                        {progress ? (
                            <>
                                <p className="font-display text-2xl leading-none text-content">
                                    Level {progress.level.level}
                                </p>
                                <XpBar
                                    level={progress.level}
                                    className="mt-3"
                                />
                            </>
                        ) : (
                            <Skeleton className="h-14 w-full" />
                        )}
                    </div>
                    {games.length > 0 && (
                        <div aria-hidden className="flex shrink-0 -space-x-5">
                            {games.slice(0, 3).map((game, i) => (
                                <span
                                    key={game.id}
                                    className="block"
                                    style={{
                                        transform: `rotate(${(i - 1) * 6}deg)`,
                                    }}
                                >
                                    <GameCover
                                        coverUrl={game.coverUrl}
                                        title={game.title}
                                        className="aspect-3/4 w-12 overflow-hidden rounded-xs shadow-cover ring-2 ring-surface-raised sm:w-14"
                                    />
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {offered.length > 0 && (
                    <section
                        aria-labelledby={`${titleId}-next`}
                        className="flex flex-col gap-2"
                    >
                        <h3
                            id={`${titleId}-next`}
                            className="text-label text-content-secondary"
                        >
                            Try one next
                        </h3>
                        <ul className="flex flex-col gap-2">
                            {offered.map((key) => {
                                const { icon: Icon, title } = STEP_META[key];
                                // A review is of something: theirs, art and
                                // all.
                                const game =
                                    key === "review" ? lead : undefined;
                                const xp = xpOf(key);
                                return (
                                    <li key={key}>
                                        <button
                                            type="button"
                                            onClick={() => onPick(key)}
                                            className={cardClass(
                                                "group relative isolate flex w-full cursor-pointer items-center gap-3 overflow-hidden p-3 text-left transition-colors hover:border-strong",
                                                { padding: "none" }
                                            )}
                                        >
                                            {game && (
                                                <ArtBackdrop
                                                    url={game.artworkUrl}
                                                    fade="row"
                                                />
                                            )}
                                            {game ? (
                                                <span
                                                    aria-hidden
                                                    className="contents"
                                                >
                                                    <GameCover
                                                        coverUrl={game.coverUrl}
                                                        title={game.title}
                                                        className="aspect-3/4 w-9 shrink-0 overflow-hidden rounded-xs"
                                                    />
                                                </span>
                                            ) : (
                                                <span
                                                    aria-hidden
                                                    className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-subtle text-brand-text"
                                                >
                                                    <Icon size={17} />
                                                </span>
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-body-sm font-medium text-content">
                                                    {game
                                                        ? `Review ${game.title}`
                                                        : title}
                                                </span>
                                                {xp !== undefined && (
                                                    <XpLabel>+{xp} XP</XpLabel>
                                                )}
                                            </span>
                                            <ArrowRight
                                                size={16}
                                                aria-hidden
                                                className={cn(
                                                    "shrink-0 text-content-muted transition-transform duration-200",
                                                    "group-hover:translate-x-0.5 group-hover:text-brand-text"
                                                )}
                                            />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}
            </StepFrame>
        </>
    );
};

export default DoneStep;
