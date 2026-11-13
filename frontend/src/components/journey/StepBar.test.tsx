import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import StepBar from "./StepBar";

describe("StepBar", () => {
    it("names every step and says which are done and which is now", () => {
        render(
            <StepBar
                label="Your welcome"
                steps={["Account", "You", "Games"]}
                done={1}
            />
        );
        const [account, you, games] = within(
            screen.getByRole("list", { name: "Your welcome" })
        ).getAllByRole("listitem");
        expect(account).toHaveTextContent("Account, done");
        expect(you).toHaveAttribute("aria-current", "step");
        expect(you).toHaveTextContent("You, now");
        expect(games).toHaveTextContent(/^Games$/);
    });
});
