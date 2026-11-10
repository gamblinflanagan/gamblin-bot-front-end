"use client";

import { getRecord } from "./api";
import { usePolling } from "./use-polling";

export function useRecord(enabled: boolean) {
  return usePolling(getRecord, 60_000, enabled);
}
