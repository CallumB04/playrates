import { cn } from "../../lib/cn";

/** A full-width action along a panel's foot: "See all", say. For a Link as
 *  well as a button, so it takes a class rather than being a component. */
export const panelButtonClass = (accent = false, className?: string) =>
    cn(
        "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-sm border px-3 py-2 text-body-sm lift sm:min-h-0",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        accent
            ? "border-brand/40 text-brand-text hover:border-brand"
            : "border-subtle text-content-secondary hover:border-strong hover:text-content",
        className
    );
