import { Link } from "react-router-dom";
import type { AdminRange } from "@playrates/shared";
import { TextSkeleton } from "../../../../components/ui/Skeleton";
import { EmptyNote } from "../../../../components/ui/EmptyPlate";
import GameCover from "../../../../components/game/GameCover";
import ProfilePicture from "../../../../components/ProfilePicture";
import { buttonClass } from "../../../../components/ui/Button";
import { relativeTime } from "../../../../lib/format";
import {
    useAdminHealth,
    useAdminMetric,
    useRawgUsage,
    useServerErrors,
} from "../../../../hooks/queries/useAdmin";
import RankBars from "../../components/RankBars";
import { RANGE_LABELS } from "../../lib/adminFormat";
import {
    AllowanceBasis,
    AllowanceDays,
    AllowanceMeter,
} from "../../games/RawgAllowance";
import HealthSystems from "../../health/HealthSystems";
import { ErrorList } from "../../health/ErrorRow";
import { headline, systemStates } from "../../health/healthState";
import { formatCount } from "../../../../lib/format";
import Popup, { PopupSection } from "./Popup";

interface RangeProps {
    range: AdminRange;
    onClose: () => void;
}

export const MostActivePopup = ({ range, onClose }: RangeProps) => {
    const { data } = useAdminMetric("users", range);
    const people = data?.metric === "users" ? data.mostActive : null;
    return (
        <Popup
            title={`Most active people · last ${RANGE_LABELS[range]}`}
            onClose={onClose}
        >
            <p className="-mt-3 text-label text-content-muted">
                An action is anything in the activity log: logging, reviewing,
                posting, upvoting, adding friends, and editing or removing any
                of those.
            </p>
            {!people ? (
                <TextSkeleton lines={5} />
            ) : people.length === 0 ? (
                <EmptyNote>Nobody did anything in this time.</EmptyNote>
            ) : (
                <RankBars
                    unit={["action", "actions"]}
                    items={people.map((p) => ({
                        key: p.username,
                        label: p.username,
                        value: p.count,
                        href: `/user/${p.username}`,
                        lead: (
                            <span className="shrink-0 [&>*]:size-8">
                                <ProfilePicture
                                    variant="nav"
                                    file={p.avatarUrl ?? ""}
                                    accent={p.accent}
                                    username={p.username}
                                    link={false}
                                />
                            </span>
                        ),
                    }))}
                />
            )}
        </Popup>
    );
};

export const MostLoggedPopup = ({ range, onClose }: RangeProps) => {
    const { data } = useAdminMetric("logs", range);
    const games = data?.metric === "logs" ? data.topGames : null;
    return (
        <Popup
            title={`Most logged games · last ${RANGE_LABELS[range]}`}
            onClose={onClose}
        >
            {!games ? (
                <TextSkeleton lines={5} />
            ) : games.length === 0 ? (
                <EmptyNote>Nobody logged a game in this time.</EmptyNote>
            ) : (
                <RankBars
                    unit={["log", "logs"]}
                    items={games.map((g) => ({
                        key: String(g.id),
                        label: g.title,
                        value: g.count,
                        href: `/game/${g.id}`,
                        lead: (
                            <GameCover
                                coverUrl={g.coverUrl}
                                title={g.title}
                                className="aspect-3/4 w-8 shrink-0 overflow-hidden rounded-xs shadow-cover"
                            />
                        ),
                    }))}
                />
            )}
        </Popup>
    );
};

export const RawgPopup = ({ onClose }: { onClose: () => void }) => {
    const { data: usage } = useRawgUsage();
    return (
        <Popup
            title="RAWG requests left"
            value={usage ? formatCount(usage.left) : undefined}
            note={usage ? `of ${formatCount(usage.allowance)}` : undefined}
            onClose={onClose}
        >
            {!usage ? (
                <TextSkeleton lines={5} />
            ) : (
                <>
                    <AllowanceMeter usage={usage} />
                    <PopupSection title="Requests counted each day · this period">
                        <AllowanceDays usage={usage} height={140} />
                    </PopupSection>
                    <AllowanceBasis usage={usage} />
                    <Link
                        to="/admin/games"
                        className={buttonClass(
                            "secondary",
                            "w-full sm:w-auto sm:self-start"
                        )}
                    >
                        Pull new games or look after one
                    </Link>
                </>
            )}
        </Popup>
    );
};

export const HealthPopup = ({ onClose }: { onClose: () => void }) => {
    const health = useAdminHealth();
    const errors = useServerErrors();
    const recent = (errors.data?.pages[0]?.data ?? []).slice(0, 3);
    const h = health.data;

    return (
        <Popup title="Health" onClose={onClose}>
            {!h ? (
                <TextSkeleton lines={5} />
            ) : (
                <>
                    <div className="-mt-4">
                        <p className="font-display text-section text-content">
                            {headline(systemStates(h), h.errors.last24h).text}
                        </p>
                        <p className="mt-1.5 text-label text-content-muted">
                            Checked{" "}
                            {relativeTime(
                                new Date(health.dataUpdatedAt).toISOString()
                            )}
                        </p>
                    </div>
                    <div className="border-t border-subtle">
                        <HealthSystems health={h} />
                    </div>
                    {recent.length > 0 && (
                        <PopupSection title="Latest failed requests">
                            <ErrorList entries={recent} />
                        </PopupSection>
                    )}
                    <Link
                        to="/admin/health"
                        className={buttonClass(
                            "secondary",
                            "w-full sm:w-auto sm:self-start"
                        )}
                    >
                        Every failed request
                    </Link>
                </>
            )}
        </Popup>
    );
};
