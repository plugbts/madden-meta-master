import { useState, useCallback } from "react";
import {
  analyzePreSnap,
  DEFAULT_INPUTS,
  type PreSnapInputs,
  type Coverage,
  type SafetyDepth,
  type SafetySpacing,
  type CBLeverage,
  type NickelAlignment,
  type SlotDefender,
  type LBDepth,
  type LBSpacing,
  type DLAlignment,
  type UserPosition,
  type DefAdjustment,
  type BlitzLook,
  type UserObservableEvidence,
} from "@/lib/pre-snap-engine";
import {
  logResult,
  getStore,
  getHistoricalBoost,
  getAccuracyStats,
  getOpponentTendency,
  getTopOpponentCoverage,
  clearHistory,
  type PostSnapResult,
} from "@/lib/pre-snap-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelTab = "analyze" | "recs" | "validate" | "history";

// ─── Option Lists ─────────────────────────────────────────────────────────────

const SAFETY_DEPTH: SafetyDepth[] = ["Deep (15+ yds)", "Mid (8-12 yds)", "Shallow (5-7 yds)", "In the box"];
const SAFETY_SPACING: SafetySpacing[] = ["Split wide", "Centerfield", "Rotated strong", "Rotated weak"];
const CB_LEVERAGE: CBLeverage[] = ["Press (0-2 yds)", "Off-man (3-5 yds)", "Cushion (7+ yds)", "Inside shade", "Outside shade"];
const NICKEL_ALIGNMENT: NickelAlignment[] = ["Normal", "Mugged / walked up", "Walked out wide", "Blitz look"];
const SLOT_DEFENDER: SlotDefender[] = ["Playing zone", "Playing man", "Walked up tight"];
const LB_DEPTH: LBDepth[] = ["Deep (8+ yds)", "Normal (4-7 yds)", "Mugged (0-3 yds)", "A-gap shade"];
const LB_SPACING: LBSpacing[] = ["Wide", "Normal", "Pinched"];
const DL_ALIGNMENT: DLAlignment[] = ["Normal", "Over (shifted strong)", "Under (shifted weak)", "Wide (pass rush)"];
const USER_POSITION: UserPosition[] = ["None visible", "FS", "SS", "LB", "CB"];
const DEF_ADJUSTMENT: DefAdjustment[] = ["None", "Pinch", "Spread", "Press all", "Cushion all", "Shade inside", "Shade outside", "Over top"];
const BLITZ_LOOK: BlitzLook[] = ["None", "A-gap shade", "Edge walk-up", "DB walked down", "Multiple walk-ups"];
const ALL_COVERAGES: Coverage[] = [
  "Cover 0", "Cover 1", "Cover 1 Robber", "Cover 2 Zone", "Cover 2 Tampa",
  "Cover 2 Invert", "Cover 3 Sky", "Cover 3 Buzz", "Cover 3 Cloud", "Cover 3 Match",
  "Cover 4 Quarters", "Cover 4 Palms", "Cover 6", "Man Free", "Zero Blitz", "Cover 2 Man Under",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#eab308";
  if (pct >= 40) return "#f97316";
  return "#ef4444";
}

