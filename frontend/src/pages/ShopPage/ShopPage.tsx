import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import {
    SHOP_GROUPS,
    SHOP_KINDS,
    type ShopEntry,
    type ShopKind,
} from "@playrates/shared";
import PageHeader from "../../components/ui/PageHeader";
import SegmentedChoice from "../../components/ui/SegmentedChoice";
import { cardClass } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { TokenCoin } from "../../components/progress/TokenAmount";
import ItemSheet, { useWear } from "../../components/shop/ItemSheet";
import { ItemThumb } from "../../components/shop/ItemPreview";
import { GROUP_LABELS, KIND_LABELS } from "../../components/shop/shopItems";
import { useAuth } from "../../contexts/AuthContext";
import { useShop } from "../../hooks/queries/useProgress";
import { useOverflowFade } from "../../hooks/useOverflowFade";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Where tokens are spent: looks, room on your profile, and the rest. */
const ShopPage = () => {
    const { user, isLoading } = useAuth();
    const { data: shop } = useShop();
    const [kind, setKind] = useState<ShopKind>("cosmetic");
    const [open, setOpen] = useState<ShopEntry | null>(null);
    // `?item=` opens one item, for a page that sends you here for it: out of
    // pin slots, say. It leaves the URL as the popup closes.
    const [params, setParams] = useSearchParams();
    const linked = params.get("item");
    const tabsFade = useOverflowFade<HTMLDivElement>();
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

    return (
        <div className="flex flex-col gap-5 lg:gap-6">
            <PageHeader
                title="Shop"
                back={{ to: "/progress", label: "Your progress" }}
                actions={
                    <span
                        className="inline-flex items-center gap-2 font-mono text-[28px] leading-none font-bold text-content tabular-nums sm:text-[34px]"
                        aria-label={`${formatCount(shop.tokens)} tokens`}
                    >
                        <TokenCoin className="size-6 sm:size-7" />
                        <span aria-hidden>{formatCount(shop.tokens)}</span>
                    </span>
                }
            />

            {/* Five sections don't fit a phone's width: the row scrolls
                sideways there, edge to edge, faded where there's more. */}
            <div
                ref={tabsFade.ref}
                onScroll={tabsFade.onScroll}
                style={tabsFade.style}
                className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
            >
                <SegmentedChoice
                    label="Shop sections"
                    segments={SHOP_KINDS.map((k) => ({
                        value: k,
                        label: KIND_LABELS[k],
                    }))}
                    value={kind}
                    onChange={setKind}
                    fill
                    className="w-max min-w-full sm:w-auto sm:max-w-xl sm:min-w-0"
                />
            </div>

            {SHOP_GROUPS.map((group) => {
                const items = shop.items.filter(
                    (i) => i.kind === kind && i.group === group
                );
                if (items.length === 0) return null;
                return (
                    <section key={group} aria-labelledby={`shop-${group}`}>
                        <h2
                            id={`shop-${group}`}
                            className="mb-2 text-label font-semibold text-content-secondary"
                        >
                            {GROUP_LABELS[group]}
                        </h2>
                        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {items.map((item) => (
                                <li key={item.item}>
                                    <ShopTile
                                        item={item}
                                        tokens={shop.tokens}
                                        onOpen={() => setOpen(item)}
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}

            {(open ?? shop.items.find((i) => i.item === linked)) && (
                <ItemSheet
                    // Fresh from the shop, so it shows what you own now.
                    item={
                        shop.items.find(
                            (i) => i.item === (open?.item ?? linked)
                        ) ?? open!
                    }
                    onClose={() => {
                        setOpen(null);
                        if (linked) setParams({}, { replace: true });
                    }}
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
                        {worn ? "Active" : owned ? "Owned" : "Full"}
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
                        <TokenCoin className="size-3.5" />
                        {formatCount(item.price)}
                    </span>
                )}
            </span>
        </button>
    );
};

export default ShopPage;
