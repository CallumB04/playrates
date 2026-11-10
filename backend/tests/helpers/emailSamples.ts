import {
  alertEmail,
  announcementEmail,
  digestEmail,
  friendAcceptedEmail,
  friendRequestEmail,
  giftEmail,
  inviteActiveEmail,
  inviteJoinedEmail,
  milestoneEmail,
  patchNotesEmail,
  replyEmail,
  streakEmail,
  taskEmail,
  welcomeEmail,
  wishlistReleaseEmail,
  type EmailLinks,
  type RenderedEmail,
} from "../../src/modules/email/email.templates.js";

const box = (id: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${id}.jpg`;

/** Real covers, so a preview looks like the email a member gets. */
export const SAMPLE_GAMES = {
  hades2: { id: 259435, title: "Hades II", coverUrl: box("coaknx") },
  silksong: {
    id: 258659,
    title: "Hollow Knight: Silksong",
    coverUrl: box("cobebu"),
  },
  clair: {
    id: 258466,
    title: "Clair Obscur: Expedition 33",
    coverUrl: box("co9gam"),
  },
  eldenRing: { id: 258334, title: "Elden Ring", coverUrl: box("co4jni") },
  balatro: { id: 258778, title: "Balatro", coverUrl: box("co9f4g") },
  astroBot: { id: 259442, title: "Astro Bot", coverUrl: box("coba3k") },
  ds2: {
    id: 259835,
    title: "Death Stranding 2: On the Beach",
    coverUrl: box("co9ipx"),
  },
  kcd2: {
    id: 259015,
    title: "Kingdom Come: Deliverance II",
    coverUrl: box("co8qmv"),
  },
  splitFiction: { id: 259082, title: "Split Fiction", coverUrl: box("co95gf") },
  mhWilds: {
    id: 260616,
    title: "Monster Hunter Wilds",
    coverUrl: box("co904o"),
  },
} as const;

const G = SAMPLE_GAMES;

export interface EmailSample {
  /** A file-safe name. */
  key: string;
  name: string;
  /** What sends it, for the before and after document. */
  trigger: string;
  email: RenderedEmail;
}

/**
 * Every email the API builds, with the content a member would really see:
 * the previews render these, and the template tests run their checks over
 * every one, so a new template joins both by being added here.
 */
export const emailSamples = (links: EmailLinks): EmailSample[] => [
  {
    key: "friend-request",
    name: "Friend request",
    trigger: "Someone sends you a friend request",
    email: friendRequestEmail(
      { actor: "halcyon", actorAvatar: null, recipient: "tester" },
      links,
    ),
  },
  {
    key: "friend-accepted",
    name: "Friend request accepted",
    trigger: "Someone accepts your friend request",
    email: friendAcceptedEmail({ actor: "halcyon", actorAvatar: null }, links),
  },
  {
    key: "reply",
    name: "Reply",
    trigger: "Someone replies to you in a community thread",
    email: replyEmail(
      {
        actor: "halcyon",
        actorAvatar: null,
        threadId: 115,
        threadTitle: "Is Silksong harder than the first one?",
        messageId: 902,
        excerpt:
          "Honestly the difficulty spike after Act 1 is the point. Once you get the pogo timing down, the bosses start to feel fair.",
      },
      links,
    ),
  },
  {
    key: "gift",
    name: "Gift",
    trigger: "A friend sends you something from the shop",
    email: giftEmail(
      {
        giver: "halcyon",
        giverAvatar: null,
        item: "frame_neon",
        recipient: "tester",
      },
      links,
    ),
  },
  {
    key: "invite-joined",
    name: "Invite joined",
    trigger: "Someone signs up from your invite link",
    email: inviteJoinedEmail(
      { username: "marlowe", xp: 300, tokens: 50 },
      links,
    ),
  },
  {
    key: "invite-active",
    name: "Invite got going",
    trigger: "Someone you invited logs enough games to count",
    email: inviteActiveEmail(
      { username: "marlowe", xp: 250, tokens: 50 },
      links,
    ),
  },
  {
    key: "milestone-review",
    name: "Milestone: review reactions",
    trigger: "Your review reaches a reaction milestone",
    email: milestoneEmail(
      {
        milestone: 25,
        subject: {
          kind: "review",
          gameId: G.clair.id,
          reviewId: 41,
          gameTitle: G.clair.title,
          coverUrl: G.clair.coverUrl,
        },
      },
      links,
    ),
  },
  {
    key: "milestone-message",
    name: "Milestone: message reactions",
    trigger: "Your community message reaches a reaction milestone",
    email: milestoneEmail(
      {
        milestone: 10,
        subject: {
          kind: "message",
          threadId: 115,
          messageId: 880,
          threadTitle: "Is Silksong harder than the first one?",
          excerpt:
            "The Act 3 bosses are the best in the genre and I will not be taking questions.",
        },
      },
      links,
    ),
  },
  {
    key: "milestone-list",
    name: "Milestone: list loves",
    trigger: "Your list reaches a love milestone",
    email: milestoneEmail(
      {
        milestone: 50,
        subject: {
          kind: "list",
          listId: 12,
          listName: "Cosy games for a rainy weekend",
          username: "tester",
        },
      },
      links,
    ),
  },
  {
    key: "streak",
    name: "Streak at risk",
    trigger:
      "Your weekly streak is about to end (reminders are off by default)",
    email: streakEmail({ weeks: 6, shield: false, day: "Monday" }, links),
  },
  {
    key: "task",
    name: "Task nearly done",
    trigger:
      "A weekly or monthly task is nearly done, near its end (reminders are off by default)",
    email: taskEmail(
      {
        label: "Rate 3 games you’ve played",
        count: 2,
        target: 3,
        xp: 40,
        tokens: 5,
        day: "Monday",
      },
      links,
    ),
  },
  {
    key: "wishlist-one",
    name: "Wishlist release: one game",
    trigger: "A game on your wishlist comes out today",
    email: wishlistReleaseEmail(
      { games: [G.hades2], username: "tester" },
      links,
    ),
  },
  {
    key: "wishlist-many",
    name: "Wishlist release: several games",
    trigger: "Several games on your wishlist come out today",
    email: wishlistReleaseEmail(
      { games: [G.silksong, G.ds2, G.kcd2], username: "tester" },
      links,
    ),
  },
  {
    key: "digest",
    name: "Weekly digest",
    trigger: "Sunday evening, when there’s something to say",
    email: digestEmail(
      {
        friends: [
          {
            username: "halcyon",
            gameId: G.silksong.id,
            title: G.silksong.title,
            status: "played",
            rating: 9,
            coverUrl: G.silksong.coverUrl,
            avatarUrl: null,
          },
          {
            username: "marlowe",
            gameId: G.clair.id,
            title: G.clair.title,
            status: "playing",
            rating: null,
            coverUrl: G.clair.coverUrl,
            avatarUrl: null,
          },
          {
            username: "juniper",
            gameId: G.balatro.id,
            title: G.balatro.title,
            status: "played",
            rating: 8,
            coverUrl: G.balatro.coverUrl,
            avatarUrl: null,
          },
          {
            username: "halcyon",
            gameId: G.astroBot.id,
            title: G.astroBot.title,
            status: "backlog",
            rating: null,
            coverUrl: G.astroBot.coverUrl,
            avatarUrl: null,
          },
        ],
        releases: [
          {
            gameId: G.hades2.id,
            title: G.hades2.title,
            releaseDate: "2026-11-12",
            coverUrl: G.hades2.coverUrl,
          },
          {
            gameId: G.mhWilds.id,
            title: G.mhWilds.title,
            releaseDate: "2026-11-14",
            coverUrl: G.mhWilds.coverUrl,
          },
        ],
        logged: 3,
        weekEnding: "2026-11-09",
      },
      links,
    ),
  },
  {
    key: "welcome",
    name: "Welcome",
    trigger: "You finish signing up",
    email: welcomeEmail({ username: "tester", firstName: "Sam" }, links),
  },
  {
    key: "announcement",
    name: "Announcement",
    trigger: "An admin sends news (only to members who ticked the box)",
    email: announcementEmail(
      {
        tone: "celebration",
        title: "PlayRates turns one",
        body: "A year ago this was a spreadsheet. Today it’s home to thousands of logs, reviews and lists, and a community that argues about Hollow Knight more than we expected.\n\nThank you for being here. As a small thank you, everyone gets a [free card theme](/shop) this week.",
        link: "/shop",
      },
      links,
    ),
  },
  {
    key: "patch-notes",
    name: "Patch notes",
    trigger:
      "An admin announces a release (only to members who ticked the box)",
    email: patchNotesEmail(
      {
        subject: "New patch notes: v1.1.4",
        title: "v1.1.4",
        doc: { type: "doc", content: [] },
        note: {
          title: "v1.1.4",
          intro:
            "A smaller release, mostly about writing: reviews get room to breathe, and emails got a lot nicer.",
          items: [
            {
              kind: "feature",
              text: "Write your review in a bigger window, with the expand button beside the count.",
              link: null,
            },
            {
              kind: "improvement",
              text: "Every email has a new look, with covers in the weekly digest.",
              link: "/settings?section=emails",
            },
            {
              kind: "fix",
              text: "Deep pages of the library load in time again.",
              link: "/library",
            },
          ],
          outro: "Thanks for playing.",
        },
        link: "/community/thread/7#message-41",
      },
      links,
    ),
  },
  {
    key: "alert",
    name: "Admin alert",
    trigger: "A scheduled job fails (admins only)",
    email: alertEmail(
      {
        kind: "job",
        job: "Nudges",
        failures: [
          { part: "digest", message: "weekly_digest timed out after 8s" },
        ],
      },
      links.site,
    ),
  },
];
