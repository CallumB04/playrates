import type { ReactNode } from "react";

/** The step's own heading, and a line under it: the way to the other
 *  form, or what has just happened. */
const StepHeading = ({
    title,
    aside,
    centred = false,
}: {
    title: string;
    aside?: ReactNode;
    /** Over a step whose own content is centred, as the inbox's is. */
    centred?: boolean;
}) => (
    <div className={centred ? "text-center" : undefined}>
        <h1 className="font-display text-[26px] leading-tight text-content sm:text-[32px]">
            {title}
        </h1>
        {aside && (
            <p className="mt-1.5 text-body-sm text-content-secondary">
                {aside}
            </p>
        )}
    </div>
);

export default StepHeading;
