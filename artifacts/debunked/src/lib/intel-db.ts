// ═══════════════════════════════════════════════════════════════════════════════
// DEBUNKED. — Opponent Intelligence Database
// Multi-layer persistence: Session → Local → (Cloud-ready)
// All analyzed snaps build permanent opponent intelligence.
// ═══════════════════════════════════════════════════════════════════════════════

import { getAnalysesByOpponent, getAllGames, type StoredAnalysis, type PostSnapGameLog } from "./post-snap-store";
import { getStore as getPreSnapStore, type OpponentTendency } from "./pre-snap-store";
import { COVERAGES, type Counter } from "./madden-data";

// ─── Core Types ───────────────────────────────────────────────────────────────

export type IntelSnap = {
  id: string;
  gameId: string;
  opponentId: string;
  opponentName: string;
  timestamp: number;

  // Situational context
  quarter?: number;
  down?: number;
  distance?: number;
  fieldZone?: "normal" | "redzone" | "goalline" | "4thdown";

  // Side
  side: "offense" | "defense";

  // Defensive scheme
  coverageId?: string;
  coverageName?: string;
  coverageFamily?: string;
  coverageShell?: string;
  blitzPackage?: string;
  wasDisguised?: boolean;
  blitzConfirmed?: boolean;

  // User defender tracking
  userPosition?: string;

  // Counter tracking (when user logs a result)
  counterUsed?: string;
  counterFormation?: string;
  counterPlay?: string;
  yardsGained?: number;
  wasSuccessful?: boolean;
  turnover?: boolean;
  sack?: boolean;

  // Analysis metadata
  confidenceScore?: number;

  // Self-learning corrections
  aiPrediction?: string;
  userCorrection?: string;
  corrected?: boolean;
  correctionFrequency?: number;
};

export type IntelGame = {
  gameId: string;
  opponentId: string;
  opponentName: string;
  date: number;
  snapCount: number;
};

export type FrequencyItem = {
  id: string;
  label: string;
  count: number;
  pct: number;
};

export type TrendWindow = {
  window: "last1" | "last3" | "last5" | "last10" | "lifetime";
  label: string;
  gameCount: number;
  snapCount: number;
  blitzRate: number;
  disguiseRate: number;
  topCoverages: FrequencyItem[];
};

export type TrendInsight = {
  metric: string;
  lifetimeLabel: string;
  recentLabel: string;
  direction: "increasing" | "decreasing" | "stable";
  significance: "low" | "medium" | "high";
  insight: string;
};

export type CounterRecord = {
  vsCoverageId: string;
  vsCoverageName: string;
  counterFormation: string;
  counterPlay: string;
  counterLabel: string;
  uses: number;
  successes: number;
  successRate: number;
  totalYards: number;
  avgYards: number;
  confidence: "Low" | "Medium" | "High";
};

export type CorrectionRecord = {
  id: string;
  lastSeen: number;
  aiPrediction: string;
  userCorrection: string;
  count: number;
  confidenceBefore?: number;
  confidenceAfter?: number;
};

export type OpponentIntelProfile = {
  opponentId: string;
  opponentName: string;
  gamesAnalyzed: number;
  totalSnaps: number;
  firstSeen: number;
  lastSeen: number;

  // Coverage tendencies (lifetime)
  favoriteCoverages: FrequencyItem[];
  blitzRate: number;
  disguiseRate: number;

  // User controlling defender
  favoriteUserPositions: FrequencyItem[];

  // Situational tendencies
  redZoneCoverages: FrequencyItem[];
  thirdDownCoverages: FrequencyItem[];
  fourthDownCoverages: FrequencyItem[];

  // Trend windows (last 1 / 3 / 5 / 10 / lifetime)
  trends: TrendWindow[];

  // Auto-detected trend changes
  insights: TrendInsight[];

  // Counter history
  counterHistory: CounterRecord[];

  // Self-learning corrections
  corrections: CorrectionRecord[];

  // Best historical counters (across all snaps)
  bestCounters: Counter[];
};

export type IntelStore = {
  snaps: IntelSnap[];
  games: IntelGame[];
  counters: CounterRecord[];
  corrections: CorrectionRecord[];
  schemaVersion: number;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const LOCAL_KEY   = "debunked_intel_v1";
const SESSION_KEY = "debunked_session_v1";
const SCHEMA_VER  = 1;

// ─── Session Persistence (Layer 1) ────────────────────────────────────────────

export type ActiveSession = {
  opponentName: string;
  gameId: string;
  snapCount: number;
  analysisProgress: number;
  lastActivity: number;
  pendingSnaps: Partial<IntelSnap>[];
};

export function saveSession(session: Partial<ActiveSession>): void {
  try {
    const current = loadSession();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...session, lastActivity: Date.now() }));
  } catch { /* ignore */ }
}

