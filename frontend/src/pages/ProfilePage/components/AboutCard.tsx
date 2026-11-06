import { Link } from "react-router-dom";
import { Pencil, Plus, Shield } from "lucide-react";
import type { AboutField, AboutKey, Profile } from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import { useNotify } from "../../../contexts/NotificationContext";
import {
    ABOUT_FACT_ROWS,
    ABOUT_ROWS,
    joinedText,
    lastSeenText,
    linkLabel,
    steamLabel,
} from "../lib/about";
import { cn } from "../../../lib/cn";

interface AboutCardProps {
    /** The About fields and facts here are only those this viewer may see. */
    profile: Profile;
    /** Set on your own profile. Who sees each line is chosen in Settings:
     *  a picker beside every line made the card a wall of controls. */
    owner?: {
        onEdit: () => void;
        /** Hiding when you're online hides when you were, too. */
        hideOnline: boolean;
    };
}

interface Line {
    key: AboutKey;
    label: string;
    value: string | null;
    /** Said in place of a value the owner can't set from here. */
    note?: string;
}

const LINK_ROWS = ABOUT_ROWS.filter((row) => row.group === "socials");

/* A small raised surface rather than an underline: these leave the page,
   or copy, and should look pressable. 32px tall, its touch grown to 44. */
const CHIP =
    "relative inline-flex h-8 max-w-full min-w-0 items-center gap-1.5 rounded-sm border border-subtle bg-surface-sunken/60 px-2.5 text-body-sm text-content lift " +
    "hover:border-strong hover:bg-surface-hover before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const ICON_BUTTON =
    "grid size-9 place-items-center rounded-sm text-content-muted lift max-sm:size-11 " +
    "hover:bg-surface-hover hover:text-content " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const LinkChip = ({ field, value }: { field: AboutField; value: string }) => {
    const notify = useNotify();
    const { icon: Icon, label } = LINK_ROWS.find((r) => r.field === field)!;
    const inner = (text: string) => (
        <>
            <Icon size={14} aria-hidden className="shrink-0" />
            <span className="truncate">{text}</span>
        </>
    );
    // A Discord name isn't an address, so the chip copies it instead.
    if (field === "discord") {
        return (
            <button
                type="button"
                aria-label={`Copy ${label} username ${value}`}
                onClick={() =>
                    void navigator.clipboard
                        .writeText(value)
                        .then(() => notify(`Copied ${value}`, "success", "low"))
                }
                className={cn(CHIP, "cursor-pointer")}
            >
                {inner(value)}
            </button>
        );
    }
    return (
        <a
            href={value}
            target="_blank"
            // Off the site, and nothing to vouch for: no referrer, no ranking.
            rel="noopener noreferrer nofollow ugc"
            className={CHIP}
        >
            {inner(field === "website" ? linkLabel(value) : steamLabel(value))}
        </a>
    );
};

/** Who they are, in their words: the bio, then a short ledger of what
 *  they've chosen to share, then where else to find them. The owner sees
 *  every line, set or not. */
const AboutCard = ({ profile, owner }: AboutCardProps) => {
    const facts = profile.facts ?? {};
    const lines: Line[] = [
        ...ABOUT_ROWS.filter((row) => row.group === "about").map(
            ({ field, label }) => ({
                key: field,
                label,
                value: profile.about[field] ?? null,
            })
        ),
        ...ABOUT_FACT_ROWS.map(({ fact, label }) => ({
            key: fact,
            label,
            value:
                fact === "age"
                    ? facts.age !== undefined
                        ? String(facts.age)
                        : null
                    : fact === "joined"
                      ? facts.joined
                          ? joinedText(facts.joined)
                          : null
                      : facts.lastSeen
                        ? lastSeenText(facts.lastSeen, profile.online)
                        : null,
            note:
                fact === "lastSeen" && owner?.hideOnline
                    ? "Hidden with your online status"
                    : undefined,
        })),
    ].filter((line) => owner || line.value);
    const links = LINK_ROWS.filter(
        ({ field }) => owner || profile.about[field]
    );

    if (!owner && !profile.bio && lines.length === 0 && links.length === 0)
        return null;

    return (
        <Panel
            title="About"
            trailing={
                owner && (
                    <span className="-my-1 flex items-center gap-1">
                        <Link
                            to="/settings?section=privacy"
                            aria-label="Privacy settings"
                            title="Privacy settings"
                            className={ICON_BUTTON}
                        >
                            <Shield size={15} aria-hidden />
                        </Link>
                        <button
                            type="button"
                            onClick={owner.onEdit}
                            aria-label="Edit profile"
                            title="Edit profile"
                            className={cn(ICON_BUTTON, "cursor-pointer")}
                        >
                            <Pencil size={15} aria-hidden />
                        </button>
                    </span>
                )
            }
            bodyClassName="flex flex-col gap-4 p-4"
        >
            {profile.bio ? (
                <p className="text-body-sm leading-relaxed text-content-secondary">
                    {profile.bio}
                </p>
            ) : (
                owner && (
                    <p className="text-body-sm text-content-muted">
                        No bio yet. Say a little about yourself.
                    </p>
                )
            )}

            {lines.length > 0 && (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 text-body-sm">
                    {lines.map(({ key, label, value, note }) => (
                        /* `contents` so each line's cells sit in the one grid:
                           the labels share a column however long they run. */
                        <div
                            key={key}
                            className={cn(
                                "contents",
                                !value && "[&>*]:opacity-60"
                            )}
                        >
                            <dt className="text-content-muted">{label}</dt>
                            <dd
                                className={cn(
                                    "min-w-0 break-words",
                                    value
                                        ? "text-content"
                                        : "text-content-muted"
                                )}
                            >
                                {value ?? note ?? "Not set"}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {links.length > 0 && (
                <ul aria-label="Links" className="flex flex-wrap gap-2">
                    {links.map(({ field, label, icon: Icon }) => {
                        const value = profile.about[field];
                        return (
                            <li key={field} className="flex min-w-0">
                                {value ? (
                                    <LinkChip field={field} value={value} />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={owner?.onEdit}
                                        className={cn(
                                            CHIP,
                                            "cursor-pointer border-dashed bg-transparent text-content-muted"
                                        )}
                                    >
                                        <Icon size={14} aria-hidden />
                                        <Plus size={12} aria-hidden />
                                        {label}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
};

export default AboutCard;
