import { useEffect, useId, useState } from "react";
import { badgeDef, type BadgeUnlock, type Progress } from "@playrates/shared";
import Button from "../ui/Button";
import { useFigureRoll } from "../ui/Figure";
import { useAuth } from "../../contexts/AuthContext";
import { usePlayerBadges } from "../../hooks/queries/useProgress";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { formatCount } from "../../lib/format";
import BadgeMedal from "./BadgeMedal";
import MomentStage from "./MomentStage";
import { TokenCoin } from "./TokenAmount";

interface LaunchRevealProps {
    progress: Progress;
    onShowcase: () => void;
    onDone: () => void;
}

/** When each beat lands, in ms from the start. */
const BEATS = [0, 1300, 3400, 5200];

/**
 * A member from before levels sees their history counted once: what they
 * have done ticks up, the XP rolls to their level, and their badges drop
 * in. Skip goes straight to the end.
 */
const LaunchReveal = ({ progress, onShowcase, onDone }: LaunchRevealProps) => {
    const titleId = useId();
    const { user } = useAuth();
    const still = usePrefersReducedMotion();
    const [beat, setBeat] = useState(still ? 3 : 0);
    const { data: mine } = usePlayerBadges(user?.username ?? "", !!user);

    useEffect(() => {
        if (still) return;
        const timers = BEATS.slice(1).map((at, i) =>
            setTimeout(() => setBeat((b) => Math.max(b, i + 1)), at)
        );
        return () => timers.forEach(clearTimeout);
    }, [still]);

    const value = (badge: string) =>
        mine?.progress?.find((p) => p.badge === badge)?.value ?? 0;
    const tallies = [
        { label: "games logged", n: value("collector") },
        { label: "games finished", n: value("finisher") },
        { label: "reviews written", n: value("critic") },
        { label: "friends made", n: value("social_butterfly") },
    ];
    const xp = useFigureRoll(beat >= 2 ? progress.xp : 0, !still);
    const tiers = progress.unseen.badges.filter((b) =>
        badgeDef(b.badge)
    ).length;
    const badges = progress.unseen.badges
        .map((b: BadgeUnlock) => ({ ...b, def: badgeDef(b.badge) }))
        .filter((b) => b.def)
        // The best metal of each badge, not every step on the way.
        .filter(
            (b, _, all) =>
                !all.some((o) => o.badge === b.badge && o.metal > b.metal)
        );

    return (
        <MomentStage
            onClose={onDone}
            labelledBy={titleId}
            celebrate={beat >= 2}
            light="rgba(143,116,255,0.32)"
        >
            {beat < 3 && (
                <button
                    type="button"
                    onClick={() => setBeat(3)}
                    className="fixed top-4 right-4 min-h-11 rounded-md px-4 text-label font-medium text-content-on-media/70 hover:text-content-on-media"
                >
                    Skip
                </button>
            )}

            <p className="animate-fade-up font-mono text-label font-bold tracking-[0.3em] text-medal-gold uppercase">
                Levels are here
            </p>
            <h2
                id={titleId}
                className="mt-2 animate-fade-up font-display text-[28px] leading-tight font-semibold sm:text-[40px]"
            >
                Here’s what you’ve done so far
            </h2>

            {beat >= 1 && beat < 3 && (
                <ul className="mt-6 grid w-full grid-cols-2 gap-2">
                    {tallies.map((t, i) => (
                        <li
                            key={t.label}
                            className="animate-fade-up rounded-md bg-content-on-media/10 px-3 py-2.5"
                            style={{ animationDelay: `${i * 220}ms` }}
                        >
                            <span className="block font-mono text-figure-sm font-bold">
                                {formatCount(t.n)}
                            </span>
                            <span className="text-label-sm text-content-on-media/70">
                                {t.label}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {beat >= 2 && (
                <div className="mt-6 flex flex-col items-center">
                    <span className="font-mono text-label text-content-on-media/70 tabular-nums">
                        {formatCount(Math.round(beat >= 3 ? progress.xp : xp))}{" "}
                        XP
                    </span>
                    <span className="relative grid place-items-center">
                        <span
                            aria-hidden
                            className="pointer-events-none absolute size-56 animate-glow-bloom rounded-full bg-medal-gold/20 blur-3xl"
                        />
                        {/* Once, as the number lands. Still, a ring that
                            never leaves would only be in the way. */}
                        <span
                            aria-hidden
                            className="pointer-events-none absolute size-32 animate-ring-out rounded-full border-2 border-medal-gold/70 [animation-delay:250ms] motion-reduce:hidden sm:size-40"
                        />
                        <span className="metal-gold pr-metal-text relative animate-level-pop font-display text-[6rem] leading-none font-extrabold sm:text-[8rem]">
                            {progress.level.level}
                        </span>
                    </span>
                    <span className="font-mono text-label font-semibold tracking-[0.2em] uppercase">
                        Level
                    </span>
                </div>
            )}

            {beat >= 3 && (
                <>
                    {badges.length > 0 && (
                        <ul className="mt-6 flex max-h-[30dvh] flex-wrap justify-center gap-3 overflow-y-auto p-1">
                            {badges.map((b, i) => (
                                <li
                                    key={`${b.badge}:${b.metal}`}
                                    className="animate-medal-drop"
                                    style={{ animationDelay: `${i * 90}ms` }}
                                >
                                    <BadgeMedal
                                        badge={b.def!}
                                        metal={b.metal}
                                        size="md"
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-content-on-media/10 px-3 py-1.5 font-mono text-label font-semibold">
                        {/* Every metal counts, as on the badges tab: the
                            medals above are only each badge's best. */}
                        {formatCount(tiers)} {tiers === 1 ? "badge" : "badges"}
                        <span aria-hidden>·</span>
                        <TokenCoin />
                        {formatCount(progress.tokens)} tokens to spend
                    </p>
                    <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Button
                            size="touch"
                            onClick={onShowcase}
                            className="w-full sm:w-auto"
                        >
                            Pick your showcase
                        </Button>
                        <Button
                            variant="secondary"
                            size="touch"
                            onClick={onDone}
                            className="w-full sm:w-auto"
                        >
                            Done
                        </Button>
                    </div>
                </>
            )}
        </MomentStage>
    );
};

export default LaunchReveal;
