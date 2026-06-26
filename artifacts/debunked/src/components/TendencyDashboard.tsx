// ─── User Tendency Dashboard ──────────────────────────────────────────────────
// Profiles the user's defensive tendencies and behavioral patterns.
// Tracks position, behaviors, and trend data across analyzed games.

import { useState, useEffect, useCallback } from "react";
import {
  createProfile,
  getStore,
  getActiveProfile,
  setActiveProfile,
  updatePosition,
  logBehaviorEvent,
  incrementSnaps,
  startSession,
  deleteProfile,
  getTendencyAiPayload,
  BEHAVIOR_LABELS,
  BEHAVIOR_DESCRIPTIONS,
  USER_POSITION_LABELS,
  type UserProfile,
  type UserPosition,
  type BehaviorType,
  type TrendData,
  type BehaviorSeverity,
} from "@/lib/user-tendency-store";

// Re-export counters for use in component
const COUNTERS: Record<BehaviorType, string[]> = {
  chases_first_crosser: ["Mesh concept", "Sail / high-low", "Drive concept", "Double crossers with delay"],
  overcommits_deep: ["Screen passes", "Quick slants / hitches", "Bubble screen", "RB checkdown"],
  ignores_rb_routes: ["RB wheel route", "Texas route", "Angle route", "Y-cross with RB underneath"],
  shades_middle: ["Comeback routes", "Four-verticals", "Out routes to wide side", "Trips boundary"],
  blitz_frequency: ["Hot routes", "Max protection", "5-step quick game", "RB delay"],
  click_on_aggression: ["Motion", "Backfield motion", "Stack or bunch", "Pick routes"],
};

