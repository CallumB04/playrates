import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { igdbSized, SETUP_REWARD, type SetupStepKey } from "@playrates/shared";
import XpLabel from "../../../components/journey/XpLabel";
import { STEP_META } from "../../../components/journey/setupStepMeta";
import { TokenCoin } from "../../../components/progress/TokenAmount";
import { cardClass } from "../../../components/ui/cardClass";
import { useGames } from "../../../hooks/queries/useGames";
import { openSetupStep } from "../../../lib/setupSheet";
import { useXpRules } from "../../../hooks/queries/useProgress";
import { useSetupSteps } from "../../../hooks/useSetupSteps";
import { unfinished } from "../../../lib/setupChecklist";
import { cn } from "../../../lib/cn";

/**
 * Setup on home, carrying on from the welcome, as a shelf: each step a
 * card on the art of a game people are playing now, done ones marked as a
 * played game is, any of the rest a tap from its sheet. The eight across
 * on a wide screen; a swipe on a phone, opening on the next one.
 */
const GetStarted = () => {
    const steps = unfinished(useSetupSteps());
    const rules = useXpRules(!!steps).data;
    // The home page's own trending rail, so no request of its own.
    const { data: trending } = useGames({
        trending: true,
        limit: 12,
        count: false,
    });
    const rail = useRef<HTMLOListElement>(null);
    const nextAt = steps?.findIndex((step) => !step.done) ?? -1;
    // On a phone, open on the next one rather than on those already done.
    useEffect(() => {
        const el = rail.current;
        const card = el?.children[nextAt] as HTMLElement | undefined;
        if (el && card && el.scrollWidth > el.clientWidth) {
            // Clear of the rail's own 16px edge, so its ring shows.
            el.scrollLeft +=
                card.getBoundingClientRect().left -
                el.getBoundingClientRect().left -
                16;
        }
    }, [nextAt]);
    if (!steps || nextAt < 0) return null;
    const done = steps.filter((step) => step.done).length;
    const xpOf = (key: SetupStepKey) =>
        rules?.find((r) => r.source === STEP_META[key].xpSource)?.xp;
    const art = (trending?.data ?? [])
        .map((g) => g.artworkUrl ?? g.coverUrl)
        .filter((u): u is string => !!u);

    return (
        <section
            aria-labelledby="get-started"
            className={cardClass("flex animate-fade-up flex-col gap-4", {
                padding: "none",
            })}
        >
            <div className="flex flex-col gap-2.5 px-4 pt-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
                <h2
                    id="get-started"
                    className="flex shrink-0 items-baseline gap-2.5 text-body font-semibold text-content"
                >
                    Get started{" "}
                    <span className="font-mono text-body-sm font-normal text-content-muted">
                        {done} of {steps.length}
                    </span>
                </h2>
                <div className="flex flex-1 items-center gap-3 sm:gap-5">
                    <div className="flex flex-1 gap-1" aria-hidden>
                        {steps.map((step) => (
                            <span
                                key={step.key}
                                className={cn(
                                    "h-1.5 flex-1 rounded-full",
                                    step.done
                                        ? "bg-brand"
                                        : "bg-content-muted/20"
                                )}
                            />
                        ))}
                    </div>
                    {/* At the end of the bar on a phone, where the bar
                        says what it's for. */}
                    <p className="inline-flex shrink-0 items-center gap-1 text-label-sm text-content-muted">
                        <span className="max-sm:sr-only">All done:</span>
                        <XpLabel>+{SETUP_REWARD.xp} XP</XpLabel>
                        and {SETUP_REWARD.tokens}
                        <TokenCoin className="size-3" />
                    </p>
                </div>
            </div>

            <ol
                ref={rail}
                className="grid snap-x snap-proximity scroll-px-4 [scrollbar-width:none] auto-cols-[29%] grid-flow-col gap-2.5 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-4 sm:scroll-px-5 sm:auto-cols-[minmax(0,1fr)] sm:gap-3 sm:px-5 sm:pb-5 [&::-webkit-scrollbar]:hidden"
            >
                {steps.map((step, i) => {
                    const Icon = STEP_META[step.key].icon;
                    const next = i === nextAt;
                    const xp = xpOf(step.key);
                    const url = art[i % Math.max(art.length, 1)];
                    const face = (
                        <>
                            {url && (
                                <img
                                    src={igdbSized(url, "screenshot_med")}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className={cn(
                                        "absolute inset-0 -z-10 size-full object-cover transition-[scale,filter,opacity] duration-[900ms] ease-[var(--ease-glide)]",
                                        step.done
                                            ? "opacity-40 grayscale"
                                            : "group-hover:scale-105"
                                    )}
                                />
                            )}
                            <span
                                aria-hidden
                                className="absolute inset-0 -z-10 bg-linear-to-t from-overlay-tile via-overlay-tile/70 to-overlay-tile/20"
                            />
                            <span className="grid size-6 place-items-center rounded-sm bg-media-scrim-strong text-content-on-media backdrop-blur-sm sm:size-8">
                                <Icon
                                    aria-hidden
                                    className="size-3 sm:size-4"
                                />
                            </span>
                            {next && (
                                <span className="absolute top-2 right-2 rounded-xs bg-action px-1 py-px text-[8px] font-semibold tracking-wide text-action-ink uppercase sm:top-3 sm:right-3 sm:px-1.5 sm:py-0.5 sm:text-[10px]">
                                    Next
                                </span>
                            )}
                            {step.done && (
                                <Check
                                    strokeWidth={2.5}
                                    aria-label="Done"
                                    className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-content-on-media sm:size-7"
                                />
                            )}
                            <span className="mt-auto flex flex-col gap-1 text-left">
                                <span
                                    className={cn(
                                        "line-clamp-3 text-xs leading-tight font-medium sm:text-[13px]",
                                        step.done
                                            ? "text-content-on-media/70"
                                            : "text-content-on-media"
                                    )}
                                >
                                    {step.label}
                                </span>
                                {!step.done && xp !== undefined && (
                                    <span className="font-mono text-[11px] text-content-on-media/75">
                                        +{xp} XP
                                    </span>
                                )}
                            </span>
                        </>
                    );
                    const box = cn(
                        "group relative isolate flex aspect-3/4 snap-start flex-col overflow-hidden rounded-md bg-surface-media p-2.5 shadow-cover sm:p-3",
                        next &&
                            "ring-2 ring-brand ring-offset-2 ring-offset-surface-raised"
                    );
                    return (
                        <li key={step.key}>
                            {step.done ? (
                                <div className={box}>{face}</div>
                            ) : (
                                <button
                                    type="button"
                                    aria-label={
                                        next
                                            ? `Next: ${step.label}`
                                            : step.label
                                    }
                                    onClick={() => openSetupStep(step.key)}
                                    className={cn(
                                        box,
                                        "w-full cursor-pointer transition-shadow duration-500 hover:shadow-cover-hover"
                                    )}
                                >
                                    {face}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

export default GetStarted;
