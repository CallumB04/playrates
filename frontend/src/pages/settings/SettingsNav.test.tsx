import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Lock, UserRound } from "lucide-react";
import SettingsNav from "./SettingsNav";

const sections = [
    { id: "account", label: "Account", icon: UserRound },
    { id: "privacy", label: "Privacy", icon: Lock },
];

describe("SettingsNav on a phone", () => {
    it("names the section it's on, and picks another from a sheet", async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup({ delay: null });
        render(
            <SettingsNav
                sections={sections}
                active="account"
                onSelect={onSelect}
            />
        );

        await user.click(
            screen.getByRole("button", { name: /Account.*Sections/ })
        );
        const sheet = within(screen.getByRole("dialog"));
        await user.click(sheet.getByRole("button", { name: "Privacy" }));

        expect(onSelect).toHaveBeenCalledWith("privacy");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
