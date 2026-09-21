import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Dropdown from "./Dropdown";

const OPTIONS = [
    { value: "Europe/London", label: "Europe/London" },
    { value: "Europe/Lisbon", label: "Europe/Lisbon" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo" },
];

const open = async (label = "Time zone") =>
    userEvent.click(screen.getByRole("button", { name: label }));

describe("Dropdown", () => {
    it("shows the chosen option on the closed control", () => {
        render(
            <Dropdown
                options={OPTIONS}
                value="Asia/Tokyo"
                onChange={vi.fn()}
                aria-label="Time zone"
            />
        );
        expect(screen.getByRole("button")).toHaveTextContent("Asia/Tokyo");
    });

    it("falls back to the placeholder when the value matches nothing", () => {
        render(
            <Dropdown
                options={OPTIONS}
                value="Mars/Olympus"
                onChange={vi.fn()}
                placeholder="Pick one"
                aria-label="Time zone"
            />
        );
        expect(screen.getByRole("button")).toHaveTextContent("Pick one");
    });

    it("commits the option that was clicked", async () => {
        const onChange = vi.fn();
        render(
            <Dropdown
                options={OPTIONS}
                value="Asia/Tokyo"
                onChange={onChange}
                aria-label="Time zone"
            />
        );

        await open();
        await userEvent.click(
            screen.getByRole("option", { name: "Europe/Lisbon" })
        );

        expect(onChange).toHaveBeenCalledWith("Europe/Lisbon");
        expect(screen.queryByRole("listbox")).toBeNull();
    });

    describe("searchable", () => {
        const searchable = (onChange = vi.fn()) => {
            render(
                <Dropdown
                    searchable
                    options={OPTIONS}
                    value="Asia/Tokyo"
                    onChange={onChange}
                    aria-label="Time zone"
                />
            );
            return onChange;
        };

        it("narrows the list as you type", async () => {
            searchable();
            await open();

            expect(screen.getAllByRole("option")).toHaveLength(3);

            await userEvent.type(
                screen.getByRole("textbox", { name: "Filter options" }),
                "lond"
            );

            const remaining = screen.getAllByRole("option");
            expect(remaining).toHaveLength(1);
            expect(remaining[0]).toHaveTextContent("Europe/London");
        });

        it("matches anywhere in the label, not just the start", async () => {
            searchable();
            await open();
            await userEvent.type(
                screen.getByRole("textbox", { name: "Filter options" }),
                "tokyo"
            );
            expect(screen.getAllByRole("option")).toHaveLength(1);
        });

        it("says so when nothing matches, rather than showing an empty menu", async () => {
            searchable();
            await open();
            await userEvent.type(
                screen.getByRole("textbox", { name: "Filter options" }),
                "zzz"
            );

            expect(screen.queryAllByRole("option")).toHaveLength(0);
            expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
        });

        it("commits what the filter left highlighted on Enter", async () => {
            const onChange = searchable();
            await open();
            await userEvent.type(
                screen.getByRole("textbox", { name: "Filter options" }),
                "lisb{Enter}"
            );
            expect(onChange).toHaveBeenCalledWith("Europe/Lisbon");
        });

        it("types a space into the filter rather than committing on it", async () => {
            const onChange = searchable();
            await open();
            await userEvent.type(
                screen.getByRole("textbox", { name: "Filter options" }),
                "europe "
            );

            expect(onChange).not.toHaveBeenCalled();
            expect(
                screen.getByRole("textbox", { name: "Filter options" })
            ).toHaveValue("europe ");
        });

        it("forgets the filter between openings", async () => {
            searchable();
            await open();
            await userEvent.type(
                screen.getByRole("textbox", { name: "Filter options" }),
                "lond"
            );
            await userEvent.keyboard("{Escape}");

            await open();
            expect(screen.getAllByRole("option")).toHaveLength(3);
        });
    });
});
