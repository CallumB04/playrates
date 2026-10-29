import { describe, expect, it, vi } from "vitest";
import {
  createResendClient,
  ResendError,
} from "../../src/modules/email/email.resend.js";
import {
  createLoggingSender,
  createMailpitSender,
  createResendSender,
  parseAddress,
  type EmailMessage,
} from "../../src/modules/email/email.sender.js";
import { createResendAudience } from "../../src/modules/email/email.audience.js";

interface Call {
  method: string;
  url: string;
  body: unknown;
  headers: Headers;
}

/** A fake Resend that answers each request from the queue, recording it. */
const upstream = (responses: (() => Response)[]) => {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: string | URL, init?: RequestInit) => {
    calls.push({
      method: init?.method ?? "GET",
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: new Headers(init?.headers),
    });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request to ${String(input)}`);
    return next();
  }) as unknown as typeof fetch;
  const client = createResendClient("re_test", fetchImpl, {
    sleep: async () => {},
    minIntervalMs: 0,
  });
  return { calls, client };
};

const message = (n: number): EmailMessage => ({
  to: `m${n}@example.test`,
  subject: `Hi ${n}`,
  html: "<p>Hi</p>",
  text: "Hi",
  headers: { "List-Unsubscribe": `<https://api.test/u?t=${n}>` },
});

const ok = (body: unknown = { id: "x" }) => () => Response.json(body);
const status = (code: number, body: unknown = {}) => () =>
  Response.json(body, { status: code });

describe("Resend client", () => {
  it("signs in and names itself, as Resend requires", async () => {
    const { calls, client } = upstream([ok()]);
    await client.request("GET", "/segments/s/contacts");
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer re_test");
    expect(calls[0]!.headers.get("user-agent")).toBeTruthy();
  });

  it("tries a 5xx again", async () => {
    const { calls, client } = upstream([status(502), ok({ id: "e1" })]);
    await expect(client.request("POST", "/emails", {})).resolves.toEqual({ id: "e1" });
    expect(calls).toHaveLength(2);
  });

  it("doesn't try a 429 again: it's the quota or the rate", async () => {
    const { calls, client } = upstream([
      status(429, { name: "daily_quota_exceeded", message: "Quota" }),
    ]);
    const error = await client.request("POST", "/emails", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ResendError);
    expect(error).toMatchObject({ status: 429, type: "daily_quota_exceeded" });
    expect(calls).toHaveLength(1);
  });

  it("tries a dropped connection again", async () => {
    const { calls, client } = upstream([
      () => {
        throw new TypeError("fetch failed");
      },
      ok({ id: "e1" }),
    ]);
    await expect(client.request("POST", "/emails", {})).resolves.toEqual({ id: "e1" });
    expect(calls).toHaveLength(2);
  });

  it("gives up after three 5xx", async () => {
    const { calls, client } = upstream([status(500), status(500), status(500)]);
    await expect(client.request("POST", "/emails", {})).rejects.toMatchObject({ status: 500 });
    expect(calls).toHaveLength(3);
  });

  it("waits between requests", async () => {
    const waits: number[] = [];
    const fetchImpl = (async () => Response.json({})) as unknown as typeof fetch;
    const client = createResendClient("re_test", fetchImpl, {
      sleep: async (ms) => {
        waits.push(ms);
      },
      minIntervalMs: 200,
    });
    await Promise.all([client.request("GET", "/a"), client.request("GET", "/b")]);
    expect(waits.some((ms) => ms > 0)).toBe(true);
  });
});

describe("with no provider", () => {
  it("only logs what would have gone", async () => {
    const info = vi.fn();
    await createLoggingSender({ info } as never).send([message(1)]);
    expect(info).toHaveBeenCalledWith({ subject: "Hi 1" }, expect.any(String));
  });
});

