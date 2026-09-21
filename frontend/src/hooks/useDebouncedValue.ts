import { useEffect, useState } from "react";

/** Trails a fast-changing value, so keystrokes don't each become a request. */
export const useDebouncedValue = <T>(value: T, delay = 300): T => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(id);
    }, [value, delay]);

    return debounced;
};
