import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Lock, SmilePlus } from "lucide-react";
import {
    DEFAULT_REACTION,
    REACTIONS,
    type ReactionCount,
    type ReactionKey,
} from "@playrates/shared";
import ReactionIcon from "../progress/ReactionIcon";
import { REACTION_COLOURS } from "../progress/reactionIcons";
import { useProgressQuery } from "../../hooks/queries/useProgress";
import { useDismiss } from "../../hooks/useDismiss";
import { applyReaction, countOf, type ReactionView } from "../../lib/reactions";
import { cn } from "../../lib/cn";
import { floatBeside, popoverClass } from "./popover";
import { ItemSheetFor } from "../shop/ItemSheet";

interface ReactionBarProps {
    voteCount: number;
    myReaction: ReactionKey | null;
    reactions: ReactionCount[];
    /** Return the request's promise, and the bar takes the reaction back if
     *  it fails. */
    onReact: (reaction: ReactionKey) => unknown;
    /** Set when the viewer cannot react, and says why: the counts still
     *  show, so a signed-out viewer or the author can read them. */
    disabledReason?: string | null;
    /** What is being reacted to, for the labels. */
    noun?: string;
    /** Which edge the picker hangs from: the bar's right, where the bar
     *  sits at the right of its row, so it opens over the page. */
    align?: "start" | "end";
    className?: string;
}

const defOf = (key: ReactionKey) => REACTIONS.find((r) => r.key === key)!;

/** The shop item that unlocks a reaction, for one that's bought. */
const itemOf = (key: ReactionKey): string | null => {
    const def = defOf(key);
    return "item" in def ? def.item : null;
};

/** Where a locked reaction comes from, said short. */
const lockText = (key: ReactionKey) => {
    const def = defOf(key);
    return "level" in def ? `Level ${def.level}` : "Shop";
};

/** A wash of a reaction's colour, for the one that's yours. */
const tint = (key: string) => {
    const colour = REACTION_COLOURS[key] ?? "var(--brand)";
    return {
        borderColor: colour,
        background: `color-mix(in srgb, ${colour} 14%, transparent)`,
    };
};

/** The picker's size, for placing it before it has drawn: five across,
 *  each row about 46px, and the shop link under them. */
const PICKER = {
    width: 240,
    height: Math.ceil(REACTIONS.length / 5) * 46 + 50,
};

const CHIP =
    "inline-flex min-h-11 items-center gap-1 rounded-full border px-2.5 py-1 text-label-sm transition-colors lift sm:min-h-0 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * Reactions on a review or a post: each one someone has left, with
 * its count, and a plus that picks from the ones the viewer has unlocked.
 * With none left yet there's only the plus. One per person: the same again takes it back,
 * another swaps it.
 *
 * It answers the press at once rather than after the round trip: a reaction
 * that lands a second later reads as a missed tap, and gets pressed again.
 */
