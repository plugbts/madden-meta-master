// ─── Session Persistence Store ────────────────────────────────────────────────
// Prevents data loss during active analysis sessions.
// Survives page refresh. Cleared on explicit session end.

const SESSION_KEY = "debunked_active_session_v1";

export type SessionState = {
  // Active scout session
  scoutOpponentName: string;
  scoutGameId: string;
  scoutSnaps: Array<{
    coverageId: string;
    coverageName: string;
    situation: string;
    userPosition?: string;
    down?: number;
    distance?: number;
  }>;

  // Film analysis session
  filmGameId: string;
  filmOpponentName: string;
  filmSnapIndex: number;
  filmAnalysisProgress: number;

  // Last active tab
  lastTab: string;

  // Timestamp
  savedAt: number;
};

const defaultSession: SessionState = {
  scoutOpponentName: "",
  scoutGameId: "",
  scoutSnaps: [],
  filmGameId: "",
  filmOpponentName: "",
  filmSnapIndex: 0,
  filmAnalysisProgress: 0,
  lastTab: "film",
  savedAt: 0,
};

function load(): SessionState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { ...defaultSession };
    return { ...defaultSession, ...JSON.parse(raw) } as SessionState;
  } catch {
    return { ...defaultSession };
  }
}

function save(state: SessionState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

export function getSession(): SessionState {
  return load();
}

export function patchSession(patch: Partial<SessionState>): void {
  const current = load();
  save({ ...current, ...patch });
}

export function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function hasActiveSession(): boolean {
  const s = load();
  return s.scoutSnaps.length > 0 || s.filmOpponentName !== "";
}
