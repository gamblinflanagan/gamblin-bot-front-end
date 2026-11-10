import { cn } from "cn";
import { signed } from "@/lib/board/format";
import type { SummaryBucket } from "@/lib/board/types";

export function Stat({ label, stats }: { label: string; stats: SummaryBucket }) {
  return (
    <div className="rounded-[20px] border border-board-line bg-board-card p-4 shadow-board">
      <div className="text-[11px] font-semibold tracking-[0.05em] text-board-muted uppercase">{label}</div>
      <div className={cn("mt-2 text-[24px]/[1.2] font-bold tracking-[-0.02em] tabular-nums", stats.pnl > 0 ? "text-board-ok" : stats.pnl < 0 ? "text-board-bad" : "")}>{signed(stats.pnl)}</div>
      <div className="mt-1 text-[11.5px] text-board-muted">
        {stats.w}-{stats.l}{stats.p ? `-${stats.p}` : ""} · {stats.roi === null ? "–" : `${stats.roi > 0 ? "+" : ""}${stats.roi}%`}
        {stats.open > 0 && <> · {stats.open} open</>}
      </div>
    </div>
  );
}
