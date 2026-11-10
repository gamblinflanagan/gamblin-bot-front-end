export type League = "nba" | "nfl" | "fifa";
export type BetKind = "single" | "parlay";
export type BetResult = "win" | "loss" | "push" | null;

export interface BetLeg {
  side: string;
  price: number;
  ga: string;
  gb: string;
  market: string;
  start: string;
}

export interface Bet {
  key: string;
  kind: BetKind;
  league: League;
  book: string;
  eventId: string | null;
  start: string;
  ga: string;
  gb: string;
  fdName: string | null;
  market: string;
  side: string;
  line: number | string | null;
  price: number;
  stake: number;
  app: string | null;
  web: string | null;
  slipIds: unknown;
  armed: boolean;
  why: string | null;
  note: string | null;
  legs?: BetLeg[];
}

export interface Placement {
  status: "placed" | "skipped";
  key: string;
  pick: string;
  market: string;
  kind: BetKind;
  book: string;
  league: League;
  match: string;
  start: string;
  price: number;
  stake: number;
  limited: boolean;
  line: number | string | null;
  at: string;
  result: BetResult;
  score: string | null;
  pnl: number | null;
  locked: boolean;
}

export interface SummaryBucket {
  n: number;
  w: number;
  l: number;
  p: number;
  open: number;
  openUsd: number;
  staked: number;
  pnl: number;
  roi: number | null;
}

export interface Partner {
  id: string;
  name: string;
  bankroll: number;
  cap: number;
  nflBankroll: number;
  fifaBankroll: number;
  state: string;
}

export interface AddAll {
  n: number;
  app: string;
  web: string;
}

export interface BoardData {
  ok: boolean;
  role: string;
  live: boolean;
  why: string | null;
  checkedAt: string;
  now: string;
  title: string;
  partner: Partner;
  partners?: Partner[];
  bets: Bet[];
  mine: Record<string, Placement>;
  addAll: AddAll | null;
  today: SummaryBucket;
  split: boolean;
  alerts: string;
  alertsNote: string | null;
  source: string;
  lan: boolean;
  phoneUrl: string | null;
  phoneHost: string;
  pin: string;
  pulledAt: string;
}

export interface LeagueScope {
  placed: SummaryBucket;
}

export interface RecordScope {
  placed: SummaryBucket;
  byLeague: Partial<Record<League, LeagueScope>>;
}

export interface RecordCounts {
  placed: number;
  skipped: number;
  missed: number;
  open: number;
}

export interface RecordDay {
  day: string;
  placed: SummaryBucket;
}

export type RecordStatus = "placed" | "skipped" | "missed" | "open";
export type LedgerEntry = Omit<Placement, "locked"> & { locked?: boolean };

export interface RecordRow {
  key: string;
  start: string | null;
  eventId: string | null;
  kind: BetKind | null;
  match: string | null;
  market: string | null;
  book: string | null;
  league: League | null;
  status: RecordStatus;
  offered: {
    side: string | null;
    price: number | null;
    stake: number | null;
    at: string | null;
  };
  placed: LedgerEntry | null;
  skipped: LedgerEntry | null;
  result: BetResult;
  score: string | null;
  pnl: number | null;
  late: boolean;
}

export interface RecordData {
  ok: boolean;
  summary: {
    today: RecordScope;
    week: RecordScope;
    all: RecordScope;
    counts: RecordCounts;
  };
  days: RecordDay[];
  rows: RecordRow[];
}

export type RefreshOutcome = "source" | "source-empty" | "fallback" | "failed";
export type RefreshError =
  | "no-source"
  | "source-unreachable"
  | "source-refused"
  | "source-malformed"
  | "fallback-empty"
  | "fallback-error"
  | "fallback-malformed"
  | "internal-error";

export interface StatusData {
  ok: boolean;
  initialized: boolean;
  pulledAt: string | null;
  snapshotOrigin: "source" | "fallback" | "legacy" | null;
  lastAttemptAt: string | null;
  lastOutcome: RefreshOutcome | null;
  lastError: RefreshError | null;
  consecutiveFailures: number;
  interval: "minute" | "hour";
  intervalSeconds: number;
  nextAttemptAt: string | null;
  now: string;
}
