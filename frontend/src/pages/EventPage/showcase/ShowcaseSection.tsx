import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import {
    REVEAL_TAG_LABELS,
    type EventDetail,
    type ShowcaseDetail,
    type ShowcaseReveal,
} from "@playrates/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { useAccountForm } from "../../../contexts/AccountFormContext";
import { useMyHype, useSetHype } from "../../../hooks/queries/useEvents";
import { useTileActions } from "../../../components/game/useTileActions";
import ArtBackdrop from "../../../components/game/ArtBackdrop";
import GameCover from "../../../components/game/GameCover";
import ShareBar from "../../../components/events/ShareBar";
import { buttonClass } from "../../../components/ui/buttonClass";
import { cardClass } from "../../../components/ui/cardClass";
import { cn } from "../../../lib/cn";
import { mostHyped } from "../../../lib/events";

/** One reveal in the running order: when it came, what it was, and your
 *  hype for it. */
const RevealRow = ({
    reveal,
    index,
    hyped,
    onHype,
}: {
    reveal: ShowcaseReveal;
    index: number;
    hyped: boolean;
    onHype: () => void;
}) => {
    const { actionsFor } = useTileActions();
    const wishlist = reveal.game
        ? actionsFor(reveal.game).find((a) => a.key === "wishlist")
        : undefined;
    const name = reveal.game?.title ?? reveal.label ?? "";
    return (
        <li
            className={cardClass(
                "relative isolate flex items-center gap-3 overflow-hidden sm:gap-4",
                { padding: "none" }
            )}
        >
            <ArtBackdrop url={reveal.game?.artworkUrl} fade="row" />
            <span className="w-8 shrink-0 pl-3 font-mono text-label-sm text-content-muted tabular-nums sm:w-14 sm:pl-4 sm:text-figure-sm">
                {String(index + 1).padStart(2, "0")}
            </span>
            {reveal.game ? (
                <Link
                    to={`/game/${reveal.game.id}`}
                    className="shrink-0 py-3"
                    aria-label={reveal.game.title}
                >
                    <GameCover
                        coverUrl={reveal.game.coverUrl}
                        title=""
                        sizes="56px"
                        className="aspect-3/4 w-12 rounded-sm shadow-plate sm:w-14"
                    />
                </Link>
            ) : (
                <span
                    aria-hidden
                    className="my-3 grid aspect-3/4 w-12 shrink-0 place-items-center rounded-sm border border-dashed border-strong text-label-sm text-content-muted sm:w-14"
                >
                    New
                </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-3">
                <p
                    className={cn(
                        "text-label-sm font-semibold",
                        reveal.tag === "premiere"
                            ? "text-brand-text"
                            : "text-content-muted"
                    )}
                >
                    {REVEAL_TAG_LABELS[reveal.tag]}
                </p>
                {reveal.game ? (
                    <Link
                        to={`/game/${reveal.game.id}`}
                        className="line-clamp-2 text-body-sm font-semibold text-content hover:underline sm:truncate sm:text-body"
                    >
                        {name}
                    </Link>
                ) : (
                    <p className="line-clamp-2 text-body-sm font-semibold text-content sm:truncate sm:text-body">
                        {name}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-2 pr-3 sm:pr-4">
                {/* A phone has the tile's own menu on the cover's page;
                    here there's only room for hype. */}
                {wishlist && (
                    <span className="hidden sm:block">
                        <button
                            type="button"
                            onClick={() => void wishlist.onSelect()}
                            className={buttonClass("ghost", undefined, "sm")}
                        >
                            {wishlist.label}
                        </button>
                    </span>
                )}
                <button
                    type="button"
                    aria-pressed={hyped}
                    aria-label={
                        hyped
                            ? `Hyped for ${name}. Take it back`
                            : `Hype ${name}`
                    }
                    onClick={onHype}
                    className={buttonClass(
                        hyped ? "primary" : "secondary",
                        "min-w-16 sm:min-w-20",
                        "md"
                    )}
                >
                    <Flame size={16} aria-hidden />
                    <span className="tabular-nums">{reveal.hype}</span>
                </button>
            </div>
        </li>
    );
};

/** The crowd's ranking: what everyone's most excited about, each measured
 *  against the leader. */
const MostHyped = ({ reveals }: { reveals: ShowcaseReveal[] }) => {
    const top = mostHyped(reveals).slice(0, 5);
    const most = Math.max(1, top[0]?.hype ?? 0);
    return (
        <aside
            aria-labelledby="most-hyped"
            className={cardClass(
                "flex flex-col overflow-hidden lg:sticky lg:top-[calc(var(--spacing-navbar)+1.5rem)]",
                { padding: "none" }
            )}
        >
            <header className="flex flex-col gap-0.5 px-5 pt-5 pb-4">
                <h3
                    id="most-hyped"
                    className="font-display text-section text-content"
                >
                    Most hyped
                </h3>
                <p className="text-body-sm text-content-secondary">
                    What everyone’s most excited for
                </p>
            </header>
            <ol className="flex flex-col divide-y divide-subtle border-t border-subtle">
                {top.map((reveal, i) => {
                    const name = reveal.game?.title ?? reveal.label ?? "";
                    return (
                        <li
                            key={reveal.id}
                            className="flex items-center gap-3 px-5 py-3"
                        >
                            <span
                                className={cn(
                                    "w-4 shrink-0 font-display text-body tabular-nums",
                                    i === 0
                                        ? "text-brand-text"
                                        : "text-content-muted"
                                )}
                            >
                                {i + 1}
                            </span>
                            {reveal.game ? (
                                <GameCover
                                    coverUrl={reveal.game.coverUrl}
                                    title=""
                                    sizes="36px"
                                    className="aspect-3/4 w-9 shrink-0 rounded-xs shadow-plate"
                                />
                            ) : (
                                <span
                                    aria-hidden
                                    className="aspect-3/4 w-9 shrink-0 rounded-xs border border-dashed border-strong"
                                />
                            )}
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="truncate text-body-sm font-semibold text-content">
                                        {name}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-1 text-label-sm text-content-secondary tabular-nums">
                                        <Flame
                                            size={12}
                                            aria-hidden
                                            className="text-brand-text"
                                        />
                                        {reveal.hype}
                                    </span>
                                </div>
                                <ShareBar
                                    value={reveal.hype / most}
                                    label={`${name}: ${reveal.hype} hyped`}
                                />
                            </div>
                        </li>
                    );
                })}
            </ol>
        </aside>
    );
};

/**
 * A showcase's part of its page: what it revealed, in the order it was
 * shown, and what everyone's hyped for. Nothing to pick and nobody wins.
 */
const ShowcaseSection = ({
    event,
    showcase,
}: {
    event: EventDetail;
    showcase: ShowcaseDetail;
}) => {
    const { user } = useAuth();
    const { openSignup } = useAccountForm();
    const { data: hype } = useMyHype(event.slug, !!user);
    const setHype = useSetHype(event.slug);
    const mine = new Set(hype ?? []);

    if (showcase.reveals.length === 0) return null;
    return (
        <section
            aria-labelledby="running-order"
            className="flex flex-col gap-6"
        >
            <header>
                <h2
                    id="running-order"
                    className="font-display text-display text-content"
                >
                    Every reveal
                </h2>
            </header>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                <ol className="flex min-w-0 flex-col gap-2">
                    {showcase.reveals.map((reveal, index) => (
                        <RevealRow
                            key={reveal.id}
                            reveal={reveal}
                            index={index}
                            hyped={mine.has(reveal.id)}
                            onHype={() =>
                                user
                                    ? setHype.mutate({
                                          revealId: reveal.id,
                                          on: !mine.has(reveal.id),
                                      })
                                    : openSignup()
                            }
                        />
                    ))}
                </ol>
                <MostHyped reveals={showcase.reveals} />
            </div>
        </section>
    );
};

export default ShowcaseSection;
