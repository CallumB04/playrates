import { useEffect, useState, type ReactNode } from "react";
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
import { Input, Select, Textarea } from "../components/ui/Input";
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
                    <span className="border border-subtle px-1.5 font-mono text-[9px] uppercase tracking-[.14em] text-content-muted">
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

const Section = ({
    title,
    note,
    children,
}: {
    title: string;
    note: string;
    children: ReactNode;
}) => (
    <section className="border border-strong bg-surface-raised shadow-lip">
        <header className="flex flex-wrap items-baseline gap-3 border-b border-strong px-5 py-4">
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

    const [username, setUsername] = useState(user?.username ?? "");
    const [bio, setBio] = useState(user?.bio ?? "");

    useEffect(() => {
        setUsername(user?.username ?? "");
        setBio(user?.bio ?? "");
    }, [user]);

    if (!user) {
        return (
            <EmptyPlate
                eyebrow="Members only"
                title="Sign in to change your settings"
                action={<Button onClick={openLogin}>Sign in</Button>}
            />
        );
    }

    const dirty = username !== user.username || bio !== (user.bio ?? "");

    const save = async () => {
        try {
            await update.mutateAsync({ username, bio });
            notify("Settings saved", "success");
        } catch {
            notify("Couldn't save those changes", "error");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="font-display text-title text-content">Settings</h1>
                <p className="mt-2 font-mono text-label uppercase text-content-muted">
                    {user.username}
                </p>
            </header>

            <Section title="Account" note="how you sign in">
                <Row
                    label="Username"
                    help={`Your profile lives at /user/${username || "…"}`}
                >
                    <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        aria-label="Username"
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
                    <Select aria-label="Time zone">
                        <option>Europe/London</option>
                    </Select>
                </Row>
            </Section>

            <Section title="Profile" note="what other people see">
                <Row
                    label="Display bio"
                    help={`Shown under your name · ${bio.length} / 160`}
                >
                    <Textarea
                        rows={3}
                        value={bio}
                        maxLength={160}
                        onChange={(e) => setBio(e.target.value)}
                        aria-label="Bio"
                    />
                </Row>
                <Row
                    label="Default platform"
                    help="No stored preference — the log editor remembers nothing yet."
                    pending
                >
                    <Select aria-label="Default platform">
                        <option>Steam</option>
                    </Select>
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

            <Section title="Content" note="what you see">
                <Row
                    label="Adult content"
                    help="Set per visit from the catalogue's own filter."
                    pending
                >
                    <Toggle checked={false} onChange={() => {}} label="Hidden" />
                </Row>
                <Row
                    label="Hide logged games"
                    help="Set per visit from the catalogue's own filter."
                    pending
                >
                    <Toggle checked onChange={() => {}} label="On" />
                </Row>
                <Row label="Theme" help="Day, night — saved to this browser.">
                    <Select
                        value={theme}
                        onChange={(e) =>
                            setTheme(e.target.value as "light" | "dark")
                        }
                        aria-label="Theme"
                    >
                        <option value="light">Day</option>
                        <option value="dark">Night</option>
                    </Select>
                </Row>
            </Section>

            <Section title="Notifications" note="none of this is wired yet">
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

            <section className="border border-danger bg-surface-raised shadow-lip">
                <header className="flex flex-wrap items-baseline gap-3 border-b border-strong px-5 py-4">
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

            <div className="flex flex-wrap items-center justify-end gap-3">
                <span
                    className={cn(
                        "mr-auto font-mono text-label uppercase",
                        dirty ? "text-content-muted" : "text-success"
                    )}
                >
                    {dirty ? "Unsaved changes" : "✓ All changes saved"}
                </span>
                <Button
                    variant="secondary"
                    disabled={!dirty || update.isPending}
                    onClick={() => {
                        setUsername(user.username);
                        setBio(user.bio ?? "");
                    }}
                >
                    Discard
                </Button>
                <Button
                    disabled={!dirty || update.isPending}
                    onClick={() => void save()}
                >
                    Save changes
                </Button>
            </div>
        </div>
    );
};

export default SettingsPage;
