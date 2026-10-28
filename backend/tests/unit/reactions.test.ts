import { describe, expect, it } from "vitest";
import { react, reactionStates } from "../../src/lib/reactions.js";
import { createMemoryReactionRepo } from "../helpers/inMemoryReactions.js";

const store = () => {
  let rows: { review_id: number; user_id: string; reaction?: string }[] = [
    { review_id: 1, user_id: "b" },
  ];
  return createMemoryReactionRepo(
    () => rows,
    (next) => (rows = next),
    "review_id",
  );
};

const unlocked =
  (...keys: string[]) =>
  async () =>
    new Set(["upvote", ...keys]);

describe("react", () => {
  it("leaves one, takes the same one back, and counts only a first as added", async () => {
    const repo = store();
    const first = await react(repo, unlocked(), "a", 1, "upvote");
    expect(first.added).toBe(true);
    expect(first.state).toMatchObject({ voteCount: 2, myReaction: "upvote" });

    const again = await react(repo, unlocked(), "a", 1, "upvote");
    expect(again.added).toBe(false);
    expect(again.state).toMatchObject({ voteCount: 1, myReaction: null });
  });

  it("swaps one reaction for another without counting it twice", async () => {
    const repo = store();
    await react(repo, unlocked("fire"), "a", 1, "upvote");
    const swapped = await react(repo, unlocked("fire"), "a", 1, "fire");
    expect(swapped.added).toBe(false);
    expect(swapped.state).toMatchObject({
      voteCount: 2,
      myReaction: "fire",
      reactions: [
        { reaction: "upvote", count: 1 },
        { reaction: "fire", count: 1 },
      ],
    });
  });

  it("refuses a reaction that isn't unlocked, but never the upvote", async () => {
    const repo = store();
    await expect(react(repo, unlocked(), "a", 1, "fire")).rejects.toThrow(
      /isn't unlocked/,
    );
    await expect(
      react(repo, async () => new Set(), "a", 1, "upvote"),
    ).resolves.toMatchObject({ added: true });
  });
});

describe("reactionStates", () => {
  it("says what the viewer left, and tallies the rest, most first", async () => {
    const repo = store();
    await repo.set("c", 1, "fire");
    await repo.set("d", 1, "fire");
    const stateOf = await reactionStates(repo, "b", [1]);
    expect(stateOf(1, 3)).toEqual({
      voteCount: 3,
      votedByViewer: true,
      myReaction: "upvote",
      reactions: [
        { reaction: "fire", count: 2 },
        { reaction: "upvote", count: 1 },
      ],
    });
  });
});
