import { describe, expect, it } from "vitest";
import {
  AdminEventInputSchema,
  AdminNomineeInputSchema,
  AwardPickInputSchema,
  awardsPhase,
  eventLogo,
  eventTiming,
  eventTrail,
  eventWords,
  isCurrentEvent,
} from "@playrates/shared";

const show = {
  startsAt: "2026-12-11T03:30:00.000Z",
  endsAt: null,
  publishedAt: "2026-11-17T17:00:00.000Z",
};

describe("eventTiming", () => {
  it("is to come, then live, then gone", () => {
    expect(eventTiming(show, new Date("2026-12-11T03:29:59Z"))).toBe(
      "upcoming",
    );
    expect(eventTiming(show, new Date("2026-12-11T03:30:00Z"))).toBe("live");
    expect(eventTiming(show, new Date("2026-12-11T08:00:00Z"))).toBe("past");
  });

  it("runs to its end when it has one", () => {
    const week = { ...show, endsAt: "2026-12-18T00:00:00.000Z" };
    expect(eventTiming(week, new Date("2026-12-15T00:00:00Z"))).toBe("live");
  });
});

describe("isCurrentEvent", () => {
  it("is current from publishing until a fortnight after it ends", () => {
    expect(isCurrentEvent(show, new Date("2026-11-18"))).toBe(true);
    expect(isCurrentEvent(show, new Date("2026-12-25T07:29:00Z"))).toBe(true);
    expect(isCurrentEvent(show, new Date("2026-12-25T07:30:00Z"))).toBe(false);
  });

  it("is never current as a draft", () => {
    expect(
      isCurrentEvent({ ...show, publishedAt: null }, new Date("2026-11-18")),
    ).toBe(false);
  });
});

describe("awardsPhase", () => {
  const awards = { picksCloseAt: "2026-12-11T03:30:00.000Z", resultsAt: null };

  it("is open until picks close, and locked from that moment", () => {
    expect(awardsPhase(awards, new Date("2026-12-11T03:29:59.999Z"))).toBe(
      "open",
    );
    expect(awardsPhase(awards, new Date("2026-12-11T03:30:00.000Z"))).toBe(
      "locked",
    );
  });

  it("shows the results once any winner is out", () => {
    expect(
      awardsPhase(
        { ...awards, resultsAt: "2026-12-11T04:00:00.000Z" },
        new Date("2026-11-20"),
      ),
    ).toBe("results");
  });
});

describe("eventWords", () => {
  const named = { name: "The Game Awards 2026", tagline: "The big night." };

  it("speaks of nominees until the results, then of winners", () => {
    expect(eventWords({ ...named, awards: { phase: "open" } }).title).toBe(
      "The Game Awards 2026: nominees and picks",
    );
    expect(eventWords({ ...named, awards: { phase: "results" } }).title).toBe(
      "The Game Awards 2026: the winners",
    );
  });

  it("is just the name for any other kind, described by its tagline", () => {
    expect(eventWords({ ...named, awards: null })).toEqual({
      title: "The Game Awards 2026",
      description: "The big night.",
    });
    expect(
      eventWords({ ...named, tagline: "", awards: null }).description,
    ).toMatch(/^What’s on in gaming/);
  });

  it("puts an event under Events in its trail", () => {
    expect(eventTrail({ slug: "tga", name: "TGA" })).toEqual([
      { name: "Events", path: "/events" },
      { name: "TGA", path: "/events/tga" },
    ]);
  });
});

describe("eventLogo", () => {
  it("finds a logo the site carries, with its credit, and nothing else", () => {
    expect(eventLogo("the-game-awards")).toMatchObject({
      path: "/events/the-game-awards.svg",
      credit: expect.stringMatching(/trademarks of their owner/),
    });
    expect(eventLogo("someone-else")).toBeNull();
    expect(eventLogo(null)).toBeNull();
  });
});

describe("event schemas", () => {
  const base = {
    kind: "awards",
    slug: "the-game-awards-2026",
    name: "Awards",
    tagline: "The big night.",
    startsAt: "2026-12-11T03:30:00Z",
    awards: { picksCloseAt: "2026-12-11T03:30:00Z" },
  };

  it("takes one nominee for a pick, and nothing else", () => {
    expect(AwardPickInputSchema.safeParse({ nomineeId: 3 }).success).toBe(true);
    expect(
      AwardPickInputSchema.safeParse({ nomineeId: 3, userId: "x" }).success,
    ).toBe(false);
  });

  it("wants a game or a name for a nominee", () => {
    expect(AdminNomineeInputSchema.safeParse({ gameId: 1 }).success).toBe(true);
    expect(
      AdminNomineeInputSchema.safeParse({ label: "A Composer" }).success,
    ).toBe(true);
    expect(AdminNomineeInputSchema.safeParse({}).success).toBe(false);
  });

  it("keeps a slug to lowercase words and dashes, and a logo to the site's own", () => {
    expect(AdminEventInputSchema.safeParse(base).success).toBe(true);
    expect(
      AdminEventInputSchema.safeParse({ ...base, slug: "The Game Awards" })
        .success,
    ).toBe(false);
    expect(
      AdminEventInputSchema.safeParse({
        ...base,
        logo: "https://example.com/logo.svg",
      }).success,
    ).toBe(false);
  });

  it("wants an awards night's picks to close, and an end after the start", () => {
    expect(
      AdminEventInputSchema.safeParse({ ...base, awards: null }).success,
    ).toBe(false);
    expect(
      AdminEventInputSchema.safeParse({
        ...base,
        endsAt: "2026-12-10T00:00:00Z",
      }).success,
    ).toBe(false);
  });
});
