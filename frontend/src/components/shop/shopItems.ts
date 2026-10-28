import {
    CARD_THEMES,
    EFFECTS,
    FRAMES,
    type CardThemeKey,
    type EffectKey,
    type FrameKey,
    type ShopKind,
    type ShowcaseLayout,
} from "@playrates/shared";

export const KIND_LABELS: Record<ShopKind, string> = {
    cosmetic: "Cosmetics",
    slot: "Slots",
    helper: "Other",
};

export const DESCRIPTIONS: Record<string, string> = {
    frame_neon: "A bright cyan ring round your picture, wherever it shows.",
    frame_pixel: "A chequered ring in the style of an old console.",
    frame_flame: "A ring of fire round your picture.",
    frame_aurora: "Northern lights round your picture.",
    theme_retro: "Your Player card and Gaming 25 picture in warm orange.",
    theme_night: "Your Player card and Gaming 25 picture in deep blue.",
    theme_synthwave: "Your Player card and Gaming 25 picture in neon pink.",
    effect_sheen: "A light crosses the top of your profile as it opens.",
    effect_glow: "Your name glows on your profile.",
    layout_shelf: "Your showcase on a shelf, each badge on a plinth.",
    layout_spotlight: "Your first badge big in the middle, the rest beneath.",
    slot_showcase: "Room for one more badge in your showcase.",
    slot_pinned_list: "Room to pin one more list to your profile.",
    streak_shield:
        "Covers a missed week once your free monthly shield is used.",
};

/** What an item is, for how to show it and what wearing it means. */
export type ItemLook =
    | { kind: "frame"; frame: FrameKey }
    | { kind: "theme"; theme: CardThemeKey }
    | { kind: "effect"; effect: EffectKey }
    | { kind: "layout"; layout: ShowcaseLayout }
    | { kind: "showcase_slot" }
    | { kind: "list_slot" }
    | { kind: "shield" };

export const lookOf = (item: string): ItemLook => {
    const frame = FRAMES.find((f) => "item" in f && f.item === item);
    if (frame) return { kind: "frame", frame: frame.key as FrameKey };
    const theme = CARD_THEMES.find((t) => "item" in t && t.item === item);
    if (theme) return { kind: "theme", theme: theme.key as CardThemeKey };
    if ((EFFECTS as readonly string[]).includes(item))
        return { kind: "effect", effect: item as EffectKey };
    if (item.startsWith("layout_"))
        return { kind: "layout", layout: item as ShowcaseLayout };
    if (item === "slot_showcase") return { kind: "showcase_slot" };
    if (item === "slot_pinned_list") return { kind: "list_slot" };
    return { kind: "shield" };
};
