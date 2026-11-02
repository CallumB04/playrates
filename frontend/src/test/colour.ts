/**
 * The hue of the first colour in a CSS value, whichever way the browser
 * writes it back: jsdom 30 turns `hsl(...)` into `rgb(...)`, older versions
 * keep it. Null when there's no colour to read.
 */
export const firstHue = (value: string | undefined): number | null => {
    if (!value) return null;
    const hsl = /hsla?\(\s*([\d.]+)/.exec(value);
    if (hsl) return Number(hsl[1]);
    const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(value);
    if (!rgb) return null;
    const [r, g, b] = rgb.slice(1, 4).map((n) => Number(n) / 255) as [
        number,
        number,
        number,
    ];
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    if (d === 0) return 0;
    const h =
        max === r
            ? ((g - b) / d) % 6
            : max === g
              ? (b - r) / d + 2
              : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
};

/** Whether a CSS value's first colour has this hue, give or take the
 *  rounding of writing it as rgb. */
export const hasHue = (value: string | undefined, hue: number): boolean => {
    const found = firstHue(value);
    if (found === null) return false;
    const diff = Math.abs(found - hue) % 360;
    return Math.min(diff, 360 - diff) <= 1.5;
};
