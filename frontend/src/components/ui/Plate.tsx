import type { HTMLAttributes } from "react";
import { plateClass, type PlateDepth, type PlateState } from "./plateClass";

interface PlateProps extends HTMLAttributes<HTMLDivElement> {
    state?: PlateState;
    depth?: PlateDepth;
}

const Plate = ({
    state = "raised",
    depth = "shallow",
    className,
    ...props
}: PlateProps) => (
    <div className={plateClass(state, depth, className)} {...props} />
);

export default Plate;
