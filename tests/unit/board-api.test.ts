import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getBoard, getRecord, getStatus } from "@/lib/board/api";
import { board, record, status } from "../fixtures/board";

afterEach(() => vi.unstubAllGlobals());

describe("board API", () => {
  it("loads and validates all three payloads", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(board))
      .mockResolvedValueOnce(Response.json(record))
      .mockResolvedValueOnce(Response.json(status));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBoard()).resolves.toEqual(board);
    await expect(getRecord()).resolves.toEqual(record);
    await expect(getStatus()).resolves.toEqual(status);
    expect(fetchMock.mock.calls.map((call) => new URL(call[0] as string, "http://localhost").pathname)).toEqual(["/api/data", "/api/record", "/api/status"]);
  });

  it("rejects malformed payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true, bets: [] })));
    await expect(getBoard()).rejects.toMatchObject({ kind: "invalid" } satisfies Partial<ApiError>);
  });

  it("classifies HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 502 })));
    await expect(getStatus()).rejects.toMatchObject({ kind: "http", message: "The backend returned HTTP 502." });
  });
});
