// ─── Post-Snap Storage ────────────────────────────────────────────────────────
// Persists post-snap analysis results in localStorage.
// Supports retrieval by game, opponent, and coverage type for trend analysis.

import type { PostSnapAnalysis } from "./post-snap-engine";
import type { CoverageFamily } from "./coverage-recognition-engine";

export type StoredAnalysis = {
  id: string;
  timestamp: number;
  gameId: string;
  opponent: string;
  snapLabel: string;
  down: number | null;
  distance: number | null;
  preSnapPrediction: CoverageFamily | null;
  actualCoverage: CoverageFamily;
  wasDisguised: boolean;
  blitzConfirmed: boolean;
  notes: string;
  aiPayload: object;  // preserved for AI pipeline
};

export type PostSnapGameLog = {
  gameId: string;
  opponent: string;
  date: number;
  snaps: StoredAnalysis[];
};

export type PostSnapDataStore = {
  analyses: StoredAnalysis[];
  games: PostSnapGameLog[];
};

// ─── Coverage Stats ───────────────────────────────────────────────────────────

export type CoverageFrequency = {
  family: CoverageFamily;
  count: number;
  pct: number;
  disguisedCount: number;
};

export type OpponentProfile = {
  opponent: string;
  totalSnaps: number;
  coverageFrequency: CoverageFrequency[];
  blitzRate: number;
  disguiseRate: number;
  lastSeen: number;
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORE_KEY = "debunked_postsnap_v1";

function load(): PostSnapDataStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { analyses: [], games: [] };
    return JSON.parse(raw) as PostSnapDataStore;
  } catch {
    return { analyses: [], games: [] };
  }
}

function save(store: PostSnapDataStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage full
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function saveAnalysis(params: {
  analysis: PostSnapAnalysis;
  opponent: string;
  gameId: string;
  snapLabel?: string;
  notes?: string;
}): StoredAnalysis {
  const store = load();
  const { analysis, opponent, gameId, snapLabel = "", notes = "" } = params;

  const record: StoredAnalysis = {
    id: analysis.id,
    timestamp: analysis.timestamp,
    gameId,
    opponent,
    snapLabel,
    down: analysis.input.context?.down ?? null,
    distance: analysis.input.context?.distance ?? null,
    preSnapPrediction: analysis.input.preSnapPrediction,
    actualCoverage: analysis.actualCoverage.family,
    wasDisguised: analysis.wasDisguised,
    blitzConfirmed: analysis.blitzConfirmed,
    notes,
    aiPayload: analysis.aiPayload,
  };

  store.analyses = [record, ...store.analyses].slice(0, 500);

  // Upsert game log
  const existingGame = store.games.find((g) => g.gameId === gameId);
  if (existingGame) {
    existingGame.snaps = [record, ...existingGame.snaps];
  } else {
    store.games = [{ gameId, opponent, date: Date.now(), snaps: [record] }, ...store.games].slice(0, 50);
  }

  save(store);
  return record;
}

export function getAnalysesByOpponent(opponent: string): StoredAnalysis[] {
  const store = load();
  return store.analyses.filter(
    (a) => a.opponent.toLowerCase() === opponent.toLowerCase()
  );
}

export function getRecentAnalyses(limit = 20): StoredAnalysis[] {
  return load().analyses.slice(0, limit);
}

export function getAllGames(): PostSnapGameLog[] {
  return load().games;
}

export function getOpponentProfile(opponent: string): OpponentProfile | null {
  const snaps = getAnalysesByOpponent(opponent);
  if (snaps.length === 0) return null;

  const coverageMap = new Map<CoverageFamily, { count: number; disguised: number }>();
  let blitzCount = 0;
  let disguiseCount = 0;

  for (const snap of snaps) {
    const existing = coverageMap.get(snap.actualCoverage) ?? { count: 0, disguised: 0 };
    existing.count += 1;
    if (snap.wasDisguised) existing.disguised += 1;
    coverageMap.set(snap.actualCoverage, existing);
    if (snap.blitzConfirmed) blitzCount += 1;
    if (snap.wasDisguised) disguiseCount += 1;
  }

  const total = snaps.length;
  const coverageFrequency: CoverageFrequency[] = Array.from(coverageMap.entries())
    .map(([family, { count, disguised }]) => ({
      family,
      count,
      pct: Math.round((count / total) * 100),
      disguisedCount: disguised,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    opponent,
    totalSnaps: total,
    coverageFrequency,
    blitzRate: Math.round((blitzCount / total) * 100),
    disguiseRate: Math.round((disguiseCount / total) * 100),
    lastSeen: snaps[0].timestamp,
  };
}

export function getAllOpponentProfiles(): OpponentProfile[] {
  const store = load();
  const opponents = [...new Set(store.analyses.map((a) => a.opponent))];
  return opponents
    .map((opp) => getOpponentProfile(opp))
    .filter(Boolean) as OpponentProfile[];
}

export function getStoreStats(): {
  totalAnalyses: number;
  totalGames: number;
  disguiseRate: number;
  blitzRate: number;
  mostCommonActualCoverage: CoverageFamily | null;
} {
  const store = load();
  const total = store.analyses.length;
  if (total === 0) {
    return { totalAnalyses: 0, totalGames: 0, disguiseRate: 0, blitzRate: 0, mostCommonActualCoverage: null };
  }
  const blitz = store.analyses.filter((a) => a.blitzConfirmed).length;
  const disguise = store.analyses.filter((a) => a.wasDisguised).length;

  const covMap = new Map<CoverageFamily, number>();
  for (const a of store.analyses) {
    covMap.set(a.actualCoverage, (covMap.get(a.actualCoverage) ?? 0) + 1);
  }
  const mostCommon = [...covMap.entries()].sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  return {
    totalAnalyses: total,
    totalGames: store.games.length,
    disguiseRate: Math.round((disguise / total) * 100),
    blitzRate: Math.round((blitz / total) * 100),
    mostCommonActualCoverage: mostCommon,
  };
}

export function clearAll(): void {
  save({ analyses: [], games: [] });
}

/** Export all data as a structured JSON blob ready for AI pipeline ingestion. */
export function exportForAi(): object {
  const store = load();
  return {
    schemaVersion: "post-snap-store/v1",
    exportedAt: new Date().toISOString(),
    totalAnalyses: store.analyses.length,
    totalGames: store.games.length,
    opponentProfiles: getAllOpponentProfiles(),
    recentAnalyses: store.analyses.slice(0, 50).map((a) => ({
      ...a,
      aiPayload: a.aiPayload,
    })),
  };
}
