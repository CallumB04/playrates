import { Pencil } from "lucide-react";
import type {
    AboutField,
    AboutVisibility,
    Profile,
    ProfileVisibility,
} from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import { ABOUT_ROWS, linkLabel, steamLabel } from "../lib/about";
import PrivacySelect, { PRIVACY_OPTIONS } from "./PrivacySelect";

const Value = ({ field, value }: { field: AboutField; value: string }) => {
    if (field === "website" || field === "steam") {
        return (
            <a
                href={value}
                target="_blank"
                // Off the site, and nothing to vouch for: no referrer, no ranking.
                rel="noopener noreferrer nofollow ugc"
                className="block truncate text-content underline decoration-subtle underline-offset-2 hover:text-brand hover:decoration-brand"
            >
                {field === "website" ? linkLabel(value) : steamLabel(value)}
            </a>
        );
    }
    return <span className="break-words text-content">{value}</span>;
};

interface AboutCardProps {
    /** The About fields here are only those this viewer may see. */
    profile: Profile;
    /** Set on your own profile: who sees each field, to change in place. */
    owner?: {
        visibility: AboutVisibility;
        onChangeVisibility: (
            field: AboutField,
            value: ProfileVisibility
        ) => void;
        onEdit: () => void;
        saving: boolean;
    };
}

/** Who they are, in their words: the bio, then what they've chosen to
 *  share. The owner sees every field, set or not, and who it shows to. */
const AboutCard = ({ profile, owner }: AboutCardProps) => {
    const rows = ABOUT_ROWS.filter(
        ({ field }) => owner || profile.about[field]
    );
    if (!owner && !profile.bio && rows.length === 0) return null;

    return (
        <Panel
            title="About"
            trailing={
                owner && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={owner.onEdit}
                        className="-my-1 max-sm:min-h-11"
                    >
                        <Pencil size={14} aria-hidden />
                        Edit
                    </Button>
                )
            }
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

            {rows.length > 0 && (
                <dl className="mt-4 flex flex-col gap-3 border-t border-subtle pt-4">
                    {rows.map(({ field, label, icon: Icon }) => {
                        const value = profile.about[field];
                        return (
                            /* The label over its value, not beside it: in a
                               column of its own it left a long location three
                               lines to wrap in. */
                            <div
                                key={field}
                                className="flex items-center gap-3"
                            >
                                <span className="flex w-4 shrink-0 justify-center text-content-muted">
                                    <Icon size={16} aria-hidden />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <dt className="text-label-sm text-content-muted">
                                        {label}
                                    </dt>
                                    <dd className="text-body-sm">
                                        {value ? (
                                            <Value
                                                field={field}
                                                value={value}
                                            />
                                        ) : (
                                            <span className="text-content-muted">
                                                Not set
                                            </span>
                                        )}
                                    </dd>
                                </div>
                                {owner && (
                                    <dd className="shrink-0">
                                        <PrivacySelect
                                            field={label}
                                            value={owner.visibility[field]}
                                            onChange={(next) =>
                                                owner.onChangeVisibility(
                                                    field,
                                                    next
                                                )
                                            }
                                            disabled={owner.saving}
                                        />
                                    </dd>
                                )}
                            </div>
                        );
                    })}
                </dl>
            )}

            {owner && rows.length > 0 && (
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-content-muted">
                    <span>Who sees each:</span>
                    {PRIVACY_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <span
                            key={value}
                            className="inline-flex items-center gap-1"
                        >
                            <Icon size={12} aria-hidden />
                            {label}
                        </span>
                    ))}
                </p>
            )}
        </Panel>
    );
};

export default AboutCard;
