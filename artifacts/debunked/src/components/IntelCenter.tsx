import { useState, useEffect } from "react";
import {
  getAllTrackedOpponents,
  buildOpponentProfile,
  getGlobalStats,
  getAllCounterHistory,
  getAllCorrections,
  logCounterResult,
  type OpponentIntelProfile,
  type TrendWindow,
  type CounterRecord,
} from "@/lib/intel-db";
import { COVERAGES } from "@/lib/madden-data";

// ─── Colors ───────────────────────────────────────────────────────────────────

const BLUE   = "#78b4ff";
const GREEN  = "#6fdba8";
const GOLD   = "#ffc84a";
const PURPLE = "#e07fff";
const RED    = "#f26b6b";

function accentForRate(rate: number): string {
  if (rate >= 55) return RED;
  if (rate >= 35) return GOLD;
  return GREEN;
}

function directionColor(d: string): string {
  if (d === "increasing") return RED;
  if (d === "decreasing") return GREEN;
  return "rgba(255,255,255,0.4)";
}

function directionArrow(d: string): string {
  if (d === "increasing") return "↑";
  if (d === "decreasing") return "↓";
  return "→";
}

function confidenceStars(confidence: string, successRate: number): string {
  const stars = successRate >= 80 ? 5 : successRate >= 65 ? 4 : successRate >= 50 ? 3 : successRate >= 35 ? 2 : 1;
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2 flex flex-col gap-0.5 border"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span className="font-display font-black text-sm" style={{ color: accent ?? "rgba(255,255,255,0.9)" }}>{value}</span>
    </div>
  );
}

