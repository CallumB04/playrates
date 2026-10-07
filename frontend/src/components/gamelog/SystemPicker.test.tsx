import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlatformSystem } from "@playrates/shared";
import SystemPicker from "./SystemPicker";

const system = (slug: string, displayName: string): PlatformSystem => ({
    slug,
    displayName,
    platformSlug: "playstation",
    sortOrder: 10,
});

const SYSTEMS = [
    system("playstation5", "PlayStation 5"),
    system("playstation4", "PlayStation 4"),
];

const setup = (value = "") => {
    const onChange = vi.fn();
    render(
        <>
            <span id="label">Platform</span>
            <SystemPicker
                systems={SYSTEMS}
                value={value}
                onChange={onChange}
                logged={["playstation4"]}
                labelledBy="label"
            />
        </>
    );
    return { onChange };
};

describe("SystemPicker", () => {
    it("picks a console", async () => {
        const { onChange } = setup();
        await userEvent.click(
            screen.getByRole("radio", { name: /PlayStation 5/ })
        );
        expect(onChange).toHaveBeenCalledWith("playstation5");
    });

    /* Kept in sight and marked, so it's clear why it can't be picked. */
    it("shows a console already logged as logged, and won't pick it", async () => {
        const { onChange } = setup();
        const taken = screen.getByRole("radio", { name: /PlayStation 4/ });

        expect(taken).toBeDisabled();
        expect(taken).toHaveTextContent("Logged");
        await userEvent.click(taken);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("marks the chosen console as checked", () => {
        setup("playstation5");
        expect(
            screen.getByRole("radio", { name: /PlayStation 5/ })
        ).toBeChecked();
    });
});