export function loadSession(): ActiveSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch { return null; }
}

export function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// ─── Local Persistence (Layer 2) ──────────────────────────────────────────────

function loadStore(): IntelStore {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as IntelStore;
    if (parsed.schemaVersion !== SCHEMA_VER) return empty();
    return parsed;
  } catch { return empty(); }
}

function saveStore(store: IntelStore): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
  } catch { /* Storage full */ }
}

function empty(): IntelStore {
  return { snaps: [], games: [], counters: [], corrections: [], schemaVersion: SCHEMA_VER };
}

// ─── Snap Ingestion ───────────────────────────────────────────────────────────

export function logIntelSnap(snap: Omit<IntelSnap, "id" | "timestamp">): IntelSnap {
  const store = loadStore();
  const record: IntelSnap = {
    ...snap,
    id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    opponentId: snap.opponentName.toLowerCase().trim(),
  };

  store.snaps = [record, ...store.snaps].slice(0, 2000);

  // Upsert game log
  const existingGame = store.games.find(g => g.gameId === snap.gameId);
  if (existingGame) {
    existingGame.snapCount += 1;
  } else {
    store.games = [{
      gameId: snap.gameId,
      opponentId: record.opponentId,
      opponentName: snap.opponentName,
      date: Date.now(),
      snapCount: 1,
    }, ...store.games].slice(0, 200);
  }

  saveStore(store);
  return record;
}

/** Ingest a batch of snaps from ScoutOpponent at report time */
export function logScoutBatch(
  opponentName: string,
  gameId: string,
  snaps: Array<{
    coverageId: string;
    coverageName: string;
    situation?: string;
    userPosition?: string;
    down?: number;
    distance?: number;
    blitzConfirmed?: boolean;
  }>
): void {
  for (const snap of snaps) {
    const coverage = COVERAGES.find(c => c.id === snap.coverageId);
    logIntelSnap({
      gameId,
      opponentId: opponentName.toLowerCase().trim(),
      opponentName,
      side: "defense",
      coverageId: snap.coverageId,
      coverageName: snap.coverageName || coverage?.name,
      coverageShell: coverage?.shell,
      blitzConfirmed: snap.blitzConfirmed ?? coverage?.category === "blitz",
      fieldZone: (snap.situation as IntelSnap["fieldZone"]) || "normal",
      down: snap.down,
      distance: snap.distance,
      userPosition: snap.userPosition,
    });
  }
}

// ─── Counter Result Logging ───────────────────────────────────────────────────

export function logCounterResult(params: {
  opponentName: string;
  vsCoverageId: string;
  counterFormation: string;
  counterPlay: string;
  yardsGained: number;
  wasSuccessful: boolean;
}): void {
  const store = loadStore();
  const cov = COVERAGES.find(c => c.id === params.vsCoverageId);
  const key = `${params.vsCoverageId}|${params.counterFormation}|${params.counterPlay}`;

  const existing = store.counters.find(c =>
    c.vsCoverageId === params.vsCoverageId &&
    c.counterFormation === params.counterFormation &&
    c.counterPlay === params.counterPlay
  );

  if (existing) {
    existing.uses += 1;
    if (params.wasSuccessful) existing.successes += 1;
    existing.totalYards += params.yardsGained;
    existing.successRate = Math.round((existing.successes / existing.uses) * 100);
    existing.avgYards = Math.round(existing.totalYards / existing.uses * 10) / 10;
    existing.confidence = existing.uses >= 10
      ? (existing.successRate >= 70 ? "High" : existing.successRate >= 45 ? "Medium" : "Low")
      : existing.uses >= 3 ? "Medium" : "Low";
  } else {
    store.counters.push({
      vsCoverageId: params.vsCoverageId,
      vsCoverageName: cov?.name ?? params.vsCoverageId,
      counterFormation: params.counterFormation,
      counterPlay: params.counterPlay,
      counterLabel: `${params.counterFormation} — ${params.counterPlay}`,
      uses: 1,
      successes: params.wasSuccessful ? 1 : 0,
      successRate: params.wasSuccessful ? 100 : 0,
      totalYards: params.yardsGained,
      avgYards: params.yardsGained,
      confidence: "Low",
    });
  }

  saveStore(store);
}