describe("Resend sender", () => {
  it("sends one email on its own, with its one-click headers", async () => {
    const { calls, client } = upstream([ok()]);
    await createResendSender(client, "PlayRates <hello@playrates.app>").send([message(1)]);
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect(calls[0]!.body).toMatchObject({
      from: "PlayRates <hello@playrates.app>",
      to: ["m1@example.test"],
      headers: { "List-Unsubscribe": "<https://api.test/u?t=1>" },
    });
  });

  it("batches many, a hundred at a time", async () => {
    const { calls, client } = upstream([ok({ data: [] }), ok({ data: [] }), ok({ data: [] })]);
    const many = Array.from({ length: 205 }, (_, i) => message(i));
    await createResendSender(client, "x@y.test").send(many);
    expect(calls.map((c) => c.url)).toEqual(
      Array(3).fill("https://api.resend.com/emails/batch"),
    );
    expect(calls.map((c) => (c.body as unknown[]).length)).toEqual([100, 100, 5]);
  });
});

describe("Resend audience", () => {
  const audience = (responses: (() => Response)[]) => {
    const fake = upstream(responses);
    return { ...fake, audience: createResendAudience(fake.client, "seg_1", "x@y.test") };
  };

  it("updates a contact that's there", async () => {
    const { calls, audience: a } = audience([ok()]);
    await a.upsertContact("a+b@example.test", false);
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toMatchObject({
      method: "PATCH",
      url: "https://api.resend.com/contacts/a%2Bb%40example.test",
      body: { unsubscribed: true },
    });
  });

  it("adds a contact that isn't, into the segment", async () => {
    const { calls, audience: a } = audience([status(404), ok()]);
    await a.upsertContact("a@example.test", true);
    expect(calls[1]!).toMatchObject({
      method: "POST",
      url: "https://api.resend.com/contacts",
      body: { email: "a@example.test", unsubscribed: false, segments: [{ id: "seg_1" }] },
    });
  });

  it("takes a contact out, and doesn't mind one already gone", async () => {
    const { calls, audience: a } = audience([status(404)]);
    await a.removeContact("a@example.test");
    expect(calls[0]!.method).toBe("DELETE");
  });

  it("reads every page of the segment", async () => {
    const { calls, audience: a } = audience([
      ok({ has_more: true, data: [{ id: "c1", email: "a@x.test", unsubscribed: false }] }),
      ok({ has_more: false, data: [{ id: "c2", email: "b@x.test", unsubscribed: true }] }),
    ]);
    expect(await a.listContacts()).toEqual([
      { email: "a@x.test", unsubscribed: false },
      { email: "b@x.test", unsubscribed: true },
    ]);
    expect(calls[1]!.url).toContain("/segments/seg_1/contacts?limit=100&after=c1");
  });

  it("creates and sends a broadcast in one go", async () => {
    const { calls, audience: a } = audience([ok({ id: "b_1" })]);
    const id = await a.broadcast({ name: "News", subject: "News", html: "<p/>", text: "" });
    expect(id).toBe("b_1");
    expect(calls[0]!.body).toMatchObject({ segment_id: "seg_1", send: true, from: "x@y.test" });
  });
});

describe("Mailpit sender", () => {
  it("posts each email to the local viewer's send API", async () => {
    const bodies: unknown[] = [];
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return Response.json({ ID: "m" });
    }) as unknown as typeof fetch;
    await createMailpitSender("http://mail.test/", "PlayRates <hello@playrates.app>", fetchImpl).send([
      message(1),
    ]);
    expect(bodies[0]).toMatchObject({
      From: { Name: "PlayRates", Email: "hello@playrates.app" },
      To: [{ Email: "m1@example.test" }],
      Subject: "Hi 1",
      Headers: { "List-Unsubscribe": "<https://api.test/u?t=1>" },
    });
  });

  it("says so when the viewer refuses one", async () => {
    const fetchImpl = (async () => new Response("bad", { status: 400 })) as unknown as typeof fetch;
    await expect(
      createMailpitSender("http://mail.test", "x@y.test", fetchImpl).send([message(1)]),
    ).rejects.toThrow("Mailpit refused");
  });

  it("reads a bare address as one", () => {
    expect(parseAddress("hello@playrates.app")).toEqual({ Name: "", Email: "hello@playrates.app" });
  });
});
