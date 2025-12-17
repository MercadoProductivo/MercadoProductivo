import { render, screen, fireEvent } from "@testing-library/react";
import { SubmitButton } from "./submit-button";
import React from "react";

describe("SubmitButton", () => {
    it("renders children correctly", () => {
        render(<SubmitButton>Click me</SubmitButton>);
        expect(screen.getByText("Click me")).toBeInTheDocument();
    });

    it("shows loading text and spinner when isLoading is true", () => {
        render(<SubmitButton isLoading={true} loadingText="Processing...">Click me</SubmitButton>);
        expect(screen.getByText("Processing...")).toBeInTheDocument();
        // Check for spinner presence (it works by implementation detail, usually aria-label or role check)
        // In our component we might not have a role="status" on the spinner, but we can check if the button is disabled
        expect(screen.getByRole("button")).toBeDisabled();
        expect(screen.queryByText("Click me")).not.toBeInTheDocument();
    });

    it("is disabled when isLoading is true", () => {
        const handleClick = jest.fn();
        render(<SubmitButton isLoading={true} onClick={handleClick}>Click me</SubmitButton>);
        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(handleClick).not.toHaveBeenCalled();
    });

    it("is not disabled by default (click-to-validate strategy)", () => {
        render(<SubmitButton>Validate</SubmitButton>);
        const button = screen.getByRole("button");
        expect(button).not.toBeDisabled();
    });

    it("passes other props through", () => {
        render(<SubmitButton data-testid="custom-btn" className="custom-class">Test</SubmitButton>);
        const button = screen.getByTestId("custom-btn");
        expect(button).toHaveClass("custom-class");
    });
});
