import { useState } from "react";
import { COVERAGES } from "@/lib/madden-data";
import { buildScoutReport, type ScoutSnap, type ScoutReport, type Situation } from "@/lib/analysis-engine";
import { PlayCard } from "@/components/PlayCard";

export function ScoutOpponent() {
  const [opponentName, setOpponentName] = useState("");
  const [snaps, setSnaps] = useState<ScoutSnap[]>([]);
  const [snapInput, setSnapInput] = useState<ScoutSnap>({ coverageId: "", situation: "normal" });
  const [report, setReport] = useState<ScoutReport | null>(null);

  function addSnap() {
    if (!snapInput.coverageId) return;
    setSnaps(s => [...s, { ...snapInput }]);
    setSnapInput(s => ({ ...s, coverageId: "", situation: "normal" }));
    setReport(null);
  }

  function removeSnap(i: number) {
    setSnaps(s => s.filter((_, idx) => idx !== i));
    setReport(null);
  }

  function generate() {
    if (snaps.length === 0) return;
    setReport(buildScoutReport(opponentName || "Opponent", snaps));
  }

  const tierColor = { "A+": "text-team-two border-team-two/30 bg-team-two/10", "A": "text-accent-1 border-accent-1/30 bg-accent-1/10", "B+": "text-muted-foreground border-border bg-muted/40" };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-accent-1/30 bg-accent-1/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-accent-1 mb-1">Scout Report Engine</p>
        <p className="text-sm text-muted-foreground">
          Log coverages you've observed from your opponent. The engine detects tendencies, calculates blitz rates, and generates a full scouting report automatically.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Opponent Name (optional)</label>
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
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{snaps.length} snap{snaps.length !== 1 ? "s" : ""} logged</p>
            <button onClick={generate} className="rounded-lg bg-accent-1 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-accent-1/80">
              Generate Report
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {snaps.map((s, i) => {
              const cov = COVERAGES.find(c => c.id === s.coverageId);
              return (
                <div key={i} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                  <span className="text-xs text-foreground">{cov?.name ?? s.coverageId}</span>
                  {s.situation !== "normal" && <span className="text-xs text-muted-foreground">· {s.situation}</span>}
                  <button onClick={() => removeSnap(i)} className="text-xs text-muted-foreground hover:text-destructive ml-1">×</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {report && report.totalSnaps > 0 && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="rounded-xl border border-accent-1/20 bg-accent-1/5 p-5 space-y-1">
            <p className="text-xs font-mono uppercase tracking-wider text-accent-1">Scout Report — {report.opponentName}</p>
            <p className="text-sm leading-relaxed text-foreground">{report.narrative}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-foreground">{report.totalSnaps}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Snaps Logged</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold font-mono ${report.blitzRate > 50 ? "text-destructive" : report.blitzRate > 25 ? "text-accent-1" : "text-team-two"}`}>{report.blitzRate}%</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Blitz Rate</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold font-mono ${report.pressureRate > 50 ? "text-destructive" : "text-accent-1"}`}>{report.pressureRate}%</p>
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
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Top Counters vs {report.opponentName}</p>
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
            onClick={() => { setSnaps([]); setReport(null); setOpponentName(""); }}
            className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition"
          >
            Clear & Scout New Opponent
          </button>
        </div>
      )}
    </div>
  );
}
