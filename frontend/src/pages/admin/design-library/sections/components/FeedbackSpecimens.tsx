import { useState } from "react";
import type { AppNotification, FriendUser } from "@playrates/shared";
import {
    useNotify,
    type NotificationSeverity,
    type NotificationType,
} from "../../../../../contexts/NotificationContext";
import {
    DWELL_MS,
    MAX_VISIBLE,
} from "../../../../../contexts/notificationQueue";
import Skeleton, {
    TextSkeleton,
    TileSkeleton,
} from "../../../../../components/ui/Skeleton";
import EmptyPlate, {
    EmptyNote,
    GhostTile,
} from "../../../../../components/ui/EmptyPlate";
import Progress from "../../../../../components/ui/Progress";
import { STATUS_PRESENTATION } from "../../../../../constants/gameStatus";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
import Button from "../../../../../components/ui/Button";
import NotificationItem from "../../../../../components/notifications/NotificationItem";
import WelcomePopup from "../../../../../components/onboarding/WelcomePopup";
import { useAuth } from "../../../../../contexts/AuthContext";
import Specimen from "../../../components/Specimen";

interface ToastSpecimen {
    label: string;
    text: string;
    type: NotificationType;
    severity?: NotificationSeverity;
}

const TOASTS: ToastSpecimen[] = [
    {
        label: "Success",
        text: "Lanternfall added to your shelf",
        type: "success",
    },
    { label: "Info", text: "Import paused at 42 of 318", type: "info" },
    { label: "Error", text: "Couldn't reach Steam", type: "error" },
    {
        label: "Critical error",
        text: "Entry saved, but your note didn't send",
        type: "error",
        severity: "critical",
    },
];

const HOUR = 60 * 60 * 1000;
const ago = (hours: number) =>
    new Date(Date.now() - hours * HOUR).toISOString();

const actor = (username: string, accent: FriendUser["accent"]): FriendUser => ({
    id: `demo-${username}`,
    username,
    avatarUrl: null,
    accent,
    bio: "",
    online: true,
});

/* One of every kind the registry draws, in each state that changes what the
   row says. The ids are made up, so the row controls reach the API and change
   nothing. */
const NOTIFICATIONS: AppNotification[] = [
    {
        id: -1,
        kind: "friend_request",
        actor: actor("marlowe", "amber"),
        relation: "request-received",
        createdAt: ago(0.2),
        readAt: null,
        archivedAt: null,
    },
    {
        id: -2,
        kind: "friend_accepted",
        actor: actor("tessellate", "teal"),
        createdAt: ago(3),
        readAt: null,
        archivedAt: null,
    },
    {
        id: -3,
        kind: "friend_request",
        actor: actor("halcyon", "rose"),
        relation: "friend",
        createdAt: ago(30),
        readAt: ago(29),
        archivedAt: null,
    },
    {
        id: -4,
        kind: "welcome",
        createdAt: ago(80),
        readAt: ago(79),
        archivedAt: null,
    },
    {
        id: -5,
        kind: "unknown",
        createdAt: ago(200),
        readAt: ago(199),
        archivedAt: null,
    },
];

/** Stands in for the viewer when the library is opened signed out. */
const STAND_IN = {
    username: "newplayer",
    firstName: null,
    avatarUrl: null,
    accent: "indigo" as const,
};

