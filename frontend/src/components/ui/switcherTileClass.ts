import { cn } from "../../lib/cn";

/** One section in the sheet. Its look, for a link or a button to wear. */
export const switcherTileClass = (active: boolean) =>
    cn(
        "flex min-h-[76px] w-full cursor-pointer flex-col justify-between gap-2 rounded-md border p-3 text-left lift",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
        active
            ? "border-brand/60 bg-brand-subtle text-content"
            : "border-subtle text-content-secondary hover:border-strong hover:bg-surface-hover hover:text-content"
    );
