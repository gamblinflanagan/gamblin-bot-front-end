"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EMPTY_BUCKET, signed, stakeScale, time, usd } from "@/lib/board/format";
import type { BoardData, Placement, RecordData, RecordRow, StatusData } from "@/lib/board/types";
import { useRecord } from "@/lib/board/use-record";
import { BetCard, ParlayCard } from "./bet-cards";
import { boardClasses } from "./board-styles";
import { FreshnessBanner } from "./freshness-banner";
import { PlacedItem } from "./placed-item";
import { Stat } from "./stat";

type Tab = "bets" | "placed" | "record";

const tabClass = `inline-flex min-h-[40px] flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-full px-3 text-[14px] font-semibold text-board-muted transition-[background-color,color,box-shadow] duration-200 hover:text-board-ink ${boardClasses.focusRing} focus-visible:ring-offset-board-chip`;
const tabActive = "bg-board-card text-board-ink shadow-board";
const badgeClass = "inline-block min-w-[20px] rounded-full bg-board-card px-[6px] text-center text-[12px]/[20px] font-semibold tabular-nums text-board-muted transition-colors duration-200";
const badgeActive = "bg-board-accent text-board-on-accent";
const thClass = "border-b border-board-line px-2 py-[9px] text-[11px] font-semibold tracking-[0.04em] text-board-muted uppercase";
const tdClass = "border-b border-board-line px-2 py-[9px] group-last:border-b-0";

interface BoardPageProps {
  data: BoardData;
  status: StatusData | null;
  error: string | null;
  lastSuccessAt: number | null;
}

function storedTab(): Tab {
  try {
    const value = localStorage.getItem("pb-tab");
    if (value === "bets" || value === "placed" || value === "record") return value;
  } catch {
    return "bets";
  }
  return "bets";
}

function storedBankroll(): string {
  try {
    return localStorage.getItem("pb-mybank") || "";
  } catch {
    return "";
  }
}

function alertIsHidden(topic: string): boolean {
  try {
    return localStorage.getItem("pb-alert-tip") === topic;
  } catch {
    return false;
  }
}