function TrendBar({ item, total, accent }: { item: { label: string; count: number; pct: number }; total: number; accent: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{item.label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{item.count}</span>
          <span className="font-mono text-[11px] font-bold" style={{ color: accent }}>{item.pct}%</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${item.pct}%`, background: accent, boxShadow: `0 0 6px ${accent}55` }}
        />
      </div>
    </div>
  );
}

function TrendWindowCard({ trend, accent }: { trend: TrendWindow; accent: string }) {
  return (
    <div
      className="rounded-lg p-3 space-y-3 border"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: accent }}>
          {trend.label}
        </span>
        <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          {trend.snapCount} snaps / {trend.gameCount} {trend.gameCount === 1 ? "game" : "games"}
        </span>
      </div>

      {trend.topCoverages.length > 0 ? (
        <div className="space-y-2">
          {trend.topCoverages.slice(0, 4).map((cov) => (
            <TrendBar key={cov.id} item={cov} total={trend.snapCount} accent={accent} />
          ))}
        </div>
      ) : (
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>No data for this window</p>
      )}

      <div className="flex gap-3 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: accentForRate(trend.blitzRate) }} />
          <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            Blitz {trend.blitzRate}%
          </span>
        </div>
        {trend.disguiseRate > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: PURPLE }} />
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              Disguise {trend.disguiseRate}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Counter Result Logger ────────────────────────────────────────────────────

function CounterResultLogger({ opponentName }: { opponentName: string }) {
  const [vsCoverage, setVsCoverage] = useState("");
  const [formation, setFormation] = useState("");
  const [play, setPlay] = useState("");
  const [yards, setYards] = useState("");
  const [success, setSuccess] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  function submit() {
    if (!vsCoverage || !formation || !play || yards === "" || success === null) return;
    logCounterResult({
      opponentName,
      vsCoverageId: vsCoverage,
      counterFormation: formation,
      counterPlay: play,
      yardsGained: parseFloat(yards),
      wasSuccessful: success,
    });
    setSaved(true);
    setVsCoverage(""); setFormation(""); setPlay(""); setYards(""); setSuccess(null);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${GREEN}30`, background: `${GREEN}06` }}>
      <p className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: GREEN }}>
        Log Counter Result
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Vs Coverage</label>
          <select
            value={vsCoverage}
            onChange={e => setVsCoverage(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none"
          >
            <option value="">— Coverage —</option>
            {COVERAGES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Formation</label>
          <input
            value={formation}
            onChange={e => setFormation(e.target.value)}
            placeholder="Gun Bunch"
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Play Name</label>
          <input
            value={play}
            onChange={e => setPlay(e.target.value)}
            placeholder="PA Y Shallow Cross"
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Yards Gained</label>
          <input
            type="number"
            value={yards}
            onChange={e => setYards(e.target.value)}
            placeholder="14"
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Result:</span>
        <button
          onClick={() => setSuccess(true)}
          className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition"
          style={{
            background: success === true ? `${GREEN}20` : "transparent",
            borderColor: success === true ? GREEN : "rgba(255,255,255,0.12)",
            color: success === true ? GREEN : "rgba(255,255,255,0.45)",
          }}
        >
          ✓ Worked
        </button>
        <button
          onClick={() => setSuccess(false)}
          className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition"
          style={{
            background: success === false ? `${RED}20` : "transparent",
            borderColor: success === false ? RED : "rgba(255,255,255,0.12)",
            color: success === false ? RED : "rgba(255,255,255,0.45)",
          }}
        >
          ✗ Failed
        </button>
        <button
          onClick={submit}
          disabled={!vsCoverage || !formation || !play || yards === "" || success === null}
          className="ml-auto rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition"
          style={{
            background: saved ? `${GREEN}20` : "rgba(255,255,255,0.06)",
            borderColor: saved ? GREEN : "rgba(255,255,255,0.12)",
            color: saved ? GREEN : "rgba(255,255,255,0.7)",
          }}
        >
          {saved ? "Saved ✓" : "Log Result"}
        </button>
      </div>
    </div>
  );
}

// ─── Opponent Profile Panel ───────────────────────────────────────────────────

function OpponentProfilePanel({ profile, onBack }: { profile: OpponentIntelProfile; onBack: () => void }) {
  const [activeWindow, setActiveWindow] = useState<"last3" | "last5" | "last10" | "lifetime">("last3");
  const [showCounterLogger, setShowCounterLogger] = useState(false);

  const trendToShow = profile.trends.find(t => t.window === activeWindow) ?? profile.trends[profile.trends.length - 1];
  const lifetimeTrend = profile.trends.find(t => t.window === "lifetime")!;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" }}
        >
          ← Back
        </button>
        <div>
          <h2 className="font-display font-black text-xl" style={{ color: BLUE }}>
            {profile.opponentName}
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            {profile.gamesAnalyzed} {profile.gamesAnalyzed === 1 ? "game" : "games"} · {profile.totalSnaps} snaps · Last seen {timeAgo(profile.lastSeen)}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill label="Total Snaps" value={profile.totalSnaps} accent={BLUE} />
        <StatPill label="Games" value={profile.gamesAnalyzed} accent={BLUE} />
        <StatPill label="Blitz Rate" value={`${profile.blitzRate}%`} accent={accentForRate(profile.blitzRate)} />
        <StatPill label="Disguise Rate" value={`${profile.disguiseRate}%`} accent={PURPLE} />
      </div>

      {/* Trend Insights */}
      {profile.insights.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Trend Intelligence
          </p>
          {profile.insights.map((insight, i) => (
            <div
              key={i}
              className="rounded-xl border p-3 space-y-2"
              style={{
                borderColor: `${directionColor(insight.direction)}30`,
                background: `${directionColor(insight.direction)}08`,
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider font-bold" style={{ color: directionColor(insight.direction) }}>
                  {directionArrow(insight.direction)} {insight.metric}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Lifetime: {insight.lifetimeLabel}
                  </span>
                  <span className="font-mono text-[10px] font-bold" style={{ color: directionColor(insight.direction) }}>
                    Recent: {insight.recentLabel}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{insight.insight}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend Windows Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Coverage Trends
          </p>
          <div className="flex gap-1">
            {(["last3", "last5", "last10", "lifetime"] as const).map(w => {
              const labels = { last3: "L3", last5: "L5", last10: "L10", lifetime: "All" };
              return (
                <button
                  key={w}
                  onClick={() => setActiveWindow(w)}
                  className="rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider border transition"
                  style={{
                    background: activeWindow === w ? `${BLUE}22` : "transparent",
                    borderColor: activeWindow === w ? `${BLUE}55` : "rgba(255,255,255,0.1)",
                    color: activeWindow === w ? BLUE : "rgba(255,255,255,0.35)",
                  }}
                >
                  {labels[w]}
                </button>
              );
            })}
          </div>
        </div>
        <TrendWindowCard trend={trendToShow} accent={BLUE} />
      </div>

      {/* Situational Tendencies */}
      {(profile.redZoneCoverages.length > 0 || profile.thirdDownCoverages.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {profile.redZoneCoverages.length > 0 && (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${RED}25`, background: `${RED}05` }}>
              <p className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: RED }}>Red Zone</p>
              <div className="space-y-2">
                {profile.redZoneCoverages.map(c => (
                  <TrendBar key={c.id} item={c} total={100} accent={RED} />
                ))}
              </div>
            </div>
          )}
          {profile.thirdDownCoverages.length > 0 && (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${GOLD}25`, background: `${GOLD}05` }}>
              <p className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: GOLD }}>3rd Down</p>
              <div className="space-y-2">
                {profile.thirdDownCoverages.map(c => (
                  <TrendBar key={c.id} item={c} total={100} accent={GOLD} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Best Historical Counters */}
      {profile.counterHistory.length > 0 && (
        <div className="space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Best Historical Counters
          </p>
          <div className="space-y-2">
            {profile.counterHistory.slice(0, 6).map((c, i) => (
              <div
                key={i}
                className="rounded-xl border p-3 flex items-center gap-3"
                style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
              >
                <span className="text-sm" style={{ color: GOLD }}>
                  {confidenceStars(c.confidence, c.successRate)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{c.counterLabel}</p>
                  <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>vs {c.vsCoverageName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[11px] font-bold" style={{ color: c.successRate >= 65 ? GREEN : c.successRate >= 45 ? GOLD : RED }}>
                    {c.successRate}%
                  </p>
                  <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {c.avgYards}y avg · {c.uses} uses
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Base Counters */}
      {profile.bestCounters.length > 0 && (
        <div className="space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Counter Recommendations (vs {profile.favoriteCoverages[0]?.label ?? "Top Coverage"})
          </p>
          <div className="space-y-2">
            {profile.bestCounters.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="rounded-xl border p-3 flex items-center gap-3"
                style={{
                  borderColor: c.tier === "A+" ? `${GREEN}30` : c.tier === "A" ? `${GOLD}25` : "rgba(255,255,255,0.07)",
                  background: c.tier === "A+" ? `${GREEN}06` : c.tier === "A" ? `${GOLD}05` : "rgba(255,255,255,0.02)",
                }}
              >
                <span
                  className="font-mono text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: c.tier === "A+" ? `${GREEN}22` : c.tier === "A" ? `${GOLD}22` : "rgba(255,255,255,0.08)",
                    color: c.tier === "A+" ? GREEN : c.tier === "A" ? GOLD : "rgba(255,255,255,0.5)",
                    border: `1px solid ${c.tier === "A+" ? `${GREEN}44` : c.tier === "A" ? `${GOLD}44` : "rgba(255,255,255,0.12)"}`,
                  }}
                >
                  {c.tier}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {c.formation} — {c.play}
                  </p>
                  <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{c.read}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Defender Preference */}
      {profile.favoriteUserPositions.length > 0 && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${PURPLE}25`, background: `${PURPLE}05` }}>
          <p className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: PURPLE }}>
            Opponent User Defender Preference
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.favoriteUserPositions.map(p => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg px-3 py-1.5 border" style={{ borderColor: `${PURPLE}30`, background: `${PURPLE}10` }}>
                <span className="font-mono text-[10px] font-bold" style={{ color: PURPLE }}>{p.label}</span>
                <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{p.pct}%</span>
              </div>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {profile.favoriteUserPositions[0]?.label === "FS" && "User free safety — attack boundary seams, don't throw to the middle."}
            {profile.favoriteUserPositions[0]?.label === "MLB" && "User MLB — avoid crossers and drags. Attack the perimeter and look him off."}
            {profile.favoriteUserPositions[0]?.label === "SS" && "User strong safety — flood the flat away from his side."}
            {profile.favoriteUserPositions[0]?.label === "CB" && "User corner — motion to create leverage. Back-shoulder fades always available."}
          </p>
        </div>
      )}

      {/* Log Counter Result */}
      <div className="space-y-2">
        <button
          onClick={() => setShowCounterLogger(s => !s)}
          className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition"
          style={{ borderColor: `${GREEN}35`, color: GREEN, background: showCounterLogger ? `${GREEN}12` : "transparent" }}
        >
          {showCounterLogger ? "▲ Close" : "+ Log Counter Result"}
        </button>
        {showCounterLogger && <CounterResultLogger opponentName={profile.opponentName} />}
      </div>
    </div>
  );
}

// ─── Global Counter History ───────────────────────────────────────────────────

function GlobalCounterHistory() {
  const counters = getAllCounterHistory();
  if (counters.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
          No Counter Results Logged
        </p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Open an opponent profile and use "Log Counter Result" after each play to build your success database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {counters.slice(0, 12).map((c, i) => (
        <div key={i} className="rounded-xl border p-3 flex items-center gap-3"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <div className="w-10 text-center shrink-0">
            <span className="font-display font-black text-base" style={{ color: c.successRate >= 65 ? GREEN : c.successRate >= 45 ? GOLD : RED }}>
              {c.successRate}%
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{c.counterLabel}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>vs {c.vsCoverageName}</span>
              <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>{c.uses} uses · {c.avgYards}y avg</span>
            </div>
          </div>
          <span
            className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              background: c.confidence === "High" ? `${GREEN}18` : c.confidence === "Medium" ? `${GOLD}18` : "rgba(255,255,255,0.06)",
              color: c.confidence === "High" ? GREEN : c.confidence === "Medium" ? GOLD : "rgba(255,255,255,0.35)",
              border: `1px solid ${c.confidence === "High" ? `${GREEN}35` : c.confidence === "Medium" ? `${GOLD}35` : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {c.confidence}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Self-Learning Panel ──────────────────────────────────────────────────────

function SelfLearningPanel() {
  const corrections = getAllCorrections();
  if (corrections.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
          No Corrections Logged
        </p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          When the engine mis-identifies a coverage and you correct it, the correction is stored here to improve future recognition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {corrections.map((c, i) => (
        <div key={i} className="rounded-xl border p-3 flex items-center gap-3"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>AI: <span style={{ color: RED }}>{c.aiPrediction}</span></span>
              <span style={{ color: "rgba(255,255,255,0.25)" }}>→</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Corrected: <span style={{ color: GREEN }}>{c.userCorrection}</span></span>
            </div>
            <p className="font-mono text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
              {timeAgo(c.lastSeen)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-mono text-xs font-bold" style={{ color: GOLD }}>{c.count}×</span>
            <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>occurrences</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type IntelView = "dashboard" | "opponent" | "counters" | "learning";

export function IntelCenter() {
  const [view, setView] = useState<IntelView>("dashboard");
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [profile, setProfile] = useState<OpponentIntelProfile | null>(null);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [stats, setStats] = useState(getGlobalStats());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setOpponents(getAllTrackedOpponents());
    setStats(getGlobalStats());
  }, []);

  function openOpponent(name: string) {
    const p = buildOpponentProfile(name);
    setProfile(p);
    setSelectedOpponent(name);
    setView("opponent");
  }

  function handleBack() {
    setProfile(null);
    setSelectedOpponent(null);
    setView("dashboard");
    setOpponents(getAllTrackedOpponents());
    setStats(getGlobalStats());
  }

  const filtered = opponents.filter(o => o.toLowerCase().includes(searchQuery.toLowerCase()));

  const NAV_TABS: Array<{ id: IntelView; label: string; accent: string }> = [
    { id: "dashboard", label: "Opponent Intel", accent: BLUE },
    { id: "counters",  label: "Counter History", accent: GREEN },
    { id: "learning",  label: "Self-Learning", accent: PURPLE },
  ];

  return (
    <div className="space-y-6">
      {/* Global Stats Bar */}
      <div className="rounded-xl border p-4" style={{ borderColor: `${BLUE}25`, background: "rgba(120,180,255,0.04)" }}>
        <p className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: BLUE }}>
          Intelligence Database
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <StatPill label="Total Snaps" value={stats.totalSnaps} accent={BLUE} />
          <StatPill label="Games" value={stats.totalGames} accent={BLUE} />
          <StatPill label="Opponents" value={stats.totalOpponents} accent={BLUE} />
          <StatPill label="Blitz Rate" value={`${stats.globalBlitzRate}%`} accent={accentForRate(stats.globalBlitzRate)} />
          <StatPill label="Counter Logs" value={stats.totalCounterResults} accent={GREEN} />
          <StatPill label="Corrections" value={stats.totalCorrections} accent={PURPLE} />
        </div>
        {stats.topCoverage && (
          <p className="mt-2 font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Most logged coverage: <span style={{ color: GOLD }}>{stats.topCoverage}</span>
          </p>
        )}
      </div>

      {/* Inner Navigation */}
      {view !== "opponent" && (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {NAV_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className="shrink-0 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider border transition"
              style={{
                background: view === t.id ? `${t.accent}18` : "transparent",
                borderColor: view === t.id ? `${t.accent}45` : "rgba(255,255,255,0.1)",
                color: view === t.id ? t.accent : "rgba(255,255,255,0.4)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Dashboard: Opponent List */}
      {view === "dashboard" && (
        <div className="space-y-4">
          {opponents.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
              <p className="font-display font-black text-lg" style={{ color: "rgba(255,255,255,0.2)" }}>No Opponents Tracked</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                Scout an opponent using the Scout tab. Every game you analyze builds permanent intelligence here.
              </p>
            </div>
          ) : (
            <>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search opponent..."
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1"
                style={{ "--tw-ring-color": BLUE } as React.CSSProperties}
              />
              <div className="space-y-2">
                {filtered.map(name => {
                  const p = buildOpponentProfile(name);
                  if (!p) return null;
                  const topCov = p.favoriteCoverages[0];
                  return (
                    <button
                      key={name}
                      onClick={() => openOpponent(name)}
                      className="w-full rounded-xl border p-4 text-left transition hover:border-white/20 group"
                      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-black text-sm group-hover:text-white transition" style={{ color: BLUE }}>
                              {p.opponentName}
                            </span>
                            {p.insights.length > 0 && (
                              <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                                style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}35` }}>
                                Trend Shift
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                              {p.gamesAnalyzed} {p.gamesAnalyzed === 1 ? "game" : "games"} · {p.totalSnaps} snaps
                            </span>
                            {topCov && (
                              <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                                Favors: <span style={{ color: GOLD }}>{topCov.label}</span> ({topCov.pct}%)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-xs font-bold" style={{ color: accentForRate(p.blitzRate) }}>
                            {p.blitzRate}% Blitz
                          </p>
                          <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {timeAgo(p.lastSeen)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Opponent Profile */}
      {view === "opponent" && profile && (
        <OpponentProfilePanel profile={profile} onBack={handleBack} />
      )}

      {/* Counter History */}
      {view === "counters" && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: `${GREEN}25`, background: `${GREEN}05` }}>
            <p className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: GREEN }}>Counter Success Database</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Track which plays work against specific coverages. Open an opponent profile to log counter results.
            </p>
          </div>
          <GlobalCounterHistory />
        </div>
      )}

      {/* Self-Learning */}
      {view === "learning" && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: `${PURPLE}25`, background: `${PURPLE}05` }}>
            <p className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: PURPLE }}>Self-Learning Database</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Every time you correct the engine's coverage prediction, the correction is stored here. High-frequency corrections strengthen future recognition accuracy.
            </p>
          </div>
          <SelfLearningPanel />
        </div>
      )}
    </div>
  );
}
