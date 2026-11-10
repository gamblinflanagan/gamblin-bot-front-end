import { cn } from "cn";
import { boardClasses } from "./board-styles";
import type { BoardData, RefreshError, StatusData } from "@/lib/board/types";

interface FreshnessBannerProps {
  data: BoardData;
  status: StatusData | null;
  error: string | null;
  lastSuccessAt: number | null;
}

const reasons: Record<RefreshError, string> = {
  "no-source": "no source configured",
  "source-unreachable": "source unreachable",
  "source-refused": "source refused the request",
  "source-malformed": "source sent bad data",
  "fallback-empty": "no fallback odds available",
  "fallback-error": "fallback unavailable",
  "fallback-malformed": "refresh error",
  "internal-error": "refresh error",
};

function relativeTime(timestamp: string, reference: number): string {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return "at an unknown time";
  const seconds = Math.max(0, Math.round((reference - time) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function FreshnessBanner({ data, status, error, lastSuccessAt }: FreshnessBannerProps) {
  const pulledAt = status?.pulledAt ?? data.pulledAt;
  const waiting = status?.initialized === false || !pulledAt;
  const serverNow = status ? new Date(status.now).getTime() : NaN;
  const reference = Number.isFinite(serverNow) ? serverNow : Date.now();
  const intervalSeconds = status?.intervalSeconds ?? 60;
  const ageSeconds = pulledAt ? (reference - new Date(pulledAt).getTime()) / 1000 : 0;
  const stale = Boolean(pulledAt) && ageSeconds > 2 * intervalSeconds + 60;
  const lastSuccess = lastSuccessAt
    ? new Date(lastSuccessAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "the last successful response";
  const failureReason = status?.lastError ? reasons[status.lastError] : "refresh error";
  const attempts = status && status.consecutiveFailures > 1 ? ` (${status.consecutiveFailures} attempts)` : "";

  return (
    <div className="mt-2">
      {error && (
        <div className={cn(boardClasses.status, boardClasses.statusBad)}>
          <span className={cn(boardClasses.dot, "bg-board-bad")} />
          <span>Can’t reach the backend ({error}). Showing data from {lastSuccess}. Retrying…</span>
        </div>
      )}
      {waiting ? (
        <div className="px-3 py-1 text-[12.5px] text-board-muted">Waiting for the first collection from the backend…</div>
      ) : (
        <div className={cn("px-3 py-1 text-[12.5px] text-board-muted", stale && "font-semibold text-board-warn")} title={new Date(pulledAt).toLocaleString()}>
          Card updated {relativeTime(pulledAt, reference)}
        </div>
      )}
      {status?.lastOutcome === "failed" && pulledAt && (
        <div className={cn("mt-2", boardClasses.notice)}>Couldn’t refresh ({failureReason}) — showing the card from {new Date(pulledAt).toLocaleString()}.{attempts}</div>
      )}
      {status?.snapshotOrigin === "fallback" && (
        <div className="px-3 py-1 text-[12.5px] text-board-muted">Fallback picks from ESPN odds — not the source’s picks.</div>
      )}
    </div>
  );
}
