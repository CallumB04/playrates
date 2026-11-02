import { formatCount } from "../../lib/format";
import { figureClass, type FigureSize } from "./figureClass";
import { useFigureRoll } from "./useFigureRoll";

interface FigureProps {
    value: number;
    format?: (value: number) => string;
    size?: FigureSize;
    /** Count up on change — the 320ms figure roll. */
    roll?: boolean;
    className?: string;
}

const Figure = ({
    value,
    format = formatCount,
    size = "row",
    roll = false,
    className,
}: FigureProps) => {
    const rolled = useFigureRoll(value, roll);
    return (
        <span
            // A counting number must never be announced on every frame.
            aria-live="off"
            className={figureClass(size, className)}
        >
            {format(roll ? Math.round(rolled) : value)}
        </span>
    );
};

export default Figure;
