import { Link } from "react-router-dom";
import type {
    AboutField,
    AboutVisibility,
    ProfileAbout,
    ProfileVisibility,
} from "@playrates/shared";
import Dropdown from "../../components/ui/Dropdown";
import { PRIVACY_OPTIONS } from "../ProfilePage/components/PrivacySelect";
import { ABOUT_ROWS, linkLabel, steamLabel } from "../ProfilePage/lib/about";

const GROUPS = [
    { id: "about", title: "About you" },
    { id: "socials", title: "Socials" },
] as const;

interface AboutPrivacyProps {
    /** Every field filled in, as its owner sees it. */
    about: ProfileAbout;
    visibility: AboutVisibility;
    onChange: (next: AboutVisibility) => void;
    disabled?: boolean;
    /** Where the fields themselves are edited. */
    profileHref: string;
}

/** What a field reads as on the card, so the row says what it is hiding. */
const shown = (field: AboutField, value: string) =>
    field === "website"
        ? linkLabel(value)
        : field === "steam"
          ? steamLabel(value)
          : value;

const PrivacyDropdown = ({
    label,
    value,
    onChange,
    disabled,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (next: ProfileVisibility) => void;
    disabled?: boolean;
    placeholder?: string;
}) => (
    <Dropdown
        options={PRIVACY_OPTIONS}
        value={value}
        placeholder={placeholder}
        onChange={(next) => onChange(next as ProfileVisibility)}
        aria-label={label}
        disabled={disabled}
        menuClassName="w-60"
        className="w-36 shrink-0"
    />
);

/**
 * Who sees each line of the About card, laid out as the card is: each
 * field with its mark and what it says now, beside who sees it. One control
 * sets them all at once.
 */
const AboutPrivacy = ({
    about,
    visibility,
    onChange,
    disabled,
    profileHref,
}: AboutPrivacyProps) => {
    const levels = new Set(ABOUT_ROWS.map(({ field }) => visibility[field]));
    // Blank when they differ, which the dropdown shows as its placeholder.
    const all = levels.size === 1 ? [...levels][0]! : "";

    const setAll = (next: ProfileVisibility) =>
        onChange(
            Object.fromEntries(
                ABOUT_ROWS.map(({ field }) => [field, next])
            ) as AboutVisibility
        );

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken/60 py-1.5 pr-1.5 pl-3">
                <span className="text-body-sm font-medium text-content">
                    All of them
                </span>
                <PrivacyDropdown
                    label="Who sees all your About details"
                    value={all}
                    placeholder="Mixed"
                    onChange={setAll}
                    disabled={disabled}
                />
            </div>

            {GROUPS.map(({ id, title }) => (
                <section key={id} aria-label={title}>
                    <h3 className="mb-1.5 text-label-sm text-content-muted">
                        {title}
                    </h3>
                    <ul className="divide-y divide-subtle rounded-md border border-subtle">
                        {ABOUT_ROWS.filter((row) => row.group === id).map(
                            ({ field, label, icon: Icon }) => {
                                const value = about[field];
                                return (
                                    <li
                                        key={field}
                                        className="flex items-center gap-3 py-1.5 pr-1.5 pl-3"
                                    >
                                        <Icon
                                            size={16}
                                            aria-hidden
                                            className="shrink-0 text-content-muted"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-label-sm text-content-muted">
                                                {label}
                                            </p>
                                            <p
                                                className={
                                                    value
                                                        ? "truncate text-body-sm text-content"
                                                        : "text-body-sm text-content-muted"
                                                }
                                            >
                                                {value
                                                    ? shown(field, value)
                                                    : "Not set"}
                                            </p>
                                        </div>
                                        <PrivacyDropdown
                                            label={`Who sees your ${label.toLowerCase()}`}
                                            value={visibility[field]}
                                            onChange={(next) =>
                                                onChange({
                                                    ...visibility,
                                                    [field]: next,
                                                })
                                            }
                                            disabled={disabled}
                                        />
                                    </li>
                                );
                            }
                        )}
                    </ul>
                </section>
            ))}

            <p className="text-label-sm text-content-muted">
                Fill them in from Edit profile, on{" "}
                <Link
                    to={profileHref}
                    className="text-content underline hover:text-brand"
                >
                    your profile
                </Link>
                .
            </p>
        </div>
    );
};

export default AboutPrivacy;
