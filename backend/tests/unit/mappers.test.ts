import { describe, expect, it } from "vitest";
import {
  isOnline,
  toProfile,
} from "../../src/modules/profiles/profiles.mapper.js";
import {
  toGameLog,
  toGameLogRow,
  toGameLogWithGame,
} from "../../src/modules/game-logs/gameLogs.mapper.js";
import { toGame } from "../../src/modules/games/games.mapper.js";
import { orderPair } from "../../src/modules/friends/friends.repository.js";
import { toNotification } from "../../src/modules/notifications/notifications.mapper.js";
import { relationFor } from "@playrates/shared";
import {
  buildGame,
  buildGameLog,
  buildNotification,
  buildProfile,
} from "../helpers/fixtures.js";

describe("profile mapper", () => {
  it("maps snake_case columns to the camelCase API shape", () => {
    const profile = toProfile(
      buildProfile({ avatar_url: "https://x.test/a.png", bio: "hi" }),
    );

    expect(profile).toMatchObject({
      username: "devuser",
      bio: "hi",
      avatarUrl: "https://x.test/a.png",
    });
  });

  it("never exposes a password or email field", () => {
    const profile = toProfile(buildProfile());

    expect(profile).not.toHaveProperty("password");
    expect(profile).not.toHaveProperty("email");
  });

  describe("online derivation", () => {
    const now = Date.parse("2026-01-01T12:00:00.000Z");

    it("is online just inside the window", () => {
      expect(isOnline("2026-01-01T11:56:00.000Z", now)).toBe(true);
    });

    it("is offline just outside the window", () => {
      expect(isOnline("2026-01-01T11:54:00.000Z", now)).toBe(false);
    });
  });
});

describe("game log mapper", () => {
  it("exposes the log id as `id` and the game id as `gameId`", () => {
    const log = toGameLog(buildGameLog({ id: 42, game_id: 7 }));

    expect(log.id).toBe(42);
    expect(log.gameId).toBe(7);
  });

  it("returns numeric ratings as numbers, not strings", () => {
    // Postgres numeric can arrive as a string depending on the driver
    const log = toGameLog(
      buildGameLog({ rating: "9.25" as unknown as number }),
    );

    expect(log.rating).toBe(9.25);
    expect(typeof log.rating).toBe("number");
  });

  it("keeps playedStatus for a played game", () => {
    const row = toGameLogRow({
      status: "played",
      playedStatus: "mastered",
    });

    expect(row.played_status).toBe("mastered");
  });

  it("clears playedStatus for any other status", () => {
    for (const status of ["playing", "backlog", "wishlist"] as const) {
      const row = toGameLogRow({ status, playedStatus: "finished" });
      expect(row.played_status).toBeNull();
    }
  });

  it("only writes the fields that were provided", () => {
    const row = toGameLogRow({ rating: 5 });

    expect(row).toHaveProperty("rating", 5);
    expect(row).not.toHaveProperty("hours_played");
    expect(row).not.toHaveProperty("platform_slug");
  });

  it("writes an explicit null when a field is cleared", () => {
    const row = toGameLogRow({ rating: null });

    expect(row.rating).toBeNull();
  });

  it("clears every optional field it is handed a null for", () => {
    const row = toGameLogRow({
      hoursPlayed: null,
      hoursToBeat: null,
      startDate: null,
      finishDate: null,
      platform: null,
      achievementsTotal: null,
      achievementsCompleted: null,
    });

    expect(row).toEqual({
      hours_played: null,
      hours_to_beat: null,
      start_date: null,
      finish_date: null,
      platform_slug: null,
      achievements_total: null,
      achievements_completed: null,
    });
  });

  it("carries every optional field through when it has a value", () => {
    const row = toGameLogRow({
      hoursPlayed: 52.5,
      hoursToBeat: 40,
      startDate: "2026-01-02",
      finishDate: "2026-02-11",
      platform: "steam",
      achievementsTotal: 52,
      achievementsCompleted: 46,
    });

    expect(row).toEqual({
      hours_played: 52.5,
      hours_to_beat: 40,
      start_date: "2026-01-02",
      finish_date: "2026-02-11",
      platform_slug: "steam",
      achievements_total: 52,
      achievements_completed: 46,
    });
  });

  it("clears playedStatus when the status moves away from played", () => {
    expect(toGameLogRow({ status: "backlog" }).played_status).toBeNull();
  });

  it("leaves playedStatus alone when neither field is in the patch", () => {
    expect(toGameLogRow({ rating: 8 })).not.toHaveProperty("played_status");
  });

  it("reads nulls off a bare row rather than guessing at defaults", () => {
    const log = toGameLog(
      buildGameLog({
        rating: null,
        hours_played: null,
        hours_to_beat: null,
        played_status: null,
      }),
    );

    expect(log.rating).toBeNull();
    expect(log.hoursPlayed).toBeNull();
    expect(log.hoursToBeat).toBeNull();
    expect(log.playedStatus).toBeNull();
  });
});

