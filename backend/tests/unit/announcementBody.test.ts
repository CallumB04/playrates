import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_BODY_MAX,
  AnnouncementInputSchema,
  announcementBodyBadLinks,
  announcementBodyText,
  parseAnnouncementBody,
} from "@playrates/shared";

describe("parseAnnouncementBody", () => {
  it("leaves a message without links as one run of text", () => {
    expect(parseAnnouncementBody("Back in an hour.")).toEqual([
      { text: "Back in an hour." },
    ]);
  });

  it("splits out a link to another site and one to a page here", () => {
    expect(
      parseAnnouncementBody(
        "Join the [Discord](https://discord.gg/abc) or read [the notes](/community).",
      ),
    ).toEqual([
      { text: "Join the " },
      { text: "Discord", href: "https://discord.gg/abc" },
      { text: " or read " },
      { text: "the notes", href: "/community" },
      { text: "." },
    ]);
  });

  it.each([
    ["plain http", "[site](http://example.com)"],
    ["protocol-relative", "[site](//example.com)"],
    ["a script", "[site](javascript:alert)"],
    ["a mail link", "[me](mailto:a@b.c)"],
  ])("leaves %s as written", (_, body) => {
    expect(parseAnnouncementBody(body)).toEqual([{ text: body }]);
    expect(announcementBodyBadLinks(body)).toHaveLength(1);
  });

  it("counts the words a reader sees, not the addresses", () => {
    expect(
      announcementBodyText("Say hi on [Discord](https://discord.gg/abcdefgh)."),
    ).toBe("Say hi on Discord.");
  });
});

describe("an announcement's message", () => {
  const input = (body: string) => ({
    tone: "update",
    title: "PlayRates has a Discord",
    body,
    link: "/community",
  });

  it("can carry long addresses while its words stay in the limit", () => {
    const words = "x".repeat(ANNOUNCEMENT_BODY_MAX - "Discord".length);
    const body = `${words}[Discord](https://discord.gg/${"a".repeat(100)})`;
    expect(AnnouncementInputSchema.safeParse(input(body)).success).toBe(true);
  });

  it("is refused when its words run past the limit", () => {
    const body = `${"x".repeat(ANNOUNCEMENT_BODY_MAX)} [one more](/community)`;
    expect(AnnouncementInputSchema.safeParse(input(body)).success).toBe(false);
  });

  it("is refused with a link anywhere but https or a page here", () => {
    expect(
      AnnouncementInputSchema.safeParse(input("[site](http://example.com)"))
        .success,
    ).toBe(false);
  });
});
