import type {
    AdminCohorts,
    AdminCohortWeek,
    AdminReturn,
} from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useAdminCohorts } from "../../../hooks/queries/useAdmin";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import { bucketLabel, share, shareLevel } from "../lib/adminFormat";
import SectionHeader from "../components/SectionHeader";

const SHADE = [
    "",
    "bg-brand/8",
    "bg-brand/16",
    "bg-brand/26",
    "bg-brand/38",
] as const;

/** A share of the week, shaded by how big it is. A window that hasn't
 *  closed for anyone yet reads as a dash. */
const Cell = ({ part, whole }: { part: number; whole: number }) => (
    <td
        className={cn(
            "px-1.5 py-2 text-center font-mono text-label sm:px-3",
            whole === 0 ? "text-content-muted" : "text-content",
            SHADE[shareLevel(part, whole)]
        )}
        title={
            whole === 0
                ? undefined
                : `${formatCount(part)} of ${formatCount(whole)}`
        }
    >
        {share(part, whole)}
    </td>
);

const Returned = ({ value }: { value: AdminReturn }) => (
    <Cell part={value.back} whole={value.of} />
);

const COLUMNS = [
    "Got started",
    "Logged 3 on day one",
    "Back a week later",
    "Back a month later",
];

const CohortTable = ({ weeks }: { weeks: AdminCohortWeek[] }) => (
    <div className={cardClass("overflow-hidden", { padding: "none" })}>
        <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">
                Each signup week, and what share of it did each thing
            </caption>
            <thead>
                <tr className="border-b border-subtle text-label-sm text-content-muted">
                    <th
                        scope="col"
                        className="w-[30%] px-3 py-2.5 text-left font-medium sm:w-[22%] sm:px-4"
                    >
                        Week
                    </th>
                    {COLUMNS.map((label) => (
                        <th
                            key={label}
                            scope="col"
                            className="px-1.5 py-2.5 text-center align-bottom font-medium sm:px-3"
                        >
                            {label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {weeks.map((week, i) => (
                    <tr
                        key={week.week}
                        className="border-b border-subtle last:border-b-0"
                    >
                        <th
                            scope="row"
                            className="px-3 py-2 text-left font-normal sm:px-4"
                        >
                            <span className="block text-label text-content">
                                {i === 0
                                    ? "This week"
                                    : bucketLabel(week.week, "week")}
                            </span>
                            <span className="block text-label-sm text-content-muted">
                                {formatCount(week.signedUp)} joined
                            </span>
                        </th>
                        <Cell part={week.onboarded} whole={week.signedUp} />
                        <Cell part={week.loggedThree} whole={week.signedUp} />
                        <Returned value={week.backWeek} />
                        <Returned value={week.backMonth} />
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Step = ({
    label,
    value,
    of,
}: {
    label: string;
    value: number;
    of?: number;
}) => (
    <li className="flex min-w-0 flex-col gap-1">
        <span className="text-label text-content-secondary">{label}</span>
        <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-title text-content">
                {formatCount(value)}
            </span>
            {of !== undefined && (
                <span className="font-mono text-label text-content-muted">
                    {share(value, of)}
                </span>
            )}
        </span>
    </li>
);

const Referrals = ({ referrals }: { referrals: AdminCohorts["referrals"] }) => (
    <section className={cardClass("flex flex-col gap-4")}>
        <h3 className="text-label text-content-secondary">
            Joined through an invite, same weeks
        </h3>
        <ol className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            <Step label="Joined" value={referrals.joined} />
            <Step
                label="Got started"
                value={referrals.onboarded}
                of={referrals.joined}
            />
            <Step
                label="Played 5 games"
                value={referrals.gotGoing}
                of={referrals.joined}
            />
            <Step
                label="Back a week later"
                value={referrals.backWeek.back}
                of={referrals.backWeek.of}
            />
        </ol>
    </section>
);

/** Whether the people who join keep coming, week by week. */
const Staying = () => {
    const { data, isPending, isError } = useAdminCohorts();
    return (
        <section className="flex flex-col gap-4">
            <SectionHeader
                title="Do people stay"
                note="By the week they joined"
                className="mb-0"
            />
            {isPending ? (
                <Skeleton className="h-96 rounded-lg" />
            ) : isError || !data ? (
                <EmptyNote>These didn’t load. Health says why.</EmptyNote>
            ) : (
                <>
                    <CohortTable weeks={data.weeks} />
                    <Referrals referrals={data.referrals} />
                    <p className="text-label-sm text-content-muted">
                        Back means any visit in that week: days 7 to 13, or 30
                        to 36. A week counts toward it once that window has
                        closed. Invites shared but not used aren’t recorded.
                    </p>
                </>
            )}
        </section>
    );
};

export default Staying;
