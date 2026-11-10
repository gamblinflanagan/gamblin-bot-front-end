import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardPage } from "@/components/board/board-page";
import { useRecord } from "@/lib/board/use-record";
import { board, record, status } from "../fixtures/board";

vi.mock("@/lib/board/use-record", () => ({ useRecord: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(useRecord).mockReturnValue({ data: record, error: null, loading: false, lastSuccessAt: 1, refresh: vi.fn() });
});

describe("BoardPage", () => {
  it("renders cards, working sportsbook links, and disabled write controls", () => {
    render(<BoardPage data={board} status={status} error={null} lastSuccessAt={1} />);

    expect(screen.getByRole("heading", { name: "Roy’s picks board" })).toBeInTheDocument();
    expect(screen.getByText("ALPHA -2.5", { selector: ".flex-1" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "FanDuel app" })[0]).toHaveAttribute("href", "https://example.com/app");
    expect(screen.getAllByRole("button", { name: "I placed it" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Skip" })[0]).toBeDisabled();
    expect(screen.queryByRole("link", { name: /Tracking/ })).not.toBeInTheDocument();
  });

  it("persists bankroll scaling and the selected record tab", async () => {
    const user = userEvent.setup();
    render(<BoardPage data={board} status={status} error={null} lastSuccessAt={1} />);

    await user.type(screen.getByLabelText("Your bankroll ($)"), "500");
    expect(localStorage.getItem("pb-mybank")).toBe("500");
    expect(screen.getByText(/stakes scaled to your bankroll/)).toHaveTextContent("basketball ×0.5");
    expect(screen.getByText("($100)").parentElement).toHaveTextContent("$50 ($100)");

    await user.click(screen.getByRole("button", { name: "Record" }));
    expect(localStorage.getItem("pb-tab")).toBe("record");
    expect(screen.getByText("By day")).toBeInTheDocument();
    expect(vi.mocked(useRecord).mock.lastCall?.[0]).toBe(true);
  });

  it("restores preferences and dismisses the alert topic", async () => {
    localStorage.setItem("pb-tab", "placed");
    localStorage.setItem("pb-mybank", "250");
    const user = userEvent.setup();
    render(<BoardPage data={board} status={status} error={null} lastSuccessAt={1} />);

    expect(screen.getByText(/BETA \+3\.5/, { selector: ".font-bold" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your bankroll ($)")).toHaveValue("250");

    await user.click(screen.getByRole("button", { name: /To place/ }));
    await user.click(screen.getByRole("link", { name: "Hide this" }));
    expect(localStorage.getItem("pb-alert-tip")).toBe("test-topic");
    expect(screen.queryByText("Get a ping when new bets arrive")).not.toBeInTheDocument();
  });
});
