// ─── Opponent Learning Engine ─────────────────────────────────────────────────
// Every analyzed snap improves our knowledge of this opponent.
// All data persists across sessions via localStorage.
// The engine tracks tendencies, frequencies, and patterns automatically.

import { getAllSnaps } from "./film-snap-store";
import type { FilmSnap } from "./film-snap-store";

const STORE_KEY = "debunked_opponent_intel_v2";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FreqItem = {
  label:   string;
  count:   number;
  pct:     number;
};

export type TendencyInsight = {
  category: string;
  insight:  string;
  severity: "Low" | "Medium" | "High" | "Critical";
  exploit:  string;
};

export type OpponentProfile = {
  opponentName:       string;
  gamesPlayed:        number;
  totalSnaps:         number;
  lastSeen:           number;

  // Coverage tendencies
  coverageFrequency:    FreqItem[];  // e.g. [{ label: "Cover 2 Shell", count: 8, pct: 42 }]
  shellFrequency:       FreqItem[];
  formationFrequency:   FreqItem[];

  // Adjustment tendencies
  adjustmentFrequency:  FreqItem[];  // which adjustments they use most

  // Blitz tendencies
  blitzRate:            number;      // 0-100
  blitzByDown:          Record<string, number>; // "1": 15, "2": 30, "3": 60, "4": 80
  blitzTypes:           FreqItem[];

  // User tendencies
  userPositionFrequency: FreqItem[];
  userTendencies:       string[];    // behavioral notes

  // Pressure stats
  pressureRate:         number;
  averagePressureTime:  string;

  // Favorite packages
  favoriteFormations:   FreqItem[];
  favoriteBlitzes:      FreqItem[];
  favoriteCoverages:    FreqItem[];

  // Down and distance tendencies
  dndCoverage:          Record<string, FreqItem[]>; // "1&10" → top coverages on that down/distance

  // AI-generated insights
  insights:             TendencyInsight[];
};

// ─── Storage ──────────────────────────────────────────────────────────────────

type Store = {
  profiles: Record<string, OpponentProfile>;
};

function load(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { profiles: {} };
    return JSON.parse(raw) as Store;
  } catch {
    return { profiles: {} };
  }
}

function save(store: Store): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function buildFreqMap(items: string[]): FreqItem[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    if (!item) continue;
    map[item] = (map[item] ?? 0) + 1;
  }
  const total = items.filter(Boolean).length;
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));
}

// ─── Generate Insights ────────────────────────────────────────────────────────

function generateInsights(snaps: FilmSnap[]): TendencyInsight[] {
  const insights: TendencyInsight[] = [];
  if (snaps.length < 3) return insights;

  const blitzSnaps = snaps.filter(s => s.defBlitz);
  const blitzRate  = Math.round((blitzSnaps.length / snaps.length) * 100);

  if (blitzRate >= 50) {
    insights.push({
      category: "Blitz Frequency",
      insight:  `This opponent blitzes ${blitzRate}% of the time — well above average.`,
      severity: blitzRate >= 70 ? "Critical" : "High",
      exploit:  "Max protect and attack deep with 1v1 opportunities. Screen passes and quick game are automatic wins.",
    });
  }

  // Check for Cover 0 tendency
  const zeroSnaps = snaps.filter(s => s.defShell === "Cover 0 Shell" || s.defCoverage === "Cover 0 Man");
  if (zeroSnaps.length / snaps.length >= 0.3) {
    insights.push({
      category: "Cover 0 Tendency",
      insight:  `${Math.round((zeroSnaps.length / snaps.length) * 100)}% Cover 0 — this opponent loves bringing the house.`,
      severity: "Critical",
      exploit:  "Pre-snap identify 0 coverage. Hot route boundary fades. Ball out in 1.2 seconds every time.",
    });
  }

  // Check down-and-distance blitz rate
  const thirdDownSnaps  = snaps.filter(s => s.down === 3);
  const thirdDownBlitz  = thirdDownSnaps.filter(s => s.defBlitz).length;
  if (thirdDownSnaps.length >= 3 && thirdDownBlitz / thirdDownSnaps.length >= 0.6) {
    insights.push({
      category: "3rd Down Blitz",
      insight:  `Blitzes ${Math.round((thirdDownBlitz / thirdDownSnaps.length) * 100)}% of 3rd downs — extremely aggressive on passing downs.`,
      severity: "High",
      exploit:  "3rd and medium: quick game or screen. 3rd and long: 5-wide with hot routes ready.",
    });
  }

  // Cover 2 tendency
  const cover2Snaps = snaps.filter(s => s.defShell === "Cover 2 Shell");
  if (cover2Snaps.length / snaps.length >= 0.4) {
    insights.push({
      category: "Cover 2 Heavy",
      insight:  `${Math.round((cover2Snaps.length / snaps.length) * 100)}% Cover 2 shell — this opponent loves playing two high.`,
      severity: "Medium",
      exploit:  "Attack the corner route, smash concept, and seams between safeties. Post routes hit the void between deep halves.",
    });
  }

  // Favorite formation
  const formations = buildFreqMap(snaps.map(s => s.defFormation).filter(Boolean));
  if (formations[0] && formations[0].pct >= 40) {
    insights.push({
      category: "Formation Tendency",
      insight:  `${formations[0].pct}% of snaps from ${formations[0].label} — heavily reliant on this formation.`,
      severity: "Medium",
      exploit:  `Study ${formations[0].label} pre-snap tells. You can predict what's coming before the snap.`,
    });
  }

  return insights;
}

