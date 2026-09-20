import type { Ramp } from "../../../../styles/tokenCatalogue";
import { useTokenValues } from "./useTokenValues";

/** A raw ramp with its resolved values. Not exposed as utilities — components
 *  only ever touch the semantic layer. */
const RampRow = ({ ramp }: { ramp: Ramp }) => {
    const values = useTokenValues(ramp.steps.map((s) => s.cssVar));

    return (
        <div>
            <div className="mb-2 flex items-baseline gap-3">
                <span className="font-mono text-label-sm uppercase text-content">
                    {ramp.name}
                </span>
                <span className="text-xs text-content-muted">{ramp.note}</span>
            </div>
            <div className="flex gap-1">
                {ramp.steps.map((step) => (
                    <div key={step.cssVar} className="min-w-0 flex-1">
                        <div
                            className="h-11 border border-subtle"
                            style={{ backgroundColor: `var(${step.cssVar})` }}
                        />
                        <p className="mt-1 truncate font-mono text-[9.5px] text-content-muted">
                            {step.step}
                        </p>
                        <p className="truncate font-mono text-[9.5px] text-content-secondary">
                            {values[step.cssVar]?.light ?? "—"}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RampRow;
