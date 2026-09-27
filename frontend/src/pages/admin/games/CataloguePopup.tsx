import Progress from "../../../components/ui/Progress";
import Stat from "../../../components/ui/Stat";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import GameCover from "../../../components/game/GameCover";
import { formatCount } from "../../../lib/format";
import { useAdminMetric } from "../../../hooks/queries/useAdmin";
import RankBars from "../components/RankBars";
import { share } from "../lib/adminFormat";
import Popup, { PopupBand, PopupSection } from "../overview/popups/Popup";

const Row = ({
    label,
    part,
    whole,
}: {
    label: string;
    part: number;
    whole: number;
}) => (
    <div className="flex items-center gap-3.5 border-b border-subtle py-2.5 last:border-b-0">
        <span className="w-28 shrink-0 text-body-sm font-medium text-content sm:w-36">
            {label}
        </span>
        <Progress
            value={whole === 0 ? 0 : part / whole}
            label={`${label}: ${share(part, whole)}`}
            className="min-w-0 flex-1"
        />
        <span className="w-16 shrink-0 text-right font-mono text-body-sm font-semibold text-content">
            {formatCount(part)}
        </span>
        <span className="w-9 shrink-0 text-right font-mono text-[11.5px] text-content-muted">
            {share(part, whole)}
        </span>
    </div>
);

/** How complete the catalogue is: which games have art, words and details. */
const CataloguePopup = ({ onClose }: { onClose: () => void }) => {
    const { data } = useAdminMetric("games", "30d");
    const games = data?.metric === "games" ? data : null;
    return (
        <Popup
            title="The catalogue"
            value={games ? formatCount(games.total) : undefined}
            note={games ? "games" : undefined}
            onClose={onClose}
        >
            {!games ? (
                <TextSkeleton lines={6} />
            ) : (
                <>
                    <PopupBand>
                        <Stat
                            label="Arrived, last 30 days"
                            value={formatCount(games.added)}
                        />
                        <Stat
                            label="On the trending rail"
                            value={formatCount(games.trending)}
                        />
                    </PopupBand>
                    <PopupSection title="How many have each">
                        <Row
                            label="Cover"
                            part={games.withCover}
                            whole={games.total}
                        />
                        <Row
                            label="Portrait box art"
                            part={games.withBoxArt}
                            whole={games.total}
                        />
                        <Row
                            label="Description"
                            part={games.withDescription}
                            whole={games.total}
                        />
                        <Row
                            label="Details from RAWG"
                            part={games.detailsSynced}
                            whole={games.total}
                        />
                    </PopupSection>
                    <PopupSection title="Most logged, ever">
                        <RankBars
                            unit={["log", "logs"]}
                            items={games.mostLogged.slice(0, 5).map((g) => ({
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
                    </PopupSection>
                </>
            )}
        </Popup>
    );
};

export default CataloguePopup;
