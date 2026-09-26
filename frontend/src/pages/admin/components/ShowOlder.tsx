import { panelButtonClass } from "../../../components/ui/Panel";

/** The foot of a feed: older entries, or where the log begins. */
const ShowOlder = ({
    hasMore,
    loading,
    onClick,
    end,
}: {
    hasMore: boolean;
    loading: boolean;
    onClick: () => void;
    end: string;
}) =>
    hasMore ? (
        <div className="mt-3 flex">
            <button
                type="button"
                onClick={onClick}
                disabled={loading}
                className={panelButtonClass(false, "disabled:cursor-wait disabled:opacity-60")}
            >
                {loading ? "Loading…" : "Show older"}
            </button>
        </div>
    ) : (
        <p className="mt-4 text-center text-label text-content-muted">{end}</p>
    );

export default ShowOlder;
