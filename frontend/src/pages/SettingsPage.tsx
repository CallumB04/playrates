import { useEffect, useState, type ReactNode } from "react";
import {
    Bell,
    Eye,
    Moon,
    Plug,
    SlidersHorizontal,
    Sun,
    TriangleAlert,
    UserRound,
    type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useAccountForm } from "../contexts/AccountFormContext";
import { useNotify } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
import { useUpdateProfile } from "../hooks/queries/useProfiles";
import { useUserStats } from "../hooks/queries/useGameLogs";
import { useUserReviews } from "../hooks/queries/useReviews";
import { useUserFriends } from "../hooks/queries/useFriends";
import { deleteMyAccount } from "../api";
import DeleteAccountModal from "./settings/DeleteAccountModal";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import EmptyPlate from "../components/ui/EmptyPlate";
import { Input, Textarea } from "../components/ui/Input";
import UsernameRow from "./settings/UsernameRow";
import Dropdown from "../components/ui/Dropdown";
import { formatCount } from "../lib/format";
import { cn } from "../lib/cn";

/** Rows with no backing system yet. Rendered, disabled and labelled rather
 *  than hidden, so the page shows the shape of the thing. */
const PENDING = "Not available yet";

interface RowProps {
    label: string;
    help: ReactNode;
    /** Marks the row as unbacked and dims it. */
    pending?: boolean;
    children: ReactNode;
}

const Row = ({ label, help, pending, children }: RowProps) => (
    <div className="grid gap-3 border-b border-subtle px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)] sm:gap-8">
        <div>
            <div className="flex flex-wrap items-baseline gap-2">
                <span
                    className={cn(
                        "text-body-sm font-medium",
                        pending ? "text-content-muted" : "text-content"
                    )}
                >
                    {label}
                </span>
                {pending && (
                    <span className="rounded-full border border-subtle px-2 py-0.5 text-[10px] text-content-muted">
                        {PENDING}
                    </span>
                )}
            </div>
            <p className="mt-1 max-w-[46ch] text-xs leading-relaxed text-content-muted">
                {help}
            </p>
        </div>
        <div className={cn(pending && "pointer-events-none opacity-50")}>
            {children}
        </div>
    </div>
);

/**
 * Six sections of near-identical rows need something to tell them apart at a
 * glance — the icon is the fastest way back to the one you were looking for.
 */
const Section = ({
    title,
    note,
    icon: Icon,
    children,
}: {
    title: string;
    note: string;
    icon: LucideIcon;
    children: ReactNode;
}) => (
    <section className="overflow-hidden rounded-lg border border-subtle bg-surface-raised shadow-plate">
        <header className="flex flex-wrap items-center gap-3 border-b border-subtle bg-surface-sunken/40 px-5 py-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-brand-subtle text-brand">
                <Icon size={15} aria-hidden />
            </span>
            <h2 className="font-display text-section text-content">{title}</h2>
            <span className="text-body-sm text-content-muted">{note}</span>
        </header>
        {children}
    </section>
);

