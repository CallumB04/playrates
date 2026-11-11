import { describe, expect, it } from "vitest";
import { pushMessage } from "../../src/modules/push/push.messages.js";

describe("pushMessage", () => {
  it("opens a reply at the message", () => {
    expect(
      pushMessage(
        "community_reply",
        {
          threadId: 3,
          messageId: 9,
          excerpt: "Agreed",
          threadTitle: "Best RPG",
        },
        "ana",
        "me",
      ),
    ).toEqual({
      title: "ana replied to you",
      body: "Agreed",
      url: "/community/thread/3#message-9",
      tag: "reply:9",
    });
  });

  it("says a streak's day in the member's zone", () => {
    expect(
      pushMessage(
        "streak_at_risk",
        {
          weeks: 3,
          shield: false,
          endsAt: "2026-11-02T05:00:00Z",
          zone: "America/New_York",
        },
        null,
        "me",
      )?.title,
    ).toBe("Your 3 week streak needs something by Monday");
  });

  it("names a gift and opens where it's used", () => {
    const push = pushMessage(
      "gift_received",
      { item: "streak_shield", username: "ana" },
      null,
      "me",
    );
    expect(push?.url).toBe("/progress#streak");
    expect(push?.body).toMatch(/^ana sent you /);
  });

  it("says why a reply reached you", () => {
    const reply = (reason?: string) =>
      pushMessage(
        "community_reply",
        { threadId: 3, messageId: 9, reason },
        "ana",
        "me",
      )?.title;
    expect(reply()).toBe("ana replied to you");
    expect(reply("thread")).toBe("ana replied in your thread");
    expect(reply("conversation")).toBe("ana also replied");
  });

  it("pushes nothing it can't say properly", () => {
    expect(pushMessage("friend_request", {}, null, "me")).toBeNull();
    expect(
      pushMessage("community_reply", { threadId: 3 }, "ana", "me"),
    ).toBeNull();
    expect(pushMessage("announcement", { title: "x" }, null, "me")).toBeNull();
  });
});
