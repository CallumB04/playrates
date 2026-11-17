import { eventLogo, type EventLogoKey } from "@playrates/shared";
import { cn } from "../../lib/cn";

/**
 * An event's own logo, in the page's text colour so it reads in either
 * theme. Sized by its height (`h-*`); the width follows the logo's shape.
 * Drawn as a mask over a colour rather than as an image, which a single
 * colour file couldn't do in both themes.
 */
const EventLogo = ({
    logo,
    className,
}: {
    logo: EventLogoKey | null;
    className?: string;
}) => {
    const found = eventLogo(logo);
    if (!found) return null;
    const mask = `url("${found.path}") left center / contain no-repeat`;
    return (
        <span
            role="img"
            aria-label={found.name}
            className={cn("inline-block shrink-0 bg-current", className)}
            style={{
                aspectRatio: String(found.ratio),
                mask,
                WebkitMask: mask,
            }}
        />
    );
};

export default EventLogo;
