import { describe, expect, it } from "vitest";
import { QUESTS } from "@playrates/shared";
import { questPath } from "./questPath";

describe("questPath", () => {
    it("sends each task to where it's done", () => {
        expect(questPath("w_rate3", "me")).toBe("/user/me/games?type=played");
        expect(questPath("w_finish1", "me")).toBe(
            "/user/me/games?type=playing"
        );
        expect(questPath("w_play2", "me")).toBe("/library");
        expect(questPath("w_list", "me")).toBe("/user/me/lists");
        expect(questPath("w_post1", "me")).toBe("/community");
    });

    it("has somewhere for every task there is", () => {
        for (const q of QUESTS) expect(questPath(q.key, "me")).not.toBeNull();
    });

    it("places nothing for a task it doesn't know", () => {
        expect(questPath("retired", "me")).toBeNull();
    });
});
