import { Link } from "react-router-dom";
import { buttonClass } from "../../../components/ui/Button";
import EmptyPlate from "../../../components/ui/EmptyPlate";

interface ListEmptyProps {
    title: string;
    body?: string;
    /** Somewhere to go about it. Only the owner is ever offered one. */
    action?: { to: string; label: string };
}

/** An empty view on a profile, as the games shelves have it: a title, a
 *  line, and for the owner a way to fill it. In place of the view's card. */
const ListEmpty = ({ title, body, action }: ListEmptyProps) => (
    <EmptyPlate
        title={title}
        body={body}
        action={
            action && (
                <Link to={action.to} className={buttonClass("primary")}>
                    {action.label}
                </Link>
            )
        }
    />
);

export const NoReviews = ({ isOwner }: { isOwner: boolean }) =>
    isOwner ? (
        <ListEmpty
            title="No reviews yet"
            body="Rate and review the games on your shelves."
            action={{ to: "/library", label: "Find a game to review" }}
        />
    ) : (
        <ListEmpty title="No reviews yet" />
    );

export const NoThreads = ({ isOwner }: { isOwner: boolean }) =>
    isOwner ? (
        <ListEmpty
            title="No threads yet"
            body="Threads you start or reply to will show here."
            action={{ to: "/community", label: "Browse the community" }}
        />
    ) : (
        <ListEmpty title="No threads yet" />
    );

export default ListEmpty;
