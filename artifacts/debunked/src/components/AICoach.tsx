import { useState } from "react";
import { COVERAGES, OFFENSES } from "@/lib/madden-data";
import { getCoachAdvice, type CoachInput, type CoachAdvice, type Situation } from "@/lib/analysis-engine";
import { PlayCard } from "@/components/PlayCard";

type Session = {
  input: CoachInput;
  advice: CoachAdvice;
  label: string;
};

function ScorePill({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const color = value >= 85 ? "text-team-two border-team-two/40 bg-team-two/10"
    : value >= 65 ? "text-accent-1 border-accent-1/40 bg-accent-1/10"
    : "text-destructive border-destructive/40 bg-destructive/10";
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${color}`}>
      <p className="text-xl font-bold font-mono">{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

export function AICoach() {
  const [input, setInput] = useState<CoachInput>({
    coverageId: "",
    myFormationId: "",
    situation: "normal",
    downDistance: "",
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState<CoachAdvice | null>(null);
  const [currentCovId, setCurrentCovId] = useState("");

  function ask() {
    if (!input.coverageId) return;
    const advice = getCoachAdvice(input);
    const cov = COVERAGES.find(c => c.id === input.coverageId);
    const label = `${cov?.name ?? "Unknown"}${input.downDistance ? ` · ${input.downDistance}` : ""}`;
    setCurrent(advice);
    setCurrentCovId(input.coverageId);
    setSessions(s => [{ input: { ...input }, advice, label }, ...s.slice(0, 9)]);
  }

  const activeCov = COVERAGES.find(c => c.id === currentCovId);
  const tierColor = { "A+": "text-team-two border-team-two/30 bg-team-two/10", "A": "text-accent-1 border-accent-1/30 bg-accent-1/10", "B+": "text-muted-foreground border-border bg-muted/40" };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-team-two/30 bg-team-two/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-team-two mb-1">AI Coach — In-Game Advisor</p>
        <p className="text-sm text-muted-foreground">
          Tell the coach what you're seeing right now. The engine scores every counter, ranks your best call, and gives you a read assignment — instantly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Coverage You're Seeing *</label>
          <select
            value={input.coverageId}
            onChange={e => setInput(s => ({ ...s, coverageId: e.target.value }))}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-team-two"
          >
            <option value="">— What coverage? —</option>
            {COVERAGES.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.popular ? " ★" : ""}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Your Formation</label>
          <select
            value={input.myFormationId}
            onChange={e => setInput(s => ({ ...s, myFormationId: e.target.value }))}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-team-two"
          >
            <option value="">— Any formation —</option>
            {OFFENSES.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Situation</label>
          <select
            value={input.situation}
            onChange={e => setInput(s => ({ ...s, situation: e.target.value as Situation }))}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-team-two"
          >
            <option value="normal">Normal Down</option>
            <option value="redzone">Red Zone</option>
            <option value="goalline">Goal Line</option>
            <option value="4thdown">4th Down</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Down & Distance</label>
          <input
            value={input.downDistance}
            onChange={e => setInput(s => ({ ...s, downDistance: e.target.value }))}
            placeholder="e.g. 3rd & 7"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-team-two"
          />
        </div>
      </div>

      <button
        onClick={ask}
        disabled={!input.coverageId}
        className="w-full rounded-xl bg-team-two py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-team-two/80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Coach Me
      </button>

      {current && (
        <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {current.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {current.tags.map(t => (
                <span key={t} className="rounded-full border border-team-two/30 bg-team-two/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-team-two">{t}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <ScorePill label="Money Play" value={current.scores.moneyPlayScore} />
            <ScorePill label="Counter Conf." value={current.scores.counterConfidence} />
            <ScorePill label="Coverage Conf." value={current.scores.coverageConfidence} />
          </div>

          <div className="rounded-xl border border-team-two/20 bg-team-two/5 p-5">
            <p className="text-xs font-mono uppercase tracking-wider text-team-two mb-3">Coach Says</p>
            <p className="text-sm leading-relaxed">{current.narrative}</p>
          </div>

          {current.presnap.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Pre-Snap Checklist</p>
              <ul className="space-y-2 mt-2">
                {current.presnap.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-team-two/20 text-team-two text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {current.topPlay && (
            <div className="space-y-4">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Best Call</p>
              <PlayCard
                counter={current.topPlay}
                coverageName={activeCov?.name ?? "Cover 2 Zone"}
                coverageCategory={activeCov?.category ?? "zone"}
                rank={0}
              />
              {current.allCounters.length > 1 && (
                <div className="space-y-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Other Options</p>
                  {current.allCounters.slice(1).map((c, i) => (
                    <PlayCard
                      key={i}
                      counter={c}
                      coverageName={activeCov?.name ?? "Cover 2 Zone"}
                      coverageCategory={activeCov?.category ?? "zone"}
                      rank={i + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {sessions.length > 1 && (
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Session History</p>
          {sessions.slice(1).map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrent(s.advice)}
              className="w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:border-team-two/40 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground font-mono">{s.advice.scores.moneyPlayScore} MPS</span>
              </div>
              {s.advice.topPlay && (
                <p className="text-xs text-muted-foreground mt-0.5">{s.advice.topPlay.formation} — {s.advice.topPlay.play}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
