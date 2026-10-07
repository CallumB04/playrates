import { afterEach, describe, expect, it, vi } from "vitest";
import {
    clearThreadDraft,
    hasContent,
    readThreadDraft,
    writeThreadDraft,
    type ThreadDraft,
} from "./drafts";

const empty: ThreadDraft = { game: null, title: "", body: null };

// jsdom under Node 26 doesn't always provide one.
const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
});

afterEach(() => {
    vi.restoreAllMocks();
    clearThreadDraft();
});

describe("thread drafts", () => {
    it("keeps a draft until it's cleared", () => {
        writeThreadDraft({ ...empty, title: "Best boss fight?" });
        expect(readThreadDraft()?.title).toBe("Best boss fight?");

        clearThreadDraft();
        expect(readThreadDraft()).toBeNull();
    });

    it("counts a draft worth keeping only when something is in it", () => {
        expect(hasContent(empty)).toBe(false);
        expect(hasContent({ ...empty, title: "   " })).toBe(false);
        expect(
            hasContent({
                ...empty,
                body: { type: "doc", content: [{ type: "paragraph" }] },
            })
        ).toBe(false);
        expect(hasContent({ ...empty, title: "Hi" })).toBe(true);
        expect(
            hasContent({
                ...empty,
                game: { id: 1, title: "Stray", coverUrl: null },
            })
        ).toBe(true);
    });

    /* A private window or blocked site data: no draft, and nothing breaks. */
    it("goes without a draft when storage refuses", () => {
        vi.spyOn(localStorage, "getItem").mockImplementation(() => {
            throw new Error("denied");
        });
        vi.spyOn(localStorage, "setItem").mockImplementation(() => {
            throw new Error("denied");
        });

        expect(() => writeThreadDraft({ ...empty, title: "x" })).not.toThrow();
        expect(readThreadDraft()).toBeNull();
    });
});
