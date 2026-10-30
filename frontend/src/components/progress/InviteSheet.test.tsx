import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { REFERRAL } from "@playrates/shared";
import { renderWithProviders } from "../../test/renderWithProviders";
import InviteSheet from "./InviteSheet";

describe("InviteSheet", () => {
    it("says what an invite is worth to each of you, from the rules", () => {
        renderWithProviders(<InviteSheet username="bee" onClose={() => {}} />);
        const you = screen.getByText("You get").parentElement!;
        expect(you).toHaveTextContent(`+${REFERRAL.inviterXp} XP`);
        expect(you).toHaveTextContent(`+${REFERRAL.inviterTokens}`);
        const them = screen.getByText("They get").parentElement!;
        expect(them).toHaveTextContent(`+${REFERRAL.welcomeXp} XP`);
        expect(them).toHaveTextContent(`+${REFERRAL.welcomeTokens}`);
    });

    // The Player card is shared from the profile; this is the link alone.
    it("hands over your link, and no picture", () => {
        renderWithProviders(<InviteSheet username="bee" onClose={() => {}} />);
        expect(screen.getByText("localhost:3000/?ref=bee")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Copy" })
        ).toBeInTheDocument();
        expect(screen.queryByRole("img")).toBeNull();
        expect(screen.queryByRole("button", { name: "Download" })).toBeNull();
    });
});
