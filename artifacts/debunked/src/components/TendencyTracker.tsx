import { useState, useMemo } from "react";
import { COVERAGES } from "@/lib/madden-data";

// ─── data ──────────────────────────────────────────────────────────────────

export type TendencyEntry = {
  id: string;
  side: "OFF" | "DEF";
  situation: string;
  formation: string;
  play: string;
  result: ResultKey;
  drive: number;
};

type ResultKey = "stop" | "short" | "medium" | "chunk" | "first" | "td" | "turnover" | "sack";

const SITUATIONS = [
  "1st Down", "2nd & Short", "2nd & Med", "2nd & Long",
  "3rd & Short", "3rd & Med", "3rd & Long",
  "Red Zone", "Goal Line", "4th Down",
];

const OFF_FORMATIONS = [
  "Gun Bunch", "Gun Bunch TE", "Gun Trips TE", "Gun Tight Slots",
  "Gun Empty", "Gun Y Trips", "Shotgun 5 Wide", "Pistol Bunch",
  "Pistol Y Trips", "Singleback Ace", "Singleback Bunch",
  "Singleback Trips TE", "I-Form Pro", "I-Form Tight",
  "Strong I", "Wildcat",
];

const DEF_FORMATIONS = [
  "4-3 Over", "4-3 Under", "4-3 Wide", "3-4 Base", "3-4 Odd",
  "3-4 Over", "3-4 Under", "Nickel 3-3-5", "Nickel 3-3-5 Odd",
  "Nickel DBL A Gap", "Big Nickel", "Dime Normal", "Dime 3-2-6",
  "Dollar Normal", "Goal Line", "Bear Front", "4-4 Split",
];

const OFF_PLAYS = [
  "HB Power", "HB Dive", "Inside Zone", "Outside Zone", "Counter",
  "Stretch", "PA Boot", "PA Waggle", "Four Verticals", "Mesh",
  "Drive / Shallow Cross", "Smash", "All Slants", "Curl Flat",
  "Stick", "All Curls", "RPO", "HB Screen", "WR Screen",
  "Quick Outs", "Fade", "Wheel Concept",
];

const DEF_PLAYS = [
  "Cover 0 Blitz", "Cover 1 Man Free", "Cover 1 Robber",
  "Cover 1 Press", "Cover 2", "Tampa 2", "Cover 2 Man",
  "Cover 2 Sink", "Cover 3 Sky", "Cover 3 Buzz", "Cover 3 Cloud",
  "Cover 3 Match", "Cover 4 Quarters", "Cover 6",
  "Double A Gap", "Zero Blitz", "Bear Zero", "4 DE Blitz",
  "DB Fire Zone", "Safety Blitz",
];

const RESULTS: { key: ResultKey; label: string; short: string; color: string }[] = [
  { key: "stop",     label: "Stop / Loss",   short: "STOP",  color: "bg-team-two/20 text-team-two border-team-two/30" },
  { key: "short",    label: "Gain 1-3",       short: "1-3",   color: "bg-muted text-muted-foreground border-border" },
  { key: "medium",   label: "Gain 4-7",       short: "4-7",   color: "bg-accent text-accent-foreground border-border" },
  { key: "chunk",    label: "Chunk 8+",       short: "8+",    color: "bg-accent-1/20 text-accent-1 border-accent-1/30" },
  { key: "first",    label: "1st Down",       short: "1ST",   color: "bg-team-one/20 text-team-one border-team-one/30" },
  { key: "td",       label: "Touchdown",      short: "TD",    color: "bg-team-one text-background border-team-one" },
  { key: "turnover", label: "Turnover",       short: "TO",    color: "bg-team-two text-background border-team-two" },
  { key: "sack",     label: "Sack / TFL",     short: "SACK",  color: "bg-destructive/20 text-destructive border-destructive/30" },
];

// How "good" is this result for the person doing it (positive = they succeeded)
const RESULT_SCORE: Record<ResultKey, number> = {
  turnover: -3, stop: -2, sack: -2, short: -1,
  medium: 1, chunk: 2, first: 2, td: 3,
};