export function BoardPage({ data, status, error, lastSuccessAt }: BoardPageProps) {
  const [tab, setTab] = useState<Tab>(storedTab);
  const [bankroll, setBankroll] = useState(storedBankroll);
  const [alertHidden, setAlertHidden] = useState(() => alertIsHidden(data.alerts));
  const recordState = useRecord(tab === "record");
  const partner = data.partner;
  const hasFootball = Number(partner.nflBankroll || 0) > 0;
  const hasSoccer = Number(partner.fifaBankroll || 0) > 0;
  const multi = hasFootball || hasSoccer;
  const placements = Object.entries(data.mine || {}).sort(([, a], [, b]) => a.start.localeCompare(b.start));
  const todo = data.bets.filter((bet) => !data.mine[bet.key]);
  const singles = todo.filter((bet) => bet.kind !== "parlay");
  const parlays = todo.filter((bet) => bet.kind === "parlay");
  const pending = placements.filter(([, placement]) => placement.status === "placed" && !placement.result).length;
  const anyFootballOrSoccer = singles.some((bet) => bet.league === "nfl" || bet.league === "fifa");
  const waitingForCollection = status?.initialized === false || !data.pulledAt;

  useEffect(() => {
    document.title = data.title || "Picks board";
  }, [data.title]);

  function selectTab(next: Tab) {
    setTab(next);
    try {
      localStorage.setItem("pb-tab", next);
    } catch {
      return;
    }
  }

  function updateBankroll(value: string) {
    setBankroll(value);
    try {
      if (value) localStorage.setItem("pb-mybank", value);
      else localStorage.removeItem("pb-mybank");
    } catch {
      return;
    }
  }

  function hideAlert() {
    setAlertHidden(true);
    try {
      localStorage.setItem("pb-alert-tip", data.alerts);
    } catch {
      return;
    }
  }

  const bankrollText = multi
    ? [
        `${usd(partner.bankroll)} basketball`,
        ...(hasFootball ? [`${usd(partner.nflBankroll)} football`] : []),
        ...(hasSoccer ? [`${usd(partner.fifaBankroll)} soccer`] : []),
      ].join(" · ")
    : `${usd(partner.bankroll)} bankroll`;

  const scaleParts = [
    ["nba", "basketball"],
    ["fifa", "soccer"],
    ["nfl", "football"],
  ].flatMap(([league, label]) => {
    if ((league === "fifa" && !hasSoccer) || (league === "nfl" && !hasFootball)) return [];
    const factor = stakeScale(league, partner, bankroll);
    return factor !== 1 ? [`${label} ×${Math.round(factor * 100) / 100}`] : [];
  });

  const today = data.today || EMPTY_BUCKET;
  const settled = (today.w || 0) + (today.l || 0) + (today.p || 0);

  return (
    <main className={boardClasses.main}>
      <header className={boardClasses.header}>
        <div className={cn(boardClasses.panel, "flex flex-wrap items-start justify-between gap-x-4 gap-y-3")}>
          <div className="min-w-0">
            <h1 className={boardClasses.heading}>{data.title || `${partner.name || partner.id}’s picks board`}</h1>
            <div className={boardClasses.sub}>eBasketball{hasFootball ? " + eFootball" : ""}{hasSoccer ? " + eSoccer" : ""} H2H · FanDuel</div>
          </div>
          <div className="text-right whitespace-nowrap"><b className="block text-[17px] font-bold tracking-[-0.01em]">{bankrollText}</b><span className="text-[11.5px] text-board-muted">max {usd(partner.cap)}{multi ? " a basketball bet" : " a bet"}</span></div>
          <div className="text-right">
            <label className="flex items-center justify-end gap-[6px] text-[12.5px] text-board-muted">Your bankroll ($)<Input className="mt-0 h-9 w-[100px] flex-none rounded-[10px] border-board-line bg-board-soft px-[10px] py-1 text-right font-mono text-[13px] font-semibold text-board-ink shadow-none transition-[border-color,box-shadow,background-color] placeholder:text-board-muted focus-visible:border-board-accent/40 focus-visible:bg-board-card focus-visible:ring-[3px] focus-visible:ring-board-accent/15" inputMode="decimal" autoComplete="off" placeholder="enter to scale stakes" value={bankroll} onChange={(event) => updateBankroll(event.target.value)} /></label>
            <span className="mt-[3px] block min-h-[14px] text-[11px] text-board-muted">{scaleParts.length ? `stakes scaled to your bankroll (${scaleParts.join(", ")})` : "stakes shown at source size"}</span>
          </div>
        </div>
        <div className={cn(boardClasses.status, "mt-3", !data.live && boardClasses.statusBad)}>
          <span className={cn(boardClasses.dot, data.live ? "bg-board-ok ring-[3px] ring-board-okbg" : "bg-board-bad")} />
          <span>
            {data.live ? (
              <>Live · checked {time(data.checkedAt)}{settled > 0 && <> · today {signed(today.pnl)} ({today.w}-{today.l})</>}{today.open > 0 && <>{settled > 0 ? ", " : " · "}today {today.open} open</>}</>
            ) : multi ? (
              <>Basketball paused: {data.why || "board not live"}. Don’t place basketball bets until this says Live. {hasFootball && hasSoccer ? "Football and soccer" : hasFootball ? "Football" : "Soccer"} bets are checked on their own.</>
            ) : (
              <>Paused: {data.why || "board not live"}. Don’t place bets until this says Live.</>
            )}
          </span>
        </div>
        <FreshnessBanner data={data} status={status} error={error} lastSuccessAt={lastSuccessAt} />
        {data.role === "admin" && data.partners && (
          <div className="mt-2 px-1 text-[13px] text-board-muted">
            Viewing as Matt:{" "}
            <select className={cn("mt-[3px] w-auto cursor-pointer rounded-[10px] border border-board-line bg-board-card px-[10px] py-[6px] font-[inherit] text-board-ink transition-colors hover:bg-board-hover", boardClasses.focusRing)} value={partner.id} onChange={(event) => { window.location.search = `?p=${encodeURIComponent(event.target.value)}`; }}>
              {data.partners.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </div>
        )}
        <nav className="mt-3 flex gap-1 rounded-full bg-board-chip p-1">
          <button type="button" className={cn(tabClass, tab === "bets" && tabActive)} onClick={() => selectTab("bets")}>To place<span className={cn(badgeClass, tab === "bets" && badgeActive)}>{todo.length}</span></button>
          <button type="button" className={cn(tabClass, tab === "placed" && tabActive)} onClick={() => selectTab("placed")}>Placed<span className={cn(badgeClass, tab === "placed" && badgeActive)}>{pending}</span></button>
          <button type="button" className={cn(tabClass, tab === "record" && tabActive)} onClick={() => selectTab("record")}>Record</button>
        </nav>
      </header>

      {tab === "bets" && (
        <section id="v-bets" className={boardClasses.section}>
          {data.split && <p className={boardClasses.note}><b>Each bet is split in two:</b> half on FanDuel, half on BetMGM. Place both halves and tap <b>I placed it</b> on each. BetMGM’s line or odds can differ a little — the card shows BetMGM’s own.{anyFootballOrSoccer && <> <b>Football and soccer bets are FanDuel only.</b></>}</p>}
          <p className={boardClasses.note}>Tap {data.split ? "the FanDuel or BetMGM" : "a FanDuel"} button to load the bet, check the <b>line and odds on the slip</b> match the card (the link can’t lock the line), place it, then tap <b>I placed it</b>. If the book capped your stake, tap <b>Bet was limited</b> and enter the amount it accepted. On a phone, open this page in Safari or Chrome (not inside a texting or social app) so <b>FanDuel app</b> opens the app.</p>
          {data.alertsNote && <div className={cn("mb-3", boardClasses.notice)}>{data.alertsNote}</div>}
          {data.alerts && !alertHidden && (
            <Card className={boardClasses.card}>
              <b className="font-semibold">Get a ping when new bets arrive</b>
              <div className={cn(boardClasses.hint, "mt-2")}>Install the free <b>ntfy</b> app (App Store / Google Play), tap <b>+</b>, and subscribe to this topic:</div>
              <div className="my-3 rounded-[12px] bg-board-soft px-3 py-2 font-mono text-[15px] font-semibold [overflow-wrap:anywhere] select-all">{data.alerts}</div>
              <div className={boardClasses.hint}>New bets arrive bundled in one ping, a few minutes apart at most; tap it to open this board. <a className={cn("rounded-[4px] font-semibold text-board-fd underline-offset-2 hover:underline", boardClasses.focusRing)} href="#hide-alert" onClick={(event) => { event.preventDefault(); hideAlert(); }}>Hide this</a></div>
            </Card>
          )}
          {data.addAll && data.live && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button asChild className={cn(boardClasses.smallButton, boardClasses.fdButton)}><a href={data.addAll.app} target="_blank" rel="noopener noreferrer">Add all {data.addAll.n} (app)</a></Button>
              <Button asChild className={boardClasses.smallButton}><a href={data.addAll.web} target="_blank" rel="noopener noreferrer">browser</a></Button>
              <span className="text-[12.5px] text-board-muted">Keep them as singles, one stake each.</span>
            </div>
          )}
          {todo.length === 0 && (waitingForCollection
            ? <div className={boardClasses.empty}><b className="mb-1 block text-[16px] font-semibold text-board-ink">Waiting for the first collection from the backend…</b>The board will update when data is available.</div>
            : <div className={boardClasses.empty}><b className="mb-1 block text-[16px] font-semibold text-board-ink">Nothing to place right now</b>New bets show up here about 10–60 minutes before tip. This page refreshes itself.</div>)}
          {singles.map((bet) => <BetCard key={bet.key} bet={bet} data={data} scale={stakeScale(bet.league, partner, bankroll)} />)}
          {parlays.length > 0 && (
            <>
              <h2 className={boardClasses.sectionTitle}>Parlays · {parlays.length}</h2>
              <p className={boardClasses.note}>Extra tickets <b>on top of</b> the singles above, not instead of them — place the singles first. Once you place a basketball parlay, any other basketball parlay re-using one of its legs drops off this list.{parlays.some((bet) => bet.league === "fifa") && <> Soccer parlays are exactly Matt’s tickets and can share a leg — place each one.</>}</p>
              {parlays.map((bet) => <ParlayCard key={bet.key} bet={bet} data={data} scale={stakeScale(bet.league, partner, bankroll)} />)}
            </>
          )}
        </section>
      )}

      {tab === "placed" && (
        <section id="v-placed" className={boardClasses.section}>
          {placements.length ? (
            <>
              <Card className={cn(boardClasses.card, "py-1 sm:py-2")}>{placements.map(([key, placement]) => <PlacedItem key={key} placement={placement} />)}</Card>
              <p className={boardClasses.note}>{data.role === "admin" ? "Viewing as Matt: Undo changes this record." : "Recorded bets are final here. Grade results or fix anything in admin."}</p>
            </>
          ) : (
            <div className={boardClasses.empty}><b className="mb-1 block text-[16px] font-semibold text-board-ink">Nothing placed yet</b>Bets you mark placed in the last day and a half show here with their results.</div>
          )}
        </section>
      )}

      {tab === "record" && <RecordTab record={recordState.data} loading={recordState.loading} error={recordState.error} />}
    </main>
  );
}