// ─── Self-Learning Correction Logging ────────────────────────────────────────

export function logCorrection(params: {
  aiPrediction: string;
  userCorrection: string;
  confidenceBefore?: number;
  confidenceAfter?: number;
}): void {
  const store = loadStore();
  const existing = store.corrections.find(
    c => c.aiPrediction === params.aiPrediction && c.userCorrection === params.userCorrection
  );
  if (existing) {
    existing.count += 1;
    existing.lastSeen = Date.now();
    if (params.confidenceAfter !== undefined) existing.confidenceAfter = params.confidenceAfter;
  } else {
    store.corrections.push({
      id: `corr-${Date.now()}`,
      lastSeen: Date.now(),
      aiPrediction: params.aiPrediction,
      userCorrection: params.userCorrection,
      count: 1,
      confidenceBefore: params.confidenceBefore,
      confidenceAfter: params.confidenceAfter,
    });
  }
  saveStore(store);
}

// ─── Frequency Helpers ────────────────────────────────────────────────────────

function buildFrequency(items: string[], labelMap?: Record<string, string>): FrequencyItem[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  const total = items.filter(Boolean).length || 1;
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({
      id,
      label: labelMap?.[id] ?? id,
      count,
      pct: Math.round((count / total) * 100),
    }));
}

// ─── Trend Engine ─────────────────────────────────────────────────────────────

function buildTrendWindow(
  games: IntelGame[],
  allSnaps: IntelSnap[],
  windowSize: number | "lifetime",
  label: string,
  windowKey: TrendWindow["window"]
): TrendWindow {
  const relevantGames = windowSize === "lifetime"
    ? games
    : games.slice(0, windowSize);
  const gameIds = new Set(relevantGames.map(g => g.gameId));
  const snaps = allSnaps.filter(s => gameIds.has(s.gameId));
  const total = snaps.length || 1;
  const blitzCount = snaps.filter(s => s.blitzConfirmed).length;
  const disguiseCount = snaps.filter(s => s.wasDisguised).length;
  const covIds = snaps.map(s => s.coverageId ?? "").filter(Boolean);
  const labelMap: Record<string, string> = {};
  for (const c of COVERAGES) labelMap[c.id] = c.name;

  return {
    window: windowKey,
    label,
    gameCount: relevantGames.length,
    snapCount: snaps.length,
    blitzRate: Math.round((blitzCount / total) * 100),
    disguiseRate: Math.round((disguiseCount / total) * 100),
    topCoverages: buildFrequency(covIds, labelMap).slice(0, 5),
  };
}

function detectTrendInsights(lifetime: TrendWindow, recent: TrendWindow): TrendInsight[] {
  const insights: TrendInsight[] = [];
  if (lifetime.snapCount < 5 || recent.snapCount < 2) return insights;

  // Blitz rate change
  const blitzDelta = recent.blitzRate - lifetime.blitzRate;
  if (Math.abs(blitzDelta) >= 10) {
    insights.push({
      metric: "Blitz Rate",
      lifetimeLabel: `${lifetime.blitzRate}%`,
      recentLabel: `${recent.blitzRate}%`,
      direction: blitzDelta > 0 ? "increasing" : "decreasing",
      significance: Math.abs(blitzDelta) >= 20 ? "high" : "medium",
      insight: blitzDelta > 0
        ? `Opponent has increased pressure — blitz rate up ${blitzDelta}pts recently. Prepare hot routes on every obvious passing down.`
        : `Opponent is pulling back on pressure — blitz rate down ${Math.abs(blitzDelta)}pts. Expect more zone and patience.`,
    });
  }

  // Coverage drift
  const lifetimeTop = lifetime.topCoverages[0];
  const recentTop = recent.topCoverages[0];
  if (lifetimeTop && recentTop && lifetimeTop.id !== recentTop.id) {
    insights.push({
      metric: "Coverage Scheme",
      lifetimeLabel: `${lifetimeTop.label} ${lifetimeTop.pct}%`,
      recentLabel: `${recentTop.label} ${recentTop.pct}%`,
      direction: "increasing",
      significance: "high",
      insight: `Opponent appears to be transitioning away from ${lifetimeTop.label} toward ${recentTop.label} concepts. Update your counter strategy.`,
    });
  }

  // Coverage that dropped off
  for (const lifetimeCov of lifetime.topCoverages.slice(0, 3)) {
    const recentCov = recent.topCoverages.find(c => c.id === lifetimeCov.id);
    const recentPct = recentCov?.pct ?? 0;
    const delta = lifetimeCov.pct - recentPct;
    if (delta >= 20) {
      insights.push({
        metric: `${lifetimeCov.label} Usage`,
        lifetimeLabel: `${lifetimeCov.pct}%`,
        recentLabel: `${recentPct}%`,
        direction: "decreasing",
        significance: delta >= 30 ? "high" : "medium",
        insight: `${lifetimeCov.label} usage has dropped significantly in recent games. They may have adapted — diversify your counters.`,
      });
    }
  }

  return insights.slice(0, 4);
}

