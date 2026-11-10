import type { BoardData, RecordData, StatusData } from "./types";

export type ApiErrorKind = "network" | "timeout" | "http" | "invalid";

export class ApiError extends Error {
  kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 10_000);

  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(`/api${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new ApiError("http", `The backend returned HTTP ${response.status}.`);

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError("invalid", "The backend returned invalid JSON.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError("timeout", "The backend request timed out.");
    if (signal?.aborted) throw error;
    throw new ApiError("network", "Could not connect to the backend.");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

function invalid(): never {
  throw new ApiError("invalid", "The backend returned data in an unexpected format.");
}

export async function getBoard(signal?: AbortSignal): Promise<BoardData> {
  const data = await getJson<unknown>("/data", signal);
  if (!data || typeof data !== "object") invalid();
  const board = data as Partial<BoardData>;
  if (
    board.ok !== true ||
    !Array.isArray(board.bets) ||
    !board.mine ||
    typeof board.mine !== "object" ||
    Array.isArray(board.mine)
  ) {
    invalid();
  }
  return board as BoardData;
}

export async function getRecord(signal?: AbortSignal): Promise<RecordData> {
  const data = await getJson<unknown>("/record", signal);
  if (!data || typeof data !== "object") invalid();
  const record = data as Partial<RecordData>;
  if (record.ok !== true || !record.summary || !Array.isArray(record.rows)) invalid();
  return record as RecordData;
}

export async function getStatus(signal?: AbortSignal): Promise<StatusData> {
  const data = await getJson<unknown>("/status", signal);
  if (!data || typeof data !== "object") invalid();
  const status = data as Partial<StatusData>;
  if (status.ok !== true || typeof status.initialized !== "boolean") invalid();
  return status as StatusData;
}
