import { useId } from "react";
import { Lock } from "lucide-react";
import type {
    AwardBoardPerson,
    AwardLeaderboard,
    ProfileAccent,
} from "@playrates/shared";
import Popup from "../../../components/ui/Popup";
import ProfilePicture from "../../../components/ProfilePicture";
import { formatCount } from "../../../lib/format";
import { tierNames } from "../../../lib/events";
import { cn } from "../../../lib/cn";

const Face = ({ person }: { person: AwardBoardPerson }) =>
    person.hidden ? (
        <span className="grid size-6 place-items-center rounded-full bg-surface-sunken text-content-muted ring-2 ring-surface-raised">
            <Lock size={10} aria-hidden />
        </span>
    ) : (
        <span className="rounded-full ring-2 ring-surface-raised">
            <ProfilePicture
                variant="tab"
                file={person.avatarUrl ?? ""}
                username={person.username}
                accent={person.accent as ProfileAccent}
                link={false}
            />
        </span>
    );

/**
 * How everyone's picks did, a line for each score rather than for each
 * person, so a tie is one line however many share it: the score, a few
 * faces, their names or how many, and yours marked.
 */
const LeaderboardPopup = ({
    board,
    onClose,
}: {
    board: AwardLeaderboard;
    onClose: () => void;
}) => {
    const titleId = useId();
    const partial = board.decided < board.categories;
    return (
        <Popup
            onClose={onClose}
            titleId={titleId}
            title="Leaderboard"
            blurb={
                partial
                    ? `${formatCount(board.total)} players · ${board.decided} of ${board.categories} winners in so far`
                    : `${formatCount(board.total)} players`
            }
            tone="brand"
        >
            <ol className="flex flex-col gap-1">
                {board.tiers.map((tier) => {
                    const yours = board.you?.called === tier.called;
                    return (
                        <li
                            key={tier.called}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2.5",
                                yours && "bg-surface-active"
                            )}
                        >
                            <span className="w-12 shrink-0 font-display text-section text-content tabular-nums">
                                {tier.called}
                                <span className="text-body-sm text-content-muted">
                                    /{board.decided}
                                </span>
                            </span>
                            <span
                                aria-hidden
                                className="flex shrink-0 -space-x-1.5"
                            >
                                {tier.people.slice(0, 3).map((person, i) => (
                                    <Face key={i} person={person} />
                                ))}
                            </span>
                            <span
                                className={cn(
                                    "line-clamp-2 min-w-0 flex-1 text-body-sm sm:line-clamp-1",
                                    yours
                                        ? "font-medium text-content"
                                        : "text-content-secondary"
                                )}
                            >
                                {tierNames(tier, yours)}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </Popup>
    );
};

export default LeaderboardPopup;
