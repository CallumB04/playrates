/** What the toast says was cleared, on one line: the row's own first line
 *  cut short, so it's clear which one went. */
const ClearedLine = ({ what }: { what: string }) => (
    <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="shrink-0">Cleared</span>
        <span className="min-w-0 truncate text-content-secondary">{what}</span>
    </span>
);

export default ClearedLine;
