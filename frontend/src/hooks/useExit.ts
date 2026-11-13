import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type RefObject,
} from "react";
import { exitMs } from "../lib/motion";

/**
 * Lets a surface play its way out before it goes. `leave(done)` marks it
 * leaving, waits as long as its stylesheet says the exit takes, then calls
 * `done`, which unmounts it. With no exit to wait for, `done` runs at once.
 * `ref` is the element whose --exit-ms counts; put `data-leaving` on
 * whatever should play out.
 */
export const useExit = (ref: RefObject<HTMLElement | null>) => {
    const [leaving, setLeaving] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const leave = useCallback(
        (done: () => void) => {
            const ms = exitMs(ref.current);
            if (!ms) {
                done();
                return;
            }
            // Asked twice (a click, then Escape) still leaves once.
            if (timer.current !== undefined) return;
            setLeaving(true);
            timer.current = setTimeout(() => {
                timer.current = undefined;
                setLeaving(false);
                done();
            }, ms);
        },
        [ref]
    );

    return { leaving, leave };
};
