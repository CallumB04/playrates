import { describe, expect, it } from "vitest";
import {
    joinPosts,
    parseChecklist,
    postsByName,
    upNext,
    type TikTokPostFile,
} from "./tiktokPosts";

const CHECKLIST = `# TikTok posts

Tick one off like this:

    - [x] [example](posts/example.json) — 2026-01-01 — https://example.com

- [x] [Horror](posts/best-horror-games.json) — 2026-10-14 — https://www.tiktok.com/@playratesapp/photo/123
- [X] [best-rpgs](posts/best-rpgs.json) — 2026-10-18
- [ ] [best-indie-games](posts/best-indie-games.json)
- [ ] a line that isn't a post
`;

const file = (title: string): TikTokPostFile => ({
    tiktok: {
        title,
        description: "",
        song: { track: "", artist: "", why: "" },
        altSong: { track: "", artist: "", why: "" },
        musicSearch: "",
        pinnedComment: "",
        when: "",
    },
    games: [],
});

describe("parseChecklist", () => {
    it("reads each task's post, tick, date and link, in order", () => {
        expect(parseChecklist(CHECKLIST)).toEqual([
            {
                name: "best-horror-games",
                posted: true,
                date: "2026-10-14",
                url: "https://www.tiktok.com/@playratesapp/photo/123",
            },
            { name: "best-rpgs", posted: true, date: "2026-10-18", url: null },
            {
                name: "best-indie-games",
                posted: false,
                date: null,
                url: null,
            },
        ]);
    });

    it("ignores the indented example and tasks that don't link a post", () => {
        const names = parseChecklist(CHECKLIST).map((entry) => entry.name);
        expect(names).not.toContain("example");
        expect(names).toHaveLength(3);
    });

    it("copes with Windows line endings", () => {
        expect(
            parseChecklist(
                "- [ ] [a](posts/a.json)\r\n- [x] [b](posts/b.json)\r\n"
            )
        ).toHaveLength(2);
    });
});

describe("postsByName", () => {
    it("keys each module by its file name", () => {
        expect(
            postsByName({
                "../../../../../marketing/tiktok/posts/best-rpgs.json": 1,
            })
        ).toEqual({ "best-rpgs": 1 });
    });
});

describe("joinPosts", () => {
    const checklist = parseChecklist(CHECKLIST);

    it("keeps the checklist's order and attaches each post's file", () => {
        const rows = joinPosts(checklist, {
            "best-indie-games": file("Indie"),
            "best-horror-games": file("Horror"),
            "best-rpgs": file("RPGs"),
        });
        expect(rows.map((row) => row.file?.tiktok.title)).toEqual([
            "Horror",
            "RPGs",
            "Indie",
        ]);
    });

    it("puts a post nobody listed at the end, unposted", () => {
        const rows = joinPosts(checklist, {
            "best-horror-games": file("Horror"),
            "best-rpgs": file("RPGs"),
            "best-indie-games": file("Indie"),
            "weekend-games": file("Weekend"),
        });
        expect(rows.at(-1)).toMatchObject({
            name: "weekend-games",
            listed: false,
            posted: false,
        });
    });

    it("keeps a listed post whose file is missing, without one", () => {
        const rows = joinPosts(checklist, { "best-rpgs": file("RPGs") });
        expect(rows[0]).toMatchObject({
            name: "best-horror-games",
            file: null,
        });
    });
});

describe("upNext", () => {
    it("is the first listed post not yet posted", () => {
        const rows = joinPosts(parseChecklist(CHECKLIST), {
            "best-horror-games": file("Horror"),
            "best-rpgs": file("RPGs"),
            "best-indie-games": file("Indie"),
        });
        expect(upNext(rows)?.name).toBe("best-indie-games");
    });

    it("skips one with no file, and is nothing once all are posted", () => {
        const pending = joinPosts(
            parseChecklist("- [ ] [a](posts/a.json)\n- [ ] [b](posts/b.json)"),
            { b: file("B") }
        );
        expect(upNext(pending)?.name).toBe("b");

        const done = joinPosts(parseChecklist("- [x] [a](posts/a.json)"), {
            a: file("A"),
        });
        expect(upNext(done)).toBeNull();
    });
});
