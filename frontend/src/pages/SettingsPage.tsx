import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    Bell,
    Eye,
    Monitor,
    Moon,
    Plug,
    SlidersHorizontal,
    Sun,
    TriangleAlert,
    UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { usePageTitle } from "../hooks/usePageTitle";
import { deleteMyAccount } from "../api";
import { FALLBACK_ACCENT } from "@playrates/shared";
import DeleteAccountModal from "./settings/DeleteAccountModal";
import SettingsNav, { type SettingsSection } from "./settings/SettingsNav";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Toggle from "../components/ui/Toggle";
import EmptyPlate from "../components/ui/EmptyPlate";
import { Input, Textarea } from "../components/ui/Input";
import UsernameRow from "./settings/UsernameRow";
import Dropdown from "../components/ui/Dropdown";
import SegmentedChoice from "../components/ui/SegmentedChoice";
import AccentPicker from "../components/ui/AccentPicker";
import AvatarField, { type AvatarChoice } from "../components/AvatarField";
import { effectiveTimeZone, formatCount, timeZones } from "../lib/format";
import { cn } from "../lib/cn";

const SECTIONS: SettingsSection[] = [
    { id: "account", label: "Account", icon: UserRound },
    { id: "profile", label: "Profile", icon: Eye },
    { id: "content", label: "Content", icon: SlidersHorizontal },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "connections", label: "Connections", icon: Plug },
    { id: "account-closure", label: "Close account", icon: TriangleAlert },
];

interface RowProps {
    label: string;
    /** Only where the control alone doesn't say it. Most rows need none. */
    help?: ReactNode;
    /** Rendered, disabled and labelled, so the page shows the shape of the thing. */
    soon?: boolean;
    children: ReactNode;
}

const Row = ({ label, help, soon, children }: RowProps) => (
    <div className="grid items-center gap-3 border-b border-subtle px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-8">
        <div>
            <div className="flex flex-wrap items-baseline gap-2">
                <span
                    className={cn(
                        "text-body-sm font-medium",
                        soon ? "text-content-muted" : "text-content"
                    )}
                >
                    {label}
                </span>
                {soon && (
                    <span className="rounded-full border border-subtle px-2 py-0.5 text-[10px] text-content-muted">
                        Coming soon
                    </span>
                )}
            </div>
            {help && (
                <p className="mt-1 max-w-[46ch] text-xs leading-relaxed text-content-muted">
                    {help}
                </p>
            )}
        </div>
        <div className={cn(soon && "pointer-events-none opacity-50")}>
            {children}
        </div>
    </div>
);

/* Its rows run edge to edge with a rule between them, so the card sets no
   padding of its own. */
const SettingsCard = ({ children }: { children: ReactNode }) => (
    <Card padding="none" className="overflow-hidden">
        {children}
    </Card>
);

const SettingsPage = () => {
    usePageTitle("Settings");

    const { user, session, signOut } = useAuth();
    const { openLogin } = useAccountForm();
    const { preference, setPreference } = useTheme();
    const notify = useNotify();
    const update = useUpdateProfile();
    const navigate = useNavigate();
    const { data: stats } = useUserStats(user?.username ?? "");
    const { data: reviews } = useUserReviews(user?.username);
    const { data: friends } = useUserFriends(user?.username ?? "");
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [section, setSection] = useState("account");

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

    const [bio, setBio] = useState(user?.bio ?? "");
    const [firstName, setFirstName] = useState(user?.firstName ?? "");
    const [showSexual, setShowSexual] = useState(
        user?.showSexualContent ?? false
    );
    const [hideOnline, setHideOnline] = useState(user?.hideOnline ?? false);
    const [accent, setAccent] = useState(user?.accent ?? FALLBACK_ACCENT);
    const updateAvatar = useUpdateAvatar();
    const removeAvatar = useRemoveAvatar();

    useEffect(() => {
        setBio(user?.bio ?? "");
        setFirstName(user?.firstName ?? "");
        setShowSexual(user?.showSexualContent ?? false);
        setHideOnline(user?.hideOnline ?? false);
        setAccent(user?.accent ?? FALLBACK_ACCENT);
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
        patch: { firstName: string } | { bio: string },
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

    const panels: Record<string, ReactNode> = {
        account: (
            <SettingsCard>
                <Row label="Username">
                    <UsernameRow current={user.username} />
                </Row>
                <Row label="First name">
                    <Input
                        value={firstName}
                        maxLength={40}
                        placeholder="Optional"
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={() =>
                            saveText(
                                { firstName: firstName.trim() },
                                firstName.trim() === (user.firstName ?? ""),
                                "Couldn't save your name"
                            )
                        }
                        aria-label="First name"
                    />
                </Row>
                <Row label="Change email" soon>
                    <Input
                        value={session?.user.email ?? ""}
                        readOnly
                        aria-label="Email"
                    />
                </Row>
                <Row label="Reset password" soon>
                    <Button variant="secondary" size="sm">
                        Send a reset link
                    </Button>
                </Row>
                <Row
                    label="Time zone"
                    help={
                        zoneIsDetected
                            ? "Dates and times render in this. Detected from your device. Choose it to save it to your account."
                            : "Dates and times render in this."
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
                </Row>
            </SettingsCard>
        ),

        profile: (
            <SettingsCard>
                <Row label="Bio" help={`${bio.length} of 160 characters`}>
                    <Textarea
                        rows={3}
                        value={bio}
                        maxLength={160}
                        placeholder="I love PlayRates."
                        onChange={(e) => setBio(e.target.value)}
                        onBlur={() =>
                            saveText(
                                { bio },
                                bio === (user.bio ?? ""),
                                "Couldn't save your bio"
                            )
                        }
                        aria-label="Bio"
                    />
                </Row>
                <Row label="Profile picture">
                    <AvatarField
                        username={user.username}
                        accent={user.accent}
                        current={user.avatarUrl}
                        choice={{ kind: "unchanged" }}
                        onChange={saveAvatar}
                        disabled={savingAvatar}
                    />
                </Row>
                <Row label="Profile Colour">
                    <AccentPicker
                        label="Profile Colour"
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
                </Row>
                <Row
                    label="Hide online status"
                    help="Your profile reads as offline to everyone."
                >
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
                        label={hideOnline ? "On" : "Off"}
                        disabled={update.isPending}
                    />
                </Row>
            </SettingsCard>
        ),

        content: (
            <SettingsCard>
                <Row
                    label="Sexual content"
                    help="Games tagged as sexually explicit stay out of the library, search and every rail."
                >
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
                        label={showSexual ? "On" : "Off"}
                        disabled={update.isPending}
                    />
                </Row>
                <Row label="Theme">
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
                </Row>
            </SettingsCard>
        ),

        notifications: (
            <SettingsCard>
                <Row label="Friend requests" soon>
                    <Toggle checked={false} onChange={() => {}} label="Off" />
                </Row>
            </SettingsCard>
        ),

        connections: (
            <SettingsCard>
                <Row label="Steam" soon>
                    <Button variant="secondary" size="sm">
                        Connect
                    </Button>
                </Row>
            </SettingsCard>
        ),

        "account-closure": (
            <Card padding="none" tone="danger" className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-5 px-5 py-5">
                    <p className="max-w-[60ch] flex-1 text-body-sm text-content-secondary">
                        Your {formatCount(stats?.logCount ?? 0)} logs and
                        everything attached to them will be deleted. This cannot
                        be undone.
                    </p>
                    {/* Export has no backing yet, but the shape is real. */}
                    <Button variant="secondary" size="sm" disabled>
                        Export my data
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
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
                {panels[section]}
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
