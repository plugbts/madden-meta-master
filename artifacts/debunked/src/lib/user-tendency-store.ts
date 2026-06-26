// ─── User Tendency Engine ─────────────────────────────────────────────────────
// Tracks user position and behavioral patterns across analyzed games.
// All data stored in localStorage. Pure functions — no React.

// ─── Position Types ───────────────────────────────────────────────────────────

export type UserPosition = "MLB" | "Safety" | "Corner" | "D-Line" | "Unknown";

export const USER_POSITION_LABELS: Record<UserPosition, string> = {
  MLB:     "Middle Linebacker",
  Safety:  "Safety",
  Corner:  "Cornerback",
  "D-Line":"Defensive Lineman",
  Unknown: "Unknown",
};

// ─── Behavior Types ───────────────────────────────────────────────────────────

export type BehaviorType =
  | "chases_first_crosser"
  | "overcommits_deep"
  | "ignores_rb_routes"
  | "shades_middle"
  | "blitz_frequency"
  | "click_on_aggression";

export const BEHAVIOR_LABELS: Record<BehaviorType, string> = {
  chases_first_crosser:  "Chases First Crosser",
  overcommits_deep:      "Overcommits to Deep Routes",
  ignores_rb_routes:     "Ignores RB Routes",
  shades_middle:         "Shades Middle",
  blitz_frequency:       "Blitz Frequency",
  click_on_aggression:   "Click-On Aggression",
};

export const BEHAVIOR_DESCRIPTIONS: Record<BehaviorType, string> = {
  chases_first_crosser:  "Frequently bites on the first crossing route, losing assignment",
  overcommits_deep:      "Drifts too far back, yielding short/intermediate windows",
  ignores_rb_routes:     "Does not account for running back checkdowns or routes",
  shades_middle:         "Consistently cheats toward the middle of the field",
  blitz_frequency:       "Calls blitz at a high rate regardless of situation",
  click_on_aggression:   "Clicks to control defender aggressively, breaking assignment",
};

export type BehaviorSeverity = "Low" | "Moderate" | "High" | "Critical";

// ─── Event & Profile Types ────────────────────────────────────────────────────

export type BehaviorEvent = {
  id: string;
  type: BehaviorType;
  timestamp: number;
  gameId: string;
  snapId: string;
  position: UserPosition;
  /** Optional context: formation, down, distance, play result, etc. */
  context: Record<string, unknown>;
};

export type TrendData = {
  occurrences: number;
  totalSnaps: number;
  /** Rate 0-1 */
  rate: number;
  severity: BehaviorSeverity;
  trend: "Increasing" | "Decreasing" | "Stable" | "Insufficient data";
  recentRate: number; // rate over last 10 snaps
  lastSeen: number | null;
};

export type GameSession = {
  id: string;
  label: string;         // e.g. "vs Cowboys - Week 3"
  opponent: string;
  timestamp: number;
  snapsAnalyzed: number;
  position: UserPosition;
  eventIds: string[];    // IDs of BehaviorEvents from this session
};

export type UserProfile = {
  /** Persisted profile ID — generated once */
  profileId: string;
  displayName: string;
  position: UserPosition;
  gamesAnalyzed: number;
  totalSnapsAnalyzed: number;
  createdAt: number;
  updatedAt: number;
  sessions: GameSession[];
  events: BehaviorEvent[];
  /** Computed and stored for quick access */
  trends: Record<BehaviorType, TrendData>;
};

export type TendencyStore = {
  profiles: UserProfile[];
  activeProfileId: string | null;
};

// ─── AI Payload ───────────────────────────────────────────────────────────────

export type TendencyAiPayload = {
  schemaVersion: "user-tendency/v1";
  timestamp: number;
  profileId: string;
  position: UserPosition;
  gamesAnalyzed: number;
  totalSnaps: number;
  behaviors: {
    type: BehaviorType;
    label: string;
    rate: number;
    severity: BehaviorSeverity;
    trend: TrendData["trend"];
  }[];
  primaryWeakness: BehaviorType | null;
  counters: string[];  // suggested exploits for this tendency profile
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORE_KEY = "debunked_tendency_v1";

function load(): TendencyStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { profiles: [], activeProfileId: null };
    return JSON.parse(raw) as TendencyStore;
  } catch {
    return { profiles: [], activeProfileId: null };
  }
}

function save(store: TendencyStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable
  }
}

