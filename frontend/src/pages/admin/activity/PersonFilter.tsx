import { useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import ProfilePicture from "../../../components/ProfilePicture";
import { useDismiss } from "../../../hooks/useDismiss";
import { useAdminUsers } from "../../../hooks/queries/useAdmin";
import { popoverClass } from "../../../components/ui/popover";
import { cn } from "../../../lib/cn";

/** Finds someone by name to narrow the log to. Two letters before it asks. */
const PersonFilter = ({ onPick }: { onPick: (userId: string) => void }) => {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const listId = useId();
    const wrap = useRef<HTMLDivElement>(null);
    useDismiss([wrap], () => setOpen(false), { enabled: open, escape: true });

    const term = q.trim();
    const { data, isFetching } = useAdminUsers(
        { q: term, sort: "recent" },
        term.length >= 2
    );
    const people = term.length >= 2 ? (data?.data ?? []).slice(0, 6) : [];

    return (
        <div ref={wrap} className="relative w-full sm:w-64">
            <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
            />
            <input
                type="search"
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Find a person"
                aria-label="Find a person to show only their activity"
                aria-controls={listId}
                aria-expanded={open && people.length > 0}
                className="min-h-11 w-full rounded-md border border-subtle bg-surface-raised pr-3 pl-9 text-body-sm text-content placeholder:text-content-muted focus:border-strong focus:outline-none sm:min-h-9"
            />
            {open && term.length >= 2 && (
                <ul
                    id={listId}
                    className={popoverClass(
                        "absolute top-[calc(100%+0.35rem)] left-0 z-30 w-full p-1"
                    )}
                >
                    {people.length === 0 ? (
                        <li className="px-3 py-2.5 text-label text-content-muted">
                            {isFetching ? "Looking…" : "Nobody by that name"}
                        </li>
                    ) : (
                        people.map((p) => (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onPick(p.id);
                                        setQ("");
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2 text-left text-body-sm text-content hover:bg-surface-hover sm:min-h-9",
                                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                                    )}
                                >
                                    <span className="shrink-0 [&>*]:size-6">
                                        <ProfilePicture
                                            variant="nav"
                                            file={p.avatarUrl ?? ""}
                                            accent={p.accent}
                                            username={p.username}
                                            link={false}
                                        />
                                    </span>
                                    {p.username}
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export default PersonFilter;
