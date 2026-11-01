import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PatchNoteView from "./PatchNoteView";

describe("PatchNoteView", () => {
    it("lists changes as written, each with its kind, a linked one clickable whole", () => {
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
                        {
                            kind: "improvement",
                            text: "Import",
                            link: "/settings",
                        },
                    ],
                    outro: null,
                }}
            />
        );
        const rows = screen.getAllByRole("listitem");
        expect(rows.map((row) => row.textContent)).toEqual([
            "FixFixed it",
            "FeatureSteam",
            "ImprovementImport",
        ]);
        expect(within(rows[0]!).queryByRole("link")).toBeNull();

        const out = within(rows[1]!).getByRole("link");
        expect(out).toHaveTextContent("FeatureSteam");
        expect(out).toHaveAttribute("target", "_blank");
        const here = within(rows[2]!).getByRole("link");
        expect(here).toHaveAttribute("href", "/settings");
        expect(here).not.toHaveAttribute("target");

        expect(screen.getByText("One.")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "hello@playrates.app" })
        ).toHaveAttribute("href", "mailto:hello@playrates.app");
    });
});