function blitzColor(pct: number): string {
  if (pct >= 70) return "#ef4444";
  if (pct >= 40) return "#f97316";
  if (pct >= 20) return "#eab308";
  return "#22c55e";
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] text-foreground focus:border-team-one focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PreSnapPanel() {
  const [open, setOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("analyze");
  const [inputs, setInputs] = useState<PreSnapInputs>(DEFAULT_INPUTS);
  const [opponent, setOpponent] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [analysis, setAnalysis] = useState(() => analyzePreSnap(DEFAULT_INPUTS));
  const [actualCoverage, setActualCoverage] = useState<Coverage>("Cover 3 Sky");
  const [validateNote, setValidateNote] = useState("");
  const [lastLogged, setLastLogged] = useState<PostSnapResult | null>(null);
  const [history, setHistory] = useState(() => getStore().history);
  const [historyOpponent, setHistoryOpponent] = useState("");
  const [cleared, setCleared] = useState(false);

  const setField = useCallback(<K extends keyof PreSnapInputs>(key: K, val: PreSnapInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: val }));
    setAnalyzed(false);
  }, []);

  function runAnalysis() {
    const boost = opponent ? getHistoricalBoost(opponent) : {};
    const result = analyzePreSnap(inputs, boost);
    setAnalysis(result);
    setAnalyzed(true);
    setPanelTab("analyze");
  }

  function logPostSnap() {
    if (!analyzed) return;
    const result = logResult({ opponent: opponent || "Unknown", inputs, analysis, actualCoverage, note: validateNote });
    setLastLogged(result);
    setHistory(getStore().history);
    setValidateNote("");
    setPanelTab("history");
  }

  function handleClear() {
    clearHistory();
    setHistory([]);
    setCleared(true);
    setTimeout(() => setCleared(false), 1500);
  }

  const tendency = opponent ? getOpponentTendency(opponent) : null;
  const stats = getAccuracyStats(history);
  const filteredHistory = historyOpponent
    ? history.filter((h) => h.opponent.toLowerCase().includes(historyOpponent.toLowerCase()))
    : history;

  const PANEL_TABS: { id: PanelTab; label: string }[] = [
    { id: "analyze", label: "Read" },
    { id: "recs", label: "Attack" },
    { id: "validate", label: "Post-Snap" },
    { id: "history", label: "History" },
  ];

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-widest shadow-xl transition-all duration-200 ${
          open
            ? "border-team-one bg-team-one text-background"
            : "border-team-one/60 bg-background/90 text-team-one backdrop-blur-md hover:border-team-one hover:bg-team-one/10"
        }`}
        title="Pre-Snap Recognition Engine"
      >
        <span className="text-[13px]">⚡</span>
        PRE-SNAP
        {history.length > 0 && !open && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-team-one text-[9px] font-bold text-background">
            {Math.min(history.length, 99)}
          </span>
        )}
      </button>

      {/* ── Slide-up Panel ── */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-end" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="relative z-50 flex h-[90vh] w-full max-w-xl flex-col border-l border-t border-border/60 bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border/50 bg-background/95 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">⚡</span>
                <div>
                  <div className="text-[13px] font-bold uppercase tracking-widest text-foreground">Pre-Snap Engine</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Recognition · Disguise · Attack</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                ✕
              </button>
            </div>

            {/* Opponent Input */}
            <div className="flex items-center gap-2 border-b border-border/30 bg-muted/20 px-4 py-2">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">vs.</span>
              <input
                value={opponent}
                onChange={(e) => { setOpponent(e.target.value); setAnalyzed(false); }}
                placeholder="Opponent gamertag (optional)"
                className="flex-1 rounded-md border border-border/40 bg-background px-2 py-1 text-[11px] text-foreground placeholder-muted-foreground/50 focus:border-team-one focus:outline-none"
              />
              {tendency && (
                <span className="rounded bg-team-one/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-team-one">
                  {tendency.snaps} snaps
                </span>
              )}
            </div>

            {/* Panel Tab Bar */}
            <div className="flex border-b border-border/40 bg-background/80">
              {PANEL_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPanelTab(t.id)}
                  className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    panelTab === t.id
                      ? "border-b-2 border-team-one text-foreground"
                      : "text-muted-foreground hover:text-foreground/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── READ TAB ── */}
              {panelTab === "analyze" && (
                <div className="flex flex-col gap-4 p-4">
                  {/* Alignment Inputs */}
                  <div>
                    <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Defensive Alignment</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select label="Safety Depth" value={inputs.safetyDepth} options={SAFETY_DEPTH} onChange={(v) => setField("safetyDepth", v)} />
                      <Select label="Safety Spacing" value={inputs.safetySpacing} options={SAFETY_SPACING} onChange={(v) => setField("safetySpacing", v)} />
                      <Select label="CB Leverage" value={inputs.cbLeverage} options={CB_LEVERAGE} onChange={(v) => setField("cbLeverage", v)} />
                      <Select label="Nickel Alignment" value={inputs.nickelAlignment} options={NICKEL_ALIGNMENT} onChange={(v) => setField("nickelAlignment", v)} />
                      <Select label="Slot Defender" value={inputs.slotDefender} options={SLOT_DEFENDER} onChange={(v) => setField("slotDefender", v)} />
                      <Select label="LB Depth" value={inputs.lbDepth} options={LB_DEPTH} onChange={(v) => setField("lbDepth", v)} />
                      <Select label="LB Spacing" value={inputs.lbSpacing} options={LB_SPACING} onChange={(v) => setField("lbSpacing", v)} />
                      <Select label="DL Alignment" value={inputs.dlAlignment} options={DL_ALIGNMENT} onChange={(v) => setField("dlAlignment", v)} />
                      <Select label="Def Adjustment" value={inputs.adjustment} options={DEF_ADJUSTMENT} onChange={(v) => setField("adjustment", v)} />
                    </div>
                    <div className="mt-2">
                      <Select label="Blitz Look" value={inputs.blitzLook} options={BLITZ_LOOK} onChange={(v) => setField("blitzLook", v)} />
                    </div>

                    {/* User Defender Evidence (evidence-based — do not guess) */}
                    <div className="mt-3 rounded-lg border border-border/40 bg-muted/10 p-3">
                      <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        User Defender Detection
                      </div>
                      <p className="text-[9px] text-muted-foreground/70 mb-2 leading-relaxed">
                        Only report what you directly observed. Do not guess.
                      </p>
                      <div className="flex flex-col gap-1.5 mb-3">
                        {(
                          [
                            { id: "user_icon_visible",   label: "User indicator icon above a defender" },
                            { id: "manual_presnap_move", label: "Defender repositioned manually before snap" },
                            { id: "manual_strafing",     label: "Manual strafing / lateral movement observed" },
                            { id: "manual_rush_path",    label: "Unnatural post-snap rush path (user input)" },
                            { id: "continuous_input",    label: "Continuous erratic movement pattern" },
                          ] as { id: UserObservableEvidence; label: string }[]
                        ).map(({ id, label }) => {
                          const checked = (inputs.userEvidence ?? []).includes(id);
                          return (
                            <label key={id} className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                className="mt-0.5 accent-blue-400"
                                onChange={() => {
                                  const current = (inputs.userEvidence ?? []).filter(e => e !== "none");
                                  const next = checked
                                    ? current.filter(e => e !== id)
                                    : [...current, id];
                                  setField("userEvidence", next.length === 0 ? ["none"] : next);
                                  setAnalyzed(false);
                                }}
                              />
                              <span className="text-[10px] text-foreground/80 leading-relaxed">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {(inputs.userEvidence ?? []).some(e => e !== "none") && (
                        <div className="mt-2">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            Suspected Position (only if evidence supports)
                          </label>
                          <select
                            value={inputs.userSuspectedPosition ?? ""}
                            onChange={e => {
                              setField("userSuspectedPosition", e.target.value as UserPosition | "Unknown" || undefined);
                              setAnalyzed(false);
                            }}
                            className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] text-foreground focus:border-team-one focus:outline-none"
                          >
                            <option value="">— Not confirmed</option>
                            <option value="FS">FS — Free Safety</option>
                            <option value="SS">SS — Strong Safety</option>
                            <option value="LB">LB — Linebacker</option>
                            <option value="CB">CB — Cornerback</option>
                            <option value="Unknown">Unknown — Insufficient evidence</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Down</label>
                        <select
                          value={inputs.situationDown ?? ""}
                          onChange={(e) => setField("situationDown", e.target.value ? Number(e.target.value) : undefined)}
                          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] text-foreground focus:border-team-one focus:outline-none"
                        >
                          <option value="">—</option>
                          {[1, 2, 3, 4].map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Yards to Go</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={inputs.situationYards ?? ""}
                          onChange={(e) => setField("situationYards", e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="e.g. 7"
                          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] text-foreground placeholder-muted-foreground/50 focus:border-team-one focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Analyze Button */}
                  <button
                    onClick={runAnalysis}
                    className="w-full rounded-lg border border-team-one bg-team-one/10 py-2.5 text-[12px] font-bold uppercase tracking-widest text-team-one hover:bg-team-one/20 transition-colors"
                  >
                    ⚡ Read the Defense
                  </button>

                  {/* Results */}
                  {analyzed && (
                    <div className="flex flex-col gap-3">
                      {/* Shell */}
                      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Shell Identified</div>
                        <div className="flex items-center justify-between">
                          <span className="text-[15px] font-bold text-foreground">{analysis.shell}</span>
                          <span className="text-[11px] font-bold" style={{ color: confidenceColor(analysis.shellConfidence) }}>
                            {analysis.shellConfidence}% confident
                          </span>
                        </div>
                      </div>

                      {/* Coverage Conclusion — gated output */}
                      <div className={`rounded-lg border p-3 ${
                        analysis.coverageConclusion === "Unknown"
                          ? "border-red-500/40 bg-red-500/5"
                          : analysis.coverageConclusion === "Multiple Possibilities"
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-team-one/40 bg-team-one/5"
                      }`}>
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Coverage Conclusion</div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[16px] font-bold ${
                            analysis.coverageConclusion === "Unknown"
                              ? "text-red-400"
                              : analysis.coverageConclusion === "Multiple Possibilities"
                              ? "text-amber-400"
                              : "text-team-one"
                          }`}>
                            {analysis.coverageConclusion}
                          </span>
                          <span className="text-[11px] font-bold" style={{ color: confidenceColor(analysis.topConfidence) }}>
                            {analysis.topConfidence}% evidence
                          </span>
                        </div>
                        {analysis.isLowConfidence && (
                          <p className="mt-1 text-[9px] text-red-400/80">
                            Insufficient evidence — too many coverages are equally possible. Log more observable signals.
                          </p>
                        )}
                        {analysis.isAmbiguous && !analysis.isLowConfidence && (
                          <p className="mt-1 text-[9px] text-amber-400/80">
                            Gap between top two is &lt;{12}% — monitor post-snap rotation to confirm.
                          </p>
                        )}
                        {!analysis.isLowConfidence && !analysis.isAmbiguous && (
                          <p className="mt-1 text-[9px] text-team-one/70">
                            Best guess: {analysis.topCoverage} ({analysis.topConfidence}%)
                          </p>
                        )}
                        {tendency && tendency.snaps >= 3 && (
                          <div className="mt-1 text-[9px] text-muted-foreground">
                            ↑ Boosted by {tendency.snaps} logged snaps vs. {opponent}
                          </div>
                        )}
                      </div>

                      {/* User Defender Detection Card */}
                      <div className={`rounded-lg border p-3 ${
                        analysis.userDetection.insufficientEvidence
                          ? "border-border/40 bg-muted/10"
                          : analysis.userDetection.confidence === "High"
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-amber-500/30 bg-amber-500/5"
                      }`}>
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">User Defender</div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[15px] font-bold ${
                            analysis.userDetection.position === "Unknown"
                              ? "text-muted-foreground"
                              : analysis.userDetection.confidence === "High"
                              ? "text-green-400"
                              : "text-amber-400"
                          }`}>
                            {analysis.userDetection.position === "Unknown" ? "Unknown" : analysis.userDetection.position}
                          </span>
                          <span className={`text-[11px] font-bold uppercase ${
                            analysis.userDetection.confidence === "High" ? "text-green-400"
                            : analysis.userDetection.confidence === "Medium" ? "text-amber-400"
                            : "text-muted-foreground"
                          }`}>
                            {analysis.userDetection.confidence} confidence
                          </span>
                        </div>
                        {analysis.userDetection.location && (
                          <p className="text-[9px] text-muted-foreground mt-0.5">{analysis.userDetection.location}</p>
                        )}
                        {analysis.userDetection.evidenceUsed.length > 0 ? (
                          <ul className="mt-1.5 flex flex-col gap-0.5">
                            {analysis.userDetection.evidenceUsed.map((e, i) => (
                              <li key={i} className="text-[9px] text-foreground/60 flex gap-1">
                                <span className="text-green-400/70 shrink-0">✓</span>
                                <span>{e}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-[9px] text-muted-foreground/60">
                            No evidence logged. Check signals above and re-read.
                          </p>
                        )}
                      </div>

                      {/* Coverage Breakdown */}
                      <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
                        <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Coverage Confidence Model</div>
                        <div className="flex flex-col gap-1.5">
                          {analysis.coverageBreakdown.map(({ coverage, confidence }) => (
                            <div key={coverage}>
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="text-foreground font-medium">{coverage}</span>
                                <span className="font-bold" style={{ color: confidenceColor(confidence) }}>{confidence}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${confidence}%`, backgroundColor: confidenceColor(confidence) }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Blitz Probability */}
                      <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Blitz Probability</div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${analysis.blitzProbability}%`, backgroundColor: blitzColor(analysis.blitzProbability) }}
                            />
                          </div>
                          <span className="text-[13px] font-bold w-10 text-right" style={{ color: blitzColor(analysis.blitzProbability) }}>
                            {analysis.blitzProbability}%
                          </span>
                        </div>
                        {analysis.blitzProbability >= 60 && (
                          <div className="mt-1.5 text-[10px] font-bold text-red-400">⚠ HIGH BLITZ — Set a hot route before the snap</div>
                        )}
                      </div>

                      {/* Disguise Flags */}
                      {analysis.disguises.length > 0 && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-amber-400">Disguise Alerts</div>
                          <div className="flex flex-col gap-2">
                            {analysis.disguises.map((d, i) => (
                              <div key={i} className="border-b border-border/20 pb-2 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-amber-300">{d.likelyCoverage}</span>
                                  <span className="text-amber-400">{d.probability}% chance</span>
                                </div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">{d.indicator}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Adjustment Impact */}
                      {inputs.adjustment !== "None" && (
                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                          <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-blue-400">Adjustment Impact</div>
                          <p className="text-[10px] text-foreground/80">{analysis.adjustmentImpact}</p>
                        </div>
                      )}

                      {/* Evidence Trail */}
                      <div className="rounded-lg border border-border/30 bg-muted/10 p-3">
                        <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Evidence Trail</div>
                        <ul className="flex flex-col gap-1">
                          {analysis.evidenceTrail.map((line, i) => (
                            <li key={i} className="flex gap-2 text-[9px] text-foreground/70">
                              <span className="text-blue-400/70 shrink-0">▸</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Reasoning */}
                      <div className="rounded-lg border border-border/30 bg-muted/10 p-3">
                        <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">QB Reasoning</div>
                        <ul className="flex flex-col gap-1">
                          {analysis.reasoning.map((line, i) => (
                            <li key={i} className="flex gap-2 text-[10px] text-foreground/75">
                              <span className="text-team-one shrink-0">›</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTA to Attack tab */}
                      <button
                        onClick={() => setPanelTab("recs")}
                        className="w-full rounded-lg border border-green-500/40 bg-green-500/10 py-2 text-[11px] font-bold uppercase tracking-wider text-green-400 hover:bg-green-500/20 transition-colors"
                      >
                        → See Attack Recommendations
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── ATTACK TAB ── */}
              {panelTab === "recs" && (
                <div className="flex flex-col gap-4 p-4">
                  {!analyzed && (
                    <div className="rounded-lg border border-border/40 bg-muted/10 p-6 text-center">
                      <div className="text-[11px] text-muted-foreground">Run an alignment read first on the Read tab.</div>
                    </div>
                  )}

                  {analyzed && (
                    <>
                      <div className="rounded-lg border border-team-one/40 bg-team-one/5 p-3">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Attacking</div>
                        <div className="text-[16px] font-bold text-team-one">{analysis.topCoverage}</div>
                      </div>

                      {/* Opponent tendencies */}
                      {tendency && tendency.snaps >= 3 && (
                        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
                          <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-purple-400">Historical Tendencies — {opponent}</div>
                          <div className="flex flex-col gap-1.5">
                            {getTopOpponentCoverage(tendency).map(({ coverage, pct }) => (
                              <div key={coverage}>
                                <div className="flex justify-between text-[10px] mb-0.5">
                                  <span className="text-foreground/80">{coverage}</span>
                                  <span className="font-bold text-purple-300">{pct}%</span>
                                </div>
                                <div className="h-1 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-1.5 text-[9px] text-muted-foreground">{tendency.snaps} total snaps logged</div>
                        </div>
                      )}

                      {/* Recommendations */}
                      <div className="flex flex-col gap-3">
                        {analysis.recommendations.map((rec, i) => (
                          <div key={i} className={`rounded-lg border p-3 ${i === 0 ? "border-green-500/40 bg-green-500/5" : "border-border/40 bg-muted/10"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className={`text-[12px] font-bold ${i === 0 ? "text-green-400" : "text-foreground"}`}>
                                  {i === 0 && <span className="mr-1">★</span>}{rec.concept}
                                </div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">{rec.formation}</div>
                              </div>
                              <span
                                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                                style={{ color: confidenceColor(rec.confidence), backgroundColor: `${confidenceColor(rec.confidence)}20` }}
                              >
                                {rec.confidence}%
                              </span>
                            </div>
                            <p className="mt-1.5 text-[10px] text-foreground/70">{rec.reasoning}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {rec.routes.map((r) => (
                                <span key={r} className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-medium text-blue-300">{r}</span>
                              ))}
                              {rec.motions.map((m) => (
                                <span key={m} className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">{m}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Validate CTA */}
                      <button
                        onClick={() => setPanelTab("validate")}
                        className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        → Log Post-Snap Result
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── POST-SNAP TAB ── */}
              {panelTab === "validate" && (
                <div className="flex flex-col gap-4 p-4">
                  <div>
                    <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Prediction to Validate</div>
                    {analyzed ? (
                      <div className="rounded-lg border border-team-one/30 bg-team-one/5 p-3 text-[12px] font-bold text-team-one">
                        {analysis.topCoverage} ({analysis.topConfidence}%)
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/40 bg-muted/10 p-3 text-[11px] text-muted-foreground">
                        Run a read first on the Read tab.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Actual Coverage (Post-Snap)</label>
                    <select
                      value={actualCoverage}
                      onChange={(e) => setActualCoverage(e.target.value as Coverage)}
                      className="rounded-md border border-border/60 bg-background px-2 py-2 text-[11px] text-foreground focus:border-team-one focus:outline-none"
                    >
                      {ALL_COVERAGES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Note (optional)</label>
                    <textarea
                      value={validateNote}
                      onChange={(e) => setValidateNote(e.target.value)}
                      placeholder="e.g. He rotated late to Cover 2 from a Cover 3 look"
                      rows={3}
                      className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] text-foreground placeholder-muted-foreground/40 resize-none focus:border-team-one focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={logPostSnap}
                    disabled={!analyzed}
                    className="w-full rounded-lg border border-green-500/40 bg-green-500/10 py-2.5 text-[12px] font-bold uppercase tracking-wider text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Log Result & Train System
                  </button>

                  {lastLogged && (
                    <div className={`rounded-lg border p-3 text-center ${lastLogged.correct ? "border-green-500/40 bg-green-500/10" : "border-red-500/30 bg-red-500/5"}`}>
                      <div className={`text-[13px] font-bold ${lastLogged.correct ? "text-green-400" : "text-red-400"}`}>
                        {lastLogged.correct ? "✓ Correct Read!" : "✗ Incorrect — System Updated"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Predicted {lastLogged.predictedCoverage} · Actual {lastLogged.actualCoverage}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── HISTORY TAB ── */}
              {panelTab === "history" && (
                <div className="flex flex-col gap-4 p-4">
                  {/* Accuracy Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border/40 bg-muted/10 p-2.5 text-center">
                      <div className="text-[18px] font-bold text-foreground">{stats.total}</div>
                      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">Total Reads</div>
                    </div>
                    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-2.5 text-center">
                      <div className="text-[18px] font-bold text-green-400">{stats.correct}</div>
                      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">Correct</div>
                    </div>
                    <div className={`rounded-lg border p-2.5 text-center ${stats.accuracy >= 70 ? "border-green-500/30 bg-green-500/5" : stats.accuracy >= 50 ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                      <div className={`text-[18px] font-bold ${stats.accuracy >= 70 ? "text-green-400" : stats.accuracy >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {stats.accuracy}%
                      </div>
                      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">Accuracy</div>
                    </div>
                  </div>

                  {/* By Opponent */}
                  {stats.byOpponent.length > 0 && (
                    <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
                      <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">By Opponent</div>
                      <div className="flex flex-col gap-1.5">
                        {stats.byOpponent.map((o) => (
                          <div key={o.opponent} className="flex items-center justify-between text-[10px]">
                            <span className="text-foreground/80">{o.opponent}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{o.correct}/{o.total}</span>
                              <span className="font-bold w-8 text-right" style={{ color: confidenceColor(o.accuracy) }}>{o.accuracy}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filter */}
                  <input
                    value={historyOpponent}
                    onChange={(e) => setHistoryOpponent(e.target.value)}
                    placeholder="Filter by opponent..."
                    className="rounded-md border border-border/40 bg-background px-2 py-1.5 text-[11px] text-foreground placeholder-muted-foreground/40 focus:border-team-one focus:outline-none"
                  />

                  {/* History List */}
                  {filteredHistory.length === 0 ? (
                    <div className="rounded-lg border border-border/30 bg-muted/10 p-6 text-center text-[11px] text-muted-foreground">
                      No logged reads yet. Analyze a defensive alignment and log the result.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {filteredHistory.slice(0, 50).map((h) => (
                        <div
                          key={h.id}
                          className={`rounded-lg border p-2.5 ${h.correct ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={h.correct ? "text-green-400" : "text-red-400"}>{h.correct ? "✓" : "✗"}</span>
                              <span className="text-[11px] font-bold text-foreground">{h.predictedCoverage}</span>
                              {!h.correct && (
                                <span className="text-[9px] text-muted-foreground">→ was {h.actualCoverage}</span>
                              )}
                            </div>
                            <span className="text-[9px] text-muted-foreground">{h.opponent}</span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[9px] text-muted-foreground">{h.predictedShell} · {h.predictedConfidence}% confident</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(h.timestamp).toLocaleDateString()}</span>
                          </div>
                          {h.note && <div className="mt-1 text-[9px] text-foreground/60 italic">"{h.note}"</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Clear Button */}
                  {history.length > 0 && (
                    <button
                      onClick={handleClear}
                      className="w-full rounded-lg border border-red-500/30 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400/70 hover:border-red-500/60 hover:text-red-400 transition-colors"
                    >
                      {cleared ? "Cleared" : "Clear All History"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
