import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
    EFFECT_TOKENS,
    RAMPS,
    SEMANTIC_GROUPS,
    TYPE_SCALE,
} from "./tokenCatalogue";

/*
 * The catalogue describes what theme.css defines. Nothing here renders, so a
 * token that gets renamed or dropped would otherwise only show up as a blank
 * swatch someone has to notice. This makes "keep the two in step" an enforced
 * invariant instead of a comment.
 */
// Read off disk rather than imported: under jsdom `import.meta.url` is an
// http URL, and importing the CSS would run it through the Tailwind pipeline.
const css = readFileSync(
    resolve(process.cwd(), "src/styles/theme.css"),
    "utf8"
);

const declares = (cssVar: string) =>
    new RegExp(`^\\s*\\${cssVar}\\s*:`, "m").test(css);

const bridges = (name: string) =>
    new RegExp(`^\\s*--color-${name}\\s*:`, "m").test(css);

describe("token catalogue", () => {
    it("only names ramp steps that theme.css declares", () => {
        for (const ramp of RAMPS) {
            for (const step of ramp.steps) {
                expect(
                    declares(step.cssVar),
                    `${ramp.name} ${step.cssVar}`
                ).toBe(true);
            }
        }
    });

    it("only names semantic tokens that theme.css declares", () => {
        for (const group of SEMANTIC_GROUPS) {
            for (const token of group.tokens) {
                expect(
                    declares(token.cssVar),
                    `${group.title} ${token.cssVar}`
                ).toBe(true);
            }
        }
    });

    it("bridges every semantic colour into a utility", () => {
        // The name in the catalogue is the utility suffix, so bg-<name> has to
        // exist — that is the thing a component will actually type.
        const skip = new Set(["border (default)"]);
        for (const group of SEMANTIC_GROUPS) {
            for (const token of group.tokens) {
                if (skip.has(token.name) || token.name.startsWith("border-")) {
                    continue;
                }
                expect(bridges(token.name), `--color-${token.name}`).toBe(true);
            }
        }
    });

    it("only names effect tokens that theme.css declares", () => {
        for (const effect of EFFECT_TOKENS) {
            expect(declares(effect.cssVar), effect.name).toBe(true);
        }
    });

    it("only names type steps that theme.css declares", () => {
        for (const step of TYPE_SCALE) {
            const utility = step.utility
                .split(" ")
                .find((c) => c.startsWith("text-"));
            expect(utility, step.name).toBeDefined();
            const token = `--${utility!.replace("text-", "text-")}`;
            expect(declares(token), `${step.name} → ${token}`).toBe(true);
        }
    });

    it("has no duplicate token names across groups", () => {
        const names = SEMANTIC_GROUPS.flatMap((g) =>
            g.tokens.map((t) => t.name)
        );
        expect(new Set(names).size).toBe(names.length);
    });
});
