import { useEffect, useRef, useState } from "react";
import type { ColourToken } from "../../../styles/tokenCatalogue";
import { useTheme } from "../../../contexts/ThemeContext";

/**
 * One colour token: the swatch, its utility name, and the value it currently
 * resolves to.
 *
 * The value is read from the DOM rather than hardcoded, so it always reflects
 * the live theme — which means this page cannot drift out of date with
 * tokens.css the way a hand-written table would.
 */
const TokenSwatch = ({ token }: { token: ColourToken }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [resolved, setResolved] = useState("");
    const { theme } = useTheme();

    useEffect(() => {
        if (!ref.current) return;
        const channels = getComputedStyle(ref.current)
            .getPropertyValue(token.cssVar)
            .trim();
        if (!channels) {
            setResolved("");
            return;
        }
        const [r, g, b] = channels.split(/\s+/).map(Number);
        const hex = [r, g, b].every((n) => Number.isFinite(n))
            ? `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`
            : "";
        setResolved(hex);
        // re-read whenever the theme flips
    }, [token.cssVar, theme]);

    return (
        <div ref={ref} className="flex items-start gap-3">
            <div
                className={`size-12 shrink-0 rounded-md border border-subtle ${token.swatchClass}`}
            ></div>
            <div className="min-w-0">
                <p className="truncate font-mono text-sm text-content">
                    {token.name}
                </p>
                <p className="text-xs text-content-secondary">
                    {token.description}
                </p>
                {resolved && (
                    <p className="font-mono text-xs uppercase text-content-muted">
                        {resolved}
                    </p>
                )}
            </div>
        </div>
    );
};

export default TokenSwatch;
