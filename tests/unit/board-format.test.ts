import { describe, expect, it } from "vitest";
import { american, scaledStake, signed, stakeScale, usd } from "@/lib/board/format";
import type { Partner } from "@/lib/board/types";

const partner: Partner = { id: "roy", name: "Roy", bankroll: 600, cap: 100, nflBankroll: 200, fifaBankroll: 200, state: "nj" };

describe("board formatting", () => {
  it("formats American odds and currency", () => {
    expect(american(250)).toBe("+250");
    expect(american(-110)).toBe("-110");
    expect(usd(-1234.5, true)).toBe("-$1,234.50");
    expect(signed(50)).toBe("+$50.00");
  });

  it("scales each league by its bankroll share", () => {
    expect(stakeScale("nba", partner, "500")).toBe(0.3);
    expect(stakeScale("nfl", partner, "500")).toBe(0.1);
    expect(scaledStake(100, 0.3)).toBe(30);
    expect(stakeScale("nba", partner, "invalid")).toBe(1);
  });
});
