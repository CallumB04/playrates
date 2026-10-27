import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    IdCard,
    Lock,
    Monitor,
    Moon,
    SlidersHorizontal,
    Sun,
    TriangleAlert,
    UserRound,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useAccountForm } from "../contexts/AccountFormContext";
import { useNotify } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
import {
    useRemoveAvatar,
    useUpdateAvatar,
    useUpdateProfile,
} from "../hooks/queries/useProfiles";
import { useUserStats } from "../hooks/queries/useGameLogs";
import { useUserReviews } from "../hooks/queries/useReviews";
import { useUserFriends } from "../hooks/queries/useFriends";
import { usePageMeta } from "../hooks/usePageMeta";
import { deleteMyAccount, fetchMyData } from "../api";
import { saveFile } from "../lib/saveFile";
import {
    DEFAULT_ABOUT_VISIBILITY,
    FALLBACK_ACCENT,
    type AboutField,
    type AboutVisibility,
    type MyProfile,
    type ProfileVisibility,
} from "@playrates/shared";
import DeleteAccountModal from "./settings/DeleteAccountModal";
import SettingsNav, { type SettingsSection } from "./settings/SettingsNav";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Toggle from "../components/ui/Toggle";
import EmptyPlate from "../components/ui/EmptyPlate";
import { Textarea } from "../components/ui/Input";
import Field from "../components/ui/Field";
import UsernameRow from "./settings/UsernameRow";
import AboutPrivacy from "./settings/AboutPrivacy";
import BackgroundSetting from "./settings/BackgroundSetting";
import AboutFieldInput from "./ProfilePage/components/AboutFieldInput";
import {
    ABOUT_ROWS,
    aboutError,
    mergeSaved,
    type AboutRow,
} from "./ProfilePage/lib/about";
import Dropdown from "../components/ui/Dropdown";
import SegmentedChoice from "../components/ui/SegmentedChoice";
import AccentPicker from "../components/ui/AccentPicker";
import AvatarField, { type AvatarChoice } from "../components/AvatarField";
import { effectiveTimeZone, formatCount, timeZones } from "../lib/format";
import { cn } from "../lib/cn";

/* Only what can be used today. Sections and rows that were all "coming
   soon" were choices that led nowhere. */
