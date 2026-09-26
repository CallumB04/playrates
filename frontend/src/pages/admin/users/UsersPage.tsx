import { useState } from "react";
import { Search } from "lucide-react";
import type { AdminUserSummary } from "@playrates/shared";
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
import { formatCount, formatDate, relativeTime } from "../../../lib/format";
import AdminPageHeader from "../components/AdminPageHeader";
import UserModal from "./UserModal";

type Sort = "recent" | "joined" | "active";

const PER_PAGE = 25;

const seen = (user: AdminUserSummary) =>
    user.online ? "Online now" : relativeTime(user.lastSeenAt);

const Person = ({ user }: { user: AdminUserSummary }) => (
    <span className="flex min-w-0 items-center gap-3">
        <span className="relative shrink-0">
            <ProfilePicture
                variant="friendRow"
                file={user.avatarUrl ?? ""}
                accent={user.accent}
                username={user.username}
                link={false}
            />
            {user.online && <PresenceDot online />}
        </span>
        <span className="min-w-0">
            <span className="block truncate text-body-sm font-medium text-content">
                {user.username}
            </span>
            <span className="block text-label-sm text-content-muted">
                Joined {formatDate(user.createdAt)}
            </span>
        </span>
    </span>
);

const COUNTS: { key: keyof AdminUserSummary; label: string }[] = [
    { key: "logCount", label: "Logs" },
    { key: "reviewCount", label: "Reviews" },
    { key: "messageCount", label: "Replies" },
    { key: "friendCount", label: "Friends" },
    { key: "activeDayCount", label: "Days active" },
];

const UsersPage = () => {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<Sort>("recent");
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState<string | null>(null);
    const q = useDebouncedValue(query.trim(), 250);

    const { data, isPending, isPlaceholderData } = useAdminUsers({ q: q || undefined, sort, page });
    const pagination = usePagination({
        total: data?.meta.total ?? 0,
        perPage: PER_PAGE,
        page,
        onPageChange: setPage,
    });
    const users = data?.data ?? [];

    return (
        <>
            <AdminPageHeader title="Users" description="Everyone with an account." />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:max-w-xs sm:flex-1">
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
                        placeholder="Find by username"
                        aria-label="Find by username"
                        maxLength={24}
                    />
                </div>
                <SegmentedChoice
                    label="Sort"
                    value={sort}
                    onChange={(value) => {
                        setSort(value);
                        setPage(1);
                    }}
                    segments={[
                        { value: "recent", label: "Last seen" },
                        { value: "joined", label: "Newest" },
                        { value: "active", label: "Most active" },
                    ]}
                />
            </div>

            {isPending ? (
                <TextSkeleton lines={8} />
            ) : users.length === 0 ? (
                <EmptyPlate title="Nobody by that name" />
            ) : (
                <div className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
                    {/* A table from sm up; stacked cards below, where five
                        number columns cannot fit beside a name. */}
                    <div className="hidden overflow-hidden rounded-md border border-subtle sm:block">
                        <table className="w-full text-left text-body-sm">
                            <thead className="bg-surface-sunken text-label-sm text-content-muted">
                                <tr>
                                    <th className="px-3 py-2 font-medium">Person</th>
                                    <th className="px-3 py-2 font-medium">Last seen</th>
                                    {COUNTS.map((c) => (
                                        <th key={c.key} className="px-3 py-2 text-right font-medium">
                                            {c.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="cursor-pointer border-t border-subtle hover:bg-surface-hover"
                                        onClick={() => setOpenId(user.id)}
                                    >
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                className="cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-brand"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenId(user.id);
                                                }}
                                            >
                                                <Person user={user} />
                                            </button>
                                        </td>
                                        <td className="px-3 py-2 text-content-secondary">{seen(user)}</td>
                                        {COUNTS.map((c) => (
                                            <td key={c.key} className="px-3 py-2 text-right font-mono text-content tabular-nums">
                                                {formatCount(user[c.key] as number)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <ul className="flex flex-col gap-2 sm:hidden">
                        {users.map((user) => (
                            <li key={user.id}>
                                <button
                                    type="button"
                                    onClick={() => setOpenId(user.id)}
                                    className="flex w-full cursor-pointer flex-col gap-2 rounded-md border border-subtle bg-surface-raised p-3 text-left"
                                >
                                    <span className="flex items-center justify-between gap-3">
                                        <Person user={user} />
                                        <span className="shrink-0 text-label-sm text-content-muted">
                                            {seen(user)}
                                        </span>
                                    </span>
                                    <span className="flex flex-wrap gap-x-3 gap-y-1 text-label-sm text-content-secondary">
                                        {COUNTS.slice(0, 4).map((c) => (
                                            <span key={c.key}>
                                                <span className="font-mono text-content">
                                                    {formatCount(user[c.key] as number)}
                                                </span>{" "}
                                                {c.label.toLowerCase()}
                                            </span>
                                        ))}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                        <PaginationSummary pagination={pagination} />
                        <Pagination pagination={pagination} />
                    </div>
                </div>
            )}

            {openId && <UserModal userId={openId} onClose={() => setOpenId(null)} />}
        </>
    );
};

export default UsersPage;
