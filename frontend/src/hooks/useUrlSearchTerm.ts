import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * A search box whose term lives in the URL, so a search can be shared and
 * survives a reload. Typing settles into the URL after a pause, replacing
 * the entry rather than adding one per keystroke; the URL changing from
 * elsewhere (a nav link to the bare page) empties the box to match.
 *
 * `alsoClear` names params a new term invalidates, like the page number.
 */
export const useUrlSearchTerm = (
    key: string,
    { delay = 300, alsoClear = [] as string[] } = {}
) => {
    const [params, setParams] = useSearchParams();
    const inUrl = params.get(key)?.trim() ?? "";

    const [term, setTerm] = useState(inUrl);
    const settled = useDebouncedValue(term.trim(), delay);
    // What this hook last agreed with the URL, so each side can tell its own
    // change from the other's.
    const agreed = useRef(inUrl);

    const clears = alsoClear.join(",");
    useEffect(() => {
        if (settled === agreed.current) return;
        agreed.current = settled;
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                if (settled) next.set(key, settled);
                else next.delete(key);
                for (const other of clears ? clears.split(",") : []) {
                    next.delete(other);
                }
                return next;
            },
            { replace: true }
        );
    }, [settled, key, clears, setParams]);

    useEffect(() => {
        if (inUrl === agreed.current) return;
        agreed.current = inUrl;
        setTerm(inUrl);
    }, [inUrl]);

    return { term, setTerm, value: inUrl || undefined };
};
