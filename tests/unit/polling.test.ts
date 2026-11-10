import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePolling } from "@/lib/board/use-polling";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("usePolling", () => {
  it("retains the last good data when a later poll fails", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn()
      .mockResolvedValueOnce("good")
      .mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => usePolling(fetcher, 1_000));

    await act(async () => {});
    expect(result.current.data).toBe("good");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.data).toBe("good");
    expect(result.current.error).toBe("offline");
  });

  it("aborts the active request on cleanup", async () => {
    const fetcher = vi.fn().mockImplementation((signal: AbortSignal) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const { unmount } = renderHook(() => usePolling(fetcher, 1_000));

    unmount();
    expect(fetcher.mock.calls[0][0].aborted).toBe(true);
  });
});
