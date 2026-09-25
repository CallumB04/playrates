import { useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * A spoiler, covered until it is asked for. A pointer uncovers it while it
 * hovers and covers it again on the way out; a tap, a click or Enter holds
 * it open, since a touch screen has no hover to lend, and pressing again
 * covers it. Uncovered, a faint cover stays behind so it still reads as
 * the spoiled part. The look is `.spoiler` in theme.css.
 *
 * Covered, it is a button named "Spoiler" and nothing else, so a screen
 * reader does not read out what a sighted reader cannot see.
 */
const Spoiler = ({ children }: { children: ReactNode }) => {
    const [held, setHeld] = useState(false);

    const toggle = () => setHeld((open) => !open);
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
        }
    };

    return (
        <span
            role="button"
            tabIndex={0}
            aria-pressed={held}
            aria-label={held ? undefined : "Spoiler. Press to reveal"}
            title={held ? "Press to hide" : "Spoiler. Hover or press to reveal"}
            data-shown={held || undefined}
            onClick={toggle}
            onKeyDown={onKeyDown}
            className="spoiler focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
        >
            <span aria-hidden={!held}>{children}</span>
        </span>
    );
};

export default Spoiler;
