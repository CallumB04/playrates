import { useEffect, useState } from "react";

/** The time now, kept current every `every` ms, for a clock that ticks. */
export const useNow = (every = 1000): number => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), every);
        return () => clearInterval(timer);
    }, [every]);
    return now;
};
