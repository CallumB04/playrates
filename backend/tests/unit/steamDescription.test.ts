import { describe, expect, it, vi } from "vitest";
import {
  descriptionFromAppDetails,
  findSteamDescription,
} from "../../src/providers/games/rawg/steamDescription.js";

const STEAM = 1;
const onSteam = {
  results: [{ store_id: STEAM, url: "https://store.steampowered.com/app/620/" }],
};

const details = (key: string, about: string, steamAppId = 620) => ({
  [key]: {
    success: true,
    data: { steam_appid: steamAppId, about_the_game: about },
  },
});

describe("descriptionFromAppDetails", () => {
  it("turns the store's markup into paragraphs", () => {
    expect(
      descriptionFromAppDetails(
        "620",
        details("620", "<p>One.</p><h2>Two</h2><p>Three.</p>"),
      ),
    ).toBe("One.\n\nTwo\n\nThree.");
  });

  /* Steam files some games under the package it is selling: Elden Ring asked
     for as 1245620 comes back keyed 2855530. Looking up by key found nothing
     and quietly fell back to RAWG's flattened text. */
  it("finds the game when Steam keys it under a package", () => {
    expect(
      descriptionFromAppDetails(
        "1245620",
        details("2855530", "<p>Rise, Tarnished.</p>", 1245620),
      ),
    ).toBe("Rise, Tarnished.");
  });

  it("hands back nothing where Steam declined", () => {
    expect(descriptionFromAppDetails("620", { "620": { success: false } })).toBeNull();
    expect(descriptionFromAppDetails("620", {})).toBeNull();
  });

  /* Cyberpunk 2077's is nothing but image banners. */
  it("hands back nothing for a description that is only images", () => {
    expect(
      descriptionFromAppDetails(
        "620",
        details("620", '<p><img src="https://x.test/a.png"></p>'),
      ),
    ).toBeNull();
  });
});

describe("findSteamDescription", () => {
  it("does not ask at all for a game that is not on Steam", async () => {
    const fetchImpl = vi.fn();

    await expect(
      findSteamDescription({ results: [] }, fetchImpl as never),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("gives up quietly when Steam is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    await expect(
      findSteamDescription(onSteam, fetchImpl as never),
    ).resolves.toBeNull();
  });

  it("gives up quietly on an error status", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 429 }));

    await expect(
      findSteamDescription(onSteam, fetchImpl as never),
    ).resolves.toBeNull();
  });

  it("asks in English, whatever region the server sits in", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(details("620", "<p>Hi.</p>")),
    );

    await expect(
      findSteamDescription(onSteam, fetchImpl as never),
    ).resolves.toBe("Hi.");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("l=english"),
      expect.anything(),
    );
  });
});
