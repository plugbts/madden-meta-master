// ─── Read Analyzer — "What Did I Miss?" ──────────────────────────────────────
// QB read grader. Input what you saw, get a grade and coaching points.
// AI pipeline foundation for future clip analysis.

import { useState, useCallback } from "react";
import {
  analyzeRead,
  gradeColor,
  RECEIVER_NAMES,
  ROUTE_TYPES,
  OPEN_WINDOWS,
  DIFFICULTIES,
  type ReadAnalysisInput,
  type ReadAnalysisResult,
  type ReceiverRead,
  type PlayResult,
  type CoverageDifficulty,
  type OpenWindow,
  type RouteType,
} from "@/lib/read-analyzer";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAY_RESULTS: PlayResult[] = [
  "Completion", "Incomplete", "Touchdown", "Interception", "Sack", "Scramble", "Safety",
];

const TIME_IN_POCKET = [
  "Quick (< 2s)", "Normal (2-3s)", "Extended (3+ s)", "Sack",
] as const;

// ─── Receiver Builder ─────────────────────────────────────────────────────────
function ReceiverRow({
  receiver,
  index,
  onChange,
  onRemove,
}: {
  receiver: ReceiverRead;
  index: number;
  onChange: (updated: ReceiverRead) => void;
  onRemove: () => void;
}) {
  function update(patch: Partial<ReceiverRead>) {
    onChange({ ...receiver, ...patch });
  }

  return (
    <div className="rounded border border-border/30 bg-card/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <select
            value={receiver.name}
            onChange={(e) => update({ name: e.target.value })}
            className="rounded border border-border/40 bg-card/60 px-2 py-1 text-[11px] text-foreground focus:border-team-one/50 focus:outline-none"
          >
            {RECEIVER_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="Custom">Custom</option>
          </select>
          <select
            value={receiver.route}
            onChange={(e) => update({ route: e.target.value as RouteType })}
            className="rounded border border-border/40 bg-card/60 px-2 py-1 text-[11px] text-foreground focus:border-team-one/50 focus:outline-none"
          >
            {ROUTE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0} max={99}
              value={receiver.yards}
              onChange={(e) => update({ yards: Number(e.target.value) })}
              className="w-14 rounded border border-border/40 bg-card/60 px-2 py-1 text-[11px] text-foreground text-center focus:border-team-one/50 focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground">yds</span>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-muted-foreground/40 hover:text-destructive transition-colors text-[13px]"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {/* Was open? */}
        <button
          onClick={() => update({ wasOpen: !receiver.wasOpen })}
          className={`rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
            receiver.wasOpen
              ? "border-team-two/50 bg-team-two/10 text-team-two"
              : "border-border/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          {receiver.wasOpen ? "Open" : "Covered"}
        </button>

        {/* Targeted? */}
        <button
          onClick={() => update({ targeted: !receiver.targeted })}
          className={`rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
            receiver.targeted
              ? "border-team-one/50 bg-team-one/10 text-team-one"
              : "border-border/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          {receiver.targeted ? "✓ Targeted" : "Not targeted"}
        </button>

        {receiver.wasOpen && (
          <>
            <select
              value={receiver.openWindow}
              onChange={(e) => update({ openWindow: e.target.value as OpenWindow })}
              className="rounded border border-border/40 bg-card/60 px-2 py-1 text-[10px] text-foreground focus:border-team-one/50 focus:outline-none"
            >
              {OPEN_WINDOWS.filter((w) => w !== "Never open" && w !== "Closed before ball arrived").map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <select
              value={receiver.difficulty}
              onChange={(e) => update({ difficulty: e.target.value as CoverageDifficulty })}
              className="rounded border border-border/40 bg-card/60 px-2 py-1 text-[10px] text-foreground focus:border-team-one/50 focus:outline-none"
            >
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d} throw</option>)}
            </select>
          </>
        )}
      </div>

      <input
        className="w-full rounded border border-border/30 bg-transparent px-2.5 py-1 text-[10px] text-muted-foreground placeholder:text-muted-foreground/30 focus:border-team-one/40 focus:outline-none"
        placeholder="Coverage note (optional)"
        value={receiver.coverageNote}
        onChange={(e) => update({ coverageNote: e.target.value })}
      />
    </div>
  );
}

