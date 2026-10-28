import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { levelTokens, type ShopEntry, type ShopKind } from "@playrates/shared";
import SegmentedChoice from "../../components/ui/SegmentedChoice";
import { cardClass } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { TokenCoin } from "../../components/progress/TokenAmount";
import ItemSheet, { useWear } from "../../components/shop/ItemSheet";
import { ItemThumb } from "../../components/shop/ItemPreview";
import { KIND_LABELS } from "../../components/shop/shopItems";
import { useAuth } from "../../contexts/AuthContext";
import { useProgress, useShop } from "../../hooks/queries/useProgress";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Where tokens are spent: looks, room on your profile, and the rest. */
const ShopPage = () => {
    const { user, isLoading } = useAuth();
    const { data: shop } = useShop();
    const { data: progress } = useProgress();
    const [kind, setKind] = useState<ShopKind>("cosmetic");
    const [open, setOpen] = useState<ShopEntry | null>(null);
    usePageMeta({ title: "Shop", noindex: true });

    if (!isLoading && !user) return <Navigate to="/" replace />;
    if (!shop || !user) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-96 rounded-lg" />
            </div>
        );
    }

    const next =
        progress && progress.level.next !== null
            ? progress.level.level + 1
            : null;

    return (
        <div className="flex flex-col gap-5 lg:gap-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <Link
                        to="/progress"
                        className="relative inline-flex items-center gap-1 text-label text-content-muted before:absolute before:-inset-2 before:content-[''] hover:text-content"
                    >
                        <ArrowLeft size={14} aria-hidden />
                        Your progress
                    </Link>
                    <h1 className="mt-2 font-display text-[28px] leading-none font-semibold text-content sm:text-[40px]">
                        Shop
                    </h1>
                </div>
                <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                    <span
                        className="inline-flex items-center gap-2 font-mono text-[28px] leading-none font-bold text-content tabular-nums sm:text-[34px]"
                        aria-label={`${formatCount(shop.tokens)} tokens`}
                    >
                        <TokenCoin className="size-6 text-[11px] sm:size-7" />
                        <span aria-hidden>{formatCount(shop.tokens)}</span>
                    </span>
                    {next !== null && (
                        <span className="font-mono text-label-sm text-content-muted">
                            Level {next} pays {levelTokens(next)}
                        </span>
                    )}
                </div>
            </header>

            <SegmentedChoice
                label="Shop sections"
                segments={(["cosmetic", "slot", "helper"] as const).map(
                    (k) => ({
                        value: k,
                        label: KIND_LABELS[k],
                    })
                )}
                value={kind}
                onChange={setKind}
                fill
                className="sm:max-w-md"
            />

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {shop.items
                    .filter((i) => i.kind === kind)
                    .map((item) => (
                        <li key={item.item}>
                            <ShopTile
                                item={item}
                                tokens={shop.tokens}
                                onOpen={() => setOpen(item)}
                            />
                        </li>
                    ))}
            </ul>

            <p className="text-label-sm text-content-muted">
                Level frames and the Gold and Holo card themes can’t be bought:
                they come with your level.
            </p>

            {open && (
                <ItemSheet
                    // Fresh from the shop, so it shows what you own now.
                    item={shop.items.find((i) => i.item === open.item) ?? open}
                    onClose={() => setOpen(null)}
                />
            )}
        </div>
    );
};

/** An item as a picture and a price. Everything else is in its popup. */
const ShopTile = ({
    item,
    tokens,
    onOpen,
}: {
    item: ShopEntry;
    tokens: number;
    onOpen: () => void;
}) => {
    const { wearing } = useWear();
    const owned = item.maxOwned === 1 && item.owned > 0;
    const full = item.owned >= item.maxOwned;
    const worn = owned && wearing(item.item);
    return (
        <button
            type="button"
            onClick={onOpen}
            className={cardClass(
                cn(
                    "group flex w-full cursor-pointer flex-col overflow-hidden text-left lift",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    !worn && "hover:border-strong"
                ),
                { padding: "none", tone: worn ? "accent" : "default" }
            )}
        >
            <span className="grid h-32 place-items-center overflow-hidden bg-surface-sunken/60 sm:h-36">
                <ItemThumb item={item} />
            </span>
            <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="min-w-0 truncate text-body-sm font-medium text-content">
                    {item.label}
                </span>
                {owned || full ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-label-sm text-content-muted">
                        <Check size={13} className="text-action" aria-hidden />
                        {worn ? "Wearing" : owned ? "Yours" : "Full"}
                    </span>
                ) : (
                    <span
                        className={cn(
                            "inline-flex shrink-0 items-center gap-1 font-mono text-label font-bold tabular-nums",
                            item.price > tokens
                                ? "text-content-muted"
                                : "text-content"
                        )}
                    >
                        <TokenCoin className="size-3.5 text-[7px]" />
                        {formatCount(item.price)}
                    </span>
                )}
            </span>
        </button>
    );
};

export default ShopPage;