const ReactionBar = ({
    voteCount,
    myReaction,
    reactions,
    onReact,
    disabledReason,
    noun = "review",
    align = "start",
    className,
}: ReactionBarProps) => {
    const disabled = !!disabledReason;
    const { data: progress } = useProgressQuery(!disabled);
    const unlocked = new Set<string>(
        progress?.look.reactions ?? [DEFAULT_REACTION]
    );

    // What the press said, until the server's answer arrives as new props.
    const [pending, setPending] = useState<ReactionView | null>(null);
    useEffect(() => setPending(null), [voteCount, myReaction, reactions]);
    const [picking, setPicking] = useState(false);
    // A bought reaction not yours yet: its popup, then the reaction.
    const [buying, setBuying] = useState<ReactionKey | null>(null);
    const wrap = useRef<HTMLDivElement>(null);
    const picker = useRef<HTMLDivElement>(null);
    // The picker is portalled, so it counts as inside too.
    useDismiss([wrap, picker], () => setPicking(false), {
        enabled: picking,
        escape: true,
    });

    /* Fixed and portalled to the body: hung inside the bar, any card with
       overflow hidden around it cut it off. Portalled, it doesn't move with
       the bar, so it follows it. */
    const [anchor, setAnchor] = useState<DOMRect | null>(null);
    useEffect(() => {
        if (!picking) return setAnchor(null);
        const track = () => {
            const box = wrap.current?.getBoundingClientRect();
            if (box) setAnchor(box);
        };
        track();
        window.addEventListener("resize", track);
        window.addEventListener("scroll", track, true);
        return () => {
            window.removeEventListener("resize", track);
            window.removeEventListener("scroll", track, true);
        };
    }, [picking]);

    const shown = pending ?? { voteCount, myReaction, reactions };
    const want = (reaction: ReactionKey) => {
        setPicking(false);
        setBuying(reaction);
    };
    const press = (reaction: ReactionKey) => {
        setPicking(false);
        setPending(applyReaction(shown, reaction));
        Promise.resolve(onReact(reaction)).catch(() => setPending(null));
    };

    // Only what someone has left, the upvote first: nothing reads as a
    // row of noughts.
    const chips: ReactionKey[] = shown.reactions
        .map((r) => r.reaction)
        .sort((a, b) =>
            a === DEFAULT_REACTION ? -1 : b === DEFAULT_REACTION ? 1 : 0
        );
    if (chips.length === 0 && disabled) return null;

    return (
        <div
            ref={wrap}
            className={cn(
                "relative inline-flex flex-wrap items-center gap-1.5",
                className
            )}
        >
            {chips.map((key) => {
                const def = defOf(key);
                const mine = shown.myReaction === key;
                const count = countOf(shown, key);
                const locked = !disabled && !mine && !unlocked.has(key);
                // One someone else left that you could buy: buy it here.
                const buyable = locked && itemOf(key) !== null;
                const upvote = key === DEFAULT_REACTION;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => (buyable ? want(key) : press(key))}
                        disabled={disabled || (locked && !buyable)}
                        aria-pressed={mine}
                        aria-label={
                            disabled
                                ? `${count} ${upvote ? "upvotes" : def.label}. ${disabledReason}`
                                : mine
                                  ? `Remove your ${upvote ? "upvote" : def.label}`
                                  : upvote
                                    ? `Upvote this ${noun}`
                                    : buyable
                                      ? `Get ${def.label}, ${count} so far`
                                      : `React ${def.label}, ${count} so far`
                        }
                        title={
                            disabledReason ??
                            (locked
                                ? `${def.label}: ${lockText(key)}`
                                : def.label)
                        }
                        className={cn(
                            CHIP,
                            mine
                                ? "font-semibold text-content"
                                : "border-subtle text-content-muted hover:border-strong hover:text-content",
                            disabled || (locked && !buyable)
                                ? "cursor-not-allowed opacity-60"
                                : buyable
                                  ? "cursor-pointer opacity-60"
                                  : "cursor-pointer"
                        )}
                        // Yours takes on the reaction's own colour.
                        style={mine ? tint(key) : undefined}
                    >
                        <ReactionIcon reaction={key} size={16} />
                        <span className="font-mono tabular-nums">{count}</span>
                    </button>
                );
            })}

            {!disabled && (
                <button
                    type="button"
                    onClick={() => setPicking((p) => !p)}
                    aria-expanded={picking}
                    aria-label="Add a reaction"
                    className={cn(
                        CHIP,
                        "min-w-11 cursor-pointer justify-center border-subtle text-content-muted hover:border-strong hover:text-content sm:min-w-0"
                    )}
                >
                    <SmilePlus size={15} aria-hidden />
                </button>
            )}

            {picking &&
                anchor &&
                createPortal(
                    <div
                        ref={picker}
                        role="dialog"
                        aria-label="Reactions"
                        style={{
                            position: "fixed",
                            width: PICKER.width,
                            ...floatBeside(
                                anchor,
                                {
                                    width: window.innerWidth,
                                    height: window.innerHeight,
                                },
                                PICKER,
                                align
                            ),
                        }}
                        className={popoverClass("z-[60] p-2")}
                    >
                        <ul className="grid grid-cols-5 gap-1">
                            {REACTIONS.map((def) => {
                                const open = unlocked.has(def.key);
                                const mine = shown.myReaction === def.key;
                                const buyable =
                                    !open && itemOf(def.key) !== null;
                                return (
                                    <li key={def.key}>
                                        <button
                                            type="button"
                                            disabled={!open && !buyable}
                                            aria-pressed={mine}
                                            aria-label={
                                                open
                                                    ? def.label
                                                    : buyable
                                                      ? `Get ${def.label}`
                                                      : `${def.label}, ${lockText(def.key)}`
                                            }
                                            title={
                                                open
                                                    ? def.label
                                                    : `${def.label}: ${lockText(def.key)}`
                                            }
                                            onClick={() =>
                                                open
                                                    ? press(def.key)
                                                    : want(def.key)
                                            }
                                            className={cn(
                                                "relative grid aspect-square w-full cursor-pointer place-items-center rounded-sm disabled:cursor-not-allowed",
                                                "focus-visible:outline-2 focus-visible:outline-brand",
                                                !mine &&
                                                    (open || buyable) &&
                                                    "hover:bg-surface-hover"
                                            )}
                                            style={
                                                mine ? tint(def.key) : undefined
                                            }
                                        >
                                            <ReactionIcon
                                                reaction={def.key}
                                                size={24}
                                                muted={!open}
                                                className={cn(
                                                    !open && "opacity-50"
                                                )}
                                            />
                                            {!open && (
                                                <Lock
                                                    size={10}
                                                    aria-hidden
                                                    className="absolute right-1 bottom-1 text-content-muted"
                                                />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <Link
                            to="/shop"
                            className="mt-1.5 block rounded-sm px-1.5 py-1.5 text-center text-label-sm font-medium text-brand hover:bg-surface-hover"
                        >
                            More reactions in the shop
                        </Link>
                    </div>,
                    document.body
                )}
            {buying && (
                <ItemSheetFor
                    item={itemOf(buying)!}
                    onBought={() => press(buying)}
                    onClose={() => setBuying(null)}
                />
            )}
        </div>
    );
};

export default ReactionBar;
