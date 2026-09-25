import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Stat from "./Stat";

describe("Stat", () => {
    it("shows the figure over its label", () => {
        render(<Stat label="Hours played" value="31h" />);
        expect(screen.getByText("31h")).toBeInTheDocument();
        expect(screen.getByText("Hours played")).toBeInTheDocument();
    });

    /* A figure nobody has fetched yet is not zero: showing 0 while it loads
       would say something about the profile that isn't true. */
    it("holds the figure's place while it loads, keeping the label", () => {
        render(<Stat label="Reviews" value="0" loading />);
        expect(screen.queryByText("0")).toBeNull();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
    });
});
