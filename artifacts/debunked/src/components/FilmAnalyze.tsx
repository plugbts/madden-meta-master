import { useState } from "react";
import { COVERAGES, OFFENSES } from "@/lib/madden-data";
import { analyzeSnap, type SnapFinding, type SnapInput, type UserPosition, type Situation } from "@/lib/analysis-engine";
import { PlayCard } from "@/components/PlayCard";

const SCORE_COLOR = (n: number) =>
  n >= 85 ? "text-team-two" : n >= 65 ? "text-accent-1" : "text-destructive";

const DIFF_COLOR = (n: number) =>
  n <= 2 ? "text-team-two" : n === 3 ? "text-accent-1" : "text-destructive";

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = value >= 85 ? "bg-team-two" : value >= 65 ? "bg-accent-1" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
        <span className={`font-bold font-mono ${SCORE_COLOR(value)}`}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function FilmAnalyze() {
  const [input, setInput] = useState<SnapInput>({
    coverageId: "",
    opponentFormationId: "",
    userPosition: "none",
    situation: "normal",
  });
  const [finding, setFinding] = useState<SnapFinding | null>(null);

  function run() {
    if (!input.coverageId) return;
    setFinding(analyzeSnap(input));
  }

  const counterTierColor = { "A+": "text-team-two bg-team-two/10 border-team-two/30", "A": "text-accent-1 bg-accent-1/10 border-accent-1/30", "B+": "text-muted-foreground bg-muted/50 border-border" };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-shield/30 bg-shield/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-shield mb-1">Film Analysis Engine</p>
        <p className="text-sm text-muted-foreground">
          Log what you see pre-snap. The engine cross-references the knowledge base, scores your counter options, and generates coaching output automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Coverage Identified *</label>
          <select
            value={input.coverageId}
            onChange={e => setInput(s => ({ ...s, coverageId: e.target.value }))}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-shield"
          >
            <option value="">— Select coverage —</option>
            {COVERAGES.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.popular ? " ★" : ""}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Your Formation (optional)</label>
          <select
            value={input.opponentFormationId}
            onChange={e => setInput(s => ({ ...s, opponentFormationId: e.target.value }))}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-shield"
          >
            <option value="">— Select formation —</option>
            {OFFENSES.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Opponent Usering</label>
          <select
            value={input.userPosition}
            onChange={e => setInput(s => ({ ...s, userPosition: e.target.value as UserPosition }))}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-shield"
          >
            <option value="none">Not detected</option>
            <option value="MLB">MLB</option>
            <option value="SS">SS</option>
            <option value="FS">FS</option>
            <option value="CB">CB</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Situation</label>
          <select
            value={input.situation}
            onChange={e => setInput(s => ({ ...s, situation: e.target.value as Situation }))}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-shield"
          >
            <option value="normal">Normal Down</option>
            <option value="redzone">Red Zone</option>
            <option value="goalline">Goal Line</option>
            <option value="4thdown">4th Down</option>
          </select>
        </div>
      </div>

      <button
        onClick={run}
        disabled={!input.coverageId}
        className="w-full rounded-xl bg-shield py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-shield/80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Run Analysis
      </button>

      {finding && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {finding.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {finding.tags.map(tag => (
                <span key={tag} className="rounded-full border border-accent-1/30 bg-accent-1/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-accent-1">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Confidence Scores</p>
            <ScoreBar label="Coverage Confidence" value={finding.scores.coverageConfidence} />
            <ScoreBar label="Counter Confidence" value={finding.scores.counterConfidence} />
            <ScoreBar label="Money Play Score" value={finding.scores.moneyPlayScore} />
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono uppercase tracking-wider">Read Difficulty</span>
                <span className={`font-bold font-mono ${DIFF_COLOR(finding.scores.readDifficulty)}`}>
                  {finding.scores.readDifficulty}/5
                </span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= finding.scores.readDifficulty ? (finding.scores.readDifficulty <= 2 ? "bg-team-two" : finding.scores.readDifficulty === 3 ? "bg-accent-1" : "bg-destructive") : "bg-border"}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-shield/20 bg-shield/5 p-5">
            <p className="text-xs font-mono uppercase tracking-wider text-shield mb-3">Coach Analysis</p>
            <p className="text-sm leading-relaxed text-foreground">{finding.narrative}</p>
          </div>

          {finding.lurk && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-destructive mb-2">⚠ Lurk Alert — {finding.lurk.coverage}</p>
              <p className="text-sm text-muted-foreground mb-1">{finding.lurk.avoidThrow}</p>
              <p className="text-sm font-medium text-foreground">{finding.lurk.beatIt}</p>
            </div>
          )}

          {finding.bestCounters.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Counter Plays — Ranked by Confidence</p>
              {finding.bestCounters.map((c, i) => (
                <PlayCard
                  key={i}
                  counter={c}
                  coverageName={finding.coverage?.name ?? "Cover 2 Zone"}
                  coverageCategory={finding.coverage?.category ?? "zone"}
                  rank={i}
                />
              ))}
            </div>
          )}

          {finding.coverage && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Pre-Snap Tells — {finding.coverage.name}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {finding.coverage.tells.map((t, i) => (
                  <span key={i} className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
