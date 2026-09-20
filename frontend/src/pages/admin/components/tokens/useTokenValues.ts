import { useEffect, useState } from "react";
import { toHex } from "../../../../lib/colour";

export interface TokenValue {
    light: string;
    dark: string;
}

/**
 * Resolves custom properties in both themes at once, by probing an off-screen
 * `.light` and `.dark` scope.
 *
 * Two things make this the right approach rather than reading the custom
 * property directly. A custom property's computed value is the *unevaluated*
 * text, so `color-mix(…)` and chains of `var()` come back as recipes; assigning
 * it to a real colour property makes the browser resolve them for us. And
 * probing both scopes means the table reads the same whichever theme you happen
 * to be browsing in — which is the whole point of a two-mapping token system.
 */
export const useTokenValues = (
    cssVars: readonly string[]
): Record<string, TokenValue> => {
    const [values, setValues] = useState<Record<string, TokenValue>>({});
    const key = cssVars.join("|");

    useEffect(() => {
        const host = document.createElement("div");
        host.style.cssText =
            "position:fixed;left:-9999px;top:0;width:0;height:0;overflow:hidden";

        const scopes = { light: "light", dark: "dark" } as const;
        const probes: Record<keyof typeof scopes, HTMLElement> = {} as never;

        for (const [theme, className] of Object.entries(scopes)) {
            const scope = document.createElement("div");
            scope.className = className;
            host.appendChild(scope);
            probes[theme as keyof typeof scopes] = scope;
        }
        document.body.appendChild(host);

        const next: Record<string, TokenValue> = {};
        for (const cssVar of key.split("|").filter(Boolean)) {
            const read = (scope: HTMLElement) => {
                const probe = document.createElement("span");
                probe.style.backgroundColor = `var(${cssVar})`;
                scope.appendChild(probe);
                const resolved = getComputedStyle(probe).backgroundColor;
                probe.remove();
                return toHex(resolved);
            };
            next[cssVar] = {
                light: read(probes.light),
                dark: read(probes.dark),
            };
        }

        host.remove();
        setValues(next);
    }, [key]);

    return values;
};
