import { describe, expect, it } from "vitest";
import {
    getProfileGamesPerPage,
    getUserRelationColors,
    getUserRelationIcon,
    getUserRelationText,
} from "./friendRelation";
import { getLibraryGamesPerPage } from "../../LibraryPage/lib/gamesPerPage";

describe("friend relation button", () => {
    it("has an icon for every relation", () => {
        expect(getUserRelationIcon("friend")).toBe("user-group");
        expect(getUserRelationIcon("request-sent")).toBe("user-clock");
        expect(getUserRelationIcon("request-received")).toBe("user-check");
        expect(getUserRelationIcon(null)).toBe("user-plus");
    });

    describe("label", () => {
        it("switches to the destructive wording on hover", () => {
            expect(getUserRelationText("friend", false, false)).toBe("Friends");
            expect(getUserRelationText("friend", true, false)).toBe(
                "Remove Friend"
            );
        });

        it("shows the destructive wording on small screens without hover", () => {
            expect(getUserRelationText("friend", false, true)).toBe(
                "Remove Friend"
            );
        });

        it("handles a sent request the same way", () => {
            expect(getUserRelationText("request-sent", false, false)).toBe(
                "Request Sent"
            );
            expect(getUserRelationText("request-sent", true, false)).toBe(
                "Cancel Request"
            );
        });

        it("shortens the accept label on small screens", () => {
            expect(getUserRelationText("request-received", false, false)).toBe(
                "Accept Request"
            );
            expect(getUserRelationText("request-received", false, true)).toBe(
                "Accept"
            );
        });

        it("offers to add when there is no relationship", () => {
            expect(getUserRelationText(null, false, false)).toBe("Add Friend");
        });
    });

    it("returns literal class strings for every relation", () => {
        for (const relation of [
            "friend",
            "request-sent",
            "request-received",
            null,
        ] as const) {
            const classes = getUserRelationColors(relation);
            expect(classes).toMatch(/text-/);
            expect(classes).toMatch(/border-/);
            expect(classes).not.toContain("${");
        }
    });
});

describe("games per page", () => {
    it("steps the profile grid at each breakpoint", () => {
        expect(getProfileGamesPerPage(1280)).toBe(27);
        expect(getProfileGamesPerPage(1279)).toBe(21);
        expect(getProfileGamesPerPage(1024)).toBe(21);
        expect(getProfileGamesPerPage(1023)).toBe(28);
        expect(getProfileGamesPerPage(768)).toBe(28);
        expect(getProfileGamesPerPage(767)).toBe(24);
    });

    it("computes the library grid from the viewport", () => {
        // 1440x900: (1440-400+4)/109 = 9 across, (900-300)/140 = 4 down
        expect(getLibraryGamesPerPage(1440, 900)).toBe(36);
    });

    it("never returns zero for a short viewport", () => {
        expect(getLibraryGamesPerPage(1200, 320)).toBeGreaterThanOrEqual(1);
    });

    it("uses fixed counts below the large breakpoint", () => {
        expect(getLibraryGamesPerPage(500, 800)).toBe(18);
        expect(getLibraryGamesPerPage(600, 800)).toBe(20);
        expect(getLibraryGamesPerPage(1000, 800)).toBe(18);
    });
});
