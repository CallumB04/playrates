import { describe, expect, it } from "vitest";
import { noteFrom, problemWith, row } from "./patchNoteDraft";

const draft = (over: Partial<Parameters<typeof noteFrom>[0]> = {}) => ({
    title: "v1.2",
    intro: "",
    rows: [row("feature", "Added lists", "/lists")],
    outro: "",
    ...over,
});

describe("noteFrom", () => {
    it("trims, empties to null, and leaves out blank rows", () => {
        expect(
            noteFrom(
                draft({
                    title: "  v1.2 ",
                    intro: " Hi ",
                    rows: [row("fix", " Fixed it ", "  "), row("other", "  ")],
                })
            )
        ).toEqual({
            title: "v1.2",
            intro: "Hi",
            items: [{ kind: "fix", text: "Fixed it", link: null }],
            outro: null,
        });
    });
});

describe("problemWith", () => {
    const check = (d: ReturnType<typeof draft>) =>
        problemWith(noteFrom(d), d.rows);

    it("is happy with a title and a change", () => {
        expect(check(draft())).toBeNull();
    });

    it("asks for a title", () => {
        expect(check(draft({ title: " " }))).toMatch(/title/);
    });

    it("turns away a link that goes nowhere safe", () => {
        expect(
            check(draft({ rows: [row("feature", "x", "http://example.com")] }))
        ).toMatch(/https/);
    });

    it("needs a change or a message, and either will do", () => {
        expect(check(draft({ rows: [row()] }))).toMatch(/change or a message/);
        expect(check(draft({ rows: [row()], outro: "Thanks" }))).toBeNull();
    });
});
