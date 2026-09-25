import { useState } from "react";
import { Archive, Inbox } from "lucide-react";
import SegmentedChoice from "../ui/SegmentedChoice";
import { TextSkeleton } from "../ui/Skeleton";
import {
    useMarkAllNotificationsRead,
    useNotifications,
} from "../../hooks/queries/useNotifications";
import NotificationItem from "./NotificationItem";

type Tab = "inbox" | "archive";

const TABS = [
    { value: "inbox" as const, label: "Inbox", icon: Inbox },
    { value: "archive" as const, label: "Archive", icon: Archive },
];

const EMPTY: Record<Tab, string> = {
    inbox: "Nothing new. Friend requests and updates land here.",
    archive: "Nothing filed away yet.",
};

/** The list itself, shared by the desktop popover and the mobile sheet. */
const NotificationPanel = ({
    onNavigate,
    titleId,
}: {
    /** Closes whichever shell is around it, when a row links away. */
    onNavigate: () => void;
    titleId: string;
}) => {
    const [tab, setTab] = useState<Tab>("inbox");
    const { data, isLoading } = useNotifications(tab === "archive");
    const markAll = useMarkAllNotificationsRead();

    const notifications = data?.data ?? [];
    const unread = data?.unread ?? 0;

    return (
        <>
            {/* pr-11 clears the sheet's close control below `sm`; the popover
                renders no close button, so it reclaims the space. */}
            <div className="flex items-center justify-between gap-3 pr-11 sm:pr-0">
                <h2
                    id={titleId}
                    className="font-display text-lg font-semibold text-content"
                >
                    Notifications
                </h2>
                {/* Only on the inbox: from the archive it would act on rows
                    that are not on screen. */}
                {tab === "inbox" && unread > 0 && (
                    <button
                        type="button"
                        onClick={() => markAll.mutate()}
                        disabled={markAll.isPending}
                        /* The label stays small; the tap target does not.
                           Padding would push the heading's baseline. */
                        className="relative shrink-0 cursor-pointer rounded-sm text-label text-content-secondary transition-colors before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            <SegmentedChoice
                segments={TABS}
                value={tab}
                onChange={setTab}
                label="Which notifications to show"
                fill
                className="mt-3"
            />

            <div className="mt-3 max-h-[58dvh] overflow-y-auto sm:max-h-[26rem]">
                {isLoading ? (
                    <div className="px-2 py-3">
                        <TextSkeleton lines={4} />
                    </div>
                ) : notifications.length === 0 ? (
                    <p className="px-2 py-8 text-center text-body-sm text-content-muted">
                        {EMPTY[tab]}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-0.5">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
};

export default NotificationPanel;
