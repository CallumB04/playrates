import type { IconComponent } from "./icons";

/**
 * Status marks.
 *
 * The design sets these as the geometric-shapes block (■ ▶ ▢ ◇ ● ▤ ◻), but
 * those characters sit on wildly different baselines across fallback fonts and
 * screen readers announce them as "black square". The shape is a load-bearing
 * channel here — it is how a status reads in greyscale — so it has to be
 * reliable and silent. Drawn, not typed.
 */
export type StatusMarkName =
    | "square"
    | "play"
    | "outlineSquare"
    | "diamond"
    | "disc"
    | "ledger"
    | "hollowSquare";

const mark = (children: React.ReactNode): IconComponent =>
    function Mark(props) {
        return (
            <svg
                viewBox="0 0 10 10"
                width="1em"
                height="1em"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
                focusable="false"
                {...props}
            >
                {children}
            </svg>
        );
    };

export const STATUS_MARKS: Record<StatusMarkName, IconComponent> = {
    square: mark(<rect x="1.5" y="1.5" width="7" height="7" fill="currentColor" />),
    play: mark(<path d="M2.5 1.5 8.5 5l-6 3.5Z" fill="currentColor" />),
    outlineSquare: mark(
        <rect x="1.9" y="1.9" width="6.2" height="6.2" strokeWidth="1.4" />
    ),
    diamond: mark(<path d="M5 1.2 8.8 5 5 8.8 1.2 5Z" strokeWidth="1.4" />),
    disc: mark(<circle cx="5" cy="5" r="3.5" fill="currentColor" />),
    ledger: mark(
        <g strokeWidth="1.2" strokeLinecap="round">
            <path d="M1.8 2.6h6.4M1.8 5h6.4M1.8 7.4h6.4" />
        </g>
    ),
    hollowSquare: mark(
        <rect x="2.1" y="2.1" width="5.8" height="5.8" strokeWidth="1" />
    ),
};
