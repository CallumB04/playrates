import { describe, expect, it } from "vitest";
import type { RichTextDoc } from "@playrates/shared";
import {
  announcementEmail,
  digestEmail,
  endDay,
  streakEmail,
  taskEmail,
  friendRequestEmail,
  giftEmail,
  giftItemName,
  giftPath,
  inviteActiveEmail,
  inviteJoinedEmail,
  patchNotesEmail,
  replyEmail,
  welcomeEmail,
  wishlistReleaseEmail,
  type EmailLinks,
  type RenderedEmail,
} from "../../src/modules/email/email.templates.js";
import {
  richTextToEmailHtml,
  richTextToEmailText,
} from "../../src/modules/email/email.richText.js";

const links: EmailLinks = {
  site: "https://playrates.test",
  unsubscribe: "https://playrates.test/unsubscribe?t=TOKEN",
  settings: "https://playrates.test/settings?section=emails",
};

const EVIL = `<script>alert("x")</script>`;

/** Every email, with a member-written value full of markup wherever one
 *  can go. */
const everyEmail = (): [string, RenderedEmail][] => [
  ["friend request", friendRequestEmail({ actor: EVIL, actorAvatar: null, recipient: "me" }, links)],
  [
    "reply",
    replyEmail(
      { actor: EVIL, threadId: 3, threadTitle: EVIL, messageId: 9, excerpt: EVIL },
      links,
    ),
  ],
  ["gift", giftEmail({ giver: EVIL, giverAvatar: null, item: "frame_neon", recipient: "me" }, links)],
  ["invite joined", inviteJoinedEmail({ username: EVIL, xp: 300, tokens: 50 }, links)],
  ["invite active", inviteActiveEmail({ username: EVIL, xp: 250, tokens: 50 }, links)],
  [
    "wishlist",
    wishlistReleaseEmail(
      { games: [{ id: 1, title: EVIL, coverUrl: null }], username: "me" },
      links,
    ),
  ],
  ["welcome", welcomeEmail({ username: "me", firstName: EVIL }, links)],
  ["announcement", announcementEmail({ tone: "update", title: EVIL, body: EVIL, link: null }, links)],
  [
    "patch notes",
    patchNotesEmail(
      {
        subject: "New patch notes",
        title: EVIL,
        doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: EVIL }] }] },
        link: "/community/thread/7#message-41",
      },
      links,
    ),
  ],
];

