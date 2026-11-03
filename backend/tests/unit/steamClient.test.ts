import { describe, expect, it, vi } from "vitest";
import { createSteamClient } from "../../src/providers/steam.js";

/** A fake Steam answering every request with one status and body. */
const answering = (status: number, body: unknown) =>
  vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;

describe("the Steam client's achievements", () => {
  it("counts what's unlocked of the whole list", async () => {
    const client = createSteamClient(
      "key",
      answering(200, {
        playerstats: {
          success: true,
          achievements: [{ achieved: 1 }, { achieved: 0 }, { achieved: 1 }],
        },
      }),
    );
    expect(await client.achievements("76561198000000001", 10)).toEqual({
      total: 3,
      unlocked: 2,
    });
  });

  it("reads a game with no stats, or none to unlock, as having none", async () => {
    const noStats = createSteamClient(
      "key",
      answering(400, { playerstats: { error: "Requested app has no stats" } }),
    );
    const empty = createSteamClient(
      "key",
      answering(200, { playerstats: { success: true } }),
    );
    expect(await noStats.achievements("76561198000000001", 10)).toBeNull();
    expect(await empty.achievements("76561198000000001", 10)).toBeNull();
  });

  it("says when the profile hides them", async () => {
    const client = createSteamClient(
      "key",
      answering(403, { playerstats: { error: "Profile is not public" } }),
    );
    expect(await client.achievements("76561198000000001", 10)).toBe("private");
  });

  it("fails as Steam not answering on anything else", async () => {
    const client = createSteamClient("key", answering(500, {}));
    await expect(client.achievements("76561198000000001", 10)).rejects.toThrow(
      "Steam isn't answering",
    );
  });
});

describe("the Steam client's library", () => {
  it("reads recent playtime and whether a game keeps stats", async () => {
    const client = createSteamClient(
      "key",
      answering(200, {
        response: {
          games: [
            {
              appid: 10,
              name: "Hades",
              playtime_forever: 1500,
              playtime_2weeks: 60,
              has_community_visible_stats: true,
            },
            { appid: 20 },
          ],
        },
      }),
    );
    expect(await client.ownedGames("76561198000000001")).toEqual([
      {
        appid: 10,
        name: "Hades",
        playtime: 1500,
        recentPlaytime: 60,
        hasStats: true,
      },
      {
        appid: 20,
        name: "App 20",
        playtime: 0,
        recentPlaytime: 0,
        hasStats: false,
      },
    ]);
  });
});
