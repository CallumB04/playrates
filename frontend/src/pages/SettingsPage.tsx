import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    Lock,
    Mail,
    Monitor,
    Moon,
    Pencil,
    SlidersHorizontal,
    Sun,
    TriangleAlert,
    UserRound,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useAccountForm } from "../contexts/AccountFormContext";
import { useNotify } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
import { useUpdateProfile } from "../hooks/queries/useProfiles";
import { useUserStats } from "../hooks/queries/useGameLogs";
import { useUserReviews } from "../hooks/queries/useReviews";
import { useUserFriends } from "../hooks/queries/useFriends";
import { usePageMeta } from "../hooks/usePageMeta";
import { deleteMyAccount, fetchMyData } from "../api";
import { saveFile } from "../lib/saveFile";
import {
    DEFAULT_ABOUT_VISIBILITY,
    EMAIL_CATEGORIES,
    resolveEmailPrefs,
    type AboutVisibility,
    type EmailPrefs,
    type EmailScope,
    type ProfileVisibility,
    type UpdateProfileInput,
} from "@playrates/shared";
import DeleteAccountModal from "./settings/DeleteAccountModal";
import SettingsNav, { type SettingsSection } from "./settings/SettingsNav";
import Button, { buttonClass } from "../components/ui/Button";
import Card from "../components/ui/Card";
import Toggle from "../components/ui/Toggle";
import EmptyPlate from "../components/ui/EmptyPlate";
import UsernameRow from "./settings/UsernameRow";
import EmailRow from "./settings/EmailRow";
import PasswordRow from "./settings/PasswordRow";
import AboutPrivacy from "./settings/AboutPrivacy";
import Dropdown from "../components/ui/Dropdown";
import SegmentedChoice from "../components/ui/SegmentedChoice";
import { effectiveTimeZone, formatCount, timeZones } from "../lib/format";
import { profilePath } from "../lib/profilePaths";
import { cn } from "../lib/cn";

/* Only what can be used today. Sections and rows that were all "coming
   soon" were choices that led nowhere. The profile itself is edited on the
   profile, where you can see it change. */
const SECTIONS: SettingsSection[] = [
    { id: "account", label: "Account", icon: UserRound },
    { id: "privacy", label: "Privacy", icon: Lock },
    { id: "emails", label: "Emails", icon: Mail },
    { id: "content", label: "Content", icon: SlidersHorizontal },
    { id: "account-closure", label: "Close account", icon: TriangleAlert },
];

interface SettingProps {
    label: string;
    /** Only where the title alone doesn't say it, and short. */
    help?: ReactNode;
    children: ReactNode;
}

const Title = ({ label, help }: Omit<SettingProps, "children">) => (
    <div className="min-w-0">
        <p className="text-body-sm font-medium text-content">{label}</p>
        {help && (
            <p className="mt-0.5 text-label-sm text-content-muted">{help}</p>
        )}
    </div>
);

/** A setting whose control is small enough to sit beside its title: a
 *  switch, a short choice. `wide` drops a wider control under the title on
 *  a phone, where the two would crowd. */
