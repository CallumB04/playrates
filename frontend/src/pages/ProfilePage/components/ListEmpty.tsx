import { Link } from "react-router-dom";
import { buttonClass } from "../../../components/ui/Button";

interface ListEmptyProps {
    message: string;
    /** Somewhere to go about it. Only the owner is ever offered one. */
    action?: { to: string; label: string };
}

/** The sentence inside an empty panel on a profile. */
const ListEmpty = ({ message, action }: ListEmptyProps) => (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-body-sm text-content-muted">{message}</p>
        {action && (
            <Link
                to={action.to}
                className={buttonClass(
                    "secondary",
                    "min-h-11 sm:min-h-9",
                    "sm"
                )}
            >
                {action.label}
            </Link>
        )}
    </div>
);

export const NoReviews = ({ isOwner }: { isOwner: boolean }) =>
    isOwner ? (
        <ListEmpty
            message="No reviews yet."
            action={{ to: "/library", label: "Find a game to review" }}
        />
    ) : (
        <ListEmpty message="No reviews written yet." />
    );

export const NoThreads = ({
    username,
    isOwner,
}: {
    username: string;
    isOwner: boolean;
}) =>
    isOwner ? (
        <ListEmpty
            message="Threads you start or reply to will show here."
            action={{ to: "/community", label: "Browse the community" }}
        />
    ) : (
        <ListEmpty message={`${username} hasn't posted in any threads yet.`} />
    );

export default ListEmpty;
