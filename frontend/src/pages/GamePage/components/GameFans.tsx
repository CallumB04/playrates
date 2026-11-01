import { Link } from "react-router-dom";
import ProfilePicture from "../../../components/ProfilePicture";
import { useGameFans } from "../../../hooks/queries/useFriends";
import { profilePath } from "../../../lib/profilePaths";

/** Who rated it 8 or more, as faces to follow through to. Nothing until
 *  someone has: most games have no ratings yet. */
const GameFans = ({ gameId }: { gameId: number }) => {
    const { data: fans } = useGameFans(gameId);
    if (!fans || fans.length === 0) return null;

    return (
        <section>
            <div className="mb-3 border-b border-subtle pb-2.5">
                <h2 className="font-display text-section text-content">
                    Rated highly by
                </h2>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-3">
                {fans.map(({ user, rating }) => (
                    <li key={user.id}>
                        <Link
                            to={profilePath(user.username)}
                            className="flex min-h-11 items-center gap-2.5 rounded-sm py-1 pr-2 lift hover:bg-surface-hover"
                        >
                            <ProfilePicture
                                variant="friendRow"
                                username={user.username}
                                file={user.avatarUrl ?? ""}
                                accent={user.accent}
                                link={false}
                            />
                            <span className="flex flex-col">
                                <span className="text-body-sm text-content">
                                    {user.username}
                                </span>
                                <span className="font-mono text-label-sm text-content-muted">
                                    {Number(rating.toFixed(2))}/10
                                </span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default GameFans;
