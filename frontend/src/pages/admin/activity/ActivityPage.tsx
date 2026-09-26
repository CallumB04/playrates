import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { ACTIVITY_GROUP_NAMES, type ActivityGroup } from "@playrates/shared";
import Chip from "../../../components/ui/Chip";
import { useAdminUser } from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import ActivityFeed from "./ActivityFeed";
import { GROUP_TONES } from "./activityPresentation";

const isGroup = (value: string | null): value is ActivityGroup =>
    value !== null && (ACTIVITY_GROUP_NAMES as string[]).includes(value);

/** Filters live in the URL, so a filtered view can be linked to: from a
 *  user's detail, say, or kept as a bookmark. */
const ActivityPage = () => {
    const [params, setParams] = useSearchParams();
    const groupParam = params.get("group");
    const group = isGroup(groupParam) ? groupParam : undefined;
    const userId = params.get("user") ?? undefined;
    const { data: user } = useAdminUser(userId ?? null);

    const update = (next: { group?: ActivityGroup | null; user?: string | null }) => {
        const copy = new URLSearchParams(params);
        for (const [key, value] of Object.entries(next)) {
            if (value) copy.set(key, value);
            else copy.delete(key);
        }
        setParams(copy, { replace: true });
    };

    return (
        <>
            <AdminPageHeader
                title="Activity"
                description="Everything people do, newest first. Tap a row for the detail."
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Chip selected={!group} onClick={() => update({ group: null })}>
                    Everything
                </Chip>
                {ACTIVITY_GROUP_NAMES.map((name) => (
                    <Chip
                        key={name}
                        selected={group === name}
                        dotClassName={GROUP_TONES[name].bar}
                        onClick={() => update({ group: name })}
                    >
                        {GROUP_TONES[name].label}
                    </Chip>
                ))}
                {userId && (
                    <Chip selected onClick={() => update({ user: null })}>
                        Only {user?.username ?? "one person"}
                        <X size={13} aria-label="Clear" />
                    </Chip>
                )}
            </div>

            <ActivityFeed
                filters={{ group, userId }}
                onFilterUser={(id) => update({ user: id })}
            />
        </>
    );
};

export default ActivityPage;
