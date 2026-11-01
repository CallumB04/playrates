import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PatchNoteView from "./PatchNoteView";

describe("PatchNoteView", () => {
    it("lists changes under their kinds, linking out in a new tab", () => {
        renderWithProviders(
            <PatchNoteView
                note={{
                    title: "v1.2",
                    intro: "One.\n\nTwo, at hello@playrates.app.",
                    items: [
                        { kind: "fix", text: "Fixed it", link: null },
                        {
                            kind: "feature",
                            text: "Steam",
                            link: "https://store.steampowered.com",
                        },
                        { kind: "feature", text: "Import", link: "/settings" },
                    ],
                    outro: null,
                }}
            />
        );
        const headings = screen
            .getAllByRole("heading", { level: 3 })
            .map((h) => h.textContent);
        expect(headings).toEqual(["New features", "Fixes"]);
        expect(screen.getByText("One.")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "hello@playrates.app" })
        ).toHaveAttribute("href", "mailto:hello@playrates.app");

        const out = screen.getByRole("link", { name: "Steam" });
        expect(out).toHaveAttribute("target", "_blank");
        expect(screen.getByRole("link", { name: "Import" })).toHaveAttribute(
            "href",
            "/settings"
        );
        expect(
            screen.getByRole("link", { name: "Import" })
        ).not.toHaveAttribute("target");
    });
});
