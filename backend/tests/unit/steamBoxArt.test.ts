import { describe, expect, it, vi } from "vitest";
import {
  findSteamBoxArt,
  steamAppId,
} from "../../src/providers/games/rawg/steamBoxArt.js";

const STEAM = 1;

describe("steamAppId", () => {
  it("reads the app id out of a store link", () => {
    expect(
      steamAppId({
        results: [{ store_id: STEAM, url: "https://store.steampowered.com/app/620/" }],
      }),
    ).toBe("620");
  });

  it("reads it from a link carrying the game's name as well", () => {
    expect(
      steamAppId({
        results: [
          {
            store_id: STEAM,
            url: "https://store.steampowered.com/app/292030/The_Witcher_3_Wild_Hunt/",
          },
        ],
      }),
    ).toBe("292030");
  });

  /* A game can be on four storefronts; only one of them has the art. */
  it("ignores the other stores", () => {
    expect(
      steamAppId({
        results: [
          { store_id: 5, url: "https://www.gog.com/game/the_witcher_3" },
          { store_id: 3, url: "https://store.playstation.com/product/UP4497" },
        ],
      }),
    ).toBeNull();
  });

  it("copes with a game that is on no store at all", () => {
    expect(steamAppId({})).toBeNull();
    expect(steamAppId({ results: [] })).toBeNull();
    expect(steamAppId({ results: [{ store_id: STEAM, url: "" }] })).toBeNull();
  });
});

describe("findSteamBoxArt", () => {
  const onSteam = {
    results: [{ store_id: STEAM, url: "https://store.steampowered.com/app/620/" }],
  };

  it("hands back the portrait art when Steam has it", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));

    await expect(findSteamBoxArt(onSteam, fetchImpl as never)).resolves.toBe(
      "https://cdn.cloudflare.steamstatic.com/steam/apps/620/library_600x900.jpg",
    );
  });

  /* Asked for rather than assumed: a 404 would reach the page as a broken
     cover, which is worse than the crop it was replacing. */
  it("hands back nothing when Steam has no art for it", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));

    await expect(
      findSteamBoxArt(onSteam, fetchImpl as never),
    ).resolves.toBeNull();
  });

  it("does not ask at all for a game that is not on Steam", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));

    await expect(findSteamBoxArt({ results: [] }, fetchImpl as never))
      .resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  /* Steam being unreachable must not fail the game's detail fetch with it. */
  it("gives up quietly when the request throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    await expect(
      findSteamBoxArt(onSteam, fetchImpl as never),
    ).resolves.toBeNull();
  });

  it("asks with HEAD, since only the answer matters", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));

    await findSteamBoxArt(onSteam, fetchImpl as never);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/620/library_600x900.jpg"),
      expect.objectContaining({ method: "HEAD" }),
    );
  });
});
