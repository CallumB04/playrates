import { useEffect, useState } from "react";

const isClear = () => !document.querySelector('[aria-modal="true"]');

/**
 * Whether the page has no popup open, watched while `waiting`: for a
 * moment that should wait its turn rather than open over another. Once
 * clear it stays so until `waiting` starts again, so the moment's own
 * popup doesn't count against it.
 */
export const useNoDialogOpen = (waiting: boolean): boolean => {
    const [clear, setClear] = useState(false);

    useEffect(() => {
        if (!waiting) {
            setClear(false);
            return;
        }
        if (isClear()) {
            setClear(true);
            return;
        }
        const watch = new MutationObserver(() => {
            if (!isClear()) return;
            setClear(true);
            watch.disconnect();
        });
        watch.observe(document.body, { childList: true, subtree: true });
        return () => watch.disconnect();
    }, [waiting]);

    return clear;
};