const SECTIONS: SettingsSection[] = [
    { id: "account", label: "Account", icon: UserRound },
    { id: "profile", label: "Profile", icon: IdCard },
    { id: "privacy", label: "Privacy", icon: Lock },
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
    children,
}: SettingProps & { wide?: boolean }) => (
    <div
        className={cn(
            "flex gap-3 py-4 first:pt-0 last:pb-0",
            wide
                ? "flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                : "items-center justify-between gap-6"
        )}
    >
        <Title label={label} help={help} />
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

/** A link-styled button to another section of Settings. */
const SectionLink = ({
    onClick,
    children,
}: {
    onClick: () => void;
    children: ReactNode;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="relative cursor-pointer text-content underline before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:text-brand"
    >
        {children}
    </button>
);

type AboutValues = Record<AboutField, string>;

const aboutFrom = (user: MyProfile | null | undefined): AboutValues =>
    Object.fromEntries(
        ABOUT_ROWS.map(({ field }) => [field, user?.about[field] ?? ""])
    ) as AboutValues;

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
    const [section, setSection] = useState(() => {
        const asked = params.get("section");
        return SECTIONS.some((s) => s.id === asked) ? asked! : "account";
    });
    // From a link partway down one section, to the top of another.
    const goTo = (id: string) => {
        setSection(id);
        window.scrollTo({ top: 0 });
    };

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

    const [bio, setBio] = useState(user?.bio ?? "");
    const [about, setAbout] = useState<AboutValues>(() => aboutFrom(user));
    const savedAbout = useRef(about);
    useEffect(() => {
        const saved = aboutFrom(user);
        setAbout((drafts) => mergeSaved(drafts, savedAbout.current, saved));
        savedAbout.current = saved;
    }, [user]);
    const [showSexual, setShowSexual] = useState(
        user?.showSexualContent ?? false
    );
    const [hideOnline, setHideOnline] = useState(user?.hideOnline ?? false);
    const [hideFromSearch, setHideFromSearch] = useState(
        user?.hideFromSearch ?? false
    );
    const [profileVisibility, setProfileVisibility] =
        useState<ProfileVisibility>(user?.profileVisibility ?? "everyone");
    const [accent, setAccent] = useState(user?.accent ?? FALLBACK_ACCENT);
    const [aboutVisibility, setAboutVisibility] = useState<AboutVisibility>(
        user?.aboutVisibility ?? DEFAULT_ABOUT_VISIBILITY
    );
    const updateAvatar = useUpdateAvatar();
    const removeAvatar = useRemoveAvatar();

    useEffect(() => {
        setBio(user?.bio ?? "");
        setShowSexual(user?.showSexualContent ?? false);
        setHideOnline(user?.hideOnline ?? false);
        setHideFromSearch(user?.hideFromSearch ?? false);
        setProfileVisibility(user?.profileVisibility ?? "everyone");
        setAccent(user?.accent ?? FALLBACK_ACCENT);
        setAboutVisibility(user?.aboutVisibility ?? DEFAULT_ABOUT_VISIBILITY);
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

    // Saved on blur. One value with one owner needs no second action.
    const saveText = (
        patch: Partial<Record<AboutField, string>> | { bio: string },
        unchanged: boolean,
        message: string
    ) => {
        if (unchanged) return;
        update.mutate(patch, { onError: () => notify(message, "error") });
    };

    /* Settings has no save button, so the picture goes up the moment it is
       chosen. The field is handed "unchanged" throughout: what it draws is
       whatever the server last confirmed, never a pending choice. */
    const savingAvatar = updateAvatar.isPending || removeAvatar.isPending;
    const saveAvatar = (choice: AvatarChoice) => {
        const done = {
            onSuccess: () => notify("Profile picture updated", "success"),
            onError: () => notify("Couldn't save your picture", "error"),
        };
        if (choice.kind === "picked") updateAvatar.mutate(choice.image, done);
        else if (choice.kind === "removed")
            removeAvatar.mutate(undefined, done);
    };

    /* Toggles save immediately and roll back on failure, so the control never
       shows a state the server did not accept. */
    const saveToggle = <T,>(
        patch: Record<string, T>,
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

    if (!user) {
        return (
            <EmptyPlate
                title="Sign in to change your settings"
                action={<Button onClick={openLogin}>Sign in</Button>}
            />
        );
    }

    const aboutErrors = Object.fromEntries(
        ABOUT_ROWS.map(({ field }) => [field, aboutError(field, about[field])])
    ) as Partial<Record<AboutField, string>>;

    // Saved on blur like the bio, once it's something the server will take.
    const aboutInputs = (group: AboutRow["group"], half = false) =>
        ABOUT_ROWS.filter(
            (row) => row.group === group && !!row.half === half
        ).map((row) => (
            <AboutFieldInput
                key={row.field}
                row={row}
                value={about[row.field]}
                onChange={(value) =>
                    setAbout((was) => ({ ...was, [row.field]: value }))
                }
                onBlur={() => {
                    const value = about[row.field].trim();
                    if (aboutErrors[row.field]) return;
                    saveText(
                        { [row.field]: value },
                        value === (user.about[row.field] ?? ""),
                        `Couldn't save your ${row.label.toLowerCase()}`
                    );
                }}
                error={aboutErrors[row.field]}
            />
        ));

    const panels: Record<string, ReactNode> = {
        account: (
            <Group>
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
        ),

        profile: (
            <>
                <Group title="Picture">
                    <div>
                        <AvatarField
                            username={user.username}
                            accent={user.accent}
                            current={user.avatarUrl}
                            choice={{ kind: "unchanged" }}
                            onChange={saveAvatar}
                            disabled={savingAvatar}
                        />
                        {/* The colour fills the initial in place of a
                            picture, so it is offered only while there is
                            none. */}
                        {!user.avatarUrl && (
                            <div className="mt-4">
                                <p className="mb-2 text-label-sm text-content-muted">
                                    Or a colour behind your initial
                                </p>
                                <AccentPicker
                                    label="Colour behind your initial"
                                    value={accent}
                                    onChange={(next) =>
                                        saveToggle(
                                            { accent: next },
                                            next,
                                            setAccent,
                                            accent
                                        )
                                    }
                                    disabled={update.isPending}
                                />
                            </div>
                        )}
                    </div>
                </Group>
                <Group title="Background">
                    <BackgroundSetting profile={user} />
                </Group>
                <Group title="Bio">
                    <div>
                        <Field
                            label="Bio"
                            labelHidden
                            help={`${bio.length} of 160 characters`}
                        >
                            {(a11y) => (
                                <Textarea
                                    {...a11y}
                                    rows={3}
                                    value={bio}
                                    maxLength={160}
                                    placeholder="I love PlayRates."
                                    onChange={(e) => setBio(e.target.value)}
                                    onBlur={() =>
                                        saveText(
                                            { bio },
                                            bio === user.bio,
                                            "Couldn't save your bio"
                                        )
                                    }
                                />
                            )}
                        </Field>
                    </div>
                </Group>
                <Group title="About you">
                    <div className="flex flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {aboutInputs("about", true)}
                        </div>
                        {aboutInputs("about")}
                    </div>
                </Group>
                <Group title="Socials">
                    <div className="flex flex-col gap-4">
                        {aboutInputs("socials")}
                        <p className="text-label-sm text-content-muted">
                            Choose who sees each in{" "}
                            <SectionLink onClick={() => goTo("privacy")}>
                                Privacy
                            </SectionLink>
                            .
                        </p>
                    </div>
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
                            onFillIn={() => goTo("profile")}
                        />
                    </div>
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
