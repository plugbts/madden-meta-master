// ─── Film Snap Store ───────────────────────────────────────────────────────────
// Full snap data structure with localStorage persistence.
// Every snap stores both offense and defense — everything becomes searchable.
// Analyzed snaps feed the learning engine automatically.

import type { EliminationInputs, EliminationResult } from "./elimination-engine";

const STORE_KEY = "debunked_film_snaps_v2";

// ─── Hash ─────────────────────────────────────────────────────────────────────

export type FieldHash = "Left" | "Middle" | "Right";
export type SnapResult = "Success" | "Failure" | "Sack" | "TD" | "Turnover" | "Pressure" | "Incomplete" | "First Down";

// ─── Full Snap Record ────────────────────────────────────────────────────────
// Contains both sides — offense and defense — for every snap logged.

export type FilmSnap = {
  id:              string;
  timestamp:       number;
  gameId:          string;
  opponentName:    string;
  snapNumber:      number;

  // Situation
  quarter:         number;        // 1-4
  clock:           string;        // "14:32"
  down:            number;        // 1-4
  distance:        number;        // yards
  hash:            FieldHash;
  scoreUser:       number;
  scoreOpponent:   number;

  // Offense (your side)
  offTeam:         string;
  offFormation:    string;
  offPlay:         string;
  offPlayType:     "Run" | "Pass" | "Scramble" | "Penalty";
  offMotion:       boolean;
  offHotRoutes:    boolean;
  offConcept:      string;        // e.g. "Mesh", "Flood", "Smash"
  primaryRead:     string;
  secondRead:      string;
  thirdRead:       string;
  checkdown:       string;

  // Defense (opponent side)
  defTeam:         string;
  defPlaybook:     string;
  defFormation:    string;
  defPlayName:     string;
  defCoverage:     string;
  defShell:        string;
  defFront:        string;
  defUser:         string;
  defBlitz:        boolean;
  defBlitzType:    string;
  defAdjustments:  string[];
  defPressure:     boolean;
  defCoverageRotation: string;

  // Result
  result:          SnapResult;
  yardsGained:     number;
  td:              boolean;
  firstDown:       boolean;
  turnover:        boolean;
  sack:            boolean;
  pressureTime:    string;        // "1.8s"
  passTime:        string;        // "2.4s"
  explosivePlay:   boolean;       // 20+ yard gain
  epa:             number | null; // expected points added (optional)
  successRate:     boolean;       // 50%+ of needed yards on 1st, 70% on 2nd, 100% on 3rd/4th

  // Engine data
  eliminationInputs:  EliminationInputs | null;
  eliminationResult:  EliminationResult | null;
  userCorrection:     Partial<EliminationInputs> | null;
  enginePrediction:   string;     // "Mid Blitz (87%)"
  actualPlay:         string;     // What it actually was (user-confirmed)
};

// ─── Store ────────────────────────────────────────────────────────────────────

export type FilmStore = {
  snaps: FilmSnap[];
  games: GameRecord[];
};

export type GameRecord = {
  gameId:       string;
  opponentName: string;
  date:         number;
  snapCount:    number;
  result:       "Win" | "Loss" | "In Progress";
};

function load(): FilmStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { snaps: [], games: [] };
    return JSON.parse(raw) as FilmStore;
  } catch {
    return { snaps: [], games: [] };
  }
}

function save(store: FilmStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* storage full — silently ignore */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAllSnaps(): FilmSnap[] {
  return load().snaps;
}

export function getSnapsByGame(gameId: string): FilmSnap[] {
  return load().snaps.filter(s => s.gameId === gameId);
}

export function getSnapsByOpponent(opponentName: string): FilmSnap[] {
  return load().snaps.filter(s => s.opponentName.toLowerCase() === opponentName.toLowerCase());
}

export function addSnap(snap: FilmSnap): void {
  const store = load();
  store.snaps = [...store.snaps, snap];

  // Update or create game record
  const existing = store.games.find(g => g.gameId === snap.gameId);
  if (existing) {
    existing.snapCount++;
  } else {
    store.games.push({
      gameId:       snap.gameId,
      opponentName: snap.opponentName,
      date:         snap.timestamp,
      snapCount:    1,
      result:       "In Progress",
    });
  }

  save(store);
}

export function updateSnap(id: string, patch: Partial<FilmSnap>): void {
  const store = load();
  store.snaps = store.snaps.map(s => s.id === id ? { ...s, ...patch } : s);
  save(store);
}

export function deleteSnap(id: string): void {
  const store = load();
  store.snaps = store.snaps.filter(s => s.id !== id);
  save(store);
}

export function getAllGames(): GameRecord[] {
  return load().games;
}

export function clearGame(gameId: string): void {
  const store = load();
  store.snaps = store.snaps.filter(s => s.gameId !== gameId);
  store.games = store.games.filter(g => g.gameId !== gameId);
  save(store);
}

export function clearAll(): void {
  save({ snaps: [], games: [] });
}

// ─── Snap Factory ─────────────────────────────────────────────────────────────

export function makeSnapId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function makeGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createBlankSnap(gameId: string, opponentName: string, snapNumber: number): FilmSnap {
  return {
    id:                  makeSnapId(),
    timestamp:           Date.now(),
    gameId,
    opponentName,
    snapNumber,
    quarter:             1,
    clock:               "15:00",
    down:                1,
    distance:            10,
    hash:                "Middle",
    scoreUser:           0,
    scoreOpponent:       0,
    offTeam:             "Me",
    offFormation:        "",
    offPlay:             "",
    offPlayType:         "Pass",
    offMotion:           false,
    offHotRoutes:        false,
    offConcept:          "",
    primaryRead:         "",
    secondRead:          "",
    thirdRead:           "",
    checkdown:           "",
    defTeam:             opponentName,
    defPlaybook:         "All",
    defFormation:        "",
    defPlayName:         "",
    defCoverage:         "",
    defShell:            "",
    defFront:            "",
    defUser:             "Unknown",
    defBlitz:            false,
    defBlitzType:        "None",
    defAdjustments:      [],
    defPressure:         false,
    defCoverageRotation: "",
    result:              "Success",
    yardsGained:         0,
    td:                  false,
    firstDown:           false,
    turnover:            false,
    sack:                false,
    pressureTime:        "",
    passTime:            "",
    explosivePlay:       false,
    epa:                 null,
    successRate:         false,
    eliminationInputs:   null,
    eliminationResult:   null,
    userCorrection:      null,
    enginePrediction:    "",
    actualPlay:          "",
  };
}