describe("email templates", () => {
  it.each(everyEmail())("escapes what members wrote in the %s email", (_, email) => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it.each(everyEmail())("gives the %s email its ways out", (_, email) => {
    expect(email.html).toContain(links.unsubscribe);
    expect(email.html).toContain(links.settings);
    expect(email.text).toContain(links.unsubscribe);
    expect(email.text).toContain(links.settings);
  });

  it.each(everyEmail())("links the %s email only to absolute addresses", (_, email) => {
    const hrefs = [...email.html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^(https:|mailto:)/);
  });

  it("calls every way out of the welcome email all emails", () => {
    const email = welcomeEmail({ username: "me", firstName: null }, links);
    expect(email.html).toContain("Turn off all emails");
    expect(email.subject).toBe("Welcome to PlayRates");
    expect(email.html).toContain("Welcome to PlayRates, me");
    expect(email.html).toContain("https://playrates.test/user/me/gaming-25");
  });

  it("sends a friend request to the recipient's own requests", () => {
    const email = friendRequestEmail(
      { actor: "ana", actorAvatar: "https://cdn.test/a.webp", recipient: "bo" },
      links,
    );
    expect(email.subject).toBe("ana sent you a friend request");
    expect(email.html).toContain('href="https://playrates.test/user/bo/friends"');
    expect(email.html).toContain('src="https://cdn.test/a.webp"');
  });

  it("lands a reply on the message itself", () => {
    const email = replyEmail(
      { actor: "ana", threadId: 3, threadTitle: "Best RPG", messageId: 9, excerpt: "Agreed" },
      links,
    );
    expect(email.html).toContain("https://playrates.test/community/thread/3#message-9");
    expect(email.subject).toBe("ana replied to you in Best RPG");
  });

  it("names a gift as the shop does, and sends it where it's used", () => {
    expect(giftItemName("frame_neon")).toBe("the Neon frame");
    expect(giftItemName("streak_shield")).toBe("a spare streak shield");
    expect(giftItemName("no_such_item")).toBe("something from the shop");
    expect(giftPath("slot_pinned_review", "bo")).toBe("/user/bo?edit=pinned_reviews");
    expect(giftPath("slot_showcase", "bo")).toBe("/user/bo/badges?edit=showcase");
    expect(giftPath("slot_pinned_list", "bo")).toBe("/user/bo?edit=pinned_lists");
    expect(giftPath("streak_shield", "bo")).toBe("/progress#streak");
    expect(giftPath("colour_ember", "bo")).toBe("/progress#name");
    expect(giftPath("frame_neon", "bo")).toBe("/progress#frame");
    expect(giftPath("no_such_item", "bo")).toBe("/shop");
  });

  it("says what an invite paid", () => {
    expect(inviteActiveEmail({ username: "cy", xp: 250, tokens: 50 }, links).text).toContain(
      "250 XP and 50 tokens",
    );
    const joined = inviteJoinedEmail({ username: "cy", xp: 300, tokens: 50 }, links).text;
    expect(joined).toContain("300 XP and 50 tokens");
    expect(joined).not.toContain("games");
  });

  it("names a lone release, and counts several", () => {
    const one = wishlistReleaseEmail(
      { games: [{ id: 4, title: "Hades II", coverUrl: "https://images.test/c.jpg" }], username: "bo" },
      links,
    );
    expect(one.subject).toBe("Hades II is out today");
    expect(one.html).toContain('href="https://playrates.test/game/4"');
    expect(one.html).toContain('src="https://images.test/c.jpg"');

    const two = wishlistReleaseEmail(
      {
        games: [
          { id: 4, title: "Hades II", coverUrl: null },
          { id: 5, title: "Silksong", coverUrl: null },
        ],
        username: "bo",
      },
      links,
    );
    expect(two.subject).toBe("2 games on your wishlist are out today");
    expect(two.html).toContain("https://playrates.test/game/5");
    expect(two.html).toContain("https://playrates.test/user/bo/games?type=wishlist");
  });

  it("makes an announcement's in-app links absolute and leaves others be", () => {
    const email = announcementEmail(
      {
        tone: "warning",
        title: "Downtime",
        body: "See [the notes](/community) or [status](https://status.test).\nThanks",
        link: "/settings",
      },
      links,
    );
    expect(email.subject).toBe("Downtime");
    expect(email.html).toContain('href="https://playrates.test/community"');
    expect(email.html).toContain('href="https://status.test"');
    expect(email.html).toContain('href="https://playrates.test/settings"');
    expect(email.html).toContain("Heads up");
    expect(email.html).toContain("<br>Thanks");
    expect(email.text).toContain("the notes (https://playrates.test/community)");
  });

  it("leaves the button off an announcement with no link", () => {
    const email = announcementEmail(
      { tone: "info", title: "Hi", body: "Just saying.", link: null },
      links,
    );
    expect(email.html).not.toContain("Take a look");
  });

  it("puts a patch notes entry in the email under its own title", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "v1.1 Lists" }] },
        { type: "paragraph", content: [{ type: "text", text: "Lists are here." }] },
      ],
    };
    const email = patchNotesEmail(
      { subject: "New patch notes: v1.1 Lists", title: "v1.1 Lists", doc, link: "/community/thread/7#message-41" },
      links,
    );
    expect(email.subject).toBe("New patch notes: v1.1 Lists");
    // The heading is the title, not said twice.
    expect(email.html.match(/v1\.1 Lists/g)).toHaveLength(2); // <title> and <h1>
    expect(email.html).toContain("Lists are here.");
    expect(email.html).toContain("https://playrates.test/community/thread/7#message-41");
  });

  it("uses no em dashes anywhere", () => {
    for (const [, email] of everyEmail()) {
      expect(email.subject + email.html + email.text).not.toContain("—");
    }
  });
});

