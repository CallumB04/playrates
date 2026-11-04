import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import Breadcrumbs from "./Breadcrumbs";

const TRAIL = [
    { name: "ana", path: "/user/ana" },
    { name: "Lists", path: "/user/ana/lists" },
    { name: "Best of", path: "/user/ana/lists/7" },
];

describe("Breadcrumbs", () => {
    it("links every step but the page itself, which it marks as here", () => {
        renderWithProviders(<Breadcrumbs trail={TRAIL} />);
        const trail = within(screen.getByRole("list"));

        expect(trail.getByRole("link", { name: "ana" })).toHaveAttribute(
            "href",
            "/user/ana"
        );
        expect(trail.getByRole("link", { name: "Lists" })).toHaveAttribute(
            "href",
            "/user/ana/lists"
        );
        expect(trail.queryByRole("link", { name: "Best of" })).toBeNull();
        expect(trail.getByText("Best of")).toHaveAttribute(
            "aria-current",
            "page"
        );
    });

    /* The phone's line: the whole trail didn't fit beside a thumb. */
    it("gives a phone the step back alone", () => {
        renderWithProviders(<Breadcrumbs trail={TRAIL} />);
        const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
        const phone = within(nav)
            .getAllByRole("link")
            .find((a) => a.classList.contains("sm:hidden"))!;

        expect(phone).toHaveTextContent("Lists");
        expect(phone).toHaveAttribute("href", "/user/ana/lists");
    });

    it("draws nothing for a page with nowhere to go back to", () => {
        const { container } = renderWithProviders(
            <Breadcrumbs trail={[{ name: "Library", path: "/library" }]} />
        );
        expect(container).toBeEmptyDOMElement();
    });
});
