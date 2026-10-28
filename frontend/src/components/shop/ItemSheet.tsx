import { useId, useState } from "react";
import { Check } from "lucide-react";
import type { EffectKey, ShopEntry } from "@playrates/shared";
import { ApiError } from "../../api";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import MomentStage from "../progress/MomentStage";
import { TokenCoin } from "../progress/TokenAmount";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import {
    useBuy,
    useProgress,
    useSetStyle,
    useShop,
} from "../../hooks/queries/useProgress";
import { formatCount } from "../../lib/format";
import { ItemStage, ItemThumb } from "./ItemPreview";
import { DESCRIPTIONS, lookOf } from "./shopItems";

/** Whether an item is worn now, and how to put it on. Slots and helpers
 *  aren't worn: they simply count. */
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
            case "effect":
                return user?.effects.includes(look.effect) ?? false;
            case "layout":
                return data?.look.layout === look.layout;
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
        else if (look.kind === "layout")
            setStyle.mutate({ layout: look.layout }, done);
        else if (look.kind === "effect")
            setStyle.mutate(
                {
                    effects: [
                        ...((user?.effects ?? []) as EffectKey[]),
                        look.effect,
                    ],
                },
                done
            );
    };

    return { wearing, wear, pending: setStyle.isPending };
};

/**
 * An item up close: shown where it would be seen, with what it costs and
 * what you'd have left. Buying lands on a moment of its own.
 */
const ItemSheet = ({
    item,
    onClose,
}: {
    item: ShopEntry;
    onClose: () => void;
}) => {
    const titleId = useId();
    const notify = useNotify();
    const buy = useBuy();
    const { data: shop } = useShop();
    const { wearing, wear, pending } = useWear();
    const [bought, setBought] = useState(false);

    const tokens = shop?.tokens ?? 0;
    const owned = item.maxOwned === 1 && item.owned > 0;
    const full = item.owned >= item.maxOwned;
    const short = item.price - tokens;
    const worn = wearing(item.item);

    if (bought) return <Unlocked item={item} onClose={onClose} />;

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full sm:max-w-md"
        >
            <div className="-mx-4 -mt-4 mb-5 bg-surface-sunken/60 px-4 pt-8 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6">
                <ItemStage item={item} />
            </div>
            <h2
                id={titleId}
                className="font-display text-section font-semibold text-content"
            >
                {item.label}
            </h2>
            <p className="mt-1 text-body-sm text-content-secondary">
                {DESCRIPTIONS[item.item]}
            </p>

            <div className="mt-5 flex flex-col gap-3 border-t border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
                {owned ? (
                    <p className="inline-flex items-center gap-1.5 text-body-sm font-medium text-content-secondary">
                        <Check size={16} className="text-action" aria-hidden />
                        Yours
                    </p>
                ) : full ? (
                    <p className="text-body-sm text-content-secondary">
                        You hold {item.maxOwned}, the most you can.
                    </p>
                ) : (
                    <p className="flex flex-col">
                        <span className="inline-flex items-center gap-1.5 font-mono text-section font-bold text-content tabular-nums">
                            <TokenCoin className="size-5" />
                            {formatCount(item.price)}
                        </span>
                        <span className="font-mono text-label-sm text-content-muted tabular-nums">
                            {short > 0
                                ? `You have ${formatCount(tokens)}`
                                : `${formatCount(tokens - item.price)} left after`}
                        </span>
                    </p>
                )}

                {owned && worn !== null ? (
                    <Button
                        size="touch"
                        disabled={worn || pending}
                        variant={worn ? "secondary" : "primary"}
                        onClick={() => wear(item.item, onClose)}
                        className="w-full sm:w-auto"
                    >
                        {worn ? "Wearing" : "Wear it"}
                    </Button>
                ) : !owned && !full ? (
                    <Button
                        size="touch"
                        disabled={short > 0 || buy.isPending}
                        onClick={() =>
                            buy.mutate(item.item, {
                                onSuccess: () => setBought(true),
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
                        {short > 0
                            ? `${formatCount(short)} more tokens needed`
                            : "Buy"}
                    </Button>
                ) : null}
            </div>
        </Modal>
    );
};

/** A purchase landing: the item on a stage of its own, ready to wear. */
const Unlocked = ({
    item,
    onClose,
}: {
    item: ShopEntry;
    onClose: () => void;
}) => {
    const titleId = useId();
    const { wearing, wear } = useWear();
    const wearable = wearing(item.item) !== null;

    return (
        <MomentStage
            onClose={onClose}
            labelledBy={titleId}
            light="rgba(242,201,76,0.28)"
        >
            <p className="animate-fade-up font-mono text-label font-bold tracking-[0.3em] text-medal-gold uppercase">
                Unlocked
            </p>
            <span className="mt-6 grid min-h-28 animate-medal-drop place-items-center">
                <ItemThumb item={item} bare />
            </span>
            <h2
                id={titleId}
                className="mt-6 animate-fade-up font-display text-section font-semibold"
                style={{ animationDelay: "300ms" }}
            >
                {item.label}
            </h2>
            <div
                className="mt-8 flex w-full animate-fade-up flex-col gap-2 sm:w-auto sm:flex-row"
                style={{ animationDelay: "450ms" }}
            >
                {wearable && (
                    <Button
                        size="touch"
                        onClick={() => {
                            wear(item.item);
                            onClose();
                        }}
                        className="w-full sm:w-auto"
                    >
                        Wear it now
                    </Button>
                )}
                <Button
                    variant={wearable ? "secondary" : "primary"}
                    size="touch"
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    {wearable ? "Later" : "Nice"}
                </Button>
            </div>
        </MomentStage>
    );
};

export default ItemSheet;
