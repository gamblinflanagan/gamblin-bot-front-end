import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { american, minutesUntil, scaledStake, time, usd } from "@/lib/board/format";
import type { Bet, BoardData } from "@/lib/board/types";
import { boardClasses } from "./board-styles";

interface BetCardProps {
  bet: Bet;
  data: BoardData;
  scale: number;
}

const actionTitle = "Read-only API — writes are not available yet.";

function BookTag({ bet, split }: { bet: Bet; split: boolean }) {
  const mgm = bet.book === "betmgm";
  return (
    <>
      {bet.league === "nfl" && <span className={cn(boardClasses.chip, boardClasses.footballChip)}>Football</span>}
      {bet.league === "fifa" && <span className={cn(boardClasses.chip, boardClasses.soccerChip)}>Soccer</span>}
      {split && <span className={cn(boardClasses.chip, mgm ? boardClasses.mgmChip : boardClasses.fdChip)}>{mgm ? "BetMGM" : "FanDuel"}</span>}
    </>
  );
}

function Stake({ bet, scale }: { bet: Bet; scale: number }) {
  const real = Number(bet.stake) || 0;
  const scaled = scaledStake(real, scale);
  if (scaled === real) return <>{usd(real)}</>;
  return (
    <>
      {usd(scaled)} <span className="ml-[3px] text-[11px] font-normal text-board-muted">({usd(real)})</span>
    </>
  );
}

function SportsbookLinks({ bet, placeable }: { bet: Bet; placeable: boolean }) {
  const mgm = bet.book === "betmgm";
  const book = mgm ? "BetMGM" : "FanDuel";
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {placeable && bet.app ? (
        <Button asChild className={cn(boardClasses.button, mgm ? boardClasses.mgmButton : boardClasses.fdButton)}>
          <a href={bet.app} target="_blank" rel="noopener noreferrer">{book} app</a>
        </Button>
      ) : (
        <span aria-disabled="true" className={cn(boardClasses.button, "inline-flex pointer-events-none items-center justify-center opacity-45", mgm ? boardClasses.mgmButton : boardClasses.fdButton)}>{book} app</span>
      )}
      {placeable && bet.web ? (
        <Button asChild className={boardClasses.button}>
          <a href={bet.web} target="_blank" rel="noopener noreferrer">Browser</a>
        </Button>
      ) : (
        <span aria-disabled="true" className={cn(boardClasses.button, "inline-flex pointer-events-none items-center justify-center opacity-45")}>Browser</span>
      )}
    </div>
  );
}

function DisabledActions() {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button className={cn(boardClasses.button, boardClasses.okButton)} type="button" disabled title={actionTitle}>I placed it</Button>
      <Button className={boardClasses.button} type="button" disabled title={actionTitle}>Bet was limited</Button>
      <Button className={cn(boardClasses.button, "border-transparent bg-transparent text-board-muted")} type="button" disabled title={actionTitle}>Skip</Button>
    </div>
  );
}

export function BetCard({ bet, data, scale }: BetCardProps) {
  const minutes = minutesUntil(bet.start);
  const own = bet.league === "nfl" || bet.league === "fifa";
  const placeable = bet.armed && (own || data.live);
  const go = bet.league === "nfl" ? "starts" : bet.league === "fifa" ? "kicks off" : "tips";
  const starting = bet.league === "nfl" ? "starting" : bet.league === "fifa" ? "kicking off" : "tipping";

  return (
    <Card className={cn(boardClasses.card, !placeable && "opacity-92")}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12.5px] text-board-muted">
        <span>
          <b className="font-semibold text-board-ink">{time(bet.start)}</b> ·{" "}
          {minutes <= 0 ? <span className="font-semibold text-board-warn">{starting} now</span> : <span className={cn(minutes <= 5 && "font-semibold text-board-warn")}>{go} in {minutes} min</span>}
        </span>
        <span className="inline-flex items-center">{bet.market}<BookTag bet={bet} split={data.split} /></span>
      </div>
      <div className="mt-2 text-[18px]/[1.2] font-bold tracking-[-0.015em]">{bet.ga}<i className="mx-[3px] text-[14px] not-italic font-medium text-board-muted">v</i>{bet.gb}</div>
      {bet.fdName && <div className="mt-1 text-[12.5px] text-board-muted">{bet.fdName}</div>}
      <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-board-soft px-4 py-3">
        <span className="flex-1 text-[16.5px] font-bold">{bet.side}</span>
        <span className="font-semibold tabular-nums">{american(bet.price)}</span>
        <span className="text-[17px] font-bold tabular-nums"><Stake bet={bet} scale={scale} /></span>
      </div>
      {!placeable && <div className={cn("mt-3", boardClasses.notice)}>Not placeable right now: {bet.why || data.why || "board not live"}</div>}
      {bet.note && <div className={cn("mt-3", boardClasses.notice)}>{bet.note}</div>}
      <SportsbookLinks bet={bet} placeable={placeable} />
      <DisabledActions />
    </Card>
  );
}

export function ParlayCard({ bet, data, scale }: BetCardProps) {
  const minutes = minutesUntil(bet.start);
  const legs = bet.legs || [];
  const mgm = bet.book === "betmgm";
  const book = mgm ? "BetMGM" : "FanDuel";
  const soccer = bet.league === "fifa";
  const placeable = bet.armed && (soccer || data.live);
  const stake = scaledStake(bet.stake, scale);

  return (
    <Card className={cn(boardClasses.card, !placeable && "opacity-92")}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12.5px] text-board-muted">
        <span><b className="font-semibold text-board-ink">{time(bet.start)}</b> · {minutes <= 0 ? <span className="font-semibold text-board-warn">closing now</span> : <span className={cn(minutes <= 5 && "font-semibold text-board-warn")}>closes in {minutes} min</span>}</span>
        <span className="inline-flex items-center">{legs.length}-leg parlay<BookTag bet={bet} split={data.split} /></span>
      </div>
      <div className="mt-2">
        {legs.map((leg, index) => (
          <div className="border-b border-board-line py-2 last:border-b-0" key={`${leg.side}-${leg.start}-${index}`}>
            <div className="flex justify-between gap-3"><b className="text-[15.5px] font-semibold">{leg.side}</b><span className="font-semibold tabular-nums">{american(leg.price)}</span></div>
            <div className="mt-[2px] text-[12px] text-board-muted">{leg.ga} v {leg.gb} · {leg.market} · {soccer ? "kicks off" : "tips"} {time(leg.start)}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-board-soft px-4 py-3">
        <span className="flex-1 text-[16.5px] font-bold">Parlay, one ticket</span>
        <span className="font-semibold tabular-nums">{american(bet.price)}</span>
        <span className="text-[17px] font-bold tabular-nums"><Stake bet={bet} scale={scale} /></span>
      </div>
      {!placeable && <div className={cn("mt-3", boardClasses.notice)}>Not placeable right now: {bet.why || data.why || "board not live"}</div>}
      <div className={boardClasses.hint}>
        The button loads all {legs.length} legs. In the {book} slip put <b>{usd(stake)} on the Parlay line</b> (not on the straight bets), check every leg is there, and check the parlay odds are about <b>{american(bet.price)}</b>.
      </div>
      <SportsbookLinks bet={bet} placeable={placeable} />
      <DisabledActions />
    </Card>
  );
}