// ─── Build Profile from Snaps ─────────────────────────────────────────────────

function buildProfile(opponentName: string, snaps: FilmSnap[]): OpponentProfile {
  const blitzSnaps  = snaps.filter(s => s.defBlitz);
  const pressSnaps  = snaps.filter(s => s.defPressure);

  const blitzByDown: Record<string, number> = {};
  for (let d = 1; d <= 4; d++) {
    const downSnaps  = snaps.filter(s => s.down === d);
    const downBlitz  = downSnaps.filter(s => s.defBlitz).length;
    blitzByDown[String(d)] = downSnaps.length > 0 ? Math.round((downBlitz / downSnaps.length) * 100) : 0;
  }

  // Down and distance coverage breakdown
  const dndCoverage: Record<string, FreqItem[]> = {};
  const dndGroups: Record<string, string[]> = {};
  for (const snap of snaps) {
    if (!snap.down) continue;
    const distLabel = snap.distance <= 3 ? "Short" : snap.distance <= 7 ? "Medium" : "Long";
    const key = `${snap.down}&${distLabel}`;
    if (!dndGroups[key]) dndGroups[key] = [];
    if (snap.defShell) dndGroups[key].push(snap.defShell);
  }
  for (const [key, coverages] of Object.entries(dndGroups)) {
    dndCoverage[key] = buildFreqMap(coverages);
  }

  // Aggregate adjustments
  const allAdjustments = snaps.flatMap(s => s.defAdjustments);

  return {
    opponentName,
    gamesPlayed:          new Set(snaps.map(s => s.gameId)).size,
    totalSnaps:           snaps.length,
    lastSeen:             Math.max(...snaps.map(s => s.timestamp), 0),
    coverageFrequency:    buildFreqMap(snaps.map(s => s.defCoverage).filter(Boolean)),
    shellFrequency:       buildFreqMap(snaps.map(s => s.defShell).filter(Boolean)),
    formationFrequency:   buildFreqMap(snaps.map(s => s.defFormation).filter(Boolean)),
    adjustmentFrequency:  buildFreqMap(allAdjustments),
    blitzRate:            snaps.length > 0 ? Math.round((blitzSnaps.length / snaps.length) * 100) : 0,
    blitzByDown,
    blitzTypes:           buildFreqMap(blitzSnaps.map(s => s.defBlitzType).filter(Boolean)),
    userPositionFrequency: buildFreqMap(snaps.map(s => s.defUser).filter(f => f && f !== "Unknown")),
    userTendencies:       [],
    pressureRate:         snaps.length > 0 ? Math.round((pressSnaps.length / snaps.length) * 100) : 0,
    averagePressureTime:  "",
    favoriteFormations:   buildFreqMap(snaps.map(s => s.defFormation).filter(Boolean)).slice(0, 5),
    favoriteBlitzes:      buildFreqMap(blitzSnaps.map(s => s.defBlitzType).filter(Boolean)).slice(0, 5),
    favoriteCoverages:    buildFreqMap(snaps.map(s => s.defCoverage).filter(Boolean)).slice(0, 5),
    dndCoverage,
    insights:             generateInsights(snaps),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Rebuild and save the profile for an opponent from all stored snaps */
export function rebuildProfile(opponentName: string): OpponentProfile {
  const allSnaps   = getAllSnaps();
  const oppSnaps   = allSnaps.filter(s => normalize(s.opponentName) === normalize(opponentName));
  const profile    = buildProfile(opponentName, oppSnaps);
  const store      = load();
  store.profiles[normalize(opponentName)] = profile;
  save(store);
  return profile;
}

/** Get the saved profile for an opponent (fast — no rebuild) */
export function getProfile(opponentName: string): OpponentProfile | null {
  const store = load();
  return store.profiles[normalize(opponentName)] ?? null;
}

/** Get or rebuild a profile */
export function getOrBuildProfile(opponentName: string): OpponentProfile {
  return getProfile(opponentName) ?? rebuildProfile(opponentName);
}

/** List all saved opponent names */
export function getAllOpponents(): string[] {
  const store = load();
  return Object.values(store.profiles).map(p => p.opponentName);
}

/** Clear a specific opponent's profile */
export function deleteProfile(opponentName: string): void {
  const store = load();
  delete store.profiles[normalize(opponentName)];
  save(store);
}
