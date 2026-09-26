import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { ACTIVITY_GROUP_NAMES, type ActivityGroup } from "@playrates/shared";
import Chip from "../../../components/ui/Chip";
import { useAdminUser } from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import ActivityFeed from "./ActivityFeed";
import { GROUP_LABELS } from "./activityPresentation";

const isGroup = (value: string | null): value is ActivityGroup =>
    value !== null && (ACTIVITY_GROUP_NAMES as string[]).includes(value);

/** Filters live in the URL, so a narrowed view can be linked to: from a
 *  person's detail, or kept as a bookmark. */
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
                description="Everything anyone does here, newest first. Open a line for the detail behind it."
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Chip selected={!group} onClick={() => update({ group: null })}>
                    Everything
                </Chip>
                {ACTIVITY_GROUP_NAMES.map((name) => (
                    <Chip key={name} selected={group === name} onClick={() => update({ group: name })}>
                        {GROUP_LABELS[name]}
                    </Chip>
                ))}
                {userId && (
                    <button
                        type="button"
                        onClick={() => update({ user: null })}
                        className="relative ml-1 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-label text-content-secondary hover:text-content sm:min-h-0"
                    >
                        Only {user?.username ?? "one person"}
                        <X size={13} aria-label="clear" />
                    </button>
                )}
            </div>

            <ActivityFeed filters={{ group, userId }} onFilterUser={(id) => update({ user: id })} />
        </>
    );
};

export default ActivityPage;