describe("rich text in an email", () => {
  const doc: RichTextDoc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "New" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Bold", marks: [{ type: "bold" }] },
          { type: "text", text: " and " },
          { type: "text", text: "slanted", marks: [{ type: "italic" }, { type: "underline" }] },
          { type: "hardBreak" },
          { type: "text", text: "the end is " },
          { type: "text", text: "a twist", marks: [{ type: "spoiler" }] },
          { type: "text", text: " really", marks: [{ type: "spoiler" }, { type: "bold" }] },
        ],
      },
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] },
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Two" }] },
              {
                type: "orderedList",
                attrs: { start: 3 },
                content: [
                  { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Three" }] }] },
                ],
              },
            ],
          },
        ],
      },
      { type: "image", attrs: { src: "https://cdn.test/i.webp", alt: "A <b>map</b>" } },
      { type: "image", attrs: { src: "https://cdn.test/j.webp" } },
      { type: "paragraph" },
    ],
  };

  it("keeps headings, marks, breaks and lists", () => {
    const html = richTextToEmailHtml(doc);
    expect(html).toContain("<h3");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<u><em>slanted</em></u>");
    expect(html).toContain("<br>the end is ");
    expect(html).toMatch(/<ul[^>]*><li[^>]*>One<\/li><li[^>]*>Two<br><ol start="3"/);
  });

  it("hides a run of spoiled words behind one placeholder", () => {
    const html = richTextToEmailHtml(doc);
    expect(html).not.toContain("twist");
    expect(html.match(/\[spoiler\]/g)).toHaveLength(1);
  });

  it("says what a picture showed, rather than showing it", () => {
    const html = richTextToEmailHtml(doc);
    expect(html).not.toContain("<img");
    expect(html).toContain("<em>A &lt;b&gt;map&lt;/b&gt;</em>");
  });

  it("writes the same as plain text, lists marked", () => {
    expect(richTextToEmailText(doc)).toEqual([
      "New",
      "",
      "Bold and slanted\nthe end is [spoiler]",
      "",
      "- One\n- Two\n  3. Three",
      "",
      "A <b>map</b>",
    ]);
  });

  it("can leave out the heading that is already the title", () => {
    expect(richTextToEmailHtml(doc, { skipFirstHeading: true })).not.toContain("<h3");
    expect(richTextToEmailText(doc, { skipFirstHeading: true })[0]).toBe(
      "Bold and slanted\nthe end is [spoiler]",
    );
  });
});

describe("reminders", () => {
  it("names the day in the member's own zone", () => {
    // Monday 00:00 in London is still Sunday in New York.
    expect(endDay("2026-11-02T00:00:00.000Z", "Europe/London")).toBe("Monday");
    expect(endDay("2026-11-02T00:00:00.000Z", "America/New_York")).toBe("Sunday");
    expect(endDay("2026-11-02T00:00:00.000Z", "Not/AZone")).toBe("Monday");
  });

  it("escapes a task's name and says what finishing it pays", () => {
    const email = taskEmail(
      { label: "Rate <3> games", count: 2, target: 3, xp: 40, tokens: 5, day: "Monday" },
      links,
    );
    expect(email.subject).toBe("Nearly there: Rate <3> games");
    expect(email.html).toContain("Rate &lt;3&gt; games");
    expect(email.text).toContain("2 of 3, ends Monday.");
    expect(email.text).toContain("Finish it for 40 XP and 5 tokens.");
    expect(email.text).toContain("turned on streak and task reminder emails");
  });

  it("says a shield will cover the week when one would", () => {
    const email = streakEmail({ weeks: 4, shield: false, day: "Monday" }, links);
    expect(email.subject).toBe("Your 4 week streak needs something by Monday");
    expect(email.text).toContain("Log, rate, review or post anything to keep it.");
  });
});

describe("digestEmail", () => {
  it("leaves out the parts with nothing in them, and escapes names", () => {
    const email = digestEmail(
      {
        friends: [
          { username: "a<b", gameId: 1, title: "Hades", status: "playing", rating: null },
        ],
        releases: [],
        logged: 0,
      },
      links,
    );
    expect(email.text).toContain("a<b is playing Hades");
    expect(email.html).toContain("a&lt;b");
    expect(email.text).not.toContain("Out this week");
    expect(email.text).not.toContain("Your week\n");
    expect(email.text).toContain("You're getting this because you have the weekly digest on.");
  });

  it("counts what you logged", () => {
    const email = digestEmail({ friends: [], releases: [], logged: 1 }, links);
    expect(email.text).toContain("You logged 1 game.");
  });
});

describe("patchNotesEmail from a note", () => {
  it("lists the changes by kind and keeps their links, made absolute", () => {
    const email = patchNotesEmail(
      {
        subject: "New patch notes: v1.1.2",
        title: "v1.1.2",
        doc: { type: "doc", content: [] },
        note: {
          title: "v1.1.2",
          intro: "A big one.",
          items: [
            { kind: "fix", text: "Fixed <it>.", link: null },
            { kind: "feature", text: "Steam import", link: "/settings" },
          ],
          outro: "Thanks for playing.",
        },
        link: "/community/thread/1",
      },
      links,
    );
    expect(email.html).toContain('href="https://playrates.test/settings"');
    expect(email.html).toContain("Fixed &lt;it&gt;.");
    expect(email.html.indexOf("New features")).toBeLessThan(
      email.html.indexOf("Fixes"),
    );
    expect(email.text).toContain(
      "- Steam import (https://playrates.test/settings)",
    );
    expect(email.text).toContain("A big one.");
    // The closing message comes after the changes, in both.
    expect(email.html.indexOf("Thanks for playing.")).toBeGreaterThan(
      email.html.indexOf("Steam import"),
    );
    expect(email.text.indexOf("Thanks for playing.")).toBeGreaterThan(
      email.text.indexOf("Steam import"),
    );
  });
});