// coverage ID guessed from a defensive play name
function guessCoverageId(play: string): string | null {
  const p = play.toLowerCase();
  if (p.includes("cover 0") || p.includes("zero blitz") || p.includes("all-out")) return "cover-0";
  if (p.includes("cover 1 robber")) return "cover-1";
  if (p.includes("cover 1 press")) return "cover-1-press";
  if (p.includes("cover 1")) return "cover-1";
  if (p.includes("tampa")) return "tampa-2";
  if (p.includes("cover 2 man")) return "cover-2-man";
  if (p.includes("cover 2 sink")) return "cover-2-sink";
  if (p.includes("cover 2")) return "cover-2";
  if (p.includes("match")) return "cover-3-match";
  if (p.includes("cloud")) return "cover-3-cloud";
  if (p.includes("cover 3")) return "cover-3";
  if (p.includes("cover 4") || p.includes("quarters")) return "cover-4";
  if (p.includes("cover 6")) return "cover-6";
  if (p.includes("double a") || p.includes("mug")) return "dbl-mug";
  if (p.includes("bear")) return "bear-blitz";
  if (p.includes("4 de")) return "4de-blitz";
  if (p.includes("db fire")) return "dbl-mug";
  if (p.includes("safety blitz")) return "zero-blitz";
  return null;
}

// ─── main component ────────────────────────────────────────────────────────

