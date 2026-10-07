import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rollupLogs } from "@playrates/shared";
import { buildLogBundle, buildGameLog } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import MyLogsPlate from "./MyLogsPlate";

const bundle = buildLogBundle([
    buildGameLog({
        id: 1,
        system: "steam",
        rating: 9,
        hoursPlayed: 40,
        hoursToBeat: 30,
    }),
    buildGameLog({
        id: 2,
        system: "switch",
        status: "playing",
        playedStatus: null,
        rating: 7,
        hoursPlayed: 12,
        hoursToBeat: 21,
    }),
]);

const setup = (canAdd = true) => {
    const props = {
        onEdit: vi.fn(),
        onAdd: vi.fn(),
        onView: vi.fn(),
    };
    renderWithProviders(
        <MyLogsPlate
            logs={bundle.logs}
            rollup={rollupLogs(bundle.logs)!}
            canAdd={canAdd}
            {...props}
        />
    );
    return props;
};

describe("MyLogsPlate", () => {
    it("adds the logs up across consoles", () => {
        setup();
        expect(screen.getByText("52h")).toBeInTheDocument();
        expect(screen.getByText("21h")).toBeInTheDocument();
        expect(screen.getByText("Your average of 2")).toBeInTheDocument();
    });

    it("opens the log a row is for", async () => {
        const { onEdit } = setup();
        const rows = screen
            .getAllByRole("button")
            .filter((b) => b.textContent?.includes("/10"));

        await userEvent.click(rows[1]!);
        expect(onEdit).toHaveBeenCalledWith(2);
    });

    it("offers another platform only while one is left", async () => {
        const { onAdd } = setup();
        await userEvent.click(
            screen.getByRole("button", { name: /Add a platform/ })
        );
        expect(onAdd).toHaveBeenCalledOnce();
    });

    it("drops the offer once every console is logged", () => {
        setup(false);
        expect(
            screen.queryByRole("button", { name: /Add a platform/ })
        ).not.toBeInTheDocument();
    });
});
