import { Link } from "react-router-dom";
import type { AwardNominee } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";

/** The night's top award and who took it, beside its date once it's over:
 *  the winner's cover and its name, set plainly on the page. */
const HeadlineWinner = ({
    award,
    winner,
}: {
    award: string;
    winner: AwardNominee;
}) => {
    const name = winner.game?.title ?? winner.label ?? "";
    const body = (
        <>
            <span className="shrink-0">
                {winner.game ? (
                    <GameCover
                        coverUrl={winner.game.coverUrl}
                        title=""
                        sizes="48px"
                        className="aspect-3/4 w-10 rounded-sm shadow-plate sm:w-12"
                    />
                ) : (
                    <span className="block aspect-3/4 w-10 rounded-sm bg-surface-sunken sm:w-12" />
                )}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-label-sm text-content-muted on-backdrop">
                    {award}
                </span>
                <span className="line-clamp-2 text-body-sm font-semibold text-content group-hover:underline sm:text-body">
                    {name}
                </span>
            </span>
        </>
    );
    return winner.game ? (
        <Link
            to={`/game/${winner.game.id}`}
            className="group flex min-w-0 items-center gap-3"
        >
            {body}
        </Link>
    ) : (
        <div className="flex min-w-0 items-center gap-3">{body}</div>
    );
};

export default HeadlineWinner;
