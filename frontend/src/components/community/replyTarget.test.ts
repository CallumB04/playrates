import { describe, expect, it } from "vitest";
import { replyParentId } from "./replyTarget";

describe("replyParentId", () => {
    it("answers the opening message at the top level", () => {
        expect(
            replyParentId({ id: 1, parentId: null, isOpening: true })
        ).toBeNull();
    });

    it("answers a top-level reply underneath it", () => {
        expect(replyParentId({ id: 4, parentId: null, isOpening: false })).toBe(
            4
        );
    });

    it("answers a nested reply under the same parent, not deeper", () => {
        expect(replyParentId({ id: 9, parentId: 4, isOpening: false })).toBe(4);
    });
});