// ─── Result View ──────────────────────────────────────────────────────────────
function ResultView({ result, onReset }: { result: ReadAnalysisResult; onReset: () => void }) {
  const gc = gradeColor(result.grade);

  return (
    <div className="space-y-4 animate-[var(--animate-slide-up)]">
      {/* Grade banner */}
      <div className="glass-card p-5 flex items-center gap-6">
        <div className="text-center shrink-0">
          <div className="text-5xl font-display font-bold" style={{ color: gc }}>
            {result.grade}
          </div>
          <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1">QB Read Grade</div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-[13px] font-semibold text-foreground">
            {result.input.playResult}
            {result.input.yardage !== null && result.input.yardage > 0
              ? ` — ${result.input.yardage} yds`
              : ""}
          </div>
          <div className="text-[12px] font-bold" style={{ color: result.primaryMistake === "No mistake — correct read" ? "#22c55e" : "#f97316" }}>
            {result.primaryMistake}
          </div>
          <div className="flex gap-4 text-[10px] text-muted-foreground">
            <span>Open: <span className="text-team-two font-semibold">{result.openReceivers.length}</span></span>
            <span>Missed: <span className="text-destructive font-semibold">{result.missedReceivers.length}</span></span>
            <span>Targeted open: <span className={`font-semibold ${result.targetedWasOpen ? "text-team-two" : "text-destructive"}`}>{result.targetedWasOpen ? "Yes" : "No"}</span></span>
          </div>
        </div>
      </div>

      {/* Grade rationale */}
      <div className="grid gap-3 sm:grid-cols-2">
        {result.gradeRationale.positives.length > 0 && (
          <div className="rounded border border-team-two/20 bg-team-two/5 p-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-team-two/80">Positives</div>
            {result.gradeRationale.positives.map((p, i) => (
              <div key={i} className="flex gap-2 text-[11px] text-foreground/80">
                <span className="text-team-two shrink-0">+</span><span>{p}</span>
              </div>
            ))}
          </div>
        )}
        {result.gradeRationale.negatives.length > 0 && (
          <div className="rounded border border-destructive/20 bg-destructive/5 p-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-destructive/80">Issues</div>
            {result.gradeRationale.negatives.map((n, i) => (
              <div key={i} className="flex gap-2 text-[11px] text-foreground/80">
                <span className="text-destructive shrink-0">−</span><span>{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Best option */}
      {result.bestOption && (
        <div className="glass-card p-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-accent-1/80">Best Available Read</div>
          <div className="text-[13px] font-semibold text-foreground">{result.bestOptionDescription}</div>
          {!result.targetedWasOpen && (
            <div className="text-[11px] text-muted-foreground">
              {result.targetedReceiver
                ? `You targeted ${result.targetedReceiver.name} instead.`
                : "No targeted receiver logged."}
            </div>
          )}
        </div>
      )}

      {/* Open receivers list */}
      {result.openReceivers.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Open Receivers</div>
          {result.openReceivers.map((r, i) => (
            <div key={r.id} className={`flex items-center justify-between rounded border px-3 py-2 ${r.targeted ? "border-team-two/30 bg-team-two/5" : "border-border/30 bg-card/20"}`}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-foreground">{i + 1}. {r.name}</span>
                  {r.targeted && <span className="text-[9px] font-bold uppercase text-team-two bg-team-two/15 px-1.5 py-0.5 rounded">Targeted</span>}
                </div>
                <div className="text-[10px] text-muted-foreground">{r.route} · {r.openWindow}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[13px] font-display font-bold text-foreground">{r.yards} yds</div>
                <div className="text-[9px] text-muted-foreground">{r.difficulty}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coaching points */}
      {result.coachingPoints.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Coaching Points</div>
          {result.coachingPoints.map((pt, i) => (
            <div key={i} className="flex gap-2 rounded border border-border/20 bg-card/20 px-3 py-2 text-[12px] text-foreground/80">
              <span className="text-accent-1 shrink-0">◆</span>
              <span className="leading-relaxed">{pt}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI payload preview */}
      <div className="space-y-2">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(result.aiPayload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `read-analysis-${result.id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="rounded border border-muted-foreground/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground hover:border-muted-foreground/40 transition-colors"
        >
          Export AI Payload
        </button>
      </div>

      <button
        onClick={onReset}
        className="w-full rounded border border-border/40 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-colors"
      >
        Analyze Another Play
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function newReceiver(index: number): ReceiverRead {
  return {
    id: `rec-${Date.now()}-${index}`,
    name: RECEIVER_NAMES[index % RECEIVER_NAMES.length],
    route: "Slant",
    yards: 8,
    wasOpen: false,
    openWindow: "2-3 seconds (rhythm)",
    difficulty: "Moderate",
    targeted: false,
    depthAtWindow: "Intermediate (6-14 yds)",
    coverageNote: "",
  };
}

export function ReadAnalyzer() {
  const [result, setResult] = useState<ReadAnalysisResult | null>(null);
  const [playResult, setPlayResult] = useState<PlayResult>("Incomplete");
  const [yardage, setYardage] = useState<string>("0");
  const [timeInPocket, setTimeInPocket] = useState<ReadAnalysisInput["timeInPocket"]>("Normal (2-3s)");
  const [blitzDetected, setBlitzDetected] = useState(false);
  const [down, setDown] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [preSnapCoverage, setPreSnapCoverage] = useState("");
  const [actualCoverage, setActualCoverage] = useState("");
  const [userNote, setUserNote] = useState("");
  const [receivers, setReceivers] = useState<ReceiverRead[]>([
    newReceiver(0), newReceiver(1), newReceiver(2),
  ]);

  const updateReceiver = useCallback((index: number, updated: ReceiverRead) => {
    setReceivers((prev) => prev.map((r, i) => (i === index ? updated : r)));
  }, []);

  const removeReceiver = useCallback((index: number) => {
    setReceivers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addReceiver = useCallback(() => {
    setReceivers((prev) => [...prev, newReceiver(prev.length)]);
  }, []);

  function runAnalysis() {
    // Compute effective receivers — ensure exactly one is targeted, at most.
    // If none targeted, mark the last receiver. If multiple targeted, keep only
    // the first. This is done without triggering a state update before the call.
    let effectiveReceivers = [...receivers];
    const targetedIndices = effectiveReceivers
      .map((r, i) => (r.targeted ? i : -1))
      .filter((i) => i >= 0);

    if (targetedIndices.length === 0 && effectiveReceivers.length > 0) {
      // Auto-target last receiver and reflect in state
      const lastIdx = effectiveReceivers.length - 1;
      effectiveReceivers[lastIdx] = { ...effectiveReceivers[lastIdx], targeted: true };
      setReceivers(effectiveReceivers);
    } else if (targetedIndices.length > 1) {
      // Keep only the first targeted; un-target the rest
      effectiveReceivers = effectiveReceivers.map((r, i) => ({
        ...r,
        targeted: i === targetedIndices[0],
      }));
      setReceivers(effectiveReceivers);
    }

    const input: ReadAnalysisInput = {
      playResult,
      yardage: yardage ? Number(yardage) : null,
      receivers: effectiveReceivers,
      preSnapCoverage: preSnapCoverage || null,
      actualCoverage: actualCoverage || null,
      blitzDetected,
      timeInPocket,
      down: down ? Number(down) : null,
      distance: distance ? Number(distance) : null,
      userNote,
    };
    setResult(analyzeRead(input));
  }

  function reset() {
    setResult(null);
    setReceivers([newReceiver(0), newReceiver(1), newReceiver(2)]);
    setPlayResult("Incomplete");
    setYardage("0");
    setBlitzDetected(false);
    setDown("");
    setDistance("");
    setPreSnapCoverage("");
    setActualCoverage("");
    setUserNote("");
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">What Did I Miss?</h2>
        </div>
        <ResultView result={result} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">What Did I Miss?</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Grade your QB read — log what you saw, get coaching points and a read grade
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Play context */}
        <div className="space-y-4">
          <div className="glass-card p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Play Context
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {/* Play result */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground/70">Result</label>
                <select
                  value={playResult}
                  onChange={(e) => setPlayResult(e.target.value as PlayResult)}
                  className="w-full rounded border border-border/40 bg-card/60 px-2.5 py-1.5 text-[12px] text-foreground focus:border-team-one/50 focus:outline-none"
                >
                  {PLAY_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Yardage */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground/70">Yardage</label>
                <input
                  type="number" min={0} max={99}
                  value={yardage}
                  onChange={(e) => setYardage(e.target.value)}
                  className="w-full rounded border border-border/40 bg-card/60 px-2.5 py-1.5 text-[12px] text-foreground focus:border-team-one/50 focus:outline-none"
                />
              </div>

              {/* Down / Distance */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground/70">Down</label>
                <select
                  value={down}
                  onChange={(e) => setDown(e.target.value)}
                  className="w-full rounded border border-border/40 bg-card/60 px-2.5 py-1.5 text-[12px] text-foreground focus:border-team-one/50 focus:outline-none"
                >
                  <option value="">—</option>
                  {[1,2,3,4].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground/70">Distance</label>
                <input
                  type="number" min={1} max={40}
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="yds"
                  className="w-full rounded border border-border/40 bg-card/60 px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/30 focus:border-team-one/50 focus:outline-none"
                />
              </div>

              {/* Time in pocket */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-muted-foreground/70">Time in Pocket</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_IN_POCKET.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeInPocket(t)}
                      className={`rounded border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        timeInPocket === t
                          ? "border-team-one/50 bg-team-one/10 text-team-one"
                          : "border-border/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Blitz toggle */}
            <button
              onClick={() => setBlitzDetected(!blitzDetected)}
              className={`flex items-center gap-2 rounded border px-3 py-2 w-full text-[11px] font-medium transition-colors ${
                blitzDetected
                  ? "border-blitz/50 bg-blitz/10 text-blitz"
                  : "border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{blitzDetected ? "●" : "○"}</span>
              Blitz detected on this play
            </button>

            {/* Coverage context */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground/70">Pre-snap read</label>
                <input
                  className="w-full rounded border border-border/30 bg-transparent px-2.5 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:border-team-one/40 focus:outline-none"
                  placeholder="e.g. Cover 2"
                  value={preSnapCoverage}
                  onChange={(e) => setPreSnapCoverage(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground/70">Actual coverage</label>
                <input
                  className="w-full rounded border border-border/30 bg-transparent px-2.5 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:border-team-one/40 focus:outline-none"
                  placeholder="e.g. Cover 3 Buzz"
                  value={actualCoverage}
                  onChange={(e) => setActualCoverage(e.target.value)}
                />
              </div>
            </div>

            {/* User note */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground/70">Your assessment</label>
              <textarea
                rows={2}
                className="w-full rounded border border-border/30 bg-transparent px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:border-team-one/40 focus:outline-none resize-none"
                placeholder="What do you think went wrong? (optional)"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Receivers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Receivers ({receivers.length})
            </div>
            <div className="text-[9px] text-muted-foreground/50">Mark one as "Targeted"</div>
          </div>
          <div className="space-y-2">
            {receivers.map((r, i) => (
              <ReceiverRow
                key={r.id}
                receiver={r}
                index={i}
                onChange={(updated) => updateReceiver(i, updated)}
                onRemove={() => removeReceiver(i)}
              />
            ))}
          </div>
          {receivers.length < 6 && (
            <button
              onClick={addReceiver}
              className="w-full rounded border border-dashed border-border/40 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              + Add Receiver
            </button>
          )}

          <button
            onClick={runAnalysis}
            className="w-full rounded border border-team-one/60 bg-team-one/15 py-3 text-[13px] font-bold uppercase tracking-wider text-team-one hover:bg-team-one/25 transition-colors"
          >
            Grade My Read
          </button>
        </div>
      </div>
    </div>
  );
}
