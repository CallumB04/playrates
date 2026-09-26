import Progress from "../../../components/ui/Progress";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import { share } from "../lib/adminFormat";

export interface ProportionPart {
    key: string;
    label: string;
    value: number;
    /** A fill class: a status accent, a chart token. */
    fill: string;
}

/**
 * Parts of one whole: a single divided bar, the profile's shelf bar, with a
 * legend that carries the figures, since the bar is for the shape and the
 * legend for the numbers.
 */
const Proportion = ({ parts, label, className }: { parts: ProportionPart[]; label: string; className?: string }) => {
    const total = parts.reduce((n, p) => n + p.value, 0);
    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <Progress
                size="lg"
                label={`${label}: ${parts.map((p) => `${p.label} ${share(p.value, total)}`).join(", ")}`}
                segments={parts.map((p) => ({
                    key: p.key,
                    value: total === 0 ? 0 : p.value / total,
                    className: p.fill,
                    title: `${p.label}: ${formatCount(p.value)}`,
                }))}
            />
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {parts.map((p) => (
                    <li key={p.key} className="flex items-center gap-1.5 text-label-sm text-content-muted">
                        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", p.fill)} />
                        {p.label}
                        <span className="font-mono text-content">{formatCount(p.value)}</span>
                        <span className="font-mono">{share(p.value, total)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Proportion;
