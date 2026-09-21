import { describe, expect, it } from "vitest";
import { AppError } from "../../src/lib/AppError.js";
import { paginate, toRange } from "../../src/lib/pagination.js";
import { nullGamesProvider } from "../../src/providers/games/GamesProvider.js";

describe("toRange", () => {
  it("starts page 1 at zero", () => {
    expect(toRange({ page: 1, limit: 28 })).toEqual({ from: 0, to: 27 });
  });

  it("offsets later pages by a whole page each", () => {
    expect(toRange({ page: 2, limit: 28 })).toEqual({ from: 28, to: 55 });
    expect(toRange({ page: 100, limit: 10 })).toEqual({ from: 990, to: 999 });
  });

  it("gives a single-row range for limit 1", () => {
    expect(toRange({ page: 3, limit: 1 })).toEqual({ from: 2, to: 2 });
  });
});

describe("paginate", () => {
  it("wraps rows in the envelope every list endpoint returns", () => {
    expect(paginate(["a", "b"], { page: 2, limit: 2 }, 7)).toEqual({
      data: ["a", "b"],
      meta: { page: 2, limit: 2, total: 7 },
    });
  });

  it("reports the server's total, not the length of the page", () => {
    const { meta } = paginate([], { page: 9, limit: 20 }, 184662);
    expect(meta.total).toBe(184662);
  });
});

describe("AppError", () => {
  it("carries the status and code its factory names", () => {
    const cases: [AppError, number, string][] = [
      [AppError.badRequest("bad"), 400, "bad_request"],
      [AppError.unauthorized(), 401, "unauthorized"],
      [AppError.forbidden(), 403, "forbidden"],
      [AppError.notFound("Game"), 404, "not_found"],
      [AppError.conflict("username_taken", "taken"), 409, "username_taken"],
      [AppError.validation("nope"), 422, "validation_failed"],
      [AppError.rateLimited(), 429, "rate_limited"],
      [AppError.internal(), 500, "internal_error"],
      [AppError.upstream("RAWG is down"), 502, "upstream_error"],
      [AppError.notConfigured("no key"), 503, "not_configured"],
    ];

    for (const [error, status, code] of cases) {
      expect(error.status).toBe(status);
      expect(error.code).toBe(code);
    }
  });

  it("names the missing thing in a 404 message", () => {
    expect(AppError.notFound("Game").message).toBe("Game not found");
    expect(AppError.notFound().message).toBe("Resource not found");
  });

  it("exposes 4xx messages and hides 5xx ones", () => {
    expect(AppError.badRequest("bad").expose).toBe(true);
    expect(AppError.rateLimited().expose).toBe(true);
    expect(AppError.internal().expose).toBe(false);
    expect(AppError.upstream("down").expose).toBe(false);
  });

  it("keeps details for the caller to render against a field", () => {
    const error = AppError.validation("bad rating", { path: ["rating"] });
    expect(error.details).toEqual({ path: ["rating"] });
  });

  it("is still a real Error, so instanceof and catch both work", () => {
    const error = AppError.notFound();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
  });
});

describe("nullGamesProvider", () => {
  it("reports itself as unconfigured", () => {
    expect(nullGamesProvider.isConfigured).toBe(false);
    expect(nullGamesProvider.name).toBe("none");
  });

  it("returns empty results rather than throwing, so the app still runs", async () => {
    await expect(nullGamesProvider.search("hollow knight")).resolves.toEqual(
      [],
    );
    await expect(nullGamesProvider.getById(1)).resolves.toBeNull();
    await expect(nullGamesProvider.listByPopularity(1, 40)).resolves.toEqual({
      games: [],
      total: 0,
      hasNext: false,
    });
  });
});
