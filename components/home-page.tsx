"use client";

import { cn } from "cn";
import { BoardPage } from "@/components/board/board-page";
import { boardClasses } from "@/components/board/board-styles";
import { useBoard } from "@/lib/board/use-board";

export function HomePage() {
  const { data, status, error, loading, lastSuccessAt } = useBoard();

  if (loading && !data) {
    return <main className={cn(boardClasses.main, "pt-4")}><div className={cn(boardClasses.empty, "animate-pulse")}><b className="mb-1 block text-[16px] font-semibold text-board-ink">Loading picks board…</b>Fetching the latest board data.</div></main>;
  }

  if (!data) {
    return <main className={cn(boardClasses.main, "pt-4")}><div className={cn(boardClasses.status, boardClasses.statusBad)}><span className={cn(boardClasses.dot, "bg-board-bad")} /><span>Can’t reach the board ({error || "No data received"}). Retrying…</span></div></main>;
  }

  return <BoardPage data={data} status={status} error={error} lastSuccessAt={lastSuccessAt} />;
}
