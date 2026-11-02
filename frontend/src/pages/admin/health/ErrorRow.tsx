import { useState } from "react";
import { AppWindow } from "lucide-react";
import type { ClientErrorEntry, ServerErrorEntry } from "@playrates/shared";
import { cardClass } from "../../../components/ui/cardClass";
import { plateClass } from "../../../components/ui/plateClass";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";

export type ErrorEntry = ServerErrorEntry | ClientErrorEntry;

export const ErrorRow = ({ entry }: { entry: ErrorEntry }) => {
    const [open, setOpen] = useState(false);
    const server = "status" in entry;
    return (
        <li>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 text-left lift hover:bg-surface-hover",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    open && "bg-surface-hover"
                )}
            >
                <span className="w-9 shrink-0 pt-px font-mono text-body-sm font-semibold text-danger">
                    {server ? (
                        entry.status
                    ) : (
                        <AppWindow size={16} aria-label="In the browser" />
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-label text-content">
                        {server ? `${entry.method} ${entry.path}` : entry.path}
                    </span>
                    <span className="mt-1 block text-label-sm break-words text-content-muted">
                        {entry.message} · {relativeTime(entry.createdAt)}
                    </span>
                </span>
            </button>
            {open && (
                <div className="pb-2 pl-2 sm:pl-14">
                    <div
                        className={plateClass(
                            "pressed",
                            "shallow",
                            "flex flex-col gap-2 px-3.5 py-3 text-body-sm"
                        )}
                    >
                        <p className="text-label text-content-muted">
                            {new Date(entry.createdAt).toLocaleString("en-GB", {
                                dateStyle: "medium",
                                timeStyle: "medium",
                            })}
                            {server && entry.requestId && (
                                <>
                                    {" "}
                                    · request{" "}
                                    <span className="font-mono">
                                        {entry.requestId}
                                    </span>
                                </>
                            )}
                            {!server && entry.build && (
                                <>
                                    {" "}
                                    · build{" "}
                                    <span className="font-mono">
                                        {entry.build}
                                    </span>
                                </>
                            )}
                            {entry.username && (
                                <> · signed in as {entry.username}</>
                            )}
                        </p>
                        {!server && entry.userAgent && (
                            <p className="font-mono text-label-sm break-words text-content-muted">
                                {entry.userAgent}
                            </p>
                        )}
                        {entry.stack ? (
                            <pre className="max-h-72 overflow-auto font-mono text-label-sm leading-relaxed whitespace-pre text-content-secondary">
                                {entry.stack}
                            </pre>
                        ) : (
                            <p className="text-content-muted">
                                No stack came with it.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
};

export const ErrorList = ({ entries }: { entries: ErrorEntry[] }) => (
    <ul
        className={cardClass("flex flex-col px-1.5 py-1.5 sm:px-2", {
            padding: "none",
        })}
    >
        {entries.map((entry) => (
            <ErrorRow key={entry.id} entry={entry} />
        ))}
    </ul>
);