// ─── Trend Computation ────────────────────────────────────────────────────────

function computeSeverity(rate: number): BehaviorSeverity {
  if (rate >= 0.6) return "Critical";
  if (rate >= 0.4) return "High";
  if (rate >= 0.2) return "Moderate";
  return "Low";
}

function computeTrend(
  events: BehaviorEvent[],
  type: BehaviorType,
  totalSnaps: number
): TrendData {
  const relevant = events
    .filter((e) => e.type === type)
    .sort((a, b) => a.timestamp - b.timestamp);

  const occurrences = relevant.length;
  const rate = totalSnaps > 0 ? occurrences / totalSnaps : 0;

  // Recent: last 10 events (any type) — what is this behavior's rate in recent window?
  // We approximate with the last 20 events of any type to estimate recent density
  const recentEvents = events.slice(-20);
  const recentTotal = recentEvents.length;
  const recentOccurrences = recentEvents.filter((e) => e.type === type).length;
  const recentRate = recentTotal > 0 ? recentOccurrences / recentTotal : 0;

  let trend: TrendData["trend"] = "Insufficient data";
  if (occurrences >= 6) {
    const diff = recentRate - rate;
    if (Math.abs(diff) < 0.05) trend = "Stable";
    else if (diff > 0.05) trend = "Increasing";
    else trend = "Decreasing";
  }

  return {
    occurrences,
    totalSnaps,
    rate,
    severity: computeSeverity(rate),
    trend,
    recentRate,
    lastSeen: relevant.length > 0 ? relevant[relevant.length - 1].timestamp : null,
  };
}

