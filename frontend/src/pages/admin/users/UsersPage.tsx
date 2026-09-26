import { useState } from "react";
import { Search } from "lucide-react";
import type { AdminUserSummary } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import { SearchInput } from "../../../components/ui/Input";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import Pagination, { PaginationSummary } from "../../../components/ui/Pagination";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ProfilePicture from "../../../components/ProfilePicture";
import PresenceDot from "../../../components/ui/PresenceDot";
import { usePagination } from "../../../hooks/usePagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useAdminUsers } from "../../../hooks/queries/useAdmin";
import { cn } from "../../../lib/cn";
import { formatCount, formatDate, relativeTime } from "../../../lib/format";
import AdminPageHeader from "../components/AdminPageHeader";
import UserModal from "./UserModal";

type Sort = "recent" | "joined" | "active";

const PER_PAGE = 25;

const COUNTS = [
    { key: "logCount", label: "Logs" },
    { key: "reviewCount", label: "Reviews" },
    { key: "messageCount", label: "Replies" },
    { key: "friendCount", label: "Friends" },
    { key: "activeDayCount", label: "Days here" },
] as const;

/* One grid for the header and every row, so the figures stand in columns
   without a table's chrome. Below sm the figures fold into a sentence. */
const GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_repeat(5,3.75rem)] sm:items-center sm:gap-x-3";

const Row = ({ user, onOpen }: { user: AdminUserSummary; onOpen: () => void }) => (
    <li>
        <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left lift hover:bg-surface-hover",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                GRID
            )}
        >
            <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative shrink-0 [&>*:first-child]:size-9">
                    <ProfilePicture variant="nav" file={user.avatarUrl ?? ""} accent={user.accent} username={user.username} link={false} />
                    {user.online && <PresenceDot online />}
                </span>
                <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                        <span className="truncate text-body-sm font-medium text-content">{user.username}</span>
                        {user.isAdmin && <span className="shrink-0 text-label-sm text-brand">you</span>}
                    </span>
                    <span className="block truncate text-label-sm text-content-muted">
                        Joined {formatDate(user.createdAt)}
                        <span className="sm:hidden">
                            {" · "}
                            <span className="font-mono">{formatCount(user.logCount)}</span> logs ·{" "}
                            <span className="font-mono">{formatCount(user.friendCount)}</span> friends
                        </span>
                    </span>
                </span>
            </span>

            <span className={cn("shrink-0 text-label-sm sm:text-body-sm", user.online ? "text-success" : "text-content-muted sm:text-content-secondary")}>
                {user.online ? "Here now" : relativeTime(user.lastSeenAt)}
            </span>

            {COUNTS.map((c) => (
                <span
                    key={c.key}
                    className={cn(
                        "hidden text-right font-mono text-body-sm sm:block",
                        user[c.key] === 0 ? "text-content-muted" : "text-content"
                    )}
                >
                    {formatCount(user[c.key])}
                </span>
            ))}
        </button>
    </li>
);

const UsersPage = () => {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<Sort>("recent");
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState<string | null>(null);
    const q = useDebouncedValue(query.trim(), 250);

    const { data, isPending, isPlaceholderData } = useAdminUsers({ q: q || undefined, sort, page });
    const pagination = usePagination({ total: data?.meta.total ?? 0, perPage: PER_PAGE, page, onPageChange: setPage });
    const users = data?.data ?? [];

    return (
        <>
            <AdminPageHeader
                title="Users"
                description={
                    data ? (
                        <>
                            <span className="font-mono text-content">{formatCount(data.meta.total)}</span>{" "}
                            {q ? `matching “${q}”` : "accounts"}. Open anyone for what they’ve done.
                        </>
                    ) : (
                        "Everyone with an account."
                    )
                }
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative sm:w-72">
                    <Search
                        size={15}
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
                    />
                    <SearchInput
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Find someone by name"
                        aria-label="Find someone by name"
                        maxLength={24}
                    />
                </div>
                <SegmentedChoice
                    label="Order"
                    value={sort}
                    onChange={(value) => {
                        setSort(value);
                        setPage(1);
                    }}
                    segments={[
                        { value: "recent", label: "Last seen" },
                        { value: "joined", label: "Newest" },
                        { value: "active", label: "Most days" },
                    ]}
                />
            </div>

            {isPending ? (
                <TextSkeleton lines={8} />
            ) : users.length === 0 ? (
                <EmptyPlate title="Nobody by that name" body="Names match anywhere in them, so try fewer letters." />
            ) : (
                <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
                    <div className={cardClass("px-1.5 py-1.5 sm:px-2", { padding: "none" })}>
                        <div
                            aria-hidden
                            className={cn(
                                "hidden border-b border-subtle px-2 pt-1.5 pb-2 text-label-sm text-content-muted",
                                GRID
                            )}
                        >
                            <span>Person</span>
                            <span>Last seen</span>
                            {COUNTS.map((c) => (
                                <span key={c.key} className="text-right">
                                    {c.label}
                                </span>
                            ))}
                        </div>
                        <ul className="flex flex-col pt-1">
                            {users.map((user) => (
                                <Row key={user.id} user={user} onOpen={() => setOpenId(user.id)} />
                            ))}
                        </ul>
                    </div>

                    {pagination.pageCount > 1 && (
                        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                            <PaginationSummary pagination={pagination} className="text-label text-content-muted" />
                            <Pagination pagination={pagination} />
                        </div>
                    )}
                </div>
            )}

            {openId && <UserModal userId={openId} onClose={() => setOpenId(null)} />}
        </>
    );
};

export default UsersPage;
