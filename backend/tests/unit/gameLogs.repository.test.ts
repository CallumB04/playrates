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
const taken: Result = { data: null, error: { code: "23505" } };

/* game_logs_user_game_system_unique: the console is already logged for this
   game. That is the user's mistake to fix, so it answers 409 with a code the
   editor can show beside the console, not a bare "already exists". */
describe("game logs repository, a console logged twice", () => {
  it("creates the log when the console is free", async () => {
    const { db, calls } = scripted({
      select: [],
      insert: [{ data: row("played"), error: null }],
      update: [],
    });
    const log = await createGameLogsRepository(db).create("u", 1, {});
    expect(log.status).toBe("played");
    expect(calls).toEqual(["insert"]);
  });

  it("says the platform is taken when an insert collides", async () => {
    const { db } = scripted({ select: [], insert: [taken], update: [] });
    await expect(
      createGameLogsRepository(db).create("u", 1, { system_slug: "ps5" }),
    ).rejects.toMatchObject({ status: 409, code: "platform_taken" });
  });

  it("says the same when moving a log onto a taken console", async () => {
    const { db } = scripted({ select: [], insert: [], update: [taken] });
    await expect(
      createGameLogsRepository(db).update(7, { system_slug: "ps5" }),
    ).rejects.toMatchObject({ status: 409, code: "platform_taken" });
  });

  it("passes any other error through", async () => {
    const { db } = scripted({
      select: [],
      insert: [{ data: null, error: { code: "23503" } }],
      update: [],
    });
    await expect(
      createGameLogsRepository(db).create("u", 1, {}),
    ).rejects.toMatchObject({ code: "23503" });
  });
});