const Setting = ({
    label,
    help,
    wide = false,
    inactive = false,
    children,
}: SettingProps & { wide?: boolean; inactive?: boolean }) => (
    <div
        className={cn(
            "flex gap-3 py-4 first:pt-0 last:pb-0",
            wide
                ? "flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                : "items-center justify-between gap-6"
        )}
    >
        <div className={cn("min-w-0", inactive && "opacity-60")}>
            <Title label={label} help={help} />
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

/** A setting edited in a field, which goes under its title. */
const FieldSetting = ({ label, help, children }: SettingProps) => (
    <div className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0">
        <Title label={label} help={help} />
        <div>{children}</div>
    </div>
);

/** Settings that belong together, under a heading where the section has
 *  more than one kind. Rules between groups, not cards around them. */
const Group = ({
    title,
    children,
}: {
    title?: string;
    children: ReactNode;
}) => (
    <section className="py-7 first:pt-0 last:pb-0">
        {title && (
            <h2 className="mb-4 font-display text-base font-semibold text-content">
                {title}
            </h2>
        )}
        <div className="divide-y divide-subtle">{children}</div>
    </section>
);

/* Older links into what was the Profile section, from before the profile
   was edited only on the profile. Account is where the way there is. */
const SECTION_ALIASES: Record<string, string> = { profile: "account" };

const sectionFrom = (asked: string | null) => {
    const id = (asked && SECTION_ALIASES[asked]) ?? asked;
    return SECTIONS.some((s) => s.id === id) ? id! : "account";
};

const SettingsPage = () => {
    usePageMeta({ title: "Settings", noindex: true });

    const { user, signOut } = useAuth();
    const { openLogin } = useAccountForm();
    const { preference, setPreference } = useTheme();
    const notify = useNotify();
    const update = useUpdateProfile();
    const navigate = useNavigate();
    const { data: stats } = useUserStats(user?.username ?? "");
    const { data: reviews } = useUserReviews(user?.username);
    const { data: friends } = useUserFriends(user?.username ?? "");
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [params] = useSearchParams();
    // ?section= so a link elsewhere can open the row it is about.
    const [section, setSection] = useState(() =>
        sectionFrom(params.get("section"))
    );

    /* requireAuth verifies signatures locally and never checks revocation, so
       the token outlives the account. Sign out straight away. */
    const remove = useMutation({
        mutationFn: deleteMyAccount,
        onSuccess: async () => {
            await signOut();
            navigate("/");
            notify("Your account has been deleted", "success");
        },
        onError: () => notify("Couldn't delete your account", "error"),
    });

    const exportData = useMutation({
        mutationFn: fetchMyData,
        onSuccess: (blob) => {
            const day = new Date().toISOString().slice(0, 10);
            saveFile(
                blob,
                `playrates-${user?.username ?? "account"}-${day}.json`
            );
        },
        onError: () => notify("Couldn't export your data", "error"),
    });

    const [showSexual, setShowSexual] = useState(
        user?.showSexualContent ?? false
    );
    const [hideOnline, setHideOnline] = useState(user?.hideOnline ?? false);
    const [hideFromSearch, setHideFromSearch] = useState(
        user?.hideFromSearch ?? false
    );
    const [profileVisibility, setProfileVisibility] =
        useState<ProfileVisibility>(user?.profileVisibility ?? "everyone");
    const [aboutVisibility, setAboutVisibility] = useState<AboutVisibility>(
        user?.aboutVisibility ?? DEFAULT_ABOUT_VISIBILITY
    );
    const [emailPrefs, setEmailPrefs] = useState<EmailPrefs>(
        user?.emailPrefs ?? resolveEmailPrefs(null)
    );

    useEffect(() => {
        setShowSexual(user?.showSexualContent ?? false);
        setHideOnline(user?.hideOnline ?? false);
        setHideFromSearch(user?.hideFromSearch ?? false);
        setProfileVisibility(user?.profileVisibility ?? "everyone");
        setAboutVisibility(user?.aboutVisibility ?? DEFAULT_ABOUT_VISIBILITY);
        setEmailPrefs(user?.emailPrefs ?? resolveEmailPrefs(null));
    }, [user]);

    const zone = effectiveTimeZone(user?.timezone);
    /* "UTC" is the column default meaning "never chosen", so the field shows
       the device's zone. Nothing is saved yet, and it shouldn't imply it is. */
    const zoneIsDetected = !user?.timezone || user.timezone === "UTC";

    const zones = useMemo(() => {
        // The current zone is always offered, even if this runtime omits it.
        const names = new Set(timeZones());
        names.add(zone);
        return [...names].sort().map((name) => ({
            value: name,
            label: name.replace(/_/g, " "),
        }));
    }, [zone]);

    /* Toggles save immediately and roll back on failure, so the control never
       shows a state the server did not accept. */
    const saveToggle = <T,>(
        patch: UpdateProfileInput,
        next: T,
        setLocal: (value: T) => void,
        previous: T
    ) => {
        setLocal(next);
        update.mutate(patch, {
            onError: () => {
                setLocal(previous);
                notify("Couldn't save that setting", "error");
            },
        });
    };

    // With every email off, a category reads as off too, though it keeps
    // its own choice for when they come back on.
    const silenced = (scope: EmailScope) => scope !== "all" && !emailPrefs.all;
    const emailToggle = (scope: EmailScope, label: string) => (
        <Toggle
            checked={emailPrefs[scope] && !silenced(scope)}
            onChange={(next) =>
                saveToggle(
                    { emailPrefs: { [scope]: next } },
                    next,
                    (value) =>
                        setEmailPrefs((prefs) => ({
                            ...prefs,
                            [scope]: value,
                        })),
                    emailPrefs[scope]
                )
            }
            label={label}
            labelPosition="hidden"
            disabled={update.isPending || silenced(scope)}
        />
    );

    if (!user) {
        return (
            <EmptyPlate
                title="Sign in to change your settings"
                action={<Button onClick={openLogin}>Sign in</Button>}
            />
        );
    }

    // Opens the Edit profile popup on arrival.
    const editProfileHref = `${profilePath(user.username)}?edit=profile`;

    const panels: Record<string, ReactNode> = {
        account: (
            <>
                <Group>
                    <Setting
                        wide
                        label="Profile"
                        help="Your picture, bio, About details, socials and look."
                    >
                        <Link
                            to={editProfileHref}
                            className={buttonClass(
                                "secondary",
                                "w-full sm:w-auto"
                            )}
                        >
                            <Pencil size={15} aria-hidden />
                            Edit profile
                        </Link>
                    </Setting>
                    <FieldSetting label="Username">
                        <UsernameRow current={user.username} />
                    </FieldSetting>
                    <FieldSetting
                        label="Time zone"
                        help={
                            zoneIsDetected
                                ? "Detected from your device."
                                : undefined
                        }
                    >
                        <Dropdown
                            searchable
                            options={zones}
                            value={zone}
                            onChange={(next) =>
                                update.mutate(
                                    { timezone: next },
                                    {
                                        onError: () =>
                                            notify(
                                                "Couldn't save your time zone",
                                                "error"
                                            ),
                                    }
                                )
                            }
                            aria-label="Time zone"
                        />
                    </FieldSetting>
                </Group>
                <Group title="Email and password">
                    <FieldSetting label="Email">
                        <EmailRow />
                    </FieldSetting>
                    <FieldSetting label="Password">
                        <PasswordRow />
                    </FieldSetting>
                </Group>
            </>
        ),

        privacy: (
            <>
                <Group>
                    <Setting
                        wide
                        label="Who can see your profile"
                        help="Your picture and bio always show."
                    >
                        <SegmentedChoice
                            label="Who can see your profile"
                            segments={[
                                { value: "everyone", label: "Everyone" },
                                { value: "friends", label: "Friends" },
                                { value: "private", label: "Only me" },
                            ]}
                            value={profileVisibility}
                            onChange={(next) =>
                                saveToggle(
                                    { profileVisibility: next },
                                    next,
                                    setProfileVisibility,
                                    profileVisibility
                                )
                            }
                        />
                    </Setting>
                    <Setting label="Hide online status">
                        <Toggle
                            checked={hideOnline}
                            onChange={(next) =>
                                saveToggle(
                                    { hideOnline: next },
                                    next,
                                    setHideOnline,
                                    hideOnline
                                )
                            }
                            label="Hide online status"
                            labelPosition="hidden"
                            disabled={update.isPending}
                        />
                    </Setting>
                    <Setting
                        label="Hide from search engines"
                        help="You stay visible on PlayRates."
                    >
                        <Toggle
                            checked={hideFromSearch}
                            onChange={(next) =>
                                saveToggle(
                                    { hideFromSearch: next },
                                    next,
                                    setHideFromSearch,
                                    hideFromSearch
                                )
                            }
                            label="Hide from search engines"
                            labelPosition="hidden"
                            disabled={update.isPending}
                        />
                    </Setting>
                </Group>
                <Group title="About details">
                    <div>
                        <AboutPrivacy
                            about={user.about}
                            visibility={aboutVisibility}
                            onChange={(next) =>
                                saveToggle<AboutVisibility>(
                                    { aboutVisibility: next },
                                    next,
                                    setAboutVisibility,
                                    aboutVisibility
                                )
                            }
                            disabled={update.isPending}
                            editHref={editProfileHref}
                        />
                    </div>
                </Group>
            </>
        ),

        emails: (
            <>
                <Group>
                    <Setting
                        label="Emails from PlayRates"
                        help="Account emails always send: confirming your email, password resets and security notices."
                    >
                        {emailToggle("all", "Emails from PlayRates")}
                    </Setting>
                </Group>
                <Group>
                    {EMAIL_CATEGORIES.map((category) => (
                        <Setting
                            key={category.key}
                            label={category.label}
                            help={category.description}
                            inactive={!emailPrefs.all}
                        >
                            {emailToggle(category.key, category.label)}
                        </Setting>
                    ))}
                </Group>
            </>
        ),

        content: (
            <Group>
                <Setting label="Show sexually explicit games">
                    <Toggle
                        checked={showSexual}
                        onChange={(next) =>
                            saveToggle(
                                { showSexualContent: next },
                                next,
                                setShowSexual,
                                showSexual
                            )
                        }
                        label="Show sexually explicit games"
                        labelPosition="hidden"
                        disabled={update.isPending}
                    />
                </Setting>
                <Setting wide label="Theme">
                    <SegmentedChoice
                        label="Theme"
                        segments={[
                            { value: "light", label: "Light", icon: Sun },
                            { value: "dark", label: "Dark", icon: Moon },
                            {
                                value: "system",
                                label: "System",
                                icon: Monitor,
                            },
                        ]}
                        value={preference}
                        onChange={setPreference}
                    />
                </Setting>
            </Group>
        ),

        "account-closure": (
            <Card padding="none" tone="danger" className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-5 px-5 py-5">
                    <p className="max-w-[60ch] flex-1 text-body-sm text-content-secondary">
                        Your {formatCount(stats?.logCount ?? 0)} logs and
                        everything attached to them will be deleted. This cannot
                        be undone.
                    </p>
                    <Button
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => exportData.mutate()}
                        disabled={exportData.isPending}
                    >
                        {exportData.isPending ? "Exporting…" : "Export my data"}
                    </Button>
                    <Button
                        variant="danger"
                        className="w-full sm:w-auto"
                        onClick={() => setConfirmingDelete(true)}
                    >
                        Delete account
                    </Button>
                </div>
            </Card>
        ),
    };

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="font-display text-title text-content">
                    Settings
                </h1>
                <p className="mt-2 text-label text-content-muted">
                    {user.username}
                </p>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
                <SettingsNav
                    sections={SECTIONS}
                    active={section}
                    onSelect={setSection}
                />
                {/* One width for every section, so switching between them
                    doesn't move the edge things line up to. */}
                <div className="max-w-2xl min-w-0 divide-y divide-subtle">
                    {panels[section]}
                </div>
            </div>

            {confirmingDelete && (
                <DeleteAccountModal
                    username={user.username}
                    stats={stats}
                    reviewCount={reviews?.meta.total}
                    friendCount={
                        friends?.filter((e) => e.status === "friend").length
                    }
                    isDeleting={remove.isPending}
                    onCancel={() => setConfirmingDelete(false)}
                    onConfirm={() => remove.mutate()}
                />
            )}
        </div>
    );
};

export default SettingsPage;
