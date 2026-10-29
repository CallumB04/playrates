import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
    CARD_THEMES,
    FRAMES,
    NAME_COLOURS,
    NAME_FONTS,
    NO_FRAME,
    levelFrame,
    type CardThemeKey,
    type NameColourKey,
    type NameFontKey,
    type ProfileAccent,
    type ProfileSection,
} from "@playrates/shared";
import ProfilePicture from "../../../components/ProfilePicture";
import AvatarFrame from "../../../components/progress/AvatarFrame";
import NameText from "../../../components/progress/NameText";
import { cn } from "../../../lib/cn";

export interface LookChoice {
    /** A frame's key, "none", or null for the best the level has earned. */
    frame: string | null;
    cardTheme: CardThemeKey;
    nameFont: NameFontKey;
    nameColour: NameColourKey;
}

export const SECTION_LABELS: Record<ProfileSection, string> = {
    pinned_reviews: "Pinned reviews",
    pinned_lists: "Pinned lists",
    favourites: "Favourite games",
    wishlist: "Top of your wishlist",
};

interface LookFieldsProps {
    username: string;
    avatarUrl: string | null;
    accent: ProfileAccent;
    level: number;
    choice: LookChoice;
    onChange: (choice: LookChoice) => void;
    /** What's unlocked, by level or the shop: only these are offered. */
    owned: {
        frames: string[];
        themes: string[];
        fonts: string[];
        colours: string[];
    };
    order: ProfileSection[];
    onOrder: (order: ProfileSection[]) => void;
}

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
        <p className="mb-1.5 text-label-sm text-content-muted">{label}</p>
        {children}
    </div>
);

/** A small choice, pressed while it's the one worn. Named under it where
 *  the picture alone can't tell two apart, as fonts and colours can't. */
const Choice = ({
    on,
    label,
    caption,
    onClick,
    children,
}: {
    on: boolean;
    label: string;
    caption?: string;
    onClick: () => void;
    children: ReactNode;
}) => (
    <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        title={label}
        onClick={onClick}
        className={cn(
            "flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md p-1.5",
            "focus-visible:outline-2 focus-visible:outline-brand",
            on ? "bg-brand-subtle ring-2 ring-brand" : "hover:bg-surface-hover"
        )}
    >
        {children}
        {caption && (
            <span className="text-[10px] leading-none text-content-muted">
                {caption}
            </span>
        )}
    </button>
);

/**
 * How you look, from what you already own, and the order of the cards down
 * your profile. Buying more is the shop's: a link says where.
 */