function recomputeTrends(profile: UserProfile): Record<BehaviorType, TrendData> {
  const behaviors: BehaviorType[] = [
    "chases_first_crosser",
    "overcommits_deep",
    "ignores_rb_routes",
    "shades_middle",
    "blitz_frequency",
    "click_on_aggression",
  ];
  const trends = {} as Record<BehaviorType, TrendData>;
  for (const b of behaviors) {
    trends[b] = computeTrend(profile.events, b, profile.totalSnapsAnalyzed);
  }
  return trends;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getStore(): TendencyStore {
  return load();
}

export function getActiveProfile(): UserProfile | null {
  const store = load();
  if (!store.activeProfileId) return null;
  return store.profiles.find((p) => p.profileId === store.activeProfileId) ?? null;
}

export function createProfile(params: {
  displayName: string;
  position: UserPosition;
}): UserProfile {
  const store = load();

  const emptyTrends = Object.fromEntries(
    (["chases_first_crosser","overcommits_deep","ignores_rb_routes","shades_middle","blitz_frequency","click_on_aggression"] as BehaviorType[])
      .map((b) => [b, { occurrences: 0, totalSnaps: 0, rate: 0, severity: "Low" as BehaviorSeverity, trend: "Insufficient data" as const, recentRate: 0, lastSeen: null }])
  ) as Record<BehaviorType, TrendData>;

  const profile: UserProfile = {
    profileId: `prof-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    displayName: params.displayName,
    position: params.position,
    gamesAnalyzed: 0,
    totalSnapsAnalyzed: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessions: [],
    events: [],
    trends: emptyTrends,
  };

  store.profiles.push(profile);
  store.activeProfileId = profile.profileId;
  save(store);
  return profile;
}

export function setActiveProfile(profileId: string): boolean {
  const store = load();
  const exists = store.profiles.some((p) => p.profileId === profileId);
  if (!exists) return false;
  store.activeProfileId = profileId;
  save(store);
  return true;
}

export function updatePosition(profileId: string, position: UserPosition): void {
  const store = load();
  const profile = store.profiles.find((p) => p.profileId === profileId);
  if (!profile) return;
  profile.position = position;
  profile.updatedAt = Date.now();
  save(store);
}

export function startSession(params: {
  profileId: string;
  label: string;
  opponent: string;
  position: UserPosition;
}): GameSession {
  const store = load();
  const profile = store.profiles.find((p) => p.profileId === params.profileId);
  if (!profile) throw new Error(`Profile ${params.profileId} not found`);

  const session: GameSession = {
    id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: params.label,
    opponent: params.opponent,
    timestamp: Date.now(),
    snapsAnalyzed: 0,
    position: params.position,
    eventIds: [],
  };

  profile.sessions.push(session);
  profile.gamesAnalyzed += 1;
  profile.updatedAt = Date.now();
  save(store);
  return session;
}

export function logBehaviorEvent(params: {
  profileId: string;
  sessionId: string;
  snapId: string;
  type: BehaviorType;
  context?: Record<string, unknown>;
}): BehaviorEvent {
  const store = load();
  const profile = store.profiles.find((p) => p.profileId === params.profileId);
  if (!profile) throw new Error(`Profile ${params.profileId} not found`);

  const session = profile.sessions.find((s) => s.id === params.sessionId);

  const event: BehaviorEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: params.type,
    timestamp: Date.now(),
    gameId: params.sessionId,
    snapId: params.snapId,
    position: profile.position,
    context: params.context ?? {},
  };

  profile.events.push(event);
  // Keep last 2000 events
  if (profile.events.length > 2000) {
    profile.events = profile.events.slice(-2000);
  }

  if (session) {
    session.eventIds.push(event.id);
  }

  profile.updatedAt = Date.now();
  profile.trends = recomputeTrends(profile);
  save(store);
  return event;
}

export function incrementSnaps(profileId: string, sessionId: string, count = 1): void {
  const store = load();
  const profile = store.profiles.find((p) => p.profileId === profileId);
  if (!profile) return;

  const session = profile.sessions.find((s) => s.id === sessionId);
  if (session) session.snapsAnalyzed += count;
  profile.totalSnapsAnalyzed += count;
  profile.updatedAt = Date.now();
  profile.trends = recomputeTrends(profile);
  save(store);
}

export function getTendencyAiPayload(profile: UserProfile): TendencyAiPayload {
  const behaviors = (Object.entries(profile.trends) as [BehaviorType, TrendData][]).map(
    ([type, trend]) => ({
      type,
      label: BEHAVIOR_LABELS[type],
      rate: trend.rate,
      severity: trend.severity,
      trend: trend.trend,
    })
  );

  const highestBehavior = behaviors
    .filter((b) => b.rate > 0)
    .sort((a, b) => b.rate - a.rate)[0];

  const counters = highestBehavior ? BEHAVIOR_COUNTERS[highestBehavior.type] : [];

  return {
    schemaVersion: "user-tendency/v1",
    timestamp: Date.now(),
    profileId: profile.profileId,
    position: profile.position,
    gamesAnalyzed: profile.gamesAnalyzed,
    totalSnaps: profile.totalSnapsAnalyzed,
    behaviors,
    primaryWeakness: highestBehavior?.type ?? null,
    counters,
  };
}

export function deleteProfile(profileId: string): void {
  const store = load();
  store.profiles = store.profiles.filter((p) => p.profileId !== profileId);
  if (store.activeProfileId === profileId) {
    store.activeProfileId = store.profiles[0]?.profileId ?? null;
  }
  save(store);
}

// ─── Counter Suggestions ──────────────────────────────────────────────────────
// Maps each behavior to exploitable plays/concepts.

const BEHAVIOR_COUNTERS: Record<BehaviorType, string[]> = {
  chases_first_crosser: [
    "Mesh concept — second crosser is always open",
    "Sail / high-low — underneath floods vacated zone",
    "Drive concept — picks free second crosser",
    "Double crossers with delay — first crosser pulls user, second open",
  ],
  overcommits_deep: [
    "Screen passes — user is out of position underneath",
    "Quick slants / hitches — short completions before user reacts",
    "Bubble screen / WR screen concepts",
    "RB checkdown — user too deep to recover",
  ],
  ignores_rb_routes: [
    "RB wheel route — RB runs a full route with no coverage",
    "Texas route (RB delayed out to flat)",
    "Angle route — RB releases late into a vacated flat",
    "Y-cross with RB underneath — drag occupies user, RB open flat",
  ],
  shades_middle: [
    "Comeback routes — outside attack on boundary",
    "Four-verticals — stress the boundary deep",
    "Out routes to wide side — middle shade vacates outside",
    "Trips boundary — overload opposite of shade",
  ],
  blitz_frequency: [
    "Hot routes to the blitzing side",
    "Max protection — pick up blitzers and attack empty zone",
    "5-step quick game — release before blitz arrives",
    "RB delay — blitz-breaker when secondary is man",
  ],
  click_on_aggression: [
    "Motion to new alignment — user clicks new defender, original out of position",
    "Backfield motion — causes user to break coverage assignment",
    "Stack or bunch — forces user to choose a defender to click",
    "Pick routes — clicked defender runs into traffic",
  ],
};
