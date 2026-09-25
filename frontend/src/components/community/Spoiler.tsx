import { useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * A spoiler, blacked out until it is pressed. Once shown it stays shown:
 * hiding it again would only make the reader press it twice.
 *
 * Covered, it is a button named "Spoiler" and nothing else, so a screen
 * reader does not read out what a sighted reader cannot see.
 */
const Spoiler = ({ children }: { children: ReactNode }) => {
    const [shown, setShown] = useState(false);

    if (shown) {
        return (
            <span className="rounded-xs bg-surface-sunken box-decoration-clone px-0.5">
                {children}
            </span>
        );
    }

    const reveal = () => setShown(true);
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            reveal();
        }
    };

    return (
        <span
            role="button"
            tabIndex={0}
            aria-label="Spoiler. Press to reveal"
            title="Spoiler. Click to reveal"
            onClick={reveal}
            onKeyDown={onKeyDown}
            className={cn(
                "cursor-pointer rounded-xs bg-content-muted box-decoration-clone px-0.5 text-transparent select-none",
                "transition-colors hover:bg-content-secondary",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
                // Nested formatting would otherwise show through in its own colour.
                "[&_*]:text-transparent"
            )}
        >
            <span aria-hidden>{children}</span>
        </span>
    );
};

export default Spoiler;
