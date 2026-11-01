import { describe, expect, it } from "vitest";
import { eventEmail } from "../../src/modules/email/email.events.js";
import type { EmailLinks } from "../../src/modules/email/email.templates.js";

const links: EmailLinks = {
  site: "https://playrates.test",
  unsubscribe: "https://playrates.test/unsubscribe?t=x",
  settings: "https://playrates.test/settings?section=emails",
};
const me = { username: "callum", avatar_url: null };
const ana = { username: "ana", avatar_url: null };

describe("eventEmail for the newer kinds", () => {
  it("needs an actor for an accepted request", () => {
    expect(eventEmail("friend_accepted", {}, me, null, links)).toBeNull();
    expect(eventEmail("friend_accepted", {}, me, ana, links)?.subject).toBe(
      "ana accepted your friend request",
    );
  });

  it.each([
    [
      "community_upvote_milestone",
      { threadId: 1, messageId: 2, threadTitle: "Best RPG", milestone: 5 },
      "5 reactions on your message in Best RPG",
    ],
    [
      "review_upvote_milestone",
      { gameId: 1, reviewId: 2, gameTitle: "Hades", milestone: 10 },
      "10 reactions on your review of Hades",
    ],
    [
      "list_upvote_milestone",
      { listId: 3, listName: "Cosy", milestone: 20 },
      "20 loves on your list Cosy",
    ],
    [
      "gaming_25_love_milestone",
      { milestone: 50 },
      "50 loves on your Gaming 25",
    ],
  ] as const)("says what %s reached", (kind, data, subject) => {
    const email = eventEmail(kind, data, me, null, links);
    expect(email?.subject).toBe(subject);
  });

  it("falls back to the owner's name for a list or Gaming 25 link", () => {
    expect(
      eventEmail(
        "list_upvote_milestone",
        { listId: 3, listName: "Cosy", milestone: 5 },
        me,
        null,
        links,
      )?.text,
    ).toContain("/user/callum/lists/3");
    expect(
      eventEmail("gaming_25_love_milestone", { milestone: 5 }, me, null, links)
        ?.text,
    ).toContain("/user/callum/gaming-25");
  });

  it.each([
    ["community_upvote_milestone", { threadId: 1, milestone: 5 }],
    ["review_upvote_milestone", { gameId: 1, milestone: 5 }],
    ["list_upvote_milestone", { listId: 1, milestone: 5 }],
    ["gaming_25_love_milestone", {}],
    ["streak_at_risk", { weeks: 2 }],
    ["task_nearly_done", { label: "Rate 3", count: 2 }],
  ] as const)("sends nothing for %s missing what it needs", (kind, data) => {
    expect(eventEmail(kind, data, me, null, links)).toBeNull();
  });

  it("counts a task's reward as nothing when the data leaves it out", () => {
    const email = eventEmail(
      "task_nearly_done",
      { label: "Rate 3", count: 2, target: 3, endsAt: "2026-11-02T00:00:00Z" },
      me,
      null,
      links,
    );
    expect(email?.text).toContain("Finish it for 0 XP and 0 tokens.");
    expect(email?.text).toContain("ends Monday");
  });

  it("sends nothing for a kind with no email", () => {
    expect(eventEmail("announcement", {}, me, null, links)).toBeNull();
  });
});
