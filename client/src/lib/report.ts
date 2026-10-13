/**
 * The monthly report card: what the latest check-in says, and how it compares with the one before.
 * Pure: built only from the check-in snapshots.
 */

export interface ReportSnapshot {
  /** "2026-10-12" */
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
  /** Totals by area. Null on snapshots taken before these were recorded. */
  savings: number | null;
  investments: number | null;
  debts: number | null;
}

export type ReportAreaKey = 'savings' | 'investments' | 'debts';

export interface ReportArea {
  key: ReportAreaKey;
  label: string;
  value: number;
  /** Since the previous check-in; null when there is no previous one to compare with. */
  change: number | null;
  /** Debt going down is the good direction; for the other two it is going up. */
  goodWhenUp: boolean;
}

export interface Report {
  /** The latest check-in's date. */
  date: string;
  netWorth: number;
  /** Since the previous check-in; null for the very first one. */
  change: number | null;
  previousDate: string | null;
  /** True for a first-ever check-in: a starting point, nothing to compare yet. */
  isFirst: boolean;
  areas: ReportArea[];
}

const areaDefinitions: { key: ReportAreaKey; label: string; goodWhenUp: boolean }[] = [
  { key: 'savings', label: 'Savings', goodWhenUp: true },
  { key: 'investments', label: 'Investments', goodWhenUp: true },
  { key: 'debts', label: 'Debt', goodWhenUp: false },
];

/** The latest check-in against the one before it, or null when there has never been a check-in. */
export function buildReport(snapshots: ReportSnapshot[]): Report | null {
  if (snapshots.length === 0) return null;

  const ordered = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const latest = ordered[ordered.length - 1];
  const previous = ordered.length > 1 ? ordered[ordered.length - 2] : null;

  const areas: ReportArea[] = [];
  for (const area of areaDefinitions) {
    const value = latest[area.key];
    if (value === null) continue;
    const before = previous?.[area.key] ?? null;
    areas.push({ key: area.key, label: area.label, value, change: before === null ? null : value - before, goodWhenUp: area.goodWhenUp });
  }

  return {
    date: latest.date,
    netWorth: latest.netWorth,
    change: previous ? latest.netWorth - previous.netWorth : null,
    previousDate: previous?.date ?? null,
    isFirst: previous === null,
    areas,
  };
}

/** Whether a change is the good direction for an area. Null for no change. */
export function isImprovement(area: ReportArea): boolean | null {
  if (area.change === null || Math.abs(area.change) < 0.5) return null;
  return area.goodWhenUp ? area.change > 0 : area.change < 0;
}
