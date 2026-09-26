import Button from "../../../components/ui/Button";

/** The foot of a feed: more, or a note that there is no more. */
const LoadMore = ({
    hasMore,
    loading,
    onClick,
    endLabel = "That's everything.",
}: {
    hasMore: boolean;
    loading: boolean;
    onClick: () => void;
    endLabel?: string;
}) =>
    hasMore ? (
        <Button
            variant="secondary"
            onClick={onClick}
            disabled={loading}
            className="mt-4 w-full sm:w-auto"
        >
            {loading ? "Loading…" : "Load more"}
        </Button>
    ) : (
        <p className="mt-4 text-center text-label text-content-muted sm:text-left">
            {endLabel}
        </p>
    );

export default LoadMore;
