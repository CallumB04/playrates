import { useEffect, useRef, type ReactNode } from "react";
import { Flame, TrendingUp, Trophy, type LucideIcon } from "lucide-react";
import { badgeDef, FRAMES, type Progress } from "@playrates/shared";
import BadgeMedal from "../progress/BadgeMedal";
import { TokenCoin } from "../progress/TokenAmount";
import XpBar from "../progress/XpBar";
import Skeleton from "../ui/Skeleton";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

/** The level the first frame comes with. */
const FIRST_FRAME_LEVEL = FRAMES[0].level;

const Card = ({
    icon: Icon,
    title,
    body,
    children,
}: {
    icon: LucideIcon;
    title: string;
    body: string;
    children: ReactNode;
}) => (
    <li className="flex w-full shrink-0 snap-center flex-col overflow-hidden rounded-lg border border-subtle bg-surface-raised">
        {/* Their own figures, not a picture of someone else's. */}
        <div className="flex min-h-36 flex-col justify-center gap-3 border-b border-subtle bg-brand-subtle/40 px-5 py-5">
            {children}
        </div>
        <div className="flex flex-col gap-1.5 p-5">
            <h2 className="flex items-center gap-2 font-display text-xl leading-tight text-content">
                <Icon size={18} aria-hidden className="text-brand-text" />
                {title}
            </h2>
            <p className="text-body-sm text-content-secondary">{body}</p>
        </div>
    </li>
);

/**
 * How PlayRates works, in three cards: XP and levels, the weekly streak
 * and tasks, badges and tokens. Each shows the member's own state, so it
 * reads as theirs. Swiped on a phone; `index` says which is in view, kept
 * in step with the scroll either way.
 */
const TourCards = ({
    progress,
    index,
    onIndex,
}: {
    progress: Progress | undefined;
    index: number;
    onIndex: (index: number) => void;
}) => {
    const strip = useRef<HTMLOListElement>(null);

    // To the card asked for, unless the scroll is already there.
    useEffect(() => {
        const el = strip.current;
        if (!el) return;
        const left = index * el.clientWidth;
        if (Math.abs(el.scrollLeft - left) > 4)
            el.scrollTo({ left, behavior: "smooth" });
    }, [index]);

    /* Read once the scroll settles: midway through the glide to a card,
       the strip is still nearer the last one, and would send it back. */
    const settling = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(settling.current), []);
    const onScroll = () => {
        clearTimeout(settling.current);
        settling.current = setTimeout(() => {
            const el = strip.current;
            if (!el || el.clientWidth === 0) return;
            const at = Math.round(el.scrollLeft / el.clientWidth);
            if (at !== index) onIndex(at);
        }, 120);
    };

    const week = progress?.quests.week ?? [];
    const collector = badgeDef("collector");
    const critic = badgeDef("critic");
    const gaming25 = badgeDef("gaming_25");

    return (
        <div className="flex flex-col gap-3">
            <ol
                ref={strip}
                onScroll={onScroll}
                aria-label="How PlayRates works"
                className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
            >
                <Card
                    icon={TrendingUp}
                    title="Everything earns XP"
                    body="Logging, rating, reviewing and posting all count towards your level."
                >
                    {progress ? (
                        <>
                            <p className="flex items-baseline justify-between">
                                <span className="font-display text-2xl text-content">
                                    Level {progress.level.level}
                                </span>
                                <span className="font-mono text-label-sm text-content-secondary tabular-nums">
                                    {formatCount(progress.xp)} XP so far
                                </span>
                            </p>
                            <XpBar level={progress.level} />
                            <p className="text-label-sm text-content-muted">
                                Level {FIRST_FRAME_LEVEL} brings your first
                                frame.
                            </p>
                        </>
                    ) : (
                        <Skeleton className="h-16 w-full" />
                    )}
                </Card>
                <Card
                    icon={Flame}
                    title="A little every week"
                    body="Do one thing a week to keep your streak. Tasks pay extra."
                >
                    <p className="flex items-center gap-2 text-body-sm text-content">
                        <Flame
                            size={18}
                            aria-hidden
                            className="text-status-playing"
                        />
                        <span className="font-mono font-semibold tabular-nums">
                            {progress?.streak.weeks ?? 0}
                        </span>
                        week streak
                    </p>
                    <ul className="flex flex-col gap-1.5">
                        {week.map((quest) => (
                            <li
                                key={quest.key}
                                className="flex items-center justify-between gap-3 text-label-sm"
                            >
                                <span className="flex min-w-0 items-center gap-2 text-content-secondary">
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "size-3.5 shrink-0 rounded-full border-[1.5px]",
                                            quest.done
                                                ? "border-brand bg-brand"
                                                : "border-strong"
                                        )}
                                    />
                                    <span className="truncate">
                                        {quest.label}
                                    </span>
                                </span>
                                <span className="shrink-0 font-mono text-content-muted tabular-nums">
                                    +{quest.xp} XP
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card
                    icon={Trophy}
                    title="Badges and tokens"
                    body="Badges mark what you’ve done. Tokens buy frames and themes in the shop."
                >
                    <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2">
                            {collector && (
                                <BadgeMedal badge={collector} metal={1} />
                            )}
                            {critic && <BadgeMedal badge={critic} metal={2} />}
                            {gaming25 && (
                                <BadgeMedal badge={gaming25} metal={null} />
                            )}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-body font-semibold text-content tabular-nums">
                            <TokenCoin className="size-5" />
                            {formatCount(progress?.tokens ?? 0)}
                        </span>
                    </div>
                </Card>
            </ol>
            {/* Which card is in view, and a way to any of them. */}
            <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Card ${i + 1} of 3`}
                        aria-current={i === index ? "step" : undefined}
                        onClick={() => onIndex(i)}
                        className="relative grid h-6 w-6 cursor-pointer place-items-center"
                    >
                        <span
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                i === index
                                    ? "w-5 bg-brand"
                                    : "w-1.5 bg-content-muted/40"
                            )}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TourCards;
