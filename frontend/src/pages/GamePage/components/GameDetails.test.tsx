import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/renderWithProviders";
import type { GameFacts } from "../lib/gameFacts";
import GameDetails from "./GameDetails";

const FACTS: GameFacts = {
    released: "24 Feb 2017",
    rated: null,
    platforms: [{ slug: "steam", name: "Steam" }],
    genres: [{ slug: "role-playing-rpg", name: "Role-playing (RPG)" }],
    developers: ["FromSoftware"],
    publishers: ["Bandai Namco"],
    website: { href: "https://eldenring.com/en", label: "eldenring.com" },
};

describe("GameDetails", () => {
    it("links each platform and genre to the library, filtered to it", () => {
        renderWithProviders(<GameDetails facts={FACTS} />);

        expect(screen.getByRole("link", { name: "Steam" })).toHaveAttribute(
            "href",
            "/library?platform=steam"
        );
        expect(
            screen.getByRole("link", { name: "Role-playing (RPG)" })
        ).toHaveAttribute("href", "/library?genre=role-playing-rpg");
    });

    it("opens the website away from the page, without handing it the opener", () => {
        renderWithProviders(<GameDetails facts={FACTS} />);

        const site = screen.getByRole("link", { name: /eldenring\.com/ });
        expect(site).toHaveAttribute("target", "_blank");
        expect(site).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("leaves out what a game has nothing for", () => {
        renderWithProviders(<GameDetails facts={FACTS} />);

        expect(screen.queryByText("Rated")).not.toBeInTheDocument();
        expect(screen.getByText("Bandai Namco")).toBeInTheDocument();
    });

    it("renders nothing for a game with no details at all", () => {
        const { container } = renderWithProviders(
            <GameDetails
                facts={{
                    released: null,
                    rated: null,
                    platforms: [],
                    genres: [],
                    developers: [],
                    publishers: [],
                    website: null,
                }}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });
});
