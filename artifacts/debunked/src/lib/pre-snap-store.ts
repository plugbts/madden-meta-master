// ─── Pre-Snap Learning Store ──────────────────────────────────────────────────
// localStorage-based persistence. Stores predictions, post-snap validations,
// and opponent tendency history. Drives the learning/accuracy system.

import type { PreSnapInputs, Coverage, PreSnapAnalysis } from "./pre-snap-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostSnapResult = {
  id: string;
  timestamp: number;
  opponent: string;
  inputs: PreSnapInputs;
  predictedShell: string;
  predictedCoverage: Coverage;
  predictedConfidence: number;
  actualCoverage: Coverage;
  correct: boolean;
  note: string;
};

export type OpponentTendency = {
  opponent: string;
  snaps: number;
  coverageCounts: Partial<Record<Coverage, number>>;
  blitzCount: number;
  lastUpdated: number;
};

export type PreSnapStore = {
  history: PostSnapResult[];
  opponents: OpponentTendency[];
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEY = "debunked_presnap_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load(): PreSnapStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { history: [], opponents: [] };
    return JSON.parse(raw) as PreSnapStore;
  } catch {
    return { history: [], opponents: [] };
  }
}

function save(store: PreSnapStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getStore(): PreSnapStore {
  return load();
}

export function logResult(params: {
  opponent: string;
  inputs: PreSnapInputs;
  analysis: PreSnapAnalysis;
  actualCoverage: Coverage;
  note: string;
}): PostSnapResult {
  const store = load();
  const { opponent, inputs, analysis, actualCoverage, note } = params;
  const correct = analysis.topCoverage === actualCoverage;

  const result: PostSnapResult = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    opponent,
    inputs,
    predictedShell: analysis.shell,
    predictedCoverage: analysis.topCoverage,
    predictedConfidence: analysis.topConfidence,
    actualCoverage,
    correct,
    note,
  };

  // Update history
  store.history = [result, ...store.history].slice(0, 200);

  // Update opponent tendencies
  const existing = store.opponents.find((o) => o.opponent.toLowerCase() === opponent.toLowerCase());
  if (existing) {
    existing.snaps += 1;
    existing.coverageCounts[actualCoverage] = (existing.coverageCounts[actualCoverage] ?? 0) + 1;
    if (analysis.blitzProbability >= 60) existing.blitzCount += 1;
    existing.lastUpdated = Date.now();
  } else {
    store.opponents.push({
      opponent,
      snaps: 1,
      coverageCounts: { [actualCoverage]: 1 } as Partial<Record<Coverage, number>>,
      blitzCount: analysis.blitzProbability >= 60 ? 1 : 0,
      lastUpdated: Date.now(),
    });
  }

  save(store);
  return result;
}

export function getOpponentTendency(opponent: string): OpponentTendency | null {
  const store = load();
  return store.opponents.find((o) => o.opponent.toLowerCase() === opponent.toLowerCase()) ?? null;
}

export function getHistoricalBoost(opponent: string): Partial<Record<Coverage, number>> {
  const tendency = getOpponentTendency(opponent);
  if (!tendency || tendency.snaps < 3) return {};
  const boost: Partial<Record<Coverage, number>> = {};
  for (const [cov, count] of Object.entries(tendency.coverageCounts) as [Coverage, number][]) {
    // Convert frequency to boost points (max 40 pts for dominant tendency)
    const freq = count / tendency.snaps;
    boost[cov] = Math.round(freq * 40);
  }
  return boost;
}

export function clearHistory() {
  save({ history: [], opponents: [] });
}

export function getAccuracyStats(history: PostSnapResult[]): {
  total: number;
  correct: number;
  accuracy: number;
  byOpponent: { opponent: string; total: number; correct: number; accuracy: number }[];
} {
  const total = history.length;
  const correct = history.filter((h) => h.correct).length;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

  const opponentMap: Record<string, { total: number; correct: number }> = {};
  for (const h of history) {
    if (!opponentMap[h.opponent]) opponentMap[h.opponent] = { total: 0, correct: 0 };
    opponentMap[h.opponent].total += 1;
    if (h.correct) opponentMap[h.opponent].correct += 1;
  }

  const byOpponent = Object.entries(opponentMap).map(([opponent, { total, correct }]) => ({
    opponent,
    total,
    correct,
    accuracy: Math.round((correct / total) * 100),
  })).sort((a, b) => b.total - a.total);

  return { total, correct, accuracy, byOpponent };
}

export function getTopOpponentCoverage(tendency: OpponentTendency): { coverage: Coverage; pct: number }[] {
  return (Object.entries(tendency.coverageCounts) as [Coverage, number][])
    .map(([coverage, count]) => ({ coverage, confidence: count }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(({ coverage, confidence }) => ({
      coverage,
      pct: Math.round((confidence / tendency.snaps) * 100),
    }));
}
