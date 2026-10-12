import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SetupChecklist from "./SetupChecklist";
import { setupSteps } from "../lib/setupChecklist";

const steps = setupSteps({
    profile: {
        avatarUrl: "https://x.test/a.webp",
        bio: "",
        checklistDismissedAt: null,
    },
    logCount: 4,
    friendCount: 0,
});

const renderList = (onDismiss = vi.fn()) =>
    render(
        <MemoryRouter>
            <SetupChecklist steps={steps} onDismiss={onDismiss} />
        </MemoryRouter>
    );

describe("SetupChecklist", () => {
    it("counts what is done, on the bar as well as in words", () => {
        renderList();
        expect(screen.getByText("2 of 4 done")).toBeInTheDocument();
        expect(screen.getByRole("progressbar")).toHaveAttribute(
            "aria-valuenow",
            "50"
        );
    });

    it("takes each step left to where it is done", () => {
        renderList();
        expect(
            screen.getByRole("link", { name: /write a bio/i })
        ).toHaveAttribute("href", "/settings?section=profile");
        expect(
            screen.getByRole("link", { name: /add a friend/i })
        ).toHaveAttribute("href", "/community");
    });

    /* Kept on the list, ticked, but nothing left to press. */
    it("leaves done steps on the list without a link", () => {
        renderList();
        expect(screen.getByText("Log your first game")).toBeInTheDocument();
        expect(
            screen.queryByRole("link", { name: /log your first game/i })
        ).not.toBeInTheDocument();
    });

    it("can be put away", async () => {
        const onDismiss = vi.fn();
        renderList(onDismiss);
        await userEvent.click(
            screen.getByRole("button", { name: /dismiss setup checklist/i })
        );
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
