import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/lib/logger.js";
import { createAlerts, SPIKE_AT } from "../../src/modules/admin/alerts.js";
import type { NewEmailMessage } from "../../src/modules/email/email.repository.js";
import type { EmailMessage } from "../../src/modules/email/email.sender.js";
import { alertEmail } from "../../src/modules/email/email.templates.js";
import { setTestEnv } from "../helpers/buildTestApp.js";

setTestEnv();

const NOW = Date.parse("2026-11-01T12:00:00Z");

const setup = ({
  errors = 0,
  admins = ["admin-1"],
  failSends = false,
  failLog = false,
}: {
  errors?: number;
  admins?: string[];
  failSends?: boolean;
  failLog?: boolean;
} = {}) => {
  const sent: EmailMessage[] = [];
  const logged: NewEmailMessage[] = [];
  const settings = new Map<string, unknown>();
  let clock = NOW;
  const counted: string[] = [];
  const alerts = createAlerts({
    admin: {
      async adminIds() {
        return admins;
      },
      async errorCount(kind, since) {
        counted.push(`${kind} since ${since}`);
        return errors;
      },
      async getSetting<T>(key: string) {
        return (settings.get(key) as T | undefined) ?? null;
      },
      async setSetting(key, value) {
        settings.set(key, value);
      },
    },
    emails: {
      async memberEmails(ids) {
        return (ids ?? []).map((id) => ({
          id,
          email: `${id}@playrates.test`,
          username: id,
          email_prefs: {},
        }));
      },
      async logMessages(messages) {
        if (failLog) throw new Error("database down");
        logged.push(...messages);
      },
    },
    sender: {
      name: "log",
      async send(messages) {
        if (failSends) throw new Error("provider down");
        sent.push(...messages);
        return messages.map((_, i) => `resend-${i + 1}`);
      },
    },
    site: "https://playrates.test",
    logger: createLogger(),
    now: () => clock,
  });
  return {
    alerts,
    sent,
    logged,
    counted,
    advance: (ms: number) => (clock += ms),
  };
};

describe("job alerts", () => {
  it("emails each admin what failed", async () => {
    const { alerts, sent } = setup({ admins: ["admin-1", "admin-2"] });

    await alerts.jobFailed("trending", [
      { part: "Trending list", error: new Error("IGDB timed out") },
    ]);

    expect(sent.map((m) => m.to)).toEqual([
      "admin-1@playrates.test",
      "admin-2@playrates.test",
    ]);
    expect(sent[0]!.subject).toBe("PlayRates alert: the morning job failed");
    expect(sent[0]!.text).toContain("Trending list: IGDB timed out");
  });

  it("logs each admin it went to, with Resend's id", async () => {
    const { alerts, logged } = setup({ admins: ["admin-1", "admin-2"] });

    await alerts.jobFailed("trending", [{ part: "Trending list", error: "x" }]);

    expect(logged).toEqual([
      expect.objectContaining({
        userId: "admin-1",
        to: "admin-1@playrates.test",
        kind: "admin_alert",
        status: "sent",
        resendId: "resend-1",
      }),
      expect.objectContaining({ userId: "admin-2", resendId: "resend-2" }),
    ]);
  });

  it("still sends when the log can't be written", async () => {
    const { alerts, sent } = setup({ failLog: true });
    await alerts.jobFailed("nudges", [
      { part: "Tidying old logs", error: "x" },
    ]);
    expect(sent).toHaveLength(1);
  });

  it("sends nothing when every part ran", async () => {
    const { alerts, sent } = setup();
    await alerts.jobFailed("nudges", []);
    expect(sent).toEqual([]);
  });

  it("never throws, even when the email can't go", async () => {
    const { alerts } = setup({ failSends: true });
    await expect(
      alerts.jobFailed("nudges", [{ part: "Tidying old logs", error: "x" }]),
    ).resolves.toBeUndefined();
  });
});

describe("spike alerts", () => {
  it("emails once errors in the last hour reach the line", async () => {
    const { alerts, sent, counted } = setup({ errors: SPIKE_AT.server });

    await alerts.errorRecorded("server");

    expect(counted).toEqual(["server since 2026-11-01T11:00:00.000Z"]);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.subject).toBe(
      "PlayRates alert: 10 failed requests in the last hour",
    );
  });

  it("stays quiet below it", async () => {
    const { alerts, sent } = setup({ errors: SPIKE_AT.server - 1 });
    await alerts.errorRecorded("server");
    expect(sent).toEqual([]);
  });

  it("counts at most once a minute", async () => {
    const { alerts, counted, advance } = setup();
    await alerts.errorRecorded("client");
    advance(30_000);
    await alerts.errorRecorded("client");
    advance(31_000);
    await alerts.errorRecorded("client");
    expect(counted).toHaveLength(2);
  });

  it("sends one email per incident, then waits six hours", async () => {
    const { alerts, sent, advance } = setup({ errors: 100 });

    await alerts.errorRecorded("client");
    advance(5 * 3_600_000);
    await alerts.errorRecorded("client");
    expect(sent).toHaveLength(1);

    advance(3_600_000);
    await alerts.errorRecorded("client");
    expect(sent).toHaveLength(2);
    expect(sent[1]!.subject).toBe(
      "PlayRates alert: 100 browser errors in the last hour",
    );
  });

  it("keeps the two kinds apart", async () => {
    const { alerts, sent } = setup({ errors: 100 });
    await alerts.errorRecorded("server");
    await alerts.errorRecorded("client");
    expect(sent).toHaveLength(2);
  });
});

describe("alertEmail", () => {
  it("escapes what an error says", () => {
    const email = alertEmail(
      {
        kind: "job",
        job: "The morning job",
        failures: [{ part: "Trending list", message: "<script>x</script>" }],
      },
      "https://playrates.test",
    );
    expect(email.html).not.toContain("<script>x");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("https://playrates.test/admin/health");
  });
});