export function TendencyTracker({ onAddToBot }: { onAddToBot: (label: string, detail: string) => void }) {
  const [entries, setEntries] = useState<TendencyEntry[]>([]);
  const [drive, setDrive] = useState(1);

  // form state
  const [side, setSide] = useState<"OFF" | "DEF">("DEF");
  const [situation, setSituation] = useState(SITUATIONS[0]);
  const [formation, setFormation] = useState("");
  const [play, setPlay] = useState("");
  const [result, setResult] = useState<ResultKey>("medium");

  const formations = side === "OFF" ? OFF_FORMATIONS : DEF_FORMATIONS;
  const plays = side === "OFF" ? OFF_PLAYS : DEF_PLAYS;

  function logPlay() {
    if (!formation || !play) return;
    const entry: TendencyEntry = {
      id: crypto.randomUUID(),
      side,
      situation,
      formation,
      play,
      result,
      drive,
    };
    setEntries((prev) => [entry, ...prev]);
    // keep same side/situation for quick chaining
    setFormation("");
    setPlay("");
  }

  function newDrive() {
    setDrive((d) => d + 1);
  }

  function clearAll() {
    setEntries([]);
    setDrive(1);
  }

  // ── analysis ──
  const analysis = useMemo(() => computeAnalysis(entries), [entries]);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr_280px]">
      {/* ── LOG FORM ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-muted-foreground">Log a Play</span>
          <span className="font-mono text-[10px] text-muted-foreground">Drive {drive}</span>
        </div>

        {/* Side toggle */}
        <div className="flex gap-1 rounded-md border border-border bg-card p-0.5">
          {(["DEF", "OFF"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSide(s); setFormation(""); setPlay(""); }}
              className={`flex-1 rounded py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                side === s
                  ? s === "DEF"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-team-one text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "DEF" ? "🔴 Opp Defense" : "🔵 Opp Offense"}
            </button>
          ))}
        </div>

        {/* Situation */}
        <div>
          <label className="block mb-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Situation</label>
          <div className="flex flex-wrap gap-1">
            {SITUATIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSituation(s)}
                className={`rounded px-2 py-1 text-[10px] font-semibold transition border ${
                  situation === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Formation */}
        <div>
          <label className="block mb-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Formation</label>
          <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto scrollbar-hide">
            {formations.map((f) => (
              <button
                key={f}
                onClick={() => setFormation(f)}
                className={`rounded px-2 py-1 text-[10px] font-semibold transition border ${
                  formation === f
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Play */}
        <div>
          <label className="block mb-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Play / Coverage</label>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-hide">
            {plays.map((p) => (
              <button
                key={p}
                onClick={() => setPlay(p)}
                className={`rounded px-2 py-1 text-[10px] font-semibold transition border ${
                  play === p
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        <div>
          <label className="block mb-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Result</label>
          <div className="grid grid-cols-4 gap-1">
            {RESULTS.map((r) => (
              <button
                key={r.key}
                onClick={() => setResult(r.key)}
                className={`rounded border px-1 py-1.5 text-[9px] font-bold uppercase tracking-wide transition ${
                  result === r.key ? r.color : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.short}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={logPlay}
            disabled={!formation || !play}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition hover:opacity-90 disabled:opacity-30"
          >
            ✓ Log Play
          </button>
          <button
            onClick={newDrive}
            className="rounded-md border border-border px-3 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground transition"
            title="Next drive"
          >
            +Drive
          </button>
        </div>
      </div>

      {/* ── PLAY LOG ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
            Play Log · {entries.length} plays
          </span>
          {entries.length > 0 && (
            <button onClick={clearAll} className="text-[10px] text-destructive/70 hover:text-destructive transition">
              Clear all
            </button>
          )}
        </div>

        {entries.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground">
            Log plays using the form →
          </div>
        )}

        <div className="space-y-1.5">
          {entries.map((e, i) => {
            const res = RESULTS.find((r) => r.key === e.result)!;
            return (
              <div
                key={e.id}
                className="animate-[var(--animate-flash-in)] flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
              >
                <div className={`shrink-0 flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${
                  e.side === "OFF" ? "bg-team-one/20 text-team-one" : "bg-destructive/20 text-destructive"
                }`}>
                  {e.side}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold leading-tight truncate">{e.formation} · {e.play}</div>
                  <div className="text-[9px] text-muted-foreground font-mono">{e.situation} · Drive {e.drive}</div>
                </div>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${res.color}`}>
                  {res.short}
                </span>
                <button
                  onClick={() => setEntries((prev) => prev.filter((_, idx) => idx !== (entries.length - 1 - i)))}
                  className="shrink-0 text-[10px] text-muted-foreground/50 hover:text-destructive transition"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TENDENCY REPORT ── */}
      <div className="space-y-3">
        <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-muted-foreground">Tendency Report</span>

        {entries.length < 3 && (
          <div className="rounded-lg border border-dashed border-border/50 px-3 py-5 text-center text-[11px] text-muted-foreground">
            Log 3+ plays to see tendencies
          </div>
        )}

        {entries.length >= 3 && (
          <div key={entries.length} className="animate-[var(--animate-fade-in)] space-y-3">
            {/* Top Offensive Formations */}
            {analysis.topOffFormations.length > 0 && (
              <TendencyCard title="Opponent Runs" accent="team-one">
                {analysis.topOffFormations.map(({ name, count, pct }) => (
                  <FrequencyRow key={name} label={name} count={count} pct={pct} colorClass="bg-team-one" />
                ))}
              </TendencyCard>
            )}

            {/* Top Defensive Coverages */}
            {analysis.topDefPlays.length > 0 && (
              <TendencyCard title="Opponent Calls" accent="destructive">
                {analysis.topDefPlays.map(({ name, count, pct }) => (
                  <FrequencyRow key={name} label={name} count={count} pct={pct} colorClass="bg-destructive" />
                ))}
              </TendencyCard>
            )}

            {/* Danger zone */}
            {analysis.dangerSituation && (
              <TendencyCard title="🔥 Danger Zone" accent="accent-1">
                <p className="text-[11px] text-foreground/85">
                  They succeed most on <span className="font-semibold text-accent-1">{analysis.dangerSituation}</span>
                  {analysis.dangerFormation && <> from <span className="font-semibold">{analysis.dangerFormation}</span></>}.
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">Adjust your playcalling in this situation.</p>
              </TendencyCard>
            )}

            {/* Weakness */}
            {analysis.weakSituation && (
              <TendencyCard title="✅ Exploit This" accent="team-two">
                <p className="text-[11px] text-foreground/85">
                  They struggle on <span className="font-semibold text-team-two">{analysis.weakSituation}</span>
                  {analysis.weakFormation && <> from <span className="font-semibold">{analysis.weakFormation}</span></>}.
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">Attack this situation aggressively.</p>
              </TendencyCard>
            )}

            {/* Counter suggestions */}
            {analysis.counterSuggestions.length > 0 && (
              <TendencyCard title="📋 Suggested Counters" accent="team-one">
                {analysis.counterSuggestions.map((s) => (
                  <div key={s.coverageName} className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2 space-y-1.5">
                    <div className="text-[10px] font-semibold text-team-one">{s.coverageName}</div>
                    {s.counters.slice(0, 2).map((c) => (
                      <div key={c.play} className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-semibold">{c.play}</div>
                          <div className="text-[9px] text-muted-foreground">{c.formation} · {c.concept}</div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded bg-team-one/20 text-team-one px-1 text-[8px] font-bold">{c.tier}</span>
                          <button
                            onClick={() =>
                              onAddToBot(
                                `vs ${s.coverageName}`,
                                `${c.formation} → ${c.play} (${c.concept}). ${c.read}`,
                              )
                            }
                            className="text-[8px] font-bold text-muted-foreground hover:text-team-one transition"
                          >
                            + BOT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </TendencyCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── analysis engine ───────────────────────────────────────────────────────

type AnalysisResult = {
  topOffFormations: { name: string; count: number; pct: number }[];
  topDefPlays: { name: string; count: number; pct: number }[];
  dangerSituation: string | null;
  dangerFormation: string | null;
  weakSituation: string | null;
  weakFormation: string | null;
  counterSuggestions: { coverageName: string; counters: typeof COVERAGES[0]["counters"] }[];
};

function computeAnalysis(entries: TendencyEntry[]): AnalysisResult {
  const offEntries = entries.filter((e) => e.side === "OFF");
  const defEntries = entries.filter((e) => e.side === "DEF");

  // Formation frequency for offense
  const offFormCount = frequency(offEntries.map((e) => e.formation));
  const topOffFormations = topN(offFormCount, offEntries.length, 4);

  // Play frequency for defense
  const defPlayCount = frequency(defEntries.map((e) => e.play));
  const topDefPlays = topN(defPlayCount, defEntries.length, 4);

  // Danger + weak situations (avg score by situation)
  const sitScores: Record<string, number[]> = {};
  for (const e of entries) {
    if (!sitScores[e.situation]) sitScores[e.situation] = [];
    sitScores[e.situation].push(RESULT_SCORE[e.result]);
  }

  let dangerSituation: string | null = null;
  let dangerFormation: string | null = null;
  let weakSituation: string | null = null;
  let weakFormation: string | null = null;
  let bestScore = -Infinity;
  let worstScore = Infinity;

  for (const [sit, scores] of Object.entries(sitScores)) {
    if (scores.length < 1) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestScore) {
      bestScore = avg;
      dangerSituation = sit;
      // find most common formation in this situation
      const sitFormations = entries.filter((e) => e.situation === sit).map((e) => e.formation);
      const fc = frequency(sitFormations);
      dangerFormation = topN(fc, sitFormations.length, 1)[0]?.name ?? null;
    }
    if (avg < worstScore) {
      worstScore = avg;
      weakSituation = sit;
      const sitFormations = entries.filter((e) => e.situation === sit).map((e) => e.formation);
      const fc = frequency(sitFormations);
      weakFormation = topN(fc, sitFormations.length, 1)[0]?.name ?? null;
    }
  }

  // Counter suggestions based on top defensive plays seen
  const counterSuggestions: AnalysisResult["counterSuggestions"] = [];
  const seenCoverageIds = new Set<string>();
  for (const { name } of topDefPlays.slice(0, 3)) {
    const covId = guessCoverageId(name);
    if (!covId || seenCoverageIds.has(covId)) continue;
    seenCoverageIds.add(covId);
    const cov = COVERAGES.find((c) => c.id === covId);
    if (cov) counterSuggestions.push({ coverageName: cov.name, counters: cov.counters });
  }

  return { topOffFormations, topDefPlays, dangerSituation, dangerFormation, weakSituation, weakFormation, counterSuggestions };
}

function frequency(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!item) continue;
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return counts;
}

function topN(counts: Record<string, number>, total: number, n: number) {
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / Math.max(total, 1)) * 100) }));
}

// ─── sub-components ────────────────────────────────────────────────────────

function TendencyCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className={`text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-${accent}`}>{title}</div>
      {children}
    </div>
  );
}

function FrequencyRow({ label, count, pct, colorClass }: { label: string; count: number; pct: number; colorClass: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold truncate">{label}</span>
        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{count}× · {pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
