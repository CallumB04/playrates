import type { Platform } from "@playrates/shared";

/**
 * The ledger line under a tile has room for one platform. Takes the first in
 * the catalogue's own sort order, and says how many others there are rather
 * than silently dropping them.
 */
export const primaryPlatformLabel = (
    slugs: string[],
    platforms: Platform[]
): string => {
    if (slugs.length === 0) return "—";

    const ordered = platforms.filter((p) => slugs.includes(p.slug));
    const first = ordered[0]?.displayName ?? slugs[0]!;
    const rest = slugs.length - 1;

    return rest > 0 ? `${first} +${rest}` : first;
};
