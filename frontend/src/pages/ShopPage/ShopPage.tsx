import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import {
    SHOP_GROUPS,
    SHOP_KINDS,
    type ShopEntry,
    type ShopKind,
} from "@playrates/shared";
import PageHeader from "../../components/ui/PageHeader";
import SegmentedChoice from "../../components/ui/SegmentedChoice";
import { cardClass } from "../../components/ui/cardClass";
import { Skeleton } from "../../components/ui/Skeleton";
import { TokenCoin } from "../../components/progress/TokenAmount";
import ItemSheet from "../../components/shop/ItemSheet";
import { useWear } from "../../components/shop/useWear";
import { ItemThumb } from "../../components/shop/ItemPreview";
import {
    GROUP_LABELS,
    KIND_ICONS,
    KIND_LABELS,
} from "../../components/shop/shopItems";
import {
    SwitcherButton,
    SwitcherSheet,
    SwitcherTileBody,
} from "../../components/ui/SectionSwitcher";
import { switcherTileClass } from "../../components/ui/switcherTileClass";
import SignUpPlate from "../../components/SignUpPlate";
import { useAuth } from "../../contexts/AuthContext";
import { useShop } from "../../hooks/queries/useProgress";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Where tokens are spent: looks, room on your profile, and the rest. */
const ShopPage = () => {
    const { user, isLoading } = useAuth();
    const { data: shop } = useShop();
    const [kind, setKind] = useState<ShopKind>("cosmetic");
    const [sectionsOpen, setSectionsOpen] = useState(false);
    const [open, setOpen] = useState<ShopEntry | null>(null);
    // `?item=` opens one item, for a page that sends you here for it: out of
    // pin slots, say. It leaves the URL as the popup closes.
    const [params, setParams] = useSearchParams();
    const linked = params.get("item");
    usePageMeta({ title: "Shop", noindex: true });

    if (!isLoading && !user) {
        return (
            <SignUpPlate
                title="Sign up to use the shop"
                body="Spend the tokens you earn on frames, themes, reactions and more."
            />
        );
    }
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

            {/* Five sections don't fit a phone's width: the profile's
                switcher there, the row from sm up. */}
            <SwitcherButton
                icon={KIND_ICONS[kind]}
                label={KIND_LABELS[kind]}
                open={sectionsOpen}
                onOpen={() => setSectionsOpen(true)}
            />
            {sectionsOpen && (
                <SwitcherSheet
                    title="Shop"
                    titleId="shop-sections-title"
                    onClose={() => setSectionsOpen(false)}
                >
                    {SHOP_KINDS.map((k) => (
                        <li key={k}>
                            <button
                                type="button"
                                aria-current={k === kind ? "page" : undefined}
                                onClick={() => {
                                    setKind(k);
                                    setSectionsOpen(false);
                                }}
                                className={switcherTileClass(k === kind)}
                            >
                                <SwitcherTileBody
                                    icon={KIND_ICONS[k]}
                                    label={KIND_LABELS[k]}
                                    active={k === kind}
                                />
                            </button>
                        </li>
                    ))}
                </SwitcherSheet>
            )}
            <div className="hidden sm:block">
                <SegmentedChoice
                    label="Shop sections"
                    segments={SHOP_KINDS.map((k) => ({
                        value: k,
                        label: KIND_LABELS[k],
                    }))}
                    value={kind}
                    onChange={setKind}
                    fill
                    className="max-w-xl"
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
