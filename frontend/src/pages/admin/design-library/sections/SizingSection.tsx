import type { ReactNode } from "react";
import {
    ELEVATION,
    RADII,
    SPACING_STEPS,
    TYPE_SCALE,
} from "../../../../styles/tokenCatalogue";
import { cn } from "../../../../lib/cn";

const Group = ({
    title,
    blurb,
    children,
}: {
    title: string;
    blurb: string;
    children: ReactNode;
}) => (
    <section className="flex flex-col gap-4">
        <header className="rule-double pb-2">
            <h3 className="text-label text-content-muted">
                {title}
            </h3>
            <p className="mt-1 max-w-prose text-body-sm text-content-secondary">
                {blurb}
            </p>
        </header>
        {children}
    </section>
);

const SizingSection = () => (
    <div className="flex flex-col gap-10">
        <Group
            title="Type scale"
            blurb="Zilla Slab displays, IBM Plex Sans sets prose, IBM Plex Mono carries every figure, label and stamp. One class per step; the family is chosen alongside it. Tabular figures are set on body, not per component."
        >
            {TYPE_SCALE.map((step) => (
                <div
                    key={step.name}
                    className="border-b border-subtle py-2.5"
                >
                    <div className="flex items-baseline justify-between gap-4">
                        <span className="text-label-sm text-content-muted">
                            {step.name}
                        </span>
                        <span className="font-mono text-[10px] text-content-muted">
                            {step.utility} · {step.spec}
                        </span>
                    </div>
                    <p className={cn("mt-1.5 text-content", step.utility)}>
                        {step.sample}
                    </p>
                </div>
            ))}
        </Group>

        <Group
            title="Spacing — 4pt base"
            blurb="Tailwind's default 0.25rem base already produces the whole run; these are the step names to reach for."
        >
            <div className="flex items-end gap-1.5">
                {SPACING_STEPS.map((step) => (
                    <div key={step.name} className="text-center">
                        <div
                            className="h-5 bg-brand opacity-75"
                            style={{ width: `${step.px}px` }}
                        />
                        <p className="mt-1.5 font-mono text-[9px] text-content-muted">
                            {step.name}
                        </p>
                    </div>
                ))}
            </div>
        </Group>

        <Group
            title="Radii — square by default"
            blurb="Only two curved things exist: the mastered pill and the presence dot. Everything else is square, which is what makes the pill mean something. The rest of the radius namespace is cleared rather than redefined, so a stray rounded-lg resolves to nothing."
        >
            <div className="flex flex-wrap gap-5">
                {RADII.map((radius) => (
                    <div key={radius.name} className="text-center">
                        <div
                            className={cn(
                                "h-9 w-11 border border-strong bg-surface-raised",
                                radius.utility
                            )}
                        />
                        <p className="mt-1.5 font-mono text-[9px] text-content">
                            {radius.name}
                        </p>
                        <p className="font-mono text-[9px] text-content-muted">
                            {radius.note}
                        </p>
                    </div>
                ))}
            </div>
        </Group>

        <Group
            title="Elevation"
            blurb="Five steps. e0 is the absence of a class; the inset is how anything you own sits. A pressed plate with a lip composes from two classes, because the shadow and inset-shadow namespaces write different properties."
        >
            <div className="flex flex-wrap gap-5">
                {ELEVATION.map((level) => (
                    <div key={level.name} className="text-center">
                        <div
                            className={cn(
                                "h-11 w-[66px] border border-strong bg-surface-raised",
                                level.utility
                            )}
                        />
                        <p className="mt-2 font-mono text-[9px] text-content">
                            {level.name}
                        </p>
                        <p className="font-mono text-[9px] text-content-muted">
                            {level.note}
                        </p>
                    </div>
                ))}
            </div>
        </Group>
    </div>
);

export default SizingSection;
