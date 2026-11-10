import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoginForm } from "@/components/login-form";

describe("LoginForm", () => {
  it("shows the explicit safe state and disables submission without auth", () => {
    render(<LoginForm configured={false} />);
    expect(screen.getByText("Authentication not configured")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("enables sign-in only for a configured application", () => {
    render(<LoginForm configured />);
    expect(screen.queryByText("Authentication not configured")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
});