const FeedbackSpecimens = () => {
    const notify = useNotify();
    const { user } = useAuth();
    const [welcomeOpen, setWelcomeOpen] = useState(false);

    return (
        <>
            <Specimen
                title="Toasts"
                notes={`The same plate as every other surface — no coloured edge. The icon carries the status, and the line along the bottom carries the dwell: ${DWELL_MS.low! / 1000}s for a success, ${DWELL_MS.high! / 1000}s for an error. A critical one holds its line full, because nothing takes it away but the X. At most ${MAX_VISIBLE} stand at once; a fourth collapses the oldest out from under them.`}
                meta="ToastStack · notify(text, type, severity)"
            >
                {TOASTS.map((toast) => (
                    <Button
                        key={toast.label}
                        variant="secondary"
                        onClick={() =>
                            notify(toast.text, toast.type, toast.severity)
                        }
                    >
                        {toast.label}
                    </Button>
                ))}
            </Specimen>

            <Specimen
                title="Loading and progress"
                stack
                notes="One bar for everything measured against a whole. A value is a filled track — achievements earned, a rating out of ten, hours against the longest of two. Segments split the track into parts, for a shelf by status or a played share by how those plays ended; that reads as an image of proportions, not as progress. With no value it sweeps, for a task with no known end, like an import from Steam — and holds still under reduced motion. The spinner is for a wait too short for a bar."
                meta='Progress value · segments · label · size="sm" | "md" | "lg" · fillClassName — LoadingSpinner size="xs" | "sm" | "md" | "lg" · label (null beside text that says so)'
            >
                <div className="flex w-full max-w-md flex-col gap-3">
                    <Progress
                        value={46 / 52}
                        label="Achievements earned"
                        size="lg"
                    />
                    <Progress
                        value={0.825}
                        label="Rating out of 10"
                        size="sm"
                    />
                    <Progress
                        value={0.6}
                        label="Time to beat"
                        fillClassName="bg-strong"
                    />
                    <Progress
                        label="Shelf by status"
                        size="lg"
                        segments={(
                            [
                                ["played", 0.5],
                                ["playing", 0.2],
                                ["backlog", 0.2],
                                ["wishlist", 0.1],
                            ] as const
                        ).map(([status, value]) => ({
                            key: status,
                            value,
                            className: STATUS_PRESENTATION[status].accent,
                            title: STATUS_PRESENTATION[status].label,
                        }))}
                    />
                    <Progress label="Importing your Steam library" />
                </div>
                <div className="flex items-end gap-4">
                    <LoadingSpinner size="xs" />
                    <LoadingSpinner size="sm" />
                    <LoadingSpinner size="md" />
                    <LoadingSpinner size="lg" />
                    <span className="flex items-center gap-2 text-body-sm text-content-muted">
                        <LoadingSpinner size="xs" label={null} />
                        Searching…
                    </span>
                </div>
            </Specimen>

            <Specimen
                title="Skeletons"
                notes="A quiet placeholder, not a shimmer. Aria-hidden throughout: the region that owns them carries the live status."
                meta="Skeleton · TileSkeleton · TextSkeleton lines"
            >
                <div className="w-28">
                    <TileSkeleton />
                </div>
                <div className="w-64">
                    <TextSkeleton lines={3} />
                </div>
                <Skeleton className="h-11 w-32" />
            </Specimen>

            <Specimen
                title="Empty states"
                stack
                notes="Two dashed slots beside one real cover — the shelf shows you what it will look like once it has something in it. The charm comes from the writing, not from an illustration."
                meta="EmptyPlate title · body · action · GhostTile · EmptyNote, for a one-sentence empty feed"
            >
                <EmptyPlate
                    title="Your shelf is empty"
                    body="Log the last game you finished — even if that was years ago. The shelf is more useful when it's honest than when it's current."
                    action={<Button>Log a game</Button>}
                    className="w-full"
                />
                <div className="grid w-full max-w-md grid-cols-3 gap-4">
                    <div className="aspect-3/4 bg-surface-media shadow-cover" />
                    <GhostTile />
                    <GhostTile />
                </div>
                <EmptyNote className="w-full max-w-md">
                    No activity yet. Logs from your friends appear here.
                </EmptyNote>
            </Specimen>

            <Specimen
                title="Notifications"
                notes="Every kind shares one shell — its mark, the time, an unread rule, and read and archive controls that stand rather than appear on hover, since a phone can't hover. What the row says comes from the renderer registered against its kind, and the registry will not compile with a kind missing. A friend request reads its relation live, so answered here or on a profile, the buttons go. A kind this build doesn't know draws the plain row at the bottom rather than failing."
                meta="NotificationItem notification · onNavigate — NOTIFICATION_RENDERERS[kind]: icon · tone · Content · Leading"
            >
                <ul className="flex w-full max-w-sm flex-col gap-0.5 rounded-lg border border-subtle bg-surface-raised p-3 shadow-modal">
                    {NOTIFICATIONS.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onNavigate={() => {}}
                        />
                    ))}
                </ul>
            </Specimen>

            <Specimen
                title="Welcome popup"
                notes="Shown once, on a new account's first sign-in: a first name and a picture, both optional, and one line pointing to Settings for the rest. Save saves and closes; there is nothing after it. It waits for the signup sheet to close, so the two never stack. Any way out marks it seen — skipping included. The preview walks the real popup against your own account and saves nothing."
                meta="profile · preview · onClose — FirstLoginWelcome gates it on owesWelcome(user, accountFormOpen)"
            >
                <Button onClick={() => setWelcomeOpen(true)}>
                    Preview the welcome
                </Button>
                {welcomeOpen && (
                    <WelcomePopup
                        profile={user ?? STAND_IN}
                        preview
                        onClose={() => setWelcomeOpen(false)}
                    />
                )}
            </Specimen>
        </>
    );
};

export default FeedbackSpecimens;
