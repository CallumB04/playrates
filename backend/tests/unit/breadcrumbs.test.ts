import { describe, expect, it } from "vitest";
import {
  hubTrail,
  listTrail,
  newThreadTrail,
  reviewTrail,
} from "@playrates/shared";

const names = (trail: { name: string }[]) => trail.map((c) => c.name);

describe("breadcrumb trails", () => {
  it("puts a list under its owner's lists, ending on the list", () => {
    expect(listTrail("ana", { id: 7, name: "Best of" })).toEqual([
      { name: "ana", path: "/user/ana" },
      { name: "Lists", path: "/user/ana/lists" },
      { name: "Best of", path: "/user/ana/lists/7" },
    ]);
  });

  it("puts a slice of the library under it, and games like one under that game", () => {
    expect(names(hubTrail({ kind: "year", year: 2019 }))).toEqual([
      "Library",
      "Best games of 2019",
    ]);
    expect(
      hubTrail({ kind: "similar", gameId: 3, title: "Hades" }).map(
        (c) => c.path,
      ),
    ).toEqual(["/library", "/game/3", "/game/3/similar"]);
  });

  it("names no one on a review whose author's profile isn't open", () => {
    const review = { id: 9, game: { id: 3, title: "Hades" } };
    expect(names(reviewTrail({ ...review, author: "ana" }))).toEqual([
      "Library",
      "Hades",
      "ana’s review",
    ]);
    expect(reviewTrail({ ...review, author: null }).at(-1)!.name).toBe(
      "A review",
    );
  });

  it("leads a thread started from a game back to that game", () => {
    expect(names(newThreadTrail())).toEqual(["Community", "Start a thread"]);
    expect(newThreadTrail({ id: 3, title: "Hades" })[0]).toEqual({
      name: "Hades",
      path: "/game/3",
    });
  });
});
