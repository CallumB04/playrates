const hexPair = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, "0");

/**
 * Normalises a computed colour to hex. The scale comes from the function name,
 * not the numbers: `color(srgb 1 1 1)` is white and `rgb(1 1 1)` is not.
 * Anything unrecognised comes back unchanged so it stays debuggable.
 */
export const toHex = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.startsWith("#")) return trimmed.toLowerCase();

    const fn = trimmed.match(/^(rgba?|color)\(\s*(?:srgb\s+)?([^)]+)\)$/i);
    if (!fn) return trimmed;

    const isUnitScale = fn[1]!.toLowerCase() === "color";
    const parts = fn[2]!
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
    if (parts.length < 3 || !parts.slice(0, 3).every(Number.isFinite)) {
        return trimmed;
    }

    const scale = isUnitScale ? 255 : 1;
    const [r, g, b] = parts.slice(0, 3).map((n) => n * scale);
    const alpha = parts.length > 3 ? parts[3]! : 1;

    const base = `#${hexPair(r!)}${hexPair(g!)}${hexPair(b!)}`;
    return Number.isFinite(alpha) && alpha < 1
        ? `${base}${hexPair(alpha * 255)}`
        : base;
};
