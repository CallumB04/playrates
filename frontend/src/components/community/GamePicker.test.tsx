import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { buildGame, paginated } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import GamePicker, { type PickedGame } from "./GamePicker";

const API = "http://localhost:3000/api/v1";

const Harness = ({
    onChange,
}: {
    onChange: (g: PickedGame | null) => void;
}) => {
    const [value, setValue] = useState<PickedGame | null>(null);
    return (
        <GamePicker
            aria-label="Game"
            value={value}
            onChange={(next) => {
                setValue(next);
                onChange(next);
            }}
        />
    );
};

describe("GamePicker", () => {
    it("searches as you type and takes the game you pick", async () => {
        const searched = vi.fn();
        server.use(
            http.get(`${API}/games/search`, ({ request }) => {
                searched(new URL(request.url).searchParams.get("q"));
                return HttpResponse.json(
                    paginated([
                        buildGame({
                            id: 7,
                            title: "Portal 2",
                            releaseDate: "2011-04-19",
                        }),
                    ])
                );
            })
        );
        const onChange = vi.fn();
        renderWithProviders(<Harness onChange={onChange} />);

        await userEvent.type(screen.getByRole("combobox"), "port");
        await userEvent.click(
            await screen.findByRole("option", { name: /Portal 2/ })
        );

        expect(searched).toHaveBeenCalledWith("port");
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ id: 7, title: "Portal 2" })
        );
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
        expect(screen.getByText("Portal 2")).toBeInTheDocument();
    });

    it("picks the highlighted game with the keyboard", async () => {
        server.use(
            http.get(`${API}/games/search`, () =>
                HttpResponse.json(
                    paginated([
                        buildGame({ id: 1, title: "Hades" }),
                        buildGame({ id: 2, title: "Hades II" }),
                    ])
                )
            )
        );
        const onChange = vi.fn();
        renderWithProviders(<Harness onChange={onChange} />);

        await userEvent.type(screen.getByRole("combobox"), "hades");
        await screen.findByRole("option", { name: /Hades II/ });
        await userEvent.keyboard("{ArrowDown}{Enter}");

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ id: 2 })
        );
    });

    it("goes back to searching when the choice is cleared", async () => {
        server.use(
            http.get(`${API}/games/search`, () =>
                HttpResponse.json(
                    paginated([buildGame({ id: 3, title: "Celeste" })])
                )
            )
        );
        const onChange = vi.fn();
        renderWithProviders(<Harness onChange={onChange} />);

        await userEvent.type(screen.getByRole("combobox"), "cel");
        await userEvent.click(
            await screen.findByRole("option", { name: /Celeste/ })
        );
        await userEvent.click(screen.getByRole("button", { name: /Change/ }));

        expect(onChange).toHaveBeenLastCalledWith(null);
        await waitFor(() =>
            expect(screen.getByRole("combobox")).toBeInTheDocument()
        );
    });
});
