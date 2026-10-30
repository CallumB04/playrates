import { useId, useState } from "react";
import { Check, ChevronLeft, Gift } from "lucide-react";
import type { GiftFriend, ShopEntry, ShopGroup } from "@playrates/shared";
import { ApiError } from "../../api";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";
import ProfilePicture from "../ProfilePicture";
import { TokenCoin } from "../progress/TokenAmount";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import {
    useBuy,
    useGift,
    useGiftFriends,
    useProgress,
    useSetStyle,
    useShop,
} from "../../hooks/queries/useProgress";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import { ItemStage } from "./ItemPreview";
import { DESCRIPTIONS, lookOf } from "./shopItems";

/** What an item is, over its name in the popup. */
const KIND_OF: Record<ShopGroup, string> = {
    frame: "Frame",
    theme: "Card theme",
    font: "Name font",
    colour: "Name colour",
    reaction: "Reaction",
    slot: "Profile slot",
    shield: "Streak",
};

/** Whether an item is worn now, and how to put it on. Slots, reactions and
 *  shields aren't worn: they simply count. */
export const useWear = () => {
    const { user } = useAuth();
    const { data } = useProgress();
    const setStyle = useSetStyle();
    const notify = useNotify();
    const failed = (error: unknown) =>
        notify(
            error instanceof ApiError ? error.message : "Couldn't change that",
            "error"
        );

    const wearing = (item: string): boolean | null => {
        const look = lookOf(item);
        switch (look.kind) {
            case "frame":
                return data?.frame === look.frame;
            case "theme":
                return data?.look.cardTheme === look.theme;
            case "font":
                return (user?.nameFont ?? "default") === look.font;
            case "colour":
                return (user?.nameColour ?? "default") === look.colour;
            default:
                return null;
        }
    };

    const wear = (item: string, onDone?: () => void) => {
        const look = lookOf(item);
        const done = { onSuccess: onDone, onError: failed };
        if (look.kind === "frame") setStyle.mutate({ frame: look.frame }, done);
        else if (look.kind === "theme")
            setStyle.mutate({ cardTheme: look.theme }, done);
        else if (look.kind === "font")
            setStyle.mutate({ nameFont: look.font }, done);
        else if (look.kind === "colour")
            setStyle.mutate({ nameColour: look.colour }, done);
    };

    return { wearing, wear, pending: setStyle.isPending };
};

/** Your tokens, the price, and what you'd have left: the sum of a purchase
 *  laid out before it's made. */
const Ledger = ({ tokens, price }: { tokens: number; price: number }) => {
    const after = tokens - price;
    return (
        <dl className="mt-4 rounded-md bg-surface-sunken/60 px-3 py-1.5">
            <Line label="Your tokens" value={formatCount(tokens)} />
            <Line
                label="Price"
                value={`−${formatCount(price)}`}
                tone="danger"
            />
            <Line
                label={after < 0 ? "Short by" : "Left after"}
                value={formatCount(Math.abs(after))}
                strong
                tone={after < 0 ? "danger" : undefined}
            />
        </dl>
    );
};

const Line = ({
    label,
    value,
    strong = false,
    tone,
}: {
    label: string;
    value: string;
    strong?: boolean;
    tone?: "danger";
}) => (
    <div
        className={cn(
            "flex items-center justify-between gap-3 py-1.5",
            strong && "border-t border-subtle pt-2.5"
        )}
    >
        <dt
            className={cn(
                "text-body-sm",
                strong ? "font-semibold text-content" : "text-content-secondary"
            )}
        >
            {label}
        </dt>
        <dd
            className={cn(
                "inline-flex items-center gap-1.5 font-mono tabular-nums",
                strong ? "text-section font-bold" : "text-body-sm",
                tone === "danger" ? "text-danger" : "text-content"
            )}
        >
            <TokenCoin className={strong ? "size-5" : "size-4"} />
            {value}
        </dd>
    </div>
);

