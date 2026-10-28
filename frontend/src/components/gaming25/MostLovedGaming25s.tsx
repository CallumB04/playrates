import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { GAMING_25_SIZE } from "@playrates/shared";
import { cardClass } from "../ui/Card";
import GameCover from "../game/GameCover";
import ProfilePicture from "../ProfilePicture";
import { useMostLovedGaming25s } from "../../hooks/queries/useGaming25";
import { formatCount } from "../../lib/format";
import { gaming25Path } from "../../lib/profilePaths";

const SHOWN = 5;

/** The most loved Gaming 25s, in the side column's plain card, row for row
 *  like Popular lists beside it. */
const MostLovedGaming25s = () => {
    const { data } = useMostLovedGaming25s(SHOWN);
    const grids = data ?? [];
    if (grids.length === 0) return null;

    return (
        <section
            aria-label="Most loved Gaming 25s"
            className={cardClass("flex flex-col pb-1.5", { padding: "none" })}
        >
            <h2 className="px-3 pt-3 pb-1.5 text-label text-content-muted">
                Most loved Gaming 25s
            </h2>
            <ul>
                {grids.map((grid) => (
                    <li key={grid.owner.username}>
                        <Link
                            to={gaming25Path(grid.owner.username)}
                            className="flex items-center gap-2.5 rounded-sm px-3 py-2 lift hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                        >
                            {grid.centre ? (
                                <GameCover
                                    coverUrl={grid.centre.coverUrl}
                                    title=""
                                    className="aspect-3/4 w-8 shrink-0 rounded-xs"
                                />
                            ) : (
                                <ProfilePicture
                                    variant="nav"
                                    file={grid.owner.avatarUrl ?? ""}
                                    username={grid.owner.username}
                                    accent={grid.owner.accent}
                                    link={false}
                                />
                            )}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-body-sm font-medium text-content">
                                    {grid.owner.username}’s Gaming 25
                                </span>
                                <span className="block truncate text-label-sm text-content-muted">
                                    {grid.centre
                                        ? `Favourite game: ${grid.centre.title}`
                                        : `${grid.pickCount} of ${GAMING_25_SIZE} picked`}
                                </span>
                            </span>
                            <span
                                className="inline-flex shrink-0 items-center gap-1 font-mono text-label-sm text-content-muted"
                                aria-label={`${formatCount(grid.loveCount)} loves`}
                            >
                                <Heart
                                    size={12}
                                    aria-hidden
                                    className="fill-love text-love"
                                />
                                {formatCount(grid.loveCount)}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default MostLovedGaming25s;
