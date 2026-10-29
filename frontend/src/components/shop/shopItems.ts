import {
    CARD_THEMES,
    FRAMES,
    NAME_COLOURS,
    NAME_FONTS,
    type CardThemeKey,
    type FrameKey,
    type NameColourKey,
    type NameFontKey,
    REACTIONS,
    SHOP_ITEMS,
    type ShopGroup,
    type ShopKind,
} from "@playrates/shared";
import { profilePath } from "../../lib/profilePaths";

export const KIND_LABELS: Record<ShopKind, string> = {
    cosmetic: "Cosmetics",
    name: "Username",
    reaction: "Reactions",
    slot: "Slots",
    helper: "Other",
};

export const GROUP_LABELS: Record<ShopGroup, string> = {
    frame: "Frames",
    theme: "Card themes",
    font: "Fonts",
    colour: "Colours",
    reaction: "Reactions",
    slot: "Profile slots",
    shield: "Streak",
};

/** What an item is, said in a sentence: "sent you the Neon frame". */
const NOUNS: Partial<Record<ShopGroup, string>> = {
    frame: "frame",
    theme: "card theme",
    font: "name font",
    colour: "name colour",
    reaction: "reaction",
};
const SINGLES: Record<string, string> = {
    slot_showcase: "an extra showcase slot",
    slot_pinned_list: "an extra pinned list slot",
    slot_pinned_review: "an extra pinned review slot",
    streak_shield: "a spare streak shield",
};

export const itemName = (item: string): string => {
    const def = SHOP_ITEMS.find((i) => i.item === item);
    if (!def) return "something from the shop";
    return SINGLES[item] ?? `the ${def.label} ${NOUNS[def.group] ?? ""}`.trim();
};

/** Where a gift is put to use: the place its new owner picks or wears it.
 *  Looks and reactions are on the progress page, each under its own
 *  heading; the profile's pins open their pickers. */
export const giftPath = (item: string, username: string): string => {
    if (item === "slot_pinned_review")
        return `${profilePath(username)}?edit=pinned_reviews`;
    if (item === "slot_showcase")
        return `${profilePath(username, "badges")}?edit=showcase`;
    if (item === "slot_pinned_list") return "/progress#pinned-lists";
    const group = SHOP_ITEMS.find((i) => i.item === item)?.group;
    if (!group) return "/shop";
    if (group === "shield") return "/progress#streak";
    if (group === "font" || group === "colour") return "/progress#name";
    return `/progress#${group}`;
};

/** The reaction an item holds. */
export const itemReactions = (item: string) =>
    REACTIONS.filter((r) => "item" in r && r.item === item);

export const DESCRIPTIONS: Record<string, string> = {
    frame_neon: "A bright cyan ring round your picture, wherever it shows.",
    frame_pixel: "A chequered ring in the style of an old console.",
    frame_flame: "A ring of fire round your picture.",
    frame_aurora: "Northern lights round your picture.",
    theme_retro: "The pictures you share, in warm orange.",
    theme_night: "The pictures you share, in deep blue.",
    theme_synthwave: "The pictures you share, in neon pink.",
    font_terminal: "Your name in an old green-screen terminal's type.",
    font_pixel: "Your name in chunky 8-bit pixels.",
    font_bungee: "Your name in bold arcade-sign capitals.",
    font_marker: "Your name written by hand in marker.",
    colour_ember: "Your name in a warm orange.",
    colour_mint: "Your name in a fresh green.",
    colour_rose: "Your name in a bright pink.",
    colour_sunset: "Your name fading from orange through pink to purple.",
    colour_holo: "Your name in a pale holographic shimmer.",
    slot_showcase: "Room for one more badge beside your level.",
    slot_pinned_list: "Room to pin one more list to your profile.",
    slot_pinned_review: "Room to pin one of your reviews to your profile.",
    react_goat: "For the greatest of all time.",
    react_dead: "For the one that had you crying laughing.",
    react_hype: "For the one you can't wait for.",
    react_congrats: "For a finish, a platinum, a long-awaited win.",
    react_big_brain: "For a take smarter than it had any right to be.",
    react_sad: "For the bad news, the bug, the lost save.",
    streak_shield:
        "Covers a missed week once your free monthly shield is used.",
};

/** What an item is, for how to show it and what wearing it means. */
export type ItemLook =
    | { kind: "frame"; frame: FrameKey }
    | { kind: "theme"; theme: CardThemeKey }
    | { kind: "font"; font: NameFontKey }
    | { kind: "colour"; colour: NameColourKey }
    | { kind: "reactions"; item: string }
    | { kind: "showcase_slot" }
    | { kind: "list_slot" }
    | { kind: "review_slot" }
    | { kind: "shield" };

export const lookOf = (item: string): ItemLook => {
    const frame = FRAMES.find((f) => "item" in f && f.item === item);
    if (frame) return { kind: "frame", frame: frame.key as FrameKey };
    const theme = CARD_THEMES.find((t) => "item" in t && t.item === item);
    if (theme) return { kind: "theme", theme: theme.key as CardThemeKey };
    const font = NAME_FONTS.find((f) => "item" in f && f.item === item);
    if (font) return { kind: "font", font: font.key };
    const colour = NAME_COLOURS.find((c) => "item" in c && c.item === item);
    if (colour) return { kind: "colour", colour: colour.key };
    if (item.startsWith("react_")) return { kind: "reactions", item };
    if (item === "slot_showcase") return { kind: "showcase_slot" };
    if (item === "slot_pinned_list") return { kind: "list_slot" };
    if (item === "slot_pinned_review") return { kind: "review_slot" };
    return { kind: "shield" };
};
