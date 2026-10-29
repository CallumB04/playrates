import { describe, expect, it } from "vitest";
import {
  createResendActivity,
  parseResendTime,
  tallyPage,
  type ListedEmail,
} from "../../src/modules/email/email.activity.js";
import type { ResendClient } from "../../src/modules/email/email.resend.js";

const at = (iso: string) => iso.replace("T", " ").replace("Z", "+00");
const email = (id: string, iso: string, last_event: string | null = "delivered"): ListedEmail => ({
  id,
  created_at: at(iso),
  last_event,
});

describe("Resend's sends", () => {
  it("reads Resend's own timestamps", () => {
    expect(parseResendTime("2026-10-29 15:08:47.879+00")).toBe(
      Date.parse("2026-10-29T15:08:47.879Z"),
    );
  });

  it("counts back to the cutoff, bounces and complaints included", () => {
    const into = { sent: 0, more: false, bounced: 0, complained: 0 };
    const done = tallyPage(
      [
        email("a", "2026-11-10T11:00:00Z", "bounced"),
        email("b", "2026-11-10T10:00:00Z", "complained"),
        email("c", "2026-11-09T10:00:00Z"),
        email("d", "2026-11-10T09:00:00Z"),
      ],
      Date.parse("2026-11-09T12:00:00Z"),
      into,
    );
    expect(done).toBe(true);
    expect(into).toEqual({ sent: 2, more: false, bounced: 1, complained: 1 });
  });

  it("pages on until it passes the cutoff", async () => {
    const asked: string[] = [];
    const pages = [
      { data: [email("a", "2026-11-10T11:00:00Z")], has_more: true },
      { data: [email("b", "2026-11-10T10:00:00Z"), email("c", "2026-11-01T10:00:00Z")], has_more: true },
    ];
    const client: ResendClient = {
      async request<T>(_method: string, path: string) {
        asked.push(path);
        return pages[asked.length - 1] as T;
      },
    };
    const sends = await createResendActivity(client).since(new Date("2026-11-09T12:00:00Z"));
    expect(sends).toEqual({ sent: 2, more: false, bounced: 0, complained: 0 });
    expect(asked).toEqual(["/emails?limit=100", "/emails?limit=100&after=a"]);
  });

  it("stops after three pages and says there were more", async () => {
    let n = 0;
    const client: ResendClient = {
      async request<T>() {
        n += 1;
        return {
          data: [email(`e${n}`, "2026-11-10T11:00:00Z")],
          has_more: true,
        } as T;
      },
    };
    const sends = await createResendActivity(client).since(new Date("2026-11-09T12:00:00Z"));
    expect(n).toBe(3);
    expect(sends).toMatchObject({ sent: 3, more: true });
  });
});