const SettingsPage = () => {
    const { user } = useAuth();
    const { openLogin } = useAccountForm();
    const { theme, setTheme } = useTheme();
    const notify = useNotify();
    const update = useUpdateProfile();
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { data: stats } = useUserStats(user?.username ?? "");
    const { data: reviews } = useUserReviews(user?.username);
    const { data: friends } = useUserFriends(user?.username ?? "");
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    /* The access token stays cryptographically valid until it expires —
       requireAuth verifies signatures locally and never checks revocation —
       so sign out immediately rather than leaving a session pointed at an
       account that no longer exists. */
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

    /* Saved on toggle rather than gathered into the Save bar: this one
       changes what the library will show you, so waiting for a second
       action to apply it would be strange. */
    const [showSexual, setShowSexual] = useState(
        user?.showSexualContent ?? false
    );

    /* Saved on blur rather than gathered into a page-wide button. Every
       field here is one value with one owner, so a second action to apply it
       only adds a way to lose the change. */
    const saveFirstName = () => {
        const next = firstName.trim();
        if (next === (user?.firstName ?? "")) return;
        update.mutate(
            { firstName: next },
            { onError: () => notify("Couldn't save your name", "error") }
        );
    };

    const saveBio = () => {
        if (bio === (user?.bio ?? "")) return;
        update.mutate(
            { bio },
            { onError: () => notify("Couldn't save your bio", "error") }
        );
    };

    const saveSexualContent = (next: boolean) => {
        setShowSexual(next);
        update.mutate(
            { showSexualContent: next },
            {
                onError: () => {
                    setShowSexual(!next);
                    notify("Couldn't save that setting", "error");
                },
            }
        );
    };

    useEffect(() => {
        setBio(user?.bio ?? "");
        setFirstName(user?.firstName ?? "");
        setShowSexual(user?.showSexualContent ?? false);
    }, [user]);

    if (!user) {
        return (
            <EmptyPlate
                title="Sign in to change your settings"
                action={<Button onClick={openLogin}>Sign in</Button>}
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="font-display text-title text-content">Settings</h1>
                <p className="mt-2 text-label text-content-muted">
                    {user.username}
                </p>
            </header>

            <Section title="Account" note="how you sign in" icon={UserRound}>
                <Row
                    label="Username"
                    help="Changing this changes your profile's address, so every link anyone has to it."
                >
                    <UsernameRow current={user.username} />
                </Row>
                <Row
                    label="First name"
                    help="Optional. Used to greet you; your username is used when this is empty."
                >
                    <Input
                        value={firstName}
                        maxLength={40}
                        placeholder="Callum"
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={saveFirstName}
                        aria-label="First name"
                    />
                </Row>
                <Row
                    label="Email"
                    help="Managed by your sign-in provider, not here."
                    pending
                >
                    <Input value="" readOnly aria-label="Email" />
                </Row>
                <Row
                    label="Password"
                    help="Password changes go through a reset email."
                    pending
                >
                    <Button variant="secondary" size="sm">
                        Send a reset link
                    </Button>
                </Row>
                <Row
                    label="Time zone"
                    help="Logs are stamped with a date only, so there is no zone to set."
                    pending
                >
                    <Dropdown
                        options={[
                            {
                                value: "Europe/London",
                                label: "Europe/London",
                            },
                        ]}
                        value="Europe/London"
                        onChange={() => {}}
                        aria-label="Time zone"
                    />
                </Row>
            </Section>

            <Section title="Profile" note="what other people see" icon={Eye}>
                <Row
                    label="Display bio"
                    help={`Shown under your name. ${bio.length} of 160 characters. Saves when you click away.`}
                >
                    <Textarea
                        rows={3}
                        value={bio}
                        maxLength={160}
                        placeholder="Mostly RPGs and anything with a grappling hook."
                        onChange={(e) => setBio(e.target.value)}
                        onBlur={saveBio}
                        aria-label="Bio"
                    />
                </Row>
                <Row
                    label="Default platform"
                    help="No stored preference. The log editor remembers nothing yet."
                    pending
                >
                    <Dropdown
                        options={[{ value: "steam", label: "Steam" }]}
                        value="steam"
                        onChange={() => {}}
                        aria-label="Default platform"
                    />
                </Row>
                <Row
                    label="Show presence"
                    help="Presence is always on; there is no column to opt out with."
                    pending
                >
                    <Toggle checked onChange={() => {}} label="Visible" />
                </Row>
                <Row
                    label="Public library"
                    help="Every library is public today. Private shelves need row-level rules first."
                    pending
                >
                    <Toggle checked onChange={() => {}} label="Public" />
                </Row>
            </Section>

            <Section title="Content" note="what you see" icon={SlidersHorizontal}>
                <Row
                    label="Sexual content"
                    help="Off by default. Games RAWG tags as sexually explicit stay out of the library, search and every rail until you turn this on. Violence is not covered by this setting."
                >
                    <Toggle
                        checked={showSexual}
                        onChange={saveSexualContent}
                        label={showSexual ? "Shown" : "Hidden"}
                        disabled={update.isPending}
                    />
                </Row>
                <Row
                    label="Hide logged games"
                    help="Set per visit from the library's own filter."
                    pending
                >
                    <Toggle checked onChange={() => {}} label="On" />
                </Row>
                <Row label="Theme" help="Day or night. Saved to this browser.">
                    <Dropdown
                        options={[
                            { value: "light", label: "Day", icon: Sun },
                            { value: "dark", label: "Night", icon: Moon },
                        ]}
                        value={theme}
                        onChange={(next) =>
                            setTheme(next as "light" | "dark")
                        }
                        aria-label="Theme"
                    />
                </Row>
            </Section>

            <Section title="Notifications" note="none of this is wired yet" icon={Bell}>
                <Row
                    label="Weekly digest"
                    help="There is no mail infrastructure behind this."
                    pending
                >
                    <Toggle checked={false} onChange={() => {}} label="Off" />
                </Row>
                <Row
                    label="Friend requests"
                    help="Requests appear on the Friends page in the meantime."
                    pending
                >
                    <Toggle checked onChange={() => {}} label="On" />
                </Row>
            </Section>

            <Section
                title="Connected platforms"
                note="no provider integrations yet"
                icon={Plug}
            >
                <Row
                    label="Steam"
                    help="Importing a Steam library needs OAuth and a provider we don't have."
                    pending
                >
                    <Button variant="secondary" size="sm">
                        Connect
                    </Button>
                </Row>
            </Section>

            <section className="overflow-hidden rounded-lg border border-danger/40 bg-surface-raised shadow-plate">
                <header className="flex flex-wrap items-center gap-3 border-b border-danger/25 bg-danger-subtle px-5 py-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-danger/15 text-danger">
                        <TriangleAlert size={15} aria-hidden />
                    </span>
                    <h2 className="font-display text-section text-danger">
                        Closing your account
                    </h2>
                    <span className="text-body-sm text-content-muted">
                        this cannot be undone
                    </span>
                </header>
                <div className="flex flex-wrap items-center gap-5 px-5 py-4">
                    <p className="max-w-[60ch] flex-1 text-body-sm text-content-secondary">
                        Your {formatCount(stats?.logCount ?? 0)} logs and
                        everything attached to them will be deleted. This
                        cannot be undone.
                    </p>
                    {/* Export has no backing yet. Left visible and disabled
                        so the page still shows the intended shape. */}
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
            </section>

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