function recordPlacement(row: RecordRow): Placement {
  const placed = row.placed;
  return {
    status: "placed",
    key: row.key,
    kind: row.kind ?? placed?.kind ?? "single",
    pick: placed?.pick ?? row.offered.side ?? "",
    price: placed?.price ?? row.offered.price ?? 0,
    stake: placed?.stake ?? row.offered.stake ?? 0,
    limited: Boolean(placed?.limited),
    book: row.book ?? placed?.book ?? "",
    league: row.league ?? placed?.league ?? "nba",
    match: row.match ?? placed?.match ?? "",
    market: row.market ?? placed?.market ?? "",
    start: row.start ?? placed?.start ?? "",
    result: row.result,
    score: row.score,
    pnl: row.pnl,
    at: placed?.at ?? row.offered.at ?? "",
    line: placed?.line ?? null,
    locked: true,
  };
}

function RecordTab({ record, loading, error }: { record: RecordData | null; loading: boolean; error: string | null }) {
  if (!record) {
    return <section id="v-record" className={boardClasses.section}><div className={boardClasses.empty}>{loading ? "Loading your record…" : `Can’t load your record (${error || "unknown error"}). Retrying…`}</div></section>;
  }

  const summary = record.summary;
  const leagues = summary.all.byLeague;
  const placedRows = record.rows.filter((row) => row.status === "placed").slice(0, 80);

  return (
    <section id="v-record" className={boardClasses.section}>
      <div className="mb-3 grid grid-cols-3 gap-3 max-[380px]:grid-cols-2"><Stat label="Today" stats={summary.today.placed} /><Stat label="7 days" stats={summary.week.placed} /><Stat label="All time" stats={summary.all.placed} /></div>
      {(leagues.nfl || leagues.fifa) && (
        <div className="mb-3 grid grid-cols-3 gap-3 max-[380px]:grid-cols-2">
          {([ ["nba", "Basketball"], ["nfl", "Football"], ["fifa", "Soccer"] ] as const).map(([league, label]) => (
            leagues[league] ? <Stat key={league} label={`${label}, all time`} stats={leagues[league]!.placed} /> : null
          ))}
        </div>
      )}
      <p className={boardClasses.note}>P&amp;L on the bets you placed, at the odds you took. Staked: {usd(summary.all.placed.staked)} all time.</p>
      {error && <div className={cn(boardClasses.status, boardClasses.statusBad)}><span className={cn(boardClasses.dot, "bg-board-bad")} /><span>Can’t refresh the record ({error}). Showing the last good data.</span></div>}
      <h2 className={boardClasses.sectionTitle}>By day</h2>
      <Card className={cn(boardClasses.card, "overflow-x-auto py-2 sm:py-3")}>
        <table className="w-full border-collapse text-[13px] tabular-nums">
          <thead><tr><th className={cn(thClass, "text-left")}>Day</th><th className={cn(thClass, "text-right")}>Bets</th><th className={cn(thClass, "text-right")}>W-L</th><th className={cn(thClass, "text-right")}>P&amp;L</th><th className={cn(thClass, "text-right")}>ROI</th></tr></thead>
          <tbody>
            {record.days.slice(0, 30).map((day, index) => (
              <tr className="group transition-colors hover:bg-board-soft" key={`${day.day}-${index}`}>
                <td className={cn(tdClass, "text-left")}>{day.day}</td><td className={cn(tdClass, "text-right")}>{day.placed.n}</td><td className={cn(tdClass, "text-right")}>{day.placed.w}-{day.placed.l}</td>
                <td className={cn(tdClass, "text-right", day.placed.pnl > 0 ? "text-board-ok" : day.placed.pnl < 0 ? "text-board-bad" : "")}>{signed(day.placed.pnl)}</td>
                <td className={cn(tdClass, "text-right")}>{day.placed.roi === null ? "–" : `${day.placed.roi}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <h2 className={boardClasses.sectionTitle}>Your bets</h2>
      <Card className={cn(boardClasses.card, "py-1 sm:py-2")}>
        {placedRows.length
          ? placedRows.map((row) => <PlacedItem key={row.key} placement={recordPlacement(row)} />)
          : <div className={boardClasses.empty}>No placed bets yet.</div>}
      </Card>
    </section>
  );
}
