"use client";

import { useCallback } from "react";
import { getBoard, getStatus } from "./api";
import type { BoardData, StatusData } from "./types";
import { usePolling } from "./use-polling";

interface BoardSnapshot {
  board: BoardData;
  status: StatusData | null;
}

export function useBoard() {
  const fetcher = useCallback(async (signal: AbortSignal): Promise<BoardSnapshot> => {
    const statusRequest = getStatus(signal).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return null;
    });
    const [board, status] = await Promise.all([getBoard(signal), statusRequest]);
    return { board, status };
  }, []);
  const polling = usePolling(fetcher, 30_000);

  return {
    ...polling,
    data: polling.data?.board || null,
    status: polling.data?.status || null,
  };
}
