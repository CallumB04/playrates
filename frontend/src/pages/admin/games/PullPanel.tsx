import { useState } from "react";
import { PULL_MAX_PAGES, PULL_PAGE_SIZE, type AdminPullResult } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import Toggle from "../../../components/ui/Toggle";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";
import { useNotify } from "../../../contexts/NotificationContext";
import { formatCount } from "../../../lib/format";
import { usePullGames, useRawgUsage } from "../../../hooks/queries/useAdmin";

type Window = "7" | "30" | "90";

const PAGES = Array.from({ length: PULL_MAX_PAGES }, (_, i) => String(i + 1));

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-2 border-b border-subtle py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <span className="text-body-sm text-content-secondary">{label}</span>
        {children}
    </div>
);

/**
 * New releases on demand. Nothing does this on a schedule: otherwise a game
 * only arrives when someone searches for it and the catalogue comes up short.
 */
const PullPanel = () => {
    const [windowDays, setWindowDays] = useState<Window>("30");
    const [includeUpcoming, setIncludeUpcoming] = useState(true);
    const [maxPages, setMaxPages] = useState("1");
    const [confirming, setConfirming] = useState(false);
    const [result, setResult] = useState<AdminPullResult | null>(null);
    const pull = usePullGames();
    const { data: usage } = useRawgUsage();
    const notify = useNotify();

    const pages = Number(maxPages);
    const left = usage ? usage.allowance - usage.monthRequests : null;

    const run = () =>
        pull.mutate(
            { windowDays: Number(windowDays) as 7 | 30 | 90, includeUpcoming, maxPages: pages },
            {
                onSuccess: (outcome) => {
                    setResult(outcome);
                    setConfirming(false);
                    notify(
                        outcome.added === 0
                            ? "Nothing new: every game was already here"
                            : `${formatCount(outcome.added)} new ${outcome.added === 1 ? "game" : "games"} in the catalogue`,
                        "success"
                    );
                },
                onError: (error) => {
                    setConfirming(false);
                    notify(error.message || "The pull failed", "error");
                },
            }
        );

    return (
        <section aria-labelledby="pull-heading" className={cardClass("flex flex-col")}>
            <h2 id="pull-heading" className="text-label text-content-muted">
                Bring in new releases
            </h2>
            <p className="mt-2 max-w-[48ch] text-body-sm text-content-secondary">
                Asks RAWG for games released lately, most tracked first. Anything already
                here is refreshed rather than doubled.
            </p>

            <div className="mt-2">
                <Row label="Released in the last">
                    <SegmentedChoice
                        label="Released in the last"
                        value={windowDays}
                        onChange={setWindowDays}
                        segments={[
                            { value: "7", label: "Week" },
                            { value: "30", label: "Month" },
                            { value: "90", label: "3 months" },
                        ]}
                    />
                </Row>
                <Row label={`Pages of ${PULL_PAGE_SIZE}`}>
                    <SegmentedChoice
                        label={`Pages of ${PULL_PAGE_SIZE}`}
                        value={maxPages}
                        onChange={setMaxPages}
                        segments={PAGES.map((p) => ({ value: p, label: p }))}
                    />
                </Row>
                <div className="border-b border-subtle py-3.5">
                    <Toggle
                        checked={includeUpcoming}
                        onChange={setIncludeUpcoming}
                        label="Include games coming in the next six months"
                    />
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-label text-content-muted">
                    Up to <span className="font-mono text-content">{pages}</span>{" "}
                    {pages === 1 ? "request" : "requests"}
                    {left !== null && (
                        <>
                            {" "}
                            of the <span className="font-mono">{formatCount(left)}</span> left
                        </>
                    )}
                </p>
                <Button onClick={() => setConfirming(true)} disabled={pull.isPending} className="w-full sm:w-auto">
                    {pull.isPending ? "Asking RAWG…" : "Pull from RAWG"}
                </Button>
            </div>

            {result && (
                <p className="mt-4 border-t border-subtle pt-3 text-body-sm text-content-secondary">
                    Last pull brought back <span className="font-mono text-content">{formatCount(result.fetched)}</span>:{" "}
                    <span className="font-mono text-content">{formatCount(result.added)}</span> new,{" "}
                    <span className="font-mono">{formatCount(result.updated)}</span> refreshed
                    {result.hasMore ? ". RAWG has more past the page cap." : "."}
                </p>
            )}

            {confirming && (
                <ConfirmPopup
                    title="Pull from RAWG?"
                    body={`Up to ${pages} ${pages === 1 ? "request" : "requests"} for games released in the last ${windowDays} days${includeUpcoming ? ", and those still to come" : ""}.`}
                    confirmLabel="Pull"
                    tone="neutral"
                    isPending={pull.isPending}
                    onConfirm={run}
                    onClose={() => setConfirming(false)}
                />
            )}
        </section>
    );
};

export default PullPanel;