// ─── Profile Builder ──────────────────────────────────────────────────────────

export function buildOpponentProfile(opponentName: string): OpponentIntelProfile | null {
  const store = loadStore();
  const opponentId = opponentName.toLowerCase().trim();

  // Pull from intel-db first
  let snaps = store.snaps.filter(s => s.opponentId === opponentId);
  let games = store.games.filter(g => g.opponentId === opponentId);

  // Also pull from post-snap-store (legacy data / FilmHub)
  const legacySnaps: IntelSnap[] = getAnalysesByOpponent(opponentName).map(a => ({
    id: `legacy-${a.id}`,
    gameId: a.gameId,
    opponentId,
    opponentName,
    timestamp: a.timestamp,
    side: "defense" as const,
    coverageId: a.actualCoverage,
    coverageName: a.actualCoverage,
    coverageFamily: a.actualCoverage,
    wasDisguised: a.wasDisguised,
    blitzConfirmed: a.blitzConfirmed,
    down: a.down ?? undefined,
    distance: a.distance ?? undefined,
    corrected: false,
  }));

  const legacyGames: IntelGame[] = getAllGames()
    .filter(g => g.opponent.toLowerCase() === opponentId)
    .map(g => ({
      gameId: g.gameId,
      opponentId,
      opponentName,
      date: g.date,
      snapCount: g.snaps.length,
    }));

  // Merge, deduping by id
  const seenIds = new Set(snaps.map(s => s.id));
  for (const ls of legacySnaps) {
    if (!seenIds.has(ls.id)) { snaps.push(ls); seenIds.add(ls.id); }
  }
  const seenGameIds = new Set(games.map(g => g.gameId));
  for (const lg of legacyGames) {
    if (!seenGameIds.has(lg.gameId)) { games.push(lg); seenGameIds.add(lg.gameId); }
  }

  // Sort by date descending
  snaps.sort((a, b) => b.timestamp - a.timestamp);
  games.sort((a, b) => b.date - a.date);

  if (snaps.length === 0) return null;

  const total = snaps.length || 1;
  const labelMap: Record<string, string> = {};
  for (const c of COVERAGES) labelMap[c.id] = c.name;

  // Coverage frequencies
  const covIds = snaps.map(s => s.coverageId ?? s.coverageFamily ?? "").filter(Boolean);
  const favoriteCoverages = buildFrequency(covIds, labelMap).slice(0, 8);

  // Rates
  const blitzCount = snaps.filter(s => s.blitzConfirmed || COVERAGES.find(c => c.id === s.coverageId)?.category === "blitz").length;
  const disguiseCount = snaps.filter(s => s.wasDisguised).length;

  // User defender preferences
  const userPositions = snaps.map(s => s.userPosition ?? "").filter(p => p && p !== "none" && p !== "None visible");
  const favoriteUserPositions = buildFrequency(userPositions).slice(0, 5);

  // Situational tendencies
  const redZoneSnaps = snaps.filter(s => s.fieldZone === "redzone" || s.fieldZone === "goalline");
  const redZoneCoverages = buildFrequency(redZoneSnaps.map(s => s.coverageId ?? "").filter(Boolean), labelMap).slice(0, 4);

  const thirdDownSnaps = snaps.filter(s => s.down === 3);
  const thirdDownCoverages = buildFrequency(thirdDownSnaps.map(s => s.coverageId ?? "").filter(Boolean), labelMap).slice(0, 4);

  const fourthDownSnaps = snaps.filter(s => s.down === 4 || s.fieldZone === "4thdown");
  const fourthDownCoverages = buildFrequency(fourthDownSnaps.map(s => s.coverageId ?? "").filter(Boolean), labelMap).slice(0, 4);

  // Trend windows
  const trends: TrendWindow[] = [
    buildTrendWindow(games, snaps, 1, "Last Game", "last1"),
    buildTrendWindow(games, snaps, 3, "Last 3 Games", "last3"),
    buildTrendWindow(games, snaps, 5, "Last 5 Games", "last5"),
    buildTrendWindow(games, snaps, 10, "Last 10 Games", "last10"),
    buildTrendWindow(games, snaps, "lifetime", "Lifetime", "lifetime"),
  ];

  // Detect trend insights (compare recent 3 vs lifetime)
  const recentTrend = trends.find(t => t.window === "last3")!;
  const lifetimeTrend = trends.find(t => t.window === "lifetime")!;
  const insights = detectTrendInsights(lifetimeTrend, recentTrend);

  // Counter history for this opponent's most common coverages
  const opponentCounters = store.counters.filter(c =>
    favoriteCoverages.some(f => f.id === c.vsCoverageId)
  ).sort((a, b) => b.successRate - a.successRate || b.uses - a.uses);

  // Self-learning corrections
  const corrections = store.corrections
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Best counters from knowledge base for top coverage
  const topCov = COVERAGES.find(c => c.id === favoriteCoverages[0]?.id);
  const bestCounters = topCov?.counters ?? [];

  return {
    opponentId,
    opponentName,
    gamesAnalyzed: games.length,
    totalSnaps: snaps.length,
    firstSeen: snaps[snaps.length - 1].timestamp,
    lastSeen: snaps[0].timestamp,
    favoriteCoverages,
    blitzRate: Math.round((blitzCount / total) * 100),
    disguiseRate: Math.round((disguiseCount / total) * 100),
    favoriteUserPositions,
    redZoneCoverages,
    thirdDownCoverages,
    fourthDownCoverages,
    trends,
    insights,
    counterHistory: opponentCounters,
    corrections,
    bestCounters,
  };
}

