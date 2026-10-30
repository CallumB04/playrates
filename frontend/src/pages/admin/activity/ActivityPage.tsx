import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import {
    ACTIVITY_GROUPS,
    ACTIVITY_GROUP_NAMES,
    ACTIVITY_KINDS,
    ACTIVITY_PERIODS,
    type ActivityGroup,
    type ActivityKind,
    type ActivityPeriod,
    type AdminActivityCounts,
} from "@playrates/shared";
import Chip, { chipClass } from "../../../components/ui/Chip";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import { useGame } from "../../../hooks/queries/useGames";
import {
    useAdminActivityCounts,
    useAdminUser,
} from "../../../hooks/queries/useAdmin";
import { formatCount } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import AdminPageHeader from "../components/AdminPageHeader";
import ActivityFeed from "./ActivityFeed";
import PersonFilter from "./PersonFilter";
import { GROUP_LABELS, KIND_LABELS } from "./activityPresentation";

const isGroup = (value: string | null): value is ActivityGroup =>
    value !== null && (ACTIVITY_GROUP_NAMES as string[]).includes(value);
const isKind = (value: string | null): value is ActivityKind =>
    value !== null && (ACTIVITY_KINDS as readonly string[]).includes(value);
const isPeriod = (value: string | null): value is ActivityPeriod =>
    value !== null && value in ACTIVITY_PERIODS;

const PERIODS: { value: ActivityPeriod | "all"; label: string }[] = [
    { value: "day", label: "24h" },
    { value: "week", label: "7d" },
    { value: "month", label: "30d" },
    { value: "quarter", label: "90d" },
    { value: "all", label: "All" },
];

/* A phone has ten groups to fit: one row it scrolls along, rather than
   half the screen of chips before the log starts. */
const CHIP_ROW =
    "-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [&>*]:shrink-0 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0";

const total = (
    counts: AdminActivityCounts | undefined,
    kinds: readonly string[]
) =>
    counts
        ? kinds.reduce((n, k) => n + (counts[k as ActivityKind] ?? 0), 0)
        : undefined;

/** "accounts", "Gaming 25": a name keeps its capitals mid-sentence. */
const inline = (label: string) =>
    label.startsWith("Gaming") ? label : label.toLowerCase();

const Count = ({ value }: { value: number | undefined }) =>
    value === undefined ? null : (
        <span className="font-mono tabular-nums opacity-70">
            {formatCount(value)}
        </span>
    );

/** A filter that's on, and the way to take it off. */
const Applied = ({
    label,
    onClear,
}: {
    label: string;
    onClear: () => void;
}) => (
    <button
        type="button"
        onClick={onClear}
        aria-label={`${label}, clear`}
        className={chipClass(true, "cursor-pointer", "tag")}
    >
        {label}
        <X size={13} aria-hidden />
    </button>
);

/** Filters live in the URL, so a narrowed view can be linked to: from a
 *  person's detail, or kept as a bookmark. */
const ActivityPage = () => {
    const [params, setParams] = useSearchParams();
    const group = isGroup(params.get("group"))
        ? (params.get("group") as ActivityGroup)
        : undefined;
    const kindParam = params.get("kind");
    // A kind is only kept inside the group it belongs to.
    const kind =
        group &&
        isKind(kindParam) &&
        (ACTIVITY_GROUPS[group] as readonly string[]).includes(kindParam)
            ? kindParam
            : undefined;
    const period = isPeriod(params.get("period"))
        ? (params.get("period") as ActivityPeriod)
        : undefined;
    const userId = params.get("user") ?? undefined;
    const gameParam = Number(params.get("game"));
    const gameId =
        Number.isInteger(gameParam) && gameParam > 0 ? gameParam : undefined;

    const { data: user } = useAdminUser(userId ?? null);
    const { data: game } = useGame(gameId);
    const { data: counts } = useAdminActivityCounts({ userId, gameId, period });

    const update = (
        next: Record<string, string | number | null | undefined>
    ) => {
        const copy = new URLSearchParams(params);
        for (const [key, value] of Object.entries(next)) {
            if (value) copy.set(key, String(value));
            else copy.delete(key);
        }
        setParams(copy, { replace: true });
    };

    return (
        <>
            <AdminPageHeader title="Activity" />

            <div className="mb-4 flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <SegmentedChoice
                            fill
                            label="How far back"
                            segments={PERIODS}
                            value={period ?? "all"}
                            onChange={(value) =>
                                update({
                                    period: value === "all" ? null : value,
                                })
                            }
                        />
                    </div>
                    <PersonFilter onPick={(id) => update({ user: id })} />
                </div>

                {(userId || gameId) && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-label text-content-muted">
                            Only
                        </span>
                        {userId && (
                            <Applied
                                label={user?.username ?? "one person"}
                                onClear={() => update({ user: null })}
                            />
                        )}
                        {gameId && (
                            <Applied
                                label={game?.title ?? "one game"}
                                onClear={() => update({ game: null })}
                            />
                        )}
                    </div>
                )}

                <div className={CHIP_ROW}>
                    <Chip
                        selected={!group}
                        onClick={() => update({ group: null, kind: null })}
                    >
                        Everything
                        <Count value={total(counts, ACTIVITY_KINDS)} />
                    </Chip>
                    {ACTIVITY_GROUP_NAMES.map((name) => {
                        const n = total(counts, ACTIVITY_GROUPS[name]);
                        return (
                            <Chip
                                key={name}
                                selected={group === name}
                                onClick={() =>
                                    update({ group: name, kind: null })
                                }
                                // Nothing in this scope: still there, quieter.
                                className={cn(
                                    n === 0 && group !== name && "opacity-55"
                                )}
                            >
                                {GROUP_LABELS[name]}
                                <Count value={n} />
                            </Chip>
                        );
                    })}
                </div>

                {group && (
                    <div
                        role="group"
                        aria-label={`Kinds of ${inline(GROUP_LABELS[group])}`}
                        className={cn(
                            CHIP_ROW,
                            "sm:border-l-2 sm:border-subtle sm:pl-3"
                        )}
                    >
                        <Chip
                            selected={!kind}
                            onClick={() => update({ kind: null })}
                        >
                            All {inline(GROUP_LABELS[group])}
                        </Chip>
                        {ACTIVITY_GROUPS[group].map((k) => (
                            <Chip
                                key={k}
                                selected={kind === k}
                                onClick={() => update({ kind: k })}
                                className={cn(
                                    counts?.[k] === undefined &&
                                        kind !== k &&
                                        "opacity-55"
                                )}
                            >
                                {KIND_LABELS[k]}
                                <Count
                                    value={
                                        counts ? (counts[k] ?? 0) : undefined
                                    }
                                />
                            </Chip>
                        ))}
                    </div>
                )}
            </div>

            <ActivityFeed
                filters={{ group, kind, userId, gameId, period }}
                onFilterUser={(id) => update({ user: id })}
                onFilterGame={(id) => update({ game: id })}
            />
        </>
    );
};

export default ActivityPage;
