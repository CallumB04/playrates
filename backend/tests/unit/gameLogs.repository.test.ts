import { describe, expect, it } from "vitest";
import type { Db } from "../../src/config/supabase.js";
import { createGameLogsRepository } from "../../src/modules/game-logs/gameLogs.repository.js";

type Op = "select" | "insert" | "update";
type Result = { data: unknown; error: { code: string } | null };

/**
 * A client whose queries answer from a script, one result per operation.
 *
 * The route tests run on in-memory fakes, which cannot lose a race to
 * Postgres — and a race is the whole of what this covers, so here the real
 * repository meets a client scripted to return Postgres' own error.
 */
const scripted = (script: Record<Op, Result[]>) => {
  const calls: Op[] = [];
  const from = () => {
    let op: Op = "select";
    const builder: object = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "insert" || prop === "update") {
            return () => {
              op = prop;
              calls.push(prop);
              return builder;
            };
          }
          if (prop === "single" || prop === "maybeSingle") {
            return async () => script[op].shift();
          }
          return () => builder;
        },
      },
    );
    return builder;
  };
  return { db: { from } as unknown as Db, calls };
};

const row = (status: string) => ({ id: 7, user_id: "u", game_id: 1, status });
const missing: Result = { data: null, error: null };

describe("game logs repository, upsert", () => {
  it("creates the log when there is none", async () => {
    const { db } = scripted({
      select: [missing],
      insert: [{ data: row("wishlist"), error: null }],
      update: [],
    });

    const result = await createGameLogsRepository(db).upsert("u", 1, {
      status: "wishlist",
    });

    expect(result).toEqual({ row: row("wishlist"), created: true });
  });

  /* Wishlist then backlog, pressed before the first request came back: both
     found no log, the second insert hit the unique constraint, and the
     request failed with a 500. */
  it("updates the log a concurrent save created, rather than failing", async () => {
    const { db, calls } = scripted({
      select: [missing, { data: row("wishlist"), error: null }],
      insert: [{ data: null, error: { code: "23505" } }],
      update: [{ data: row("backlog"), error: null }],
    });

    const result = await createGameLogsRepository(db).upsert("u", 1, {
      status: "backlog",
    });

    expect(result).toEqual({ row: row("backlog"), created: false });
    expect(calls).toEqual(["insert", "update"]);
  });

  it("still fails on any other insert error", async () => {
    const { db } = scripted({
      select: [missing],
      insert: [{ data: null, error: { code: "23503" } }],
      update: [],
    });

    await expect(
      createGameLogsRepository(db).upsert("u", 1, { status: "backlog" }),
    ).rejects.toMatchObject({ code: "23503" });
  });
});
