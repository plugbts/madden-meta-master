// ─── Post-Snap Analyzer ───────────────────────────────────────────────────────
// Lets users log what happened after the snap, resolves actual coverage,
// detects disguises and rotations, and surfaces read opportunities.

import { useState, useCallback } from "react";
import {
  analyzePostSnap,
  POST_SNAP_SIGNALS,
  POST_SNAP_SIGNAL_CATEGORIES,
  POST_SNAP_SIGNAL_CATEGORY_LABELS,
  getPostSnapSignalsByCategory,
  type PostSnapInput,
  type PostSnapAnalysis,
  type PostSnapSignalCategory,
} from "@/lib/post-snap-engine";
import {
  saveAnalysis,
  getRecentAnalyses,
  getAllOpponentProfiles,
  type StoredAnalysis,
  type OpponentProfile,
} from "@/lib/post-snap-store";
import {
  COVERAGE_FAMILY_LABELS,
  type CoverageFamily,
} from "@/lib/coverage-recognition-engine";

// ─── Coverage families for pre-snap prediction selector ───────────────────────
const COVERAGE_FAMILIES: CoverageFamily[] = [
  "Cover2", "Cover3", "Cover4", "Cover6", "ManCoverage", "ZeroBlitz",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function confidenceColor(pct: number): string {
  if (pct >= 75) return "text-team-two";
  if (pct >= 55) return "text-accent-1";
  if (pct >= 35) return "text-orange-400";
  return "text-destructive";
}

function SignalToggle({
  id, name, description, selected, onToggle,
}: {
  id: string; name: string; description: string; selected: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      title={description}
      className={`w-full text-left rounded px-2.5 py-2 text-[11px] font-medium transition-all border ${
        selected
          ? "border-team-one/60 bg-team-one/10 text-team-one"
          : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      <span className={`mr-1.5 ${selected ? "text-team-one" : "text-muted-foreground/40"}`}>
        {selected ? "●" : "○"}
      </span>
      {name}
    </button>
  );
}

function CategorySection({
  category, selected, onToggle,
}: {
  category: PostSnapSignalCategory;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const signals = getPostSnapSignalsByCategory(category);
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 mb-1.5">
        {POST_SNAP_SIGNAL_CATEGORY_LABELS[category]}
      </div>
      {signals.map((s) => (
        <SignalToggle
          key={s.id}
          id={s.id}
          name={s.name}
          description={s.description}
          selected={selected.has(s.id)}
          onToggle={() => onToggle(s.id)}
        />
      ))}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function AnalysisResultCard({ result, onSave }: { result: PostSnapAnalysis; onSave: (r: PostSnapAnalysis) => void }) {
  const [opponent, setOpponent] = useState("");
  const [snapLabel, setSnapLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveAnalysis({
      analysis: result,
      opponent: opponent || "Unknown",
      gameId: `game-${Date.now()}`,
      snapLabel,
      notes,
    });
    setSaved(true);
    onSave(result);
  }

  const { actualCoverage, wasDisguised, disguiseDescription, rotation, rotationDescription, blitzConfirmed, insights, readOpportunities } = result;

  return (
    <div className="space-y-4 animate-[var(--animate-slide-up)]">
      {/* Coverage result */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Actual Coverage
          </div>
          {wasDisguised && (
            <span className="rounded bg-destructive/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-destructive">
              Disguised
            </span>
          )}
        </div>
        <div className="flex items-end gap-3">
          <div className="text-2xl font-display font-bold text-foreground">
            {actualCoverage.label}
          </div>
          <div className={`text-sm font-bold mb-0.5 ${confidenceColor(actualCoverage.confidence)}`}>
            {actualCoverage.confidence}% confidence
          </div>
        </div>
        {actualCoverage.variants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {actualCoverage.variants.slice(0, 3).map((v) => (
              <span key={v} className="rounded bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Disguise alert */}
      {wasDisguised && disguiseDescription && (
        <div className="rounded border border-destructive/30 bg-destructive/8 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">
            Coverage Disguise Detected
          </div>
          <p className="text-[12px] text-foreground/80 leading-relaxed">{disguiseDescription}</p>
        </div>
      )}

      {/* Rotation */}
      {rotation !== "None" && (
        <div className="glass-card p-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-accent-1/80">
            Rotation — {rotation}
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">{rotationDescription}</p>
        </div>
      )}

      {/* Blitz */}
      {blitzConfirmed && (
        <div className="rounded border border-blitz/30 bg-blitz/8 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blitz">
            Blitz Confirmed — {result.blitzersCount}+ Rushers
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Insights
          </div>
          {insights.map((insight, i) => (
            <div key={i} className="flex gap-2 text-[12px] text-foreground/80">
              <span className="text-team-one mt-0.5 shrink-0">→</span>
              <span className="leading-relaxed">{insight}</span>
            </div>
          ))}
        </div>
      )}

      {/* Read opportunities */}
      {readOpportunities.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Attack Windows
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {readOpportunities.map((opp, i) => (
              <div key={i} className="rounded border border-border/40 bg-card/40 p-3 space-y-0.5">
                <div className="text-[12px] font-semibold text-foreground">{opp.concept}</div>
                <div className="text-[10px] text-team-one">{opp.window}</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">{opp.reasoning}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save controls */}
      {!saved ? (
        <div className="space-y-2 border-t border-border/30 pt-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Save to Game Log
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="rounded border border-border/50 bg-card/40 px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-team-one/50 focus:outline-none"
              placeholder="Opponent (e.g. Cowboys)"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />
            <input
              className="rounded border border-border/50 bg-card/40 px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-team-one/50 focus:outline-none"
              placeholder="Snap label (e.g. Q2 3rd & 7)"
              value={snapLabel}
              onChange={(e) => setSnapLabel(e.target.value)}
            />
          </div>
          <input
            className="w-full rounded border border-border/50 bg-card/40 px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-team-one/50 focus:outline-none"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            onClick={handleSave}
            className="rounded border border-team-one/50 bg-team-one/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-team-one hover:bg-team-one/20 transition-colors"
          >
            Save Snap
          </button>
        </div>
      ) : (
        <div className="rounded border border-team-two/30 bg-team-two/8 p-2.5 text-center text-[11px] font-semibold text-team-two">
          Saved to game log ✓
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab() {
  const recent = getRecentAnalyses(30);
  const profiles = getAllOpponentProfiles();

  if (recent.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-[13px]">
        No post-snap data yet. Run an analysis and save snaps to build your game log.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Opponent profiles */}
      {profiles.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Opponent Coverage Profiles
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((p) => (
              <OpponentCard key={p.opponent} profile={p} />
            ))}
          </div>
        </div>
      )}

      {/* Recent snaps */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Recent Snaps
        </div>
        {recent.map((snap) => (
          <SnapRow key={snap.id} snap={snap} />
        ))}
      </div>
    </div>
  );
}

function OpponentCard({ profile }: { profile: OpponentProfile }) {
  return (
    <div className="glass-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-display font-semibold text-[13px]">{profile.opponent}</div>
        <div className="text-[10px] text-muted-foreground">{profile.totalSnaps} snaps</div>
      </div>
      <div className="space-y-1">
        {profile.coverageFrequency.slice(0, 3).map((c) => (
          <div key={c.family} className="flex items-center gap-2">
            <div className="text-[11px] text-foreground/80 w-28 shrink-0">
              {COVERAGE_FAMILY_LABELS[c.family]}
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-team-one/60 transition-all"
                style={{ width: `${c.pct}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground w-8 text-right">{c.pct}%</div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>Blitz: <span className="text-blitz font-semibold">{profile.blitzRate}%</span></span>
        <span>Disguise: <span className="text-accent-1 font-semibold">{profile.disguiseRate}%</span></span>
      </div>
    </div>
  );
}

function SnapRow({ snap }: { snap: StoredAnalysis }) {
  return (
    <div className="flex items-center gap-3 rounded border border-border/30 bg-card/30 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-foreground truncate">
            {COVERAGE_FAMILY_LABELS[snap.actualCoverage]}
          </span>
          {snap.wasDisguised && (
            <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-destructive">
              disguised
            </span>
          )}
          {snap.blitzConfirmed && (
            <span className="shrink-0 rounded bg-blitz/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-blitz">
              blitz
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {snap.opponent} {snap.snapLabel ? `· ${snap.snapLabel}` : ""}
          {snap.down && snap.distance ? ` · ${snap.down}&${snap.distance}` : ""}
        </div>
      </div>
      {snap.preSnapPrediction && (
        <div className="text-[10px] text-right text-muted-foreground shrink-0">
          <div>Pre: {COVERAGE_FAMILY_LABELS[snap.preSnapPrediction]}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type AnalyzerTab = "analyze" | "history";

export function PostSnapAnalyzer() {
  const [activeTab, setActiveTab] = useState<AnalyzerTab>("analyze");
  const [selectedSignals, setSelectedSignals] = useState<Set<string>>(new Set());
  const [preSnapPrediction, setPreSnapPrediction] = useState<CoverageFamily | "">("");
  const [preSnapConfidence, setPreSnapConfidence] = useState(70);
  const [result, setResult] = useState<PostSnapAnalysis | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleSignal = useCallback((id: string) => {
    setSelectedSignals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  }, []);

  function runAnalysis() {
    if (selectedSignals.size === 0) return;
    const input: PostSnapInput = {
      preSnapSignals: [],
      preSnapPrediction: preSnapPrediction || null,
      preSnapConfidence,
      postSnapSignals: [...selectedSignals],
    };
    setResult(analyzePostSnap(input));
  }

  function reset() {
    setSelectedSignals(new Set());
    setResult(null);
    setPreSnapPrediction("");
    setPreSnapConfidence(70);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Post-Snap Analyzer</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Log what you saw after the snap — resolve actual coverage, detect disguises, find read windows
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["analyze", "history"] as AnalyzerTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); if (t === "history") setRefreshKey((k) => k + 1); }}
              className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                activeTab === t
                  ? "border-team-one/60 bg-team-one/10 text-team-one"
                  : "border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "analyze" ? "Analyze" : "History"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "history" ? (
        <HistoryTab key={refreshKey} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Signal selector */}
          <div className="space-y-4">
            {/* Pre-snap prediction row */}
            <div className="glass-card p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Pre-Snap Read (Optional)
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={preSnapPrediction}
                  onChange={(e) => setPreSnapPrediction(e.target.value as CoverageFamily | "")}
                  className="rounded border border-border/50 bg-card/60 px-2.5 py-1.5 text-[12px] text-foreground focus:border-team-one/50 focus:outline-none"
                >
                  <option value="">No pre-snap read</option>
                  {COVERAGE_FAMILIES.map((f) => (
                    <option key={f} value={f}>{COVERAGE_FAMILY_LABELS[f]}</option>
                  ))}
                </select>
                {preSnapPrediction && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Confidence:</span>
                    <input
                      type="range" min={10} max={99} step={5}
                      value={preSnapConfidence}
                      onChange={(e) => setPreSnapConfidence(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-[11px] font-mono text-foreground">{preSnapConfidence}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signal groups */}
            <div className="space-y-4">
              {POST_SNAP_SIGNAL_CATEGORIES.map((cat) => (
                <CategorySection
                  key={cat}
                  category={cat}
                  selected={selectedSignals}
                  onToggle={toggleSignal}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 sticky bottom-0 bg-background/90 backdrop-blur py-2">
              <button
                onClick={runAnalysis}
                disabled={selectedSignals.size === 0}
                className="flex-1 rounded border border-team-one/60 bg-team-one/15 py-2 text-[12px] font-bold uppercase tracking-wider text-team-one hover:bg-team-one/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Resolve Coverage ({selectedSignals.size} signal{selectedSignals.size !== 1 ? "s" : ""})
              </button>
              {selectedSignals.size > 0 && (
                <button
                  onClick={reset}
                  className="rounded border border-border/40 px-4 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Result */}
          <div>
            {result ? (
              <AnalysisResultCard
                result={result}
                onSave={() => {}}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-center text-muted-foreground text-[13px] border border-border/20 rounded-lg">
                <div>
                  <div className="text-2xl mb-2 opacity-30">◎</div>
                  <div>Select post-snap observations<br />and click Resolve Coverage</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
