import { describe, expect, it } from "vitest";
import { splitReleaseTitle } from "./releaseTitle";

describe("splitReleaseTitle", () => {
    it.each([
        ["v1.1.2", { version: "v1.1.2", name: null }],
        ["v1.1 - Major updates", { version: "v1.1", name: "Major updates" }],
        [
            "v1.0 – Official Launch",
            { version: "v1.0", name: "Official Launch" },
        ],
        ["v2: The big one", { version: "v2", name: "The big one" }],
        ["v1.2 Winter update", { version: "v1.2", name: "Winter update" }],
        ["Holiday update", { version: null, name: "Holiday update" }],
        // A word that happens to start with v isn't a version.
        ["vacation mode", { version: null, name: "vacation mode" }],
    ])("splits %s", (title, parts) => {
        expect(splitReleaseTitle(title)).toEqual(parts);
    });
});
