import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildGameLog } from "../../test/msw/handlers";
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

    it("writes each month's count over its bar, and marks this month, when labelled", () => {
        const year = new Date().getFullYear();
        const logs = [
            buildGameLog({ id: 1, finishDate: `${year}-01-10` }),
            buildGameLog({ id: 2, finishDate: `${year}-01-20` }),
        ];
        const { container } = render(<YearChart logs={logs} labelled />);

        expect(screen.getByTitle("2 in January")).toHaveTextContent("2");
        expect(container.querySelectorAll("[aria-current=date]")).toHaveLength(
            1
        );
    });

    it("keeps its bars bare unless asked", () => {
        const year = new Date().getFullYear();
        render(
            <YearChart logs={[buildGameLog({ finishDate: `${year}-01-10` })]} />
        );
        expect(screen.getByTitle("1 in January")).toHaveTextContent("");
    });
});
