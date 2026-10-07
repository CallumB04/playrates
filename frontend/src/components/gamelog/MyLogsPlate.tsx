import { Plus } from "lucide-react";
import type { LogWithReview, GameLogRollup } from "@playrates/shared";
import { plateClass } from "../ui/Plate";
import Button from "../ui/Button";
import LogRow from "./LogRow";
import RollupFigures from "./RollupFigures";

interface MyLogsPlateProps {
    logs: LogWithReview[];
    rollup: GameLogRollup;
    /** Whether a console is left to log it on. */
    canAdd: boolean;
    onEdit: (logId: number) => void;
    onAdd: () => void;
    onView: () => void;
}

/**
 * A game logged on more than one console: the totals across them first,
 * since that is what a second log is for, then a row per console to open.
 */
const MyLogsPlate = ({
    logs,
    rollup,
    canAdd,
    onEdit,
    onAdd,
    onView,
}: MyLogsPlateProps) => (
    <section
        aria-labelledby="my-logs-title"
        className={plateClass("raised", "shallow", "flex flex-col gap-4 p-4")}
    >
        <header className="flex items-baseline justify-between gap-3">
            <h2 id="my-logs-title" className="text-label text-content">
                Your logs
            </h2>
            <span className="text-label-sm text-content-muted">
                {logs.length} platforms
            </span>
        </header>

        {/* Two columns in the cover's own column on a wide screen: four
            figures across 300px don't fit their labels. */}
        <RollupFigures
            rollup={rollup}
            whose="Your"
            columns="grid-cols-2 sm:grid-cols-4 lg:grid-cols-2"
        />

        <div className="-mx-2 flex flex-col border-t border-subtle pt-2">
            {logs.map((log) => (
                <LogRow
                    key={log.id}
                    log={log}
                    onSelect={() => onEdit(log.id)}
                    className="px-2"
                />
            ))}
            {canAdd && (
                <button
                    type="button"
                    onClick={onAdd}
                    className="mx-2 mt-1 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-strong text-label text-content-secondary lift hover:border-brand hover:text-content"
                >
                    <Plus size={15} aria-hidden />
                    Add a platform
                </button>
            )}
        </div>

        <Button variant="secondary" onClick={onView} className="w-full">
            View your logs
        </Button>
    </section>
);

export default MyLogsPlate;
