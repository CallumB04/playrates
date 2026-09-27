import { useState } from "react";

/** Open-and-close state for a see-all popup. */
export const useSeeAll = () => {
    const [open, setOpen] = useState(false);
    return { open, show: () => setOpen(true), hide: () => setOpen(false) };
};
