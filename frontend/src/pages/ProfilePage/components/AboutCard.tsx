import { Link2, MapPin, Pencil, Speech, UserRound } from "lucide-react";
import { SiDiscord, SiSteam } from "@icons-pack/react-simple-icons";
import type {
    AboutField,
    AboutVisibility,
    Profile,
    ProfileVisibility,
} from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import type { IconComponent } from "../../../lib/icons";
import { linkLabel, steamLabel } from "../lib/about";
import PrivacySelect from "./PrivacySelect";
import { cn } from "../../../lib/cn";

const ROWS: {
    field: AboutField;
    label: string;
    icon: IconComponent;
}[] = [
    { field: "firstName", label: "Name", icon: UserRound },
    { field: "pronouns", label: "Pronouns", icon: Speech },
    { field: "location", label: "Location", icon: MapPin },
    { field: "website", label: "Website", icon: Link2 },
    { field: "discord", label: "Discord", icon: SiDiscord },
    { field: "steam", label: "Steam", icon: SiSteam },
];

const Value = ({ field, value }: { field: AboutField; value: string }) => {
    if (field === "website" || field === "steam") {
        return (
            <a
                href={value}
                target="_blank"
                // Off the site, and nothing to vouch for: no referrer, no ranking.
                rel="noopener noreferrer nofollow ugc"
                className="break-all text-content underline decoration-subtle underline-offset-2 hover:text-brand hover:decoration-brand"
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
    const rows = ROWS.filter(({ field }) => owner || profile.about[field]);
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
                <dl className="mt-4 flex flex-col gap-2.5 border-t border-subtle pt-4">
                    {rows.map(({ field, label, icon: Icon }) => {
                        const value = profile.about[field];
                        return (
                            <div
                                key={field}
                                className={cn(
                                    "flex min-h-7 items-center gap-3 text-body-sm",
                                    // Room on a phone for each privacy pill's 44px reach.
                                    owner && "max-sm:min-h-11"
                                )}
                            >
                                {/* The mark says which it is, Discord's and
                                    Steam's above all; the word is for a
                                    screen reader. */}
                                <dt className="flex w-5 shrink-0 justify-center text-content-muted">
                                    <Icon size={16} aria-hidden />
                                    <span className="sr-only">{label}</span>
                                </dt>
                                <dd className="min-w-0 flex-1">
                                    {value ? (
                                        <Value field={field} value={value} />
                                    ) : (
                                        <span className="text-content-muted">
                                            {label} not set
                                        </span>
                                    )}
                                </dd>
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
        </Panel>
    );
};

export default AboutCard;
