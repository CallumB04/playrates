import type { AdminPeriodFigure } from "@playrates/shared";
import { cn } from "../../../lib/cn";
import { changeWords } from "../lib/plot";

/** Change on the period before: the figure in its colour, the words in body
 *  ink, so the colour is never the only way to read it. */
export const Change = ({
    figure,
    previous,
}: {
    figure: AdminPeriodFigure;
    previous: string;
}) => {
    const { figure: text, words, tone } = changeWords(figure, previous);
    if (!text) return <>{words}</>;
    return (
        <>
            <span
                className={cn(
                    "font-mono",
                    tone === "up" ? "text-success" : "text-danger"
                )}
            >
                {text}
            </span>{" "}
            {words}
        </>
    );
};
