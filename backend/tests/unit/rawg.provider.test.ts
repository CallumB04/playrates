import { describe, expect, it } from "vitest";
import { createRawgProvider } from "../../src/providers/games/rawg/rawg.provider.js";

const FLAT_RAWG =
  "<p>An expansive worldEmbrace high degrees of freedom.</p>";
const STEAM_HTML =
  "<h2>An expansive world</h2><p>Embrace high degrees of freedom.</p>";

const game = {
  id: 959817,
  slug: "wuthering-waves",
  name: "Wuthering Waves",
  description: FLAT_RAWG,
  description_raw: "An expansive worldEmbrace high degrees of freedom.",
};

interface Upstream {
  stores?: Response;
  steamDescription?: string;
}

/** RAWG and Steam behind one fetch, each answering the way it does. */
const upstream = ({ stores, steamDescription }: Upstream) =>
  (async (input: string | URL) => {
    const url = String(input);

    if (url.includes("/stores")) {
      return (
        stores ??
        Response.json({
          results: [
            { store_id: 1, url: "https://store.steampowered.com/app/3513350/" },
          ],
        })
      );
    }
    if (url.includes("api.rawg.io")) return Response.json(game);

    if (url.includes("appdetails")) {
      return Response.json({
        "3513350": {
          success: true,
          data: { steam_appid: 3513350, about_the_game: steamDescription ?? "" },
        },
      });
    }
    // Box art: neither path has any, which is not what these tests are about.
    return new Response(null, { status: 404 });
  }) as typeof fetch;

describe("RAWG provider, detail fetch", () => {
  it("takes the description from Steam where the game is on it", async () => {
    const provider = createRawgProvider(
      "key",
      upstream({ steamDescription: STEAM_HTML }),
    );

    const result = await provider.getById(959817);

    expect(result?.description).toBe(
      "An expansive world\n\nEmbrace high degrees of freedom.",
    );
  });

  it("keeps RAWG's description where Steam has none", async () => {
    const provider = createRawgProvider("key", upstream({}));

    const result = await provider.getById(959817);

    expect(result?.description).toBe(
      "An expansive worldEmbrace high degrees of freedom.",
    );
  });

  /* The store list's 404 used to escape as "no such game", so the game
     showed no details and re-fetched from RAWG on every view. */
  it("still returns the game when its store list will not load", async () => {
    const provider = createRawgProvider(
      "key",
      upstream({ stores: new Response(null, { status: 404 }) }),
    );

    const result = await provider.getById(959817);

    expect(result?.title).toBe("Wuthering Waves");
    expect(result?.boxArtUrl).toBeNull();
  });
});

describe("RAWG provider, request counting", () => {
  it("reports every call, retries included, and which ones failed", async () => {
    const statuses = [503, 200];
    const fetchImpl = (async () => {
      const status = statuses.shift()!;
      return status === 200
        ? Response.json({ results: [], count: 0 })
        : new Response(null, { status });
    }) as typeof fetch;
    const outcomes: { failed: boolean; error: string | null }[] = [];

    const provider = createRawgProvider("key", fetchImpl, {
      onRequest: (outcome) => {
        outcomes.push(outcome);
      },
    });
    await provider.search("hades");

    expect(outcomes).toEqual([
      { failed: true, error: "RAWG responded 503" },
      { failed: false, error: null },
    ]);
  });

  it("counts a 404 as a request that worked: the game simply is not there", async () => {
    const fetchImpl = (async () => new Response(null, { status: 404 })) as typeof fetch;
    const outcomes: { failed: boolean }[] = [];
    const provider = createRawgProvider("key", fetchImpl, {
      onRequest: (outcome) => {
        outcomes.push(outcome);
      },
    });

    await expect(provider.getById(1)).resolves.toBeNull();
    expect(outcomes[0]).toMatchObject({ failed: false });
  });

  it("reports a network failure before passing it on", async () => {
    const fetchImpl = (async () => {
      throw new Error("socket hang up");
    }) as typeof fetch;
    const outcomes: { failed: boolean; error: string | null }[] = [];
    const provider = createRawgProvider("key", fetchImpl, {
      onRequest: (outcome) => {
        outcomes.push(outcome);
      },
    });

    await expect(provider.search("hades")).rejects.toThrow("socket hang up");
    expect(outcomes).toEqual([{ failed: true, error: "socket hang up" }]);
  });

  it("still answers when recording the call fails", async () => {
    const fetchImpl = (async () =>
      Response.json({ results: [], count: 0 })) as typeof fetch;
    const provider = createRawgProvider("key", fetchImpl, {
      onRequest: async () => {
        throw new Error("database down");
      },
    });

    await expect(provider.search("hades")).resolves.toEqual([]);
  });
});
