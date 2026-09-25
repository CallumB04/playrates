import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RatingMeter from "./RatingMeter";

const meter = (value: number | null) => {
    const onChange = vi.fn();
    render(<RatingMeter value={value} onChange={onChange} label="Your rating" />);
    return { onChange, slider: screen.getByRole("slider") };
};

describe("RatingMeter", () => {
    /* Zero is the absence of a rating, not the bottom of the scale. The
       keyboard was the one way to reach it. */
    it("will not go below 0.5, however far down you arrow", async () => {
        const user = userEvent.setup();
        const { onChange, slider } = meter(0.5);
        slider.focus();

        await user.keyboard("{ArrowDown}{ArrowLeft}{PageDown}");

        expect(onChange).toHaveBeenCalled();
        for (const [value] of onChange.mock.calls) expect(value).toBe(0.5);
    });

    it("sends Home to the bottom of the scale, not to nothing", async () => {
        const user = userEvent.setup();
        const { onChange, slider } = meter(7);
        slider.focus();

        await user.keyboard("{Home}");

        expect(onChange).toHaveBeenCalledWith(0.5);
    });

    it("starts an unrated log at 0.5 on the first nudge up", async () => {
        const user = userEvent.setup();
        const { onChange, slider } = meter(null);
        slider.focus();

        await user.keyboard("{ArrowUp}");

        expect(onChange).toHaveBeenCalledWith(0.5);
    });

    it("clears to not rated, which is what an unrated log is", async () => {
        const user = userEvent.setup();
        const { onChange, slider } = meter(6);
        slider.focus();

        await user.keyboard("{Backspace}");

        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("tells assistive tech the scale starts at 0.5", () => {
        const { slider } = meter(null);
        expect(slider).toHaveAttribute("aria-valuemin", "0.5");
        expect(slider).toHaveAttribute("aria-valuemax", "10");
        expect(slider).toHaveAttribute("aria-valuetext", "Not rated");
    });

    it("offers a segment for every rating, 0.5 to 10", () => {
        meter(null);
        const segments = screen.getAllByRole("button");
        expect(segments).toHaveLength(20);
        expect(segments[0]).toHaveAccessibleName("0.50 out of 10");
        expect(segments[19]).toHaveAccessibleName("10.00 out of 10");
    });
});
