import Button from "../ui/Button";
import { cn } from "../../lib/cn";

const RULES = [
    "Keep it about the games.",
    "Be kind. Disagree with the take, not the person.",
    "Warn people before you spoil anything.",
];

/** The last thing in the column, and the quietest: a dashed outline, no fill. */
const HouseRules = ({
    onStart,
    className,
}: {
    onStart: () => void;
    className?: string;
}) => (
    <section
        aria-labelledby="house-rules"
        className={cn(
            "flex flex-col gap-3 rounded-lg border border-dashed border-strong p-4",
            className
        )}
    >
        <h2 id="house-rules" className="text-label text-content-muted">
            House rules
        </h2>
        <ul className="flex flex-col gap-1.5 text-label-sm text-content-secondary">
            {RULES.map((rule) => (
                <li key={rule} className="flex gap-2">
                    <span aria-hidden className="text-content-muted">
                        ·
                    </span>
                    {rule}
                </li>
            ))}
        </ul>
        <Button
            variant="secondary"
            size="sm"
            onClick={onStart}
            className="min-h-11 w-full sm:min-h-9"
        >
            Start a thread
        </Button>
    </section>
);

export default HouseRules;
