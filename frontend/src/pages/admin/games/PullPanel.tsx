import { useState } from "react";
import { DownloadCloud } from "lucide-react";
import {
    PULL_MAX_PAGES,
    PULL_PAGE_SIZE,
    type AdminPullResult,
} from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import Button from "../../../components/ui/Button";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import Toggle from "../../../components/ui/Toggle";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";
import { useNotify } from "../../../contexts/NotificationContext";
import { formatCount } from "../../../lib/format";
import { usePullGames, useRawgUsage } from "../../../hooks/queries/useAdmin";

type Window = 7 | 30 | 90;

const PAGES = Array.from({ length: PULL_MAX_PAGES }, (_, i) => String(i + 1));

/**
 * New releases on demand. Nothing does this on a schedule: otherwise a game
 * only arrives when someone searches for it and the catalogue comes up short.
 */
const PullPanel = () => {
    const [windowDays, setWindowDays] = useState<Window>(30);
    const [includeUpcoming, setIncludeUpcoming] = useState(true);
    const [maxPages, setMaxPages] = useState(1);
    const [confirming, setConfirming] = useState(false);
    const [result, setResult] = useState<AdminPullResult | null>(null);
    const pull = usePullGames();
    const { data: usage } = useRawgUsage();
    const notify = useNotify();

    const left = usage ? usage.allowance - usage.monthRequests : null;

    const run = () =>
        pull.mutate(
            { windowDays, includeUpcoming, maxPages },
            {
                onSuccess: (outcome) => {
                    setResult(outcome);
                    setConfirming(false);
                    notify(`Pulled ${formatCount(outcome.added)} new games`, "success");
                },
                onError: (error) => {
                    setConfirming(false);
                    notify(error.message || "The pull failed", "error");
                },
            }
        );

    return (
        <Panel title="Pull new releases from RAWG">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <span className="text-label text-content-secondary">Released in the last</span>
                    <SegmentedChoice
                        label="Released in the last"
                        value={String(windowDays) as "7" | "30" | "90"}
                        onChange={(v) => setWindowDays(Number(v) as Window)}
                        segments={[
                            { value: "7", label: "7 days" },
                            { value: "30", label: "30 days" },
                            { value: "90", label: "90 days" },
                        ]}
                        fill
                    />
                </div>

                <Toggle
                    checked={includeUpcoming}
                    onChange={setIncludeUpcoming}
                    label="Include upcoming games, up to six months out"
                />

                <div className="flex flex-col gap-1.5">
                    <span className="text-label text-content-secondary">
                        Pages of {PULL_PAGE_SIZE}, most tracked first
                    </span>
                    <SegmentedChoice
                        label="Pages"
                        value={String(maxPages)}
                        onChange={(v) => setMaxPages(Number(v))}
                        segments={PAGES.map((p) => ({ value: p, label: p }))}
                        fill
                    />
                </div>

                <p className="text-body-sm text-content-secondary">
                    Costs up to{" "}
                    <span className="font-mono text-content">{maxPages}</span>{" "}
                    {maxPages === 1 ? "request" : "requests"}
                    {left !== null && <> of the {formatCount(left)} left this month</>}.
                    Descriptions arrive when someone first opens each game.
                </p>

                <Button
                    onClick={() => setConfirming(true)}
                    disabled={pull.isPending}
                    className="w-full sm:w-auto sm:self-start"
                >
                    <DownloadCloud size={16} aria-hidden />
                    Pull from RAWG
                </Button>

                {result && (
                    <p className="rounded-md bg-surface-sunken px-3 py-2 text-body-sm text-content-secondary">
                        Last pull: {formatCount(result.fetched)} fetched over{" "}
                        {result.pages} {result.pages === 1 ? "page" : "pages"},{" "}
                        <span className="font-medium text-content">
                            {formatCount(result.added)} new
                        </span>
                        , {formatCount(result.updated)} refreshed.
                        {result.hasMore && " RAWG had more past the page cap."}
                    </p>
                )}
            </div>

            {confirming && (
                <ConfirmPopup
                    title="Pull from RAWG?"
                    body={`Up to ${maxPages} ${maxPages === 1 ? "request" : "requests"} for games released in the last ${windowDays} days${includeUpcoming ? ", and upcoming ones" : ""}.`}
                    confirmLabel="Pull"
                    tone="neutral"
                    isPending={pull.isPending}
                    onConfirm={run}
                    onClose={() => setConfirming(false)}
                />
            )}
        </Panel>
    );
};

export default PullPanel;