describe("game log with embedded game", () => {
  it("carries the game, so a tile needs no follow-up request", () => {
    const log = toGameLogWithGame({
      ...buildGameLog({ game_id: 7 }),
      game: { ...buildGame({ id: 7, title: "Hollow Knight" }) },
    });

    expect(log.game?.id).toBe(7);
    expect(log.game?.title).toBe("Hollow Knight");
  });

  it("leaves the game null when the join found nothing", () => {
    expect(toGameLogWithGame(buildGameLog()).game).toBeNull();
    expect(
      toGameLogWithGame({ ...buildGameLog(), game: null }).game,
    ).toBeNull();
  });
});

describe("game mapper", () => {
  it("flattens the joined platforms into slugs", () => {
    const game = toGame({
      ...buildGame(),
      game_platforms: [{ platform_slug: "steam" }, { platform_slug: "xbox" }],
    });

    expect(game.platforms).toEqual(["steam", "xbox"]);
  });

  it("defaults to an empty platform list when the join is absent", () => {
    const game = toGame({ ...buildGame(), game_platforms: null });

    expect(game.platforms).toEqual([]);
  });

  it("maps the trending and sexual-content flags", () => {
    const game = toGame({
      ...buildGame({ is_trending: true, has_sexual_content: true }),
    });

    expect(game.isTrending).toBe(true);
    expect(game.hasSexualContent).toBe(true);
  });
});

describe("friendship pair ordering", () => {
  it("produces the same canonical pair whichever way round it is given", () => {
    expect(orderPair("b", "a")).toEqual(["a", "b"]);
    expect(orderPair("a", "b")).toEqual(["a", "b"]);
  });
});

describe("friend relation", () => {
  it("reads as friends once accepted, from either side", () => {
    expect(relationFor("accepted", "a", "a")).toBe("friend");
    expect(relationFor("accepted", "a", "b")).toBe("friend");
  });

  it("distinguishes sent from received while pending", () => {
    expect(relationFor("pending", "a", "a")).toBe("request-sent");
    expect(relationFor("pending", "a", "b")).toBe("request-received");
  });
});

describe("notification mapper", () => {
  const actor = {
    id: "actor-1",
    username: "devuser",
    avatar_url: null,
    accent: "indigo",
    bio: "",
    last_seen_at: new Date().toISOString(),
  };

  it("maps a welcome notification", () => {
    const mapped = toNotification(buildNotification(), () => null);

    expect(mapped).toMatchObject({ kind: "welcome", readAt: null });
  });

  it("embeds the actor and the relation on a friend request", () => {
    const mapped = toNotification(
      { ...buildNotification({ kind: "friend_request" }), actor },
      () => "request-received",
    );

    expect(mapped).toMatchObject({
      kind: "friend_request",
      relation: "request-received",
      actor: { username: "devuser" },
    });
  });

  it("embeds the actor on an accepted request", () => {
    const mapped = toNotification(
      { ...buildNotification({ kind: "friend_accepted" }), actor },
      () => null,
    );

    expect(mapped).toMatchObject({
      kind: "friend_accepted",
      actor: { username: "devuser" },
    });
  });

  /* A client one deploy behind the API should render a plain row rather than
     throw on a kind it has never heard of. */
  it("falls back to unknown for a kind it does not handle", () => {
    const mapped = toNotification(
      buildNotification({ kind: "badge_earned" }),
      () => null,
    );

    expect(mapped.kind).toBe("unknown");
  });

  it("falls back to unknown when the actor has gone", () => {
    const mapped = toNotification(
      buildNotification({ kind: "friend_request", actor_id: null }),
      () => null,
    );

    expect(mapped.kind).toBe("unknown");
  });
});
