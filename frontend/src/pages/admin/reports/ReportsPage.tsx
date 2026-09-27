import { useState } from "react";
import { Link } from "react-router-dom";
import {
    REPORT_REASON_LABELS,
    type AdminReport,
    type ReportStatus,
} from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import Pagination, {
    PaginationSummary,
} from "../../../components/ui/Pagination";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";
import { usePagination } from "../../../hooks/usePagination";
import {
    useAdminReports,
    useResolveReport,
} from "../../../hooks/queries/useAdmin";
import { useNotify } from "../../../contexts/NotificationContext";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";
import AdminPageHeader from "../components/AdminPageHeader";

const PER_PAGE = 25;

const TARGET_NOUNS: Record<AdminReport["targetType"], string> = {
    thread: "Thread",
    message: "Message",
    review: "Review",
    profile: "Profile",
};

/** What taking it down does, said on the button that does it. */
const REMOVE_LABELS: Record<AdminReport["targetType"], string> = {
    thread: "Delete thread",
    message: "Delete message",
    review: "Delete review",
    profile: "Clear bio and picture",
};

const ReportRow = ({
    report,
    onRemove,
    onDismiss,
    onResolve,
    busy,
}: {
    report: AdminReport;
    onRemove: () => void;
    onDismiss: () => void;
    onResolve: () => void;
    busy: boolean;
}) => (
    <li className="flex flex-col gap-3 border-b border-subtle px-3 py-4 last:border-b-0 sm:px-4">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-label text-content-muted">
            <span className="font-medium text-content">
                {REPORT_REASON_LABELS[report.reason]}
            </span>
            <span aria-hidden>·</span>
            <span>{TARGET_NOUNS[report.targetType]}</span>
            <span aria-hidden>·</span>
            <span>
                {report.reporter
                    ? `from ${report.reporter.username}`
                    : "from a deleted account"}
            </span>
            <span aria-hidden>·</span>
            <span>{relativeTime(report.createdAt)}</span>
            {report.otherReports > 0 && (
                <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-label-sm text-warning-content">
                    {report.otherReports} more open
                </span>
            )}
        </div>

        {report.target ? (
            <Link
                to={report.target.href}
                className="block rounded-sm border border-subtle bg-surface-sunken px-3 py-2.5 text-body-sm text-content-secondary hover:border-strong hover:text-content"
            >
                {report.target.author && (
                    <span className="mr-1.5 font-semibold text-content">
                        {report.target.author}
                    </span>
                )}
                <span className="break-words">
                    {report.target.label || "(nothing but pictures)"}
                </span>
            </Link>
        ) : (
            <p className="rounded-sm border border-dashed border-strong px-3 py-2.5 text-body-sm text-content-muted italic">
                Already gone.
            </p>
        )}

        {report.details && (
            <p className="max-w-[70ch] text-body-sm break-words text-content">
                &ldquo;{report.details}&rdquo;
            </p>
        )}

        {report.status === "open" && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {report.target && (
                    <Button
                        variant="danger"
                        onClick={onRemove}
                        disabled={busy}
                        className="w-full sm:w-auto"
                    >
                        {REMOVE_LABELS[report.targetType]}
                    </Button>
                )}
                <Button
                    variant="secondary"
                    onClick={onResolve}
                    disabled={busy}
                    className="w-full sm:w-auto"
                >
                    Mark handled
                </Button>
                <Button
                    variant="ghost"
                    onClick={onDismiss}
                    disabled={busy}
                    className="w-full sm:w-auto"
                >
                    Dismiss
                </Button>
            </div>
        )}
    </li>
);

const ReportsPage = () => {
    const [status, setStatus] = useState<ReportStatus>("open");
    const [page, setPage] = useState(1);
    const [removing, setRemoving] = useState<AdminReport | null>(null);
    const notify = useNotify();
    const { data, isPending, isPlaceholderData } = useAdminReports(
        status,
        page
    );
    const resolve = useResolveReport();
    const pagination = usePagination({
        total: data?.meta.total ?? 0,
        perPage: PER_PAGE,
        page,
        onPageChange: setPage,
    });
    const reports = data?.data ?? [];

    const act = async (
        report: AdminReport,
        input: Parameters<typeof resolve.mutateAsync>[0]["input"],
        done: string
    ) => {
        try {
            await resolve.mutateAsync({ id: report.id, input });
            notify(done, "success");
        } catch (error) {
            notify(
                error instanceof Error ? error.message : "That didn't work",
                "error"
            );
        }
    };

    return (
        <>
            <AdminPageHeader
                title="Reports"
                description="What people have flagged. Deleting the post closes every report about it."
                actions={
                    <SegmentedChoice
                        label="Show"
                        value={status}
                        onChange={(value) => {
                            setStatus(value);
                            setPage(1);
                        }}
                        segments={[
                            { value: "open", label: "Open" },
                            { value: "resolved", label: "Handled" },
                            { value: "dismissed", label: "Dismissed" },
                        ]}
                    />
                }
            />

            {isPending ? (
                <TextSkeleton lines={6} />
            ) : reports.length === 0 ? (
                <EmptyPlate
                    title={
                        status === "open" ? "Nothing to look at" : "None yet"
                    }
                    body={
                        status === "open"
                            ? "No one has reported anything that is still waiting."
                            : undefined
                    }
                />
            ) : (
                <div
                    className={cn(
                        "transition-opacity",
                        isPlaceholderData && "opacity-60"
                    )}
                >
                    <ul className={cardClass("", { padding: "none" })}>
                        {reports.map((report) => (
                            <ReportRow
                                key={report.id}
                                report={report}
                                busy={resolve.isPending}
                                onRemove={() => setRemoving(report)}
                                onResolve={() =>
                                    void act(
                                        report,
                                        {
                                            status: "resolved",
                                            removeContent: false,
                                        },
                                        "Marked as handled"
                                    )
                                }
                                onDismiss={() =>
                                    void act(
                                        report,
                                        {
                                            status: "dismissed",
                                            removeContent: false,
                                        },
                                        "Report dismissed"
                                    )
                                }
                            />
                        ))}
                    </ul>

                    {pagination.pageCount > 1 && (
                        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                            <PaginationSummary
                                pagination={pagination}
                                className="text-label text-content-muted"
                            />
                            <Pagination pagination={pagination} />
                        </div>
                    )}
                </div>
            )}

            {removing && (
                <ConfirmPopup
                    title={`${REMOVE_LABELS[removing.targetType]}?`}
                    body={
                        removing.targetType === "profile"
                            ? "Their bio is emptied and their picture removed. The account stays."
                            : "It goes for everyone, and every open report about it is closed."
                    }
                    confirmLabel={REMOVE_LABELS[removing.targetType]}
                    isPending={resolve.isPending}
                    onConfirm={() =>
                        void act(
                            removing,
                            { status: "resolved", removeContent: true },
                            "Removed"
                        ).then(() => setRemoving(null))
                    }
                    onClose={() => setRemoving(null)}
                />
            )}
        </>
    );
};

export default ReportsPage;
