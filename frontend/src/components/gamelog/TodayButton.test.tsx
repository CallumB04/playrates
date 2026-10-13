import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setDisplayTimeZone } from "../../lib/format";
import TodayButton from "./TodayButton";

afterEach(() => {
    vi.useRealTimers();
    setDisplayTimeZone("UTC");
});

describe("TodayButton", () => {
    it("hands over today's date, named for the field it fills", async () => {
        vi.useFakeTimers({
            now: new Date("2026-10-12T21:30:00Z"),
            toFake: ["Date"],
        });
        setDisplayTimeZone("Europe/Tallinn");
        const onPick = vi.fn();
        render(<TodayButton field="finished" onPick={onPick} />);
        await userEvent.click(
            screen.getByRole("button", { name: "Set finished to today" })
        );
        expect(onPick).toHaveBeenCalledWith("2026-10-13");
    });
});