/** After a purchase or a gift: a stamp, and what's left. */
const Done = ({ text, stamp = true }: { text: string; stamp?: boolean }) => (
    <p className="inline-flex items-center gap-1.5 text-body-sm font-medium text-content">
        <Check
            size={16}
            className={cn("text-action", stamp && "animate-stamp")}
            aria-hidden
        />
        {text}
    </p>
);

/**
 * An item up close: shown where it would be seen, with what it costs and
 * what you'd have left after. From here it's bought, worn, or given to a
 * friend. Each is quiet: a stamp, then what's next.
 */
const ItemSheet = ({
    item,
    onBought,
    onClose,
}: {
    item: ShopEntry;
    /** For a purchase made on the way to something, to finish it. */
    onBought?: () => void;
    onClose: () => void;
}) => {
    const titleId = useId();
    const notify = useNotify();
    const buy = useBuy();
    const { data: shop } = useShop();
    const { wearing, wear, pending } = useWear();
    const [giving, setGiving] = useState(false);
    // What the purchase left, straight from it, before the shop refreshes.
    const [left, setLeft] = useState<number | null>(null);
    const justBought = left !== null;

    const tokens = shop?.tokens ?? 0;
    const owned = item.maxOwned === 1 && item.owned > 0;
    const full = item.owned >= item.maxOwned;
    const worn = wearing(item.item);

    if (giving) {
        return (
            <GiftSheet
                item={item}
                tokens={tokens}
                onBack={() => setGiving(false)}
                onClose={onClose}
            />
        );
    }

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full sm:max-w-md"
        >
            {/* Clear of the close button: a wide preview, as a slot's is,
                otherwise runs up under it. */}
            <div className="-mx-4 -mt-4 mb-5 bg-surface-sunken/60 px-4 pt-12 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6">
                <ItemStage item={item} />
            </div>
            <p className="text-label-sm text-content-muted">
                {KIND_OF[item.group]}
            </p>
            <h2
                id={titleId}
                className="font-display text-section font-semibold text-content"
            >
                {item.label}
            </h2>
            <p className="mt-1 text-body-sm text-content-secondary">
                {DESCRIPTIONS[item.item]}
            </p>

            {!owned && !full && !justBought && (
                <Ledger tokens={tokens} price={item.price} />
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {justBought ? (
                    <Done
                        text={`Owned. ${formatCount(left ?? 0)} tokens left.`}
                    />
                ) : owned ? (
                    <Done text="Owned" stamp={false} />
                ) : full ? (
                    <p className="text-body-sm text-content-secondary">
                        You hold {item.maxOwned}, the most you can.
                    </p>
                ) : (
                    <span />
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button
                        size="touch"
                        variant="secondary"
                        onClick={() => setGiving(true)}
                        className="w-full sm:w-auto"
                    >
                        <Gift size={16} aria-hidden />
                        Gift
                    </Button>
                    {(owned || justBought) && worn !== null ? (
                        <Button
                            size="touch"
                            disabled={worn || pending}
                            variant={worn ? "secondary" : "primary"}
                            onClick={() => wear(item.item, onClose)}
                            className="w-full sm:w-auto"
                        >
                            {worn ? "Active" : "Use it"}
                        </Button>
                    ) : !owned && !full && !justBought ? (
                        <Button
                            size="touch"
                            disabled={tokens < item.price || buy.isPending}
                            onClick={() =>
                                buy.mutate(item.item, {
                                    onSuccess: (result) => {
                                        setLeft(result.tokens);
                                        onBought?.();
                                    },
                                    onError: (error) =>
                                        notify(
                                            error instanceof ApiError
                                                ? error.message
                                                : "Couldn't buy that",
                                            "error"
                                        ),
                                })
                            }
                            className="w-full sm:w-auto"
                        >
                            Buy
                        </Button>
                    ) : null}
                </div>
            </div>
        </Modal>
    );
};

/**
 * An item's popup by its key, for buying it where you are rather than in
 * the shop: a slot when you're out of room, a reaction you don't have.
 */
export const ItemSheetFor = ({
    item,
    onBought,
    onClose,
}: {
    item: string;
    onBought?: () => void;
    onClose: () => void;
}) => {
    const { data: shop } = useShop();
    const entry = shop?.items.find((i) => i.item === item);
    if (!entry) return null;
    return <ItemSheet item={entry} onBought={onBought} onClose={onClose} />;
};

/** Choosing a friend to give an item to, and paying for it. A friend who
 *  already has it, or as many as they can hold, can't be picked. */
const GiftSheet = ({
    item,
    tokens,
    onBack,
    onClose,
}: {
    item: ShopEntry;
    tokens: number;
    onBack: () => void;
    onClose: () => void;
}) => {
    const titleId = useId();
    const notify = useNotify();
    const { data: friends, isLoading } = useGiftFriends(item.item, true);
    const gift = useGift();
    const [to, setTo] = useState<GiftFriend | null>(null);
    const [sent, setSent] = useState<{ to: string; left: number } | null>(null);

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full sm:max-w-md"
        >
            <div className="flex min-h-11 items-center gap-2 pr-10">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to the item"
                    className="relative -ml-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-content-secondary lift before:absolute before:-inset-1.5 before:content-[''] hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-brand"
                >
                    <ChevronLeft size={18} aria-hidden />
                </button>
                <h2
                    id={titleId}
                    className="min-w-0 truncate font-display text-section text-content"
                >
                    Gift {item.label}
                </h2>
            </div>
            <p className="mt-1 text-body-sm text-content-secondary">
                Pick a friend. It comes out of your tokens.
            </p>

            {isLoading ? (
                <div className="mt-4 flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 rounded-md" />
                    ))}
                </div>
            ) : !friends?.length ? (
                <p className="mt-6 mb-2 text-center text-body-sm text-content-muted">
                    Add friends to send them gifts.
                </p>
            ) : (
                <ul
                    role="radiogroup"
                    aria-label="Friends"
                    // Room inside the scroll for the picked friend's ring,
                    // which the edge would otherwise cut off.
                    className="-mx-1 mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto p-1"
                >
                    {friends.map((f) => {
                        const on = to?.username === f.username;
                        return (
                            <li key={f.username}>
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    disabled={f.full || !!sent}
                                    onClick={() => setTo(f)}
                                    className={cn(
                                        "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 text-left disabled:cursor-not-allowed",
                                        "focus-visible:outline-2 focus-visible:outline-brand",
                                        on
                                            ? "bg-brand-subtle ring-2 ring-brand"
                                            : "hover:bg-surface-hover",
                                        f.full && "opacity-50"
                                    )}
                                >
                                    <ProfilePicture
                                        variant="nav"
                                        file={f.avatarUrl ?? ""}
                                        username={f.username}
                                        link={false}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                                        {f.username}
                                    </span>
                                    {f.full && (
                                        <span className="text-label-sm text-content-muted">
                                            Has it
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {to && !sent && <Ledger tokens={tokens} price={to.price} />}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {sent ? (
                    <Done
                        text={`Sent to ${sent.to}. ${formatCount(sent.left)} tokens left.`}
                    />
                ) : (
                    <span />
                )}
                {sent ? (
                    <Button
                        size="touch"
                        variant="secondary"
                        onClick={onClose}
                        className="w-full sm:w-auto"
                    >
                        Done
                    </Button>
                ) : (
                    <Button
                        size="touch"
                        disabled={
                            !to || tokens < (to?.price ?? 0) || gift.isPending
                        }
                        onClick={() =>
                            to &&
                            gift.mutate(
                                { item: item.item, username: to.username },
                                {
                                    onSuccess: (result) =>
                                        setSent({
                                            to: to.username,
                                            left: result.tokens,
                                        }),
                                    onError: (error) =>
                                        notify(
                                            error instanceof ApiError
                                                ? error.message
                                                : "Couldn't send that gift",
                                            "error"
                                        ),
                                }
                            )
                        }
                        className="w-full sm:w-auto"
                    >
                        <Gift size={16} aria-hidden />
                        Send gift
                    </Button>
                )}
            </div>
        </Modal>
    );
};

export default ItemSheet;
