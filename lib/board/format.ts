import type { Partner, SummaryBucket } from "./types";

export const EMPTY_BUCKET: SummaryBucket = {
  n: 0,
  w: 0,
  l: 0,
  p: 0,
  open: 0,
  openUsd: 0,
  staked: 0,
  pnl: 0,
  roi: null,
};

export function american(price: number): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return "?";
  return value > 0 ? `+${value}` : String(value);
}

export function usd(value: number, cents = false): string {
  const amount = Number(value || 0);
  const formatted = Math.abs(amount)
    .toFixed(cents ? 2 : 0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0 ? "-$" : "$"}${formatted}`;
}

export function signed(value: number): string {
  const amount = Number(value || 0);
  return `${amount > 0 ? "+" : ""}${usd(amount, true)}`;
}

export function time(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "?";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

export function totalBankroll(partner: Partner): number {
  return Number(partner.bankroll || 0) + Number(partner.fifaBankroll || 0) + Number(partner.nflBankroll || 0);
}

export function leagueShare(league: string, partner: Partner): number {
  const total = totalBankroll(partner);
  if (total <= 0) return 0;
  if (league === "fifa") return Number(partner.fifaBankroll || 0) / total;
  if (league === "nfl") return Number(partner.nflBankroll || 0) / total;
  return Number(partner.bankroll || 0) / total;
}

export function stakeScale(league: string, partner: Partner, bankroll: string): number {
  const total = totalBankroll(partner);
  const mine = Number(bankroll);
  if (!total || !mine || mine <= 0) return 1;
  return (mine / total) * leagueShare(league, partner);
}

export function scaledStake(stake: number, factor: number): number {
  return Math.round((Number(stake) || 0) * factor * 100) / 100;
}
