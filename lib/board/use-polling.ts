"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PollingResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastSuccessAt: number | null;
  refresh: () => void;
}

export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  enabled = true,
): PollingResult<T> {
  const [state, setState] = useState<Omit<PollingResult<T>, "refresh">>({
    data: null,
    error: null,
    loading: enabled,
    lastSuccessAt: null,
  });
  const fetcherRef = useRef(fetcher);
  const executeRef = useRef<() => void>(() => undefined);
  const lastSuccessRef = useRef<number | null>(null);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = enabled;
    let inFlight = false;
    let controller: AbortController | null = null;
    let timer: number | undefined;

    const schedule = () => {
      if (!active || document.visibilityState === "hidden") return;
      timer = window.setTimeout(execute, intervalMs);
    };

    const execute = (force = false) => {
      if (!active || inFlight || (!force && document.visibilityState === "hidden")) return;
      inFlight = true;
      controller = new AbortController();

      fetcherRef.current(controller.signal)
        .then((data) => {
          if (!active) return;
          const lastSuccessAt = Date.now();
          lastSuccessRef.current = lastSuccessAt;
          setState({ data, error: null, loading: false, lastSuccessAt });
        })
        .catch((error: unknown) => {
          if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
          setState((previous) => ({
            ...previous,
            error: error instanceof Error ? error.message : "The request failed.",
            loading: false,
          }));
        })
        .finally(() => {
          inFlight = false;
          controller = null;
          if (active) schedule();
        });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
      } else {
        execute(true);
      }
    };

    const onFocus = () => {
      if (!lastSuccessRef.current || Date.now() - lastSuccessRef.current > 10_000) execute();
    };

    executeRef.current = execute;
    setState((previous) => ({ ...previous, loading: enabled && previous.data === null }));
    if (enabled) {
      execute(true);
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("focus", onFocus);
    }

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      executeRef.current = () => undefined;
    };
  }, [enabled, intervalMs]);

  const refresh = useCallback(() => executeRef.current(), []);
  return { ...state, refresh };
}
