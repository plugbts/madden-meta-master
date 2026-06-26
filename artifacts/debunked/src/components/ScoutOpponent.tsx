import { useState, useEffect } from "react";
import { COVERAGES } from "@/lib/madden-data";
import { buildScoutReport, type ScoutSnap, type ScoutReport, type Situation } from "@/lib/analysis-engine";
import { PlayCard } from "@/components/PlayCard";
import { logScoutBatch, newGameId } from "@/lib/intel-db";
import { getSession, patchSession, hasActiveSession } from "@/lib/session-store";

export function ScoutOpponent() {
  const [opponentName, setOpponentName]   = useState("");
  const [gameId]                          = useState(() => newGameId());
  const [snaps, setSnaps]                 = useState<ScoutSnap[]>([]);
  const [snapInput, setSnapInput]         = useState<ScoutSnap>({ coverageId: "", situation: "normal" });
  const [report, setReport]               = useState<ScoutReport | null>(null);
  const [savedToIntel, setSavedToIntel]   = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // ── Session Restore ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasActiveSession()) {
      const s = getSession();
      if (s.scoutSnaps.length > 0) {
        setSnaps(s.scoutSnaps.map(snap => ({
          coverageId: snap.coverageId,
          situation: (snap.situation || "normal") as Situation,
        })));
        if (s.scoutOpponentName) setOpponentName(s.scoutOpponentName);
        setSessionRestored(true);
      }
    }
  }, []);

  // ── Session Save on change ───────────────────────────────────────────────────
  useEffect(() => {
    patchSession({
      scoutOpponentName: opponentName,
      scoutGameId: gameId,
      scoutSnaps: snaps.map(s => ({
        coverageId: s.coverageId,
        coverageName: COVERAGES.find(c => c.id === s.coverageId)?.name ?? s.coverageId,
        situation: s.situation ?? "normal",
      })),
    });
  }, [snaps, opponentName]);

  function addSnap() {
    if (!snapInput.coverageId) return;
    setSnaps(s => [...s, { ...snapInput }]);
    setSnapInput(s => ({ ...s, coverageId: "", situation: "normal" }));
    setReport(null);
    setSavedToIntel(false);
  }

  function removeSnap(i: number) {
    setSnaps(s => s.filter((_, idx) => idx !== i));
    setReport(null);
    setSavedToIntel(false);
  }

  function generate() {
    if (snaps.length === 0) return;
    const name = opponentName.trim() || "Opponent";
    const r = buildScoutReport(name, snaps);
    setReport(r);

    // Persist every snap to the intel database
    logScoutBatch(
      name,
      gameId,
      snaps.map(s => ({
        coverageId: s.coverageId,
        coverageName: COVERAGES.find(c => c.id === s.coverageId)?.name ?? s.coverageId,
        situation: s.situation,
        blitzConfirmed: COVERAGES.find(c => c.id === s.coverageId)?.category === "blitz",
      }))
    );
    setSavedToIntel(true);
  }

  function clearAll() {
    setSnaps([]);
    setReport(null);
    setOpponentName("");
    setSavedToIntel(false);
    setSessionRestored(false);
    patchSession({ scoutSnaps: [], scoutOpponentName: "", scoutGameId: "" });
  }

  const tierColor = {
    "A+": "text-team-two border-team-two/30 bg-team-two/10",
    "A":  "text-accent-1 border-accent-1/30 bg-accent-1/10",
    "B+": "text-muted-foreground border-border bg-muted/40",
  };

  return (
    <div className="space-y-8">
      {/* Session restored banner */}
      {sessionRestored && (
        <div
          className="rounded-xl border p-3 flex items-center justify-between"
          style={{ borderColor: "rgba(111,219,168,0.3)", background: "rgba(111,219,168,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#6fdba8" }} />
            <p className="text-xs font-mono" style={{ color: "#6fdba8" }}>
              Session restored — {snaps.length} snap{snaps.length !== 1 ? "s" : ""} recovered from your last visit
            </p>
          </div>
          <button onClick={() => setSessionRestored(false)} className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>×</button>
        </div>
      )}

      <div className="rounded-xl border border-accent-1/30 bg-accent-1/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-accent-1 mb-1">Scout Report Engine</p>
        <p className="text-sm text-muted-foreground">
          Log coverages you've observed from your opponent. Every report is saved permanently to the Intel database — the more games you scout, the sharper the intelligence becomes.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Opponent Name</label>
        <input
          value={opponentName}
          onChange={e => setOpponentName(e.target.value)}
          placeholder="e.g. GT_KingSlayer"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent-1"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Log a Snap</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Coverage Seen *</label>
            <select
              value={snapInput.coverageId}
              onChange={e => setSnapInput(s => ({ ...s, coverageId: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-1"
            >
              <option value="">— Select coverage —</option>
              {COVERAGES.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.popular ? " ★" : ""}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Situation</label>
            <select
              value={snapInput.situation}
              onChange={e => setSnapInput(s => ({ ...s, situation: e.target.value as Situation }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-1"
            >
              <option value="normal">Normal Down</option>
              <option value="redzone">Red Zone</option>
              <option value="goalline">Goal Line</option>
              <option value="4thdown">4th Down</option>
            </select>
          </div>
        </div>
        <button
          onClick={addSnap}
          disabled={!snapInput.coverageId}
          className="rounded-lg border border-accent-1/40 bg-accent-1/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent-1 transition hover:bg-accent-1/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add Snap
        </button>
      </div>

      {snaps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {snaps.length} snap{snaps.length !== 1 ? "s" : ""} logged
            </p>
            <div className="flex items-center gap-2">
              {savedToIntel && (
                <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: "rgba(111,219,168,0.12)", color: "#6fdba8", border: "1px solid rgba(111,219,168,0.3)" }}>
                  ✓ Saved to Intel
                </span>
              )}
              <button
                onClick={generate}
                className="rounded-lg bg-accent-1 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-accent-1/80"
              >
                Generate Report
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {snaps.map((s, i) => {
              const cov = COVERAGES.find(c => c.id === s.coverageId);
              return (
                <div key={i} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                  <span className="text-xs text-foreground">{cov?.name ?? s.coverageId}</span>
                  {s.situation !== "normal" && (
                    <span className="text-xs text-muted-foreground">· {s.situation}</span>
                  )}
                  <button onClick={() => removeSnap(i)} className="text-xs text-muted-foreground hover:text-destructive ml-1">×</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {report && report.totalSnaps > 0 && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="rounded-xl border border-accent-1/20 bg-accent-1/5 p-5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-mono uppercase tracking-wider text-accent-1">
                Scout Report — {report.opponentName}
              </p>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider"
                style={{ background: "rgba(111,219,168,0.1)", color: "#6fdba8", border: "1px solid rgba(111,219,168,0.25)" }}>
                ✓ Saved to Intel Database
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{report.narrative}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-foreground">{report.totalSnaps}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Snaps Logged</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold font-mono ${report.blitzRate > 50 ? "text-destructive" : report.blitzRate > 25 ? "text-accent-1" : "text-team-two"}`}>
                {report.blitzRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Blitz Rate</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold font-mono ${report.pressureRate > 50 ? "text-destructive" : "text-accent-1"}`}>
                {report.pressureRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Pressure Rate</p>
            </div>
          </div>

          {report.coverageFrequency.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Coverage Breakdown</p>
              {report.coverageFrequency.map(({ coverage, count, pct }) => (
                <div key={coverage.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{coverage.name}</span>
                    <span className="font-mono text-muted-foreground">{count}× · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${coverage.category === "blitz" ? "bg-destructive" : coverage.category === "man" ? "bg-shield" : "bg-accent-1"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Weakness: {coverage.weakness}</p>
                </div>
              ))}
            </div>
          )}

          {report.topCounters.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Top Counters vs {report.opponentName}
              </p>
              {report.topCounters.slice(0, 3).map((c, i) => (
                <PlayCard
                  key={i}
                  counter={c}
                  coverageName={report.mostUsedCoverage?.name ?? "Zone Coverage"}
                  coverageCategory={report.mostUsedCoverage?.category ?? "zone"}
                  rank={i}
                />
              ))}
            </div>
          )}

          <button
            onClick={clearAll}
            className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition"
          >
            Clear & Scout New Opponent
          </button>
        </div>
      )}
    </div>
  );
}
