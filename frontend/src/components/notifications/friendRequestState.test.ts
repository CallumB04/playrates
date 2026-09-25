import { describe, expect, it } from "vitest";
import { friendRequestState } from "./friendRequestState";

describe("friendRequestState", () => {
    it("offers the buttons while the request is still yours to answer", () => {
        expect(friendRequestState("request-received")).toEqual({
            actionable: true,
        });
    });

    /* Accepting on the profile page has to disarm the row here too, or the
       inbox offers an Accept that would 404. */
    it("stops offering them once you are friends", () => {
        const state = friendRequestState("friend");

        expect(state.actionable).toBe(false);
        expect(state).toHaveProperty("note", "You are friends now.");
    });

    it("says so when the request has gone", () => {
        const state = friendRequestState(null);

        expect(state.actionable).toBe(false);
        expect(state).toHaveProperty(
            "note",
            "That request is no longer open."
        );
    });

    it("covers the request having flipped direction", () => {
        expect(friendRequestState("request-sent")).toEqual({
            actionable: false,
            note: "Waiting on them.",
        });
    });
});