// ─── Global Lookups ───────────────────────────────────────────────────────────

export function getAllTrackedOpponents(): string[] {
  const store = loadStore();
  const fromIntel = [...new Set(store.snaps.map(s => s.opponentName))];
  // Also pull from legacy stores
  const legacyGames = getAllGames();
  const fromLegacy = [...new Set(legacyGames.map(g => g.opponent))];
  const all = [...new Set([...fromIntel, ...fromLegacy])];
  return all.filter(Boolean).sort();
}

export function getGlobalStats(): {
  totalSnaps: number;
  totalGames: number;
  totalOpponents: number;
  globalBlitzRate: number;
  globalDisguiseRate: number;
  topCoverage: string | null;
  totalCounterResults: number;
  totalCorrections: number;
} {
  const store = loadStore();
  const legacySnaps = getAllGames().flatMap(g => g.snaps);
  const totalSnaps = store.snaps.length + legacySnaps.length;
  const totalGames = store.games.length + getAllGames().length;
  const opponents = getAllTrackedOpponents();

  const allBlitz = store.snaps.filter(s => s.blitzConfirmed).length;
  const allDisguise = store.snaps.filter(s => s.wasDisguised).length;
  const legacyBlitz = legacySnaps.filter(s => s.blitzConfirmed).length;
  const legacyDisguise = legacySnaps.filter(s => s.wasDisguised).length;

  const combined = totalSnaps || 1;
  const covMap = new Map<string, number>();
  for (const s of store.snaps) {
    if (s.coverageId) covMap.set(s.coverageId, (covMap.get(s.coverageId) ?? 0) + 1);
  }
  const topCovId = [...covMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topCov = topCovId ? COVERAGES.find(c => c.id === topCovId)?.name ?? topCovId : null;

  return {
    totalSnaps,
    totalGames,
    totalOpponents: opponents.length,
    globalBlitzRate: Math.round(((allBlitz + legacyBlitz) / combined) * 100),
    globalDisguiseRate: Math.round(((allDisguise + legacyDisguise) / combined) * 100),
    topCoverage: topCov,
    totalCounterResults: store.counters.reduce((sum, c) => sum + c.uses, 0),
    totalCorrections: store.corrections.reduce((sum, c) => sum + c.count, 0),
  };
}

export function getAllCounterHistory(): CounterRecord[] {
  return loadStore().counters.sort((a, b) => b.successRate - a.successRate || b.uses - a.uses);
}

export function getAllCorrections(): CorrectionRecord[] {
  return loadStore().corrections.sort((a, b) => b.count - a.count);
}

export function clearAllIntelData(): void {
  saveStore(empty());
  clearSession();
}

/** Generate unique game ID for a new scout session */
export function newGameId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