const USER_POSITIONS: UserPosition[] = ["MLB", "Safety", "Corner", "D-Line", "Unknown"];
const BEHAVIOR_TYPES: BehaviorType[] = [
  "chases_first_crosser", "overcommits_deep", "ignores_rb_routes",
  "shades_middle", "blitz_frequency", "click_on_aggression",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function severityColor(s: BehaviorSeverity): string {
  switch (s) {
    case "Critical": return "text-destructive";
    case "High":     return "text-orange-400";
    case "Moderate": return "text-accent-1";
    default:         return "text-team-two";
  }
}

function severityBg(s: BehaviorSeverity): string {
  switch (s) {
    case "Critical": return "border-destructive/30 bg-destructive/8";
    case "High":     return "border-orange-400/30 bg-orange-400/8";
    case "Moderate": return "border-accent-1/30 bg-accent-1/8";
    default:         return "border-team-two/20 bg-team-two/5";
  }
}

function trendIcon(trend: TrendData["trend"]): string {
  switch (trend) {
    case "Increasing": return "↑";
    case "Decreasing": return "↓";
    case "Stable":     return "→";
    default:           return "—";
  }
}

function trendColor(trend: TrendData["trend"]): string {
  if (trend === "Increasing") return "text-destructive";
  if (trend === "Decreasing") return "text-team-two";
  if (trend === "Stable") return "text-accent-1";
  return "text-muted-foreground";
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onCreate }: { onCreate: (p: UserProfile) => void }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState<UserPosition>("Safety");

  function handleCreate() {
    if (!name.trim()) return;
    const p = createProfile({ displayName: name.trim(), position });
    onCreate(p);
  }

  return (
    <div className="max-w-sm mx-auto py-12 space-y-6">
      <div className="text-center space-y-1">
        <h3 className="font-display text-lg font-bold">Create Tendency Profile</h3>
        <p className="text-[12px] text-muted-foreground">
          Track your defensive tendencies across games. Build a behavioral dataset for AI analysis.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
            Display Name
          </label>
          <input
            className="w-full rounded border border-border/50 bg-card/60 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-team-one/50 focus:outline-none"
            placeholder="Your gamertag or name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
            Primary Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            {USER_POSITIONS.filter(p => p !== "Unknown").map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                className={`rounded border px-3 py-2 text-[12px] font-semibold transition-colors ${
                  position === p
                    ? "border-team-one/60 bg-team-one/15 text-team-one"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {USER_POSITION_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="w-full rounded border border-team-one/60 bg-team-one/15 py-2.5 text-[13px] font-bold uppercase tracking-wider text-team-one hover:bg-team-one/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Create Profile
        </button>
      </div>
    </div>
  );
}

// ─── Log Snap Panel ───────────────────────────────────────────────────────────
function LogSnapPanel({ profile, sessionId, onLog }: { profile: UserProfile; sessionId: string; onLog: () => void }) {
  const [selectedBehaviors, setSelectedBehaviors] = useState<Set<BehaviorType>>(new Set());
  const [logged, setLogged] = useState(false);

  function toggle(b: BehaviorType) {
    setSelectedBehaviors((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  }

  function handleLog() {
    const snapId = `snap-${Date.now()}`;
    for (const b of selectedBehaviors) {
      logBehaviorEvent({ profileId: profile.profileId, sessionId, snapId, type: b });
    }
    incrementSnaps(profile.profileId, sessionId, 1);
    setSelectedBehaviors(new Set());
    setLogged(true);
    setTimeout(() => setLogged(false), 1500);
    onLog();
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        Log Snap Behaviors
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {BEHAVIOR_TYPES.map((b) => (
          <button
            key={b}
            onClick={() => toggle(b)}
            title={BEHAVIOR_DESCRIPTIONS[b]}
            className={`text-left rounded px-2.5 py-2 text-[11px] font-medium border transition-colors ${
              selectedBehaviors.has(b)
                ? "border-team-one/60 bg-team-one/10 text-team-one"
                : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {BEHAVIOR_LABELS[b]}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <button
          onClick={handleLog}
          className="rounded border border-team-one/50 bg-team-one/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-team-one hover:bg-team-one/20 transition-colors"
        >
          {selectedBehaviors.size > 0 ? `Log Snap (${selectedBehaviors.size} behavior${selectedBehaviors.size !== 1 ? "s" : ""})` : "Log Clean Snap"}
        </button>
        {logged && (
          <span className="text-[11px] text-team-two animate-[var(--animate-fade-in)]">Logged ✓</span>
        )}
      </div>
    </div>
  );
}

// ─── Behavior Card ────────────────────────────────────────────────────────────
function BehaviorCard({ type, trend }: { type: BehaviorType; trend: TrendData }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(trend.rate * 100);

  if (trend.trend === "Insufficient data" && trend.occurrences === 0) {
    return null; // hide behaviors with no data yet
  }

  return (
    <div className={`rounded border p-3 space-y-2 ${severityBg(trend.severity)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-[12px] font-semibold text-foreground">{BEHAVIOR_LABELS[type]}</div>
          <div className="text-[10px] text-muted-foreground leading-relaxed">{BEHAVIOR_DESCRIPTIONS[type]}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-lg font-display font-bold ${severityColor(trend.severity)}`}>{pct}%</div>
          <div className={`text-[10px] font-bold ${trendColor(trend.trend)}`}>
            {trendIcon(trend.trend)} {trend.trend !== "Insufficient data" ? trend.trend : "—"}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            trend.severity === "Critical" ? "bg-destructive" :
            trend.severity === "High" ? "bg-orange-400" :
            trend.severity === "Moderate" ? "bg-accent-1" : "bg-team-two"
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{trend.occurrences} occurrence{trend.occurrences !== 1 ? "s" : ""} / {trend.totalSnaps} snaps</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-team-one/70 hover:text-team-one transition-colors"
        >
          {expanded ? "Hide counters ↑" : "Show counters ↓"}
        </button>
      </div>

      {expanded && (
        <div className="space-y-1 border-t border-border/20 pt-2 animate-[var(--animate-fade-in)]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
            Offensive Counters
          </div>
          {COUNTERS[type].map((c, i) => (
            <div key={i} className="flex gap-2 text-[11px] text-foreground/70">
              <span className="text-team-one shrink-0">→</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────
function ProfileView({
  profile,
  sessionId,
  onSessionStart,
  onSessionEnd,
  onRefresh,
}: {
  profile: UserProfile;
  sessionId: string | null;
  onSessionStart: (id: string) => void;
  onSessionEnd: () => void;
  onRefresh: () => void;
}) {
  const [sessionLabel, setSessionLabel] = useState("");
  const [opponent, setOpponent] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);

  const sortedBehaviors = BEHAVIOR_TYPES
    .map((b) => ({ type: b, trend: profile.trends[b] }))
    .filter(({ trend }) => trend.occurrences > 0)
    .sort((a, b) => b.trend.rate - a.trend.rate);

  const aiPayload = getTendencyAiPayload(profile);

  function startNewSession() {
    if (!opponent.trim()) return;
    const sess = startSession({
      profileId: profile.profileId,
      label: sessionLabel || `vs ${opponent}`,
      opponent: opponent.trim(),
      position: profile.position,
    });
    onSessionStart(sess.id);
    setShowNewSession(false);
    onRefresh();
  }

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="glass-card p-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-display text-xl font-bold">{profile.displayName}</div>
          <div className="text-[11px] text-muted-foreground">
            {USER_POSITION_LABELS[profile.position]} · {profile.gamesAnalyzed} game{profile.gamesAnalyzed !== 1 ? "s" : ""} · {profile.totalSnapsAnalyzed} snap{profile.totalSnapsAnalyzed !== 1 ? "s" : ""} analyzed
          </div>
          {aiPayload.primaryWeakness && (
            <div className="text-[11px] text-destructive font-semibold">
              Primary weakness: {BEHAVIOR_LABELS[aiPayload.primaryWeakness]}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <select
            value={profile.position}
            onChange={(e) => { updatePosition(profile.profileId, e.target.value as UserPosition); onRefresh(); }}
            className="rounded border border-border/40 bg-card/60 px-2 py-1 text-[11px] text-foreground focus:border-team-one/50 focus:outline-none"
          >
            {USER_POSITIONS.map((p) => (
              <option key={p} value={p}>{USER_POSITION_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Session controls */}
      <div className="space-y-2">
        {sessionId ? (
          <>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-team-two animate-pulse" />
              <div className="text-[12px] font-semibold text-team-two">Session active</div>
              <button
                onClick={() => { onSessionEnd(); onRefresh(); }}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                End session
              </button>
            </div>
            <LogSnapPanel profile={profile} sessionId={sessionId} onLog={onRefresh} />
          </>
        ) : (
          <div>
            {showNewSession ? (
              <div className="glass-card p-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  New Session
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded border border-border/40 bg-card/40 px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:border-team-one/50 focus:outline-none"
                    placeholder="Opponent *"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                  />
                  <input
                    className="flex-1 rounded border border-border/40 bg-card/40 px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:border-team-one/50 focus:outline-none"
                    placeholder="Label (optional)"
                    value={sessionLabel}
                    onChange={(e) => setSessionLabel(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={startNewSession}
                    disabled={!opponent.trim()}
                    className="rounded border border-team-one/50 bg-team-one/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-team-one hover:bg-team-one/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => setShowNewSession(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewSession(true)}
                className="rounded border border-border/40 bg-card/30 px-4 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                + Start New Game Session
              </button>
            )}
          </div>
        )}
      </div>

      {/* Behavior cards */}
      {sortedBehaviors.length > 0 ? (
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Tendency Profile
          </div>
          {sortedBehaviors.map(({ type, trend }) => (
            <BehaviorCard key={type} type={type} trend={trend} />
          ))}
        </div>
      ) : (
        <div className="glass-card p-6 text-center">
          <div className="text-[13px] text-muted-foreground">
            {profile.totalSnapsAnalyzed === 0
              ? "Start a session and log snap behaviors to build your tendency profile."
              : "No behaviors logged yet. Log some snaps in a session to see your tendencies."}
          </div>
        </div>
      )}

      {/* AI Export */}
      {profile.totalSnapsAnalyzed >= 5 && (
        <div className="glass-card p-3 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            AI Export Payload
          </div>
          <div className="text-[10px] text-muted-foreground">
            Structured data ready for AI analysis — {profile.totalSnapsAnalyzed} snaps, {profile.gamesAnalyzed} games.
          </div>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(aiPayload, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `tendency-${profile.displayName.replace(/\s+/g, "-").toLowerCase()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded border border-team-one/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-team-one/70 hover:text-team-one hover:border-team-one/60 transition-colors"
          >
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TendencyDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // sessionId lives here so ProfileView re-renders (not remounts) on refresh,
  // preserving the active session across snap logs.
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Version counter triggers a re-read from the store without remounting ProfileView.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const active = getActiveProfile();
    setProfile(active);
  }, [version]);

  function refresh() {
    // Re-read profile from store; ProfileView stays mounted, session survives.
    const active = getActiveProfile();
    setProfile(active ? { ...active } : null);
    setVersion((v) => v + 1);
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Tendency Engine</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Build a behavioral profile — track how you play defense across games
            </p>
          </div>
        </div>
        <SetupScreen
          onCreate={(p) => {
            setProfile(p);
            setSessionId(null);
            setVersion((v) => v + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Tendency Engine</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Track behavioral patterns across games — identify and exploit defensive tendencies
          </p>
        </div>
        <button
          onClick={() => {
            deleteProfile(profile.profileId);
            setProfile(null);
            setSessionId(null);
          }}
          className="text-[10px] text-muted-foreground/40 hover:text-destructive/70 transition-colors"
        >
          Reset profile
        </button>
      </div>
      {/* No key prop here — stable mount preserves sessionId across refreshes */}
      <ProfileView
        profile={profile}
        sessionId={sessionId}
        onSessionStart={setSessionId}
        onSessionEnd={() => setSessionId(null)}
        onRefresh={refresh}
      />
    </div>
  );
}
