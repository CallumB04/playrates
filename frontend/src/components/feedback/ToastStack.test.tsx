import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    NotificationProvider,
    useNotify,
    type NotificationSeverity,
    type NotificationType,
} from "../../contexts/NotificationContext";
import { DWELL_MS } from "../../contexts/notificationQueue";
import ToastStack from "./ToastStack";
import { EXIT_MS } from "./Toast";

const Raise = ({
    text,
    type = "success",
    severity,
}: {
    text: string;
    type?: NotificationType;
    severity?: NotificationSeverity;
}) => {
    const notify = useNotify();
    return (
        <button type="button" onClick={() => notify(text, type, severity)}>
            raise {text}
        </button>
    );
};

const renderStack = (triggers: React.ReactNode) =>
    render(
        <NotificationProvider>
            {triggers}
            <ToastStack />
        </NotificationProvider>
    );

const raise = async (text: string) =>
    await userEvent.click(
        screen.getByRole("button", { name: `raise ${text}` })
    );

const advance = async (ms: number) => {
    await act(async () => {
        vi.advanceTimersByTime(ms);
    });
};

/** The exit is only scheduled once the dwell has run, so it needs its own tick. */
const advanceThenExit = async (ms: number) => {
    await advance(ms);
    await advance(EXIT_MS);
};

const visible = () =>
    screen.getByRole("list", { name: "Notifications" }).textContent;

describe("ToastStack", () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("shows a raised toast", async () => {
        renderStack(<Raise text="Entry saved" />);
        await raise("Entry saved");

        expect(screen.getByText("Entry saved")).toBeInTheDocument();
    });

    it("announces an error assertively and anything else politely", async () => {
        renderStack(
            <>
                <Raise text="Saved" />
                <Raise text="Failed" type="error" />
            </>
        );
        await raise("Saved");
        await raise("Failed");

        expect(screen.getByRole("status")).toHaveTextContent("Saved");
        expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    });

    it("clears itself once its dwell runs out", async () => {
        renderStack(<Raise text="Entry saved" />);
        await raise("Entry saved");

        await advanceThenExit(DWELL_MS.low!);

        expect(screen.queryByText("Entry saved")).not.toBeInTheDocument();
    });

    it("keeps a critical toast until it is dismissed by hand", async () => {
        renderStack(
            <Raise text="Note lost" type="error" severity="critical" />
        );
        await raise("Note lost");

        await advance(60_000);
        expect(screen.getByText("Note lost")).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole("button", { name: "Dismiss notification" })
        );
        await advance(EXIT_MS);

        expect(screen.queryByText("Note lost")).not.toBeInTheDocument();
    });

    it("draws a countdown line only on a toast that expires", async () => {
        const { container } = renderStack(
            <>
                <Raise text="Saved" />
                <Raise text="Note lost" type="error" severity="critical" />
            </>
        );

        await raise("Saved");
        expect(container.querySelector(".animate-toast-countdown")).toHaveStyle(
            { animationDuration: `${DWELL_MS.low}ms` }
        );

        await raise("Note lost");
        expect(
            container.querySelectorAll(".animate-toast-countdown")
        ).toHaveLength(1);
    });

    it("pushes the oldest out when a fourth arrives", async () => {
        renderStack(
            <>
                <Raise text="One" />
                <Raise text="Two" />
                <Raise text="Three" />
                <Raise text="Four" />
            </>
        );

        for (const text of ["One", "Two", "Three", "Four"]) await raise(text);

        // Still mounted while it plays its exit, then gone.
        expect(screen.getByText("One")).toBeInTheDocument();
        await advance(EXIT_MS);

        expect(visible()).toBe("TwoThreeFour");
    });
});
