import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { american, signed, time, usd } from "@/lib/board/format";
import type { Placement } from "@/lib/board/types";
import { boardClasses } from "./board-styles";

export function PlacedItem({ placement }: { placement: Placement }) {
  const result = placement.result;
  const resultLabel = result === "win" ? "won" : result === "loss" ? "lost" : result;

  return (
    <div className="flex justify-between gap-[10px] border-b border-board-line py-[11px] last:border-b-0">
      <div className="min-w-0">
        <div className="font-bold">
          {placement.pick}
          {placement.league === "nfl" && <span className={cn(boardClasses.chip, "bg-[#2f6b3a] text-white")}>Football</span>}
          {placement.league === "fifa" && <span className={cn(boardClasses.chip, "bg-[#5b3f9c] text-white")}>Soccer</span>}
          {placement.book === "betmgm" && <span className={cn(boardClasses.chip, "bg-[#b08d3c] text-white")}>BetMGM</span>}
          {placement.status === "placed" && <> · {american(placement.price)} · {usd(placement.stake, true)}</>}
          {placement.limited && <span className={boardClasses.chip}>Limited</span>}
        </div>
        <div className="text-[12.5px] text-board-muted">
          {placement.kind === "parlay"
            ? <>{placement.match} · first leg {time(placement.start)}</>
            : <>{placement.match} · {placement.market} · tip {time(placement.start)}{placement.score && <> · final {placement.score}</>}</>}
        </div>
      </div>
      <div className="text-right whitespace-nowrap">
        {placement.status === "skipped"
          ? <span className="inline-block rounded-[10px] bg-board-chip px-2 py-[2px] text-[11.5px] font-extrabold text-board-muted">skipped</span>
          : result
            ? <span className={cn("inline-block rounded-[10px] bg-board-chip px-2 py-[2px] text-[11.5px] font-extrabold", result === "win" ? "bg-board-okbg text-board-ok" : result === "loss" ? "bg-board-badbg text-board-bad" : "text-board-muted")}>{resultLabel}</span>
            : <span className="inline-block rounded-[10px] bg-board-chip px-2 py-[2px] text-[11.5px] font-extrabold text-board-muted">pending</span>}
        {placement.status === "placed" && placement.pnl !== null && (
          <div className={cn("mt-[3px] font-[750] tabular-nums", placement.pnl > 0 ? "text-board-ok" : placement.pnl < 0 ? "text-board-bad" : "")}>{signed(placement.pnl)}</div>
        )}
        {!placement.locked && (
          <div className="mt-[6px]"><Button className={cn(boardClasses.smallButton, "text-board-muted")} type="button" disabled title="Read-only API — writes are not available yet.">Undo</Button></div>
        )}
      </div>
    </div>
  );
}
