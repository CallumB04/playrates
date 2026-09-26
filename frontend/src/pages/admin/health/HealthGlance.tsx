import { Link } from "react-router-dom";
import { cardClass } from "../../../components/ui/Card";
import { Skeleton } from "../../../components/ui/Skeleton";
import { cn } from "../../../lib/cn";
import { useAdminHealth } from "../../../hooks/queries/useAdmin";
import { headline, systemStates, type SystemState } from "./healthState";

const DOT: Record<SystemState, string> = {
    up: "bg-success",
    slow: "bg-warning",
    down: "bg-danger",
};

/** The Health view in one line: fine, or the worst thing that isn't. */
const HealthGlance = () => {
    const health = useAdminHealth();
    if (health.isPending) return <Skeleton className="h-28 rounded-lg" />;

    const h = health.data;
    const lead = h
        ? headline(systemStates(h), h.errors.last24h)
        : { text: "The API isn’t answering.", state: "down" as SystemState };

    return (
        <Link
            to="/admin/health"
            className={cardClass("block lift hover:-translate-y-px hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand")}
        >
            <h2 className="text-label text-content-muted">Health</h2>
            <p className="mt-2 flex items-start gap-2.5 text-body-sm font-medium text-content">
                <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[lead.state])} />
                {lead.text}
            </p>
            <p className="mt-2 pl-4.5 text-label text-content-muted">
                API, database, RAWG and failed requests
            </p>
        </Link>
    );
};

export default HealthGlance;
