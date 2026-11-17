import { tagClass } from "../../../components/ui/tagClass";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import { attentionWords, type AttentionSection } from "../lib/attention";

/** How many things wait in a section, beside its name. Errors in red, the
 *  rest in the brand's colour; nothing at all when nothing waits. */
const AttentionCount = ({
    section,
    count,
    className,
}: {
    section: AttentionSection;
    count: number;
    className?: string;
}) =>
    count > 0 ? (
        <span
            className={tagClass(
                section === "health" ? "live" : "brand",
                cn("font-mono tabular-nums", className)
            )}
        >
            <span aria-hidden>{formatCount(count)}</span>
            <span className="sr-only">, {attentionWords(section, count)}</span>
        </span>
    ) : null;

export default AttentionCount;