const LookFields = ({
    username,
    avatarUrl,
    accent,
    level,
    choice,
    onChange,
    owned,
    order,
    onOrder,
}: LookFieldsProps) => {
    const set = (patch: Partial<LookChoice>) =>
        onChange({ ...choice, ...patch });
    // What the stored choice comes to: none, a frame, or the level's best.
    const worn =
        choice.frame === NO_FRAME ? null : (choice.frame ?? levelFrame(level));
    const move = (from: number, by: number) => {
        const next = [...order];
        const [section] = next.splice(from, 1);
        next.splice(from + by, 0, section!);
        onOrder(next);
    };
    const avatar = (
        <ProfilePicture
            variant="tab"
            file={avatarUrl ?? ""}
            username={username}
            accent={accent}
            link={false}
        />
    );

    return (
        <div className="flex flex-col gap-4">
            <Group label="Frame">
                <div className="flex flex-wrap gap-1">
                    <Choice
                        on={worn === null}
                        label="No frame"
                        onClick={() => set({ frame: NO_FRAME })}
                    >
                        {avatar}
                    </Choice>
                    {FRAMES.filter((f) => owned.frames.includes(f.key)).map(
                        (f) => (
                            <Choice
                                key={f.key}
                                on={worn === f.key}
                                label={`${f.label} frame`}
                                onClick={() => set({ frame: f.key })}
                            >
                                <AvatarFrame frame={f.key} size="sm">
                                    {avatar}
                                </AvatarFrame>
                            </Choice>
                        )
                    )}
                </div>
            </Group>

            <Group label="Username">
                <p className="mb-2 truncate rounded-md bg-surface-sunken/60 px-3 py-2 text-center font-display text-section font-semibold text-content">
                    <NameText font={choice.nameFont} colour={choice.nameColour}>
                        {username}
                    </NameText>
                </p>
                <p className="mb-1 text-label-sm text-content-muted">Font</p>
                <div className="flex flex-wrap gap-1">
                    {NAME_FONTS.filter((f) => owned.fonts.includes(f.key)).map(
                        (f) => (
                            <Choice
                                key={f.key}
                                on={choice.nameFont === f.key}
                                label={`${f.label} font`}
                                caption={f.label}
                                onClick={() => set({ nameFont: f.key })}
                            >
                                <span className="text-body text-content">
                                    <NameText font={f.key}>Aa</NameText>
                                </span>
                            </Choice>
                        )
                    )}
                </div>
                <p className="mt-2 mb-1 text-label-sm text-content-muted">
                    Colour
                </p>
                <div className="flex flex-wrap gap-1">
                    {NAME_COLOURS.filter((c) =>
                        owned.colours.includes(c.key)
                    ).map((c) => (
                        <Choice
                            key={c.key}
                            on={choice.nameColour === c.key}
                            label={`${c.label} colour`}
                            caption={c.label}
                            onClick={() => set({ nameColour: c.key })}
                        >
                            <span className="font-display text-body font-bold text-content">
                                <NameText colour={c.key}>Aa</NameText>
                            </span>
                        </Choice>
                    ))}
                </div>
            </Group>

            {/* Nothing to choose with only the default. */}
            {owned.themes.length > 1 && (
                <Group label="Card theme">
                    <div className="flex flex-wrap gap-1">
                        {CARD_THEMES.filter((t) =>
                            owned.themes.includes(t.key)
                        ).map((t) => (
                            <Choice
                                key={t.key}
                                on={choice.cardTheme === t.key}
                                label={`${t.label} card theme`}
                                onClick={() =>
                                    set({ cardTheme: t.key as CardThemeKey })
                                }
                            >
                                <span
                                    className={cn(
                                        `card-theme-${t.key}`,
                                        "block size-7 rounded-sm ring-1 ring-white/10"
                                    )}
                                    style={{
                                        background:
                                            "radial-gradient(circle at 50% 35%, var(--theme-glow), transparent 70%), var(--theme-ground)",
                                    }}
                                />
                            </Choice>
                        ))}
                    </div>
                </Group>
            )}

            <p className="text-label-sm text-content-muted">
                More frames, fonts and colours are in the{" "}
                <Link
                    to="/shop"
                    className="text-content underline hover:text-brand"
                >
                    shop
                </Link>
                .
            </p>

            <Group label="Order of your profile">
                <ol className="flex flex-col divide-y divide-subtle rounded-md border border-subtle">
                    {order.map((section, i) => (
                        <li
                            key={section}
                            className="flex min-h-11 items-center gap-2 px-3 py-1"
                        >
                            <span className="w-4 font-mono text-label-sm text-content-muted">
                                {i + 1}
                            </span>
                            <span className="flex-1 text-body-sm text-content">
                                {SECTION_LABELS[section]}
                            </span>
                            <button
                                type="button"
                                disabled={i === 0}
                                onClick={() => move(i, -1)}
                                aria-label={`Move ${SECTION_LABELS[section]} up`}
                                className="grid size-9 cursor-pointer place-items-center rounded-sm text-content-secondary hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-30"
                            >
                                <ArrowUp size={16} aria-hidden />
                            </button>
                            <button
                                type="button"
                                disabled={i === order.length - 1}
                                onClick={() => move(i, 1)}
                                aria-label={`Move ${SECTION_LABELS[section]} down`}
                                className="grid size-9 cursor-pointer place-items-center rounded-sm text-content-secondary hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-30"
                            >
                                <ArrowDown size={16} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ol>
            </Group>
        </div>
    );
};

export default LookFields;
