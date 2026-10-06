import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildGameLog } from "../../../test/msw/handlers";
import YearChart from "./YearChart";

const NOTE = "Games you finish this year chart here";

describe("YearChart", () => {
    it("says what will fill an empty year when given a note", () => {
        render(<YearChart logs={[]} emptyNote={NOTE} />);
        expect(screen.getByText(NOTE)).toBeInTheDocument();
    });

    it("draws nothing for an empty year without one", () => {
        const { container } = render(<YearChart logs={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("charts a year with something in it instead of the note", () => {
        const finished = buildGameLog({
            status: "played",
            finishDate: `${new Date().getFullYear()}-03-10`,
        });
        render(<YearChart logs={[finished]} emptyNote={NOTE} />);
        expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
        expect(screen.getByTitle("1 in March")).toBeInTheDocument();
    });
});
