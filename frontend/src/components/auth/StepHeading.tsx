import type { ReactNode } from "react";

/** The step's own heading, and a line under it: the way to the other
 *  form, or what has just happened. A page's title on a page, a dialog's
 *  in the log-in popup, where the dialog names itself by its id. */
const StepHeading = ({
    title,
    aside,
    centred = false,
    as: Heading = "h1",
    id,
}: {
    title: string;
    aside?: ReactNode;
    /** Over a step whose own content is centred, as the inbox's is. */
    centred?: boolean;
    as?: "h1" | "h2";
    id?: string;
}) => (
    <div className={centred ? "text-center" : undefined}>
        <Heading
            id={id}
            className="font-display text-[26px] leading-tight text-content sm:text-[32px]"
        >
            {title}
        </Heading>
        {aside && (
            <p className="mt-1.5 text-body-sm text-content-secondary">
                {aside}
            </p>
        )}
    </div>
);

export default StepHeading;
