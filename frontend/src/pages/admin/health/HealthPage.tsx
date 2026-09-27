import type { AdminHealth } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import { cardClass } from "../../../components/ui/Card";
import EmptyPlate, { EmptyNote } from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { cn } from "../../../lib/cn";
import { relativeTime } from "../../../lib/format";
import {
    useAdminHealth,
    useServerErrors,
} from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import SectionHeader from "../components/SectionHeader";
import ShowOlder from "../components/ShowOlder";
import { SeeAllButton, SeeAllModal } from "../components/SeeAll";
import { useSeeAll } from "../components/useSeeAll";
import { headline, systemStates, type SystemState } from "./healthState";
import HealthSystems from "./HealthSystems";
import { ErrorList } from "./ErrorRow";

const AllErrors = () => {
    const errors = useServerErrors();
    const entries = errors.data?.pages.flatMap((p) => p.data) ?? [];
    return (
        <>
            <ErrorList entries={entries} />
            <ShowOlder
                hasMore={errors.hasNextPage}
                loading={errors.isFetchingNextPage}
                onClick={() => errors.fetchNextPage()}
                end="That’s every error there has been."
            />
        </>
    );
};

/** The last three failed requests; the rest behind a popup. */
const Errors = () => {
    const errors = useServerErrors();
    const entries = (errors.data?.pages[0]?.data ?? []).slice(0, 3);
    const all = useSeeAll();
    return (
        <section>
            <SectionHeader
                title="Failed requests"
                trailing={
                    entries.length > 0 && <SeeAllButton onClick={all.show} />
                }
            />
            {errors.isPending ? (
                <TextSkeleton lines={3} />
            ) : entries.length === 0 ? (
                <EmptyNote>
                    None. Every request the API fails is kept here, with its
                    stack.
                </EmptyNote>
            ) : (
                <ErrorList entries={entries} />
            )}
            {all.open && (
                <SeeAllModal title="Failed requests" onClose={all.hide} wide>
                    <AllErrors />
                </SeeAllModal>
            )}
        </section>
    );
};

const GLOW: Record<SystemState, string> = {
    up: "bg-success/10",
    slow: "bg-warning/12",
    down: "bg-danger/14",
};

/**
 * Checked live when opened, and every minute after. There's no history of it:
 * a site checking itself stops when the site does, so that needs a monitor
 * somewhere else.
 */
const HealthPage = () => {
    const health = useAdminHealth();
    const h = health.data;

    const body = (health: AdminHealth, checkedAt: number) => {
        const states = systemStates(health);
        const lead = headline(states, health.errors.last24h);
        return (
            <section
                aria-label="Right now"
                className={cardClass("relative overflow-hidden", {
                    padding: "none",
                })}
            >
                <span
                    aria-hidden
                    className={cn(
                        "pointer-events-none absolute -top-32 -right-28 size-80 rounded-full blur-3xl",
                        GLOW[lead.state]
                    )}
                />
                <div className="relative px-5 pt-6 sm:px-6 sm:pt-7 lg:px-8">
                    <h2 className="text-label text-content-muted">Right now</h2>
                    <p className="mt-3 max-w-[24ch] font-display text-title text-content">
                        {lead.text}
                    </p>
                    <p className="mt-3 text-label text-content-muted">
                        Checked{" "}
                        {relativeTime(new Date(checkedAt).toISOString())}
                    </p>
                </div>
                <div className="relative mt-5 border-t border-subtle px-5 sm:px-6 lg:px-8">
                    <HealthSystems health={health} />
                </div>
            </section>
        );
    };

    return (
        <>
            <AdminPageHeader
                title="Health"
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => health.refetch()}
                        disabled={health.isFetching}
                        className="w-full sm:w-auto"
                    >
                        {health.isFetching ? "Checking…" : "Check again"}
                    </Button>
                }
            />

            <div className="flex flex-col gap-10">
                {health.isPending ? (
                    <div className={cardClass()}>
                        <TextSkeleton lines={5} />
                    </div>
                ) : health.isError || !h ? (
                    <EmptyPlate
                        title="The API isn’t answering"
                        body="If the rest of the site is down too, it’s the host. This page can’t say more without the API."
                    />
                ) : (
                    body(h, health.dataUpdatedAt)
                )}

                <Errors />
            </div>
        </>
    );
};

export default HealthPage;
