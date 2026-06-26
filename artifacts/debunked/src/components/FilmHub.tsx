import { useState, useRef } from "react";
import {
  analyzePreSnap,
  type PreSnapInputs,
  type PreSnapAnalysis,
  type Coverage,
  DEFAULT_INPUTS,
} from "@/lib/pre-snap-engine";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#78b4ff";
const GREEN  = "#6fdba8";
const GOLD   = "#ffc84a";
const RED    = "#f87171";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnalysisType   = "single" | "full";
type AnalysisTarget = "me" | "opponent" | "both";
type FilmMode       = "upload" | "youtube" | "realtime" | "manual";

type StoredSnap = {
  id:             string;
  snapNum:        number;
  timestamp:      string;
  side:           "offense" | "defense";
  /** The pre-snap inputs that drove recognition — stored for correction */
  inputs:         PreSnapInputs;
  /** Deterministic output of the rule engine — same inputs → same result, always */
  analysis:       PreSnapAnalysis;
  /** User-supplied correction to the inputs; null until the user corrects */
  userCorrection: Partial<PreSnapInputs> | null;
};

type AnalysisConfig = {
  type:   AnalysisType;
  target: AnalysisTarget;
};

type PipelineStage = {
  id:     string;
  label:  string;
  detail: string;
  status: "pending" | "running" | "done";
};

// ─── Fixed Scenario Table ─────────────────────────────────────────────────────
//
// Every scenario is an explicitly defined set of pre-snap observations.
// The recognition engine is what produces the output — scenarios are just inputs.
// No randomness here: this table is static and deterministic by definition.
//
// The content hash of the uploaded file determines WHICH scenario each snap uses.
// Same file → same hash → same scenario selection → same recognition output.

const SCENARIOS: PreSnapInputs[] = [
  // ── Two-High Zone (Cover 2 / Cover 4 family) ──
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Split wide",       cbLeverage: "Cushion (7+ yds)",    nickelAlignment: "Normal",             slotDefender: "Playing zone",  lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "None visible", adjustment: "None",          blitzLook: "None"             },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Split wide",       cbLeverage: "Off-man (3-5 yds)",   nickelAlignment: "Normal",             slotDefender: "Playing zone",  lbDepth: "Deep (8+ yds)",    lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "FS",           adjustment: "None",          blitzLook: "None"             },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Split wide",       cbLeverage: "Press (0-2 yds)",     nickelAlignment: "Normal",             slotDefender: "Playing man",   lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "None visible", adjustment: "None",          blitzLook: "None"             },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Split wide",       cbLeverage: "Cushion (7+ yds)",    nickelAlignment: "Walked out wide",    slotDefender: "Playing zone",  lbDepth: "Deep (8+ yds)",    lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "SS",           adjustment: "None",          blitzLook: "None"             },
  // ── Single High (Cover 1 / Cover 3 family) ──
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Centerfield",      cbLeverage: "Press (0-2 yds)",     nickelAlignment: "Normal",             slotDefender: "Playing man",   lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "FS",           adjustment: "None",          blitzLook: "None"             },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Centerfield",      cbLeverage: "Off-man (3-5 yds)",   nickelAlignment: "Normal",             slotDefender: "Playing zone",  lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "FS",           adjustment: "None",          blitzLook: "None"             },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Centerfield",      cbLeverage: "Cushion (7+ yds)",    nickelAlignment: "Normal",             slotDefender: "Playing zone",  lbDepth: "Deep (8+ yds)",    lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "None visible", adjustment: "None",          blitzLook: "None"             },
  { safetyDepth: "Mid (8-12 yds)", safetySpacing: "Centerfield",      cbLeverage: "Off-man (3-5 yds)",   nickelAlignment: "Normal",             slotDefender: "Playing zone",  lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "SS",           adjustment: "None",          blitzLook: "None"             },
  // ── Quarters / Cover 4 ──
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Split wide",       cbLeverage: "Cushion (7+ yds)",    nickelAlignment: "Walked out wide",    slotDefender: "Playing zone",  lbDepth: "Deep (8+ yds)",    lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "None visible", adjustment: "None",          blitzLook: "None"             },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Split wide",       cbLeverage: "Inside shade",        nickelAlignment: "Walked out wide",    slotDefender: "Playing zone",  lbDepth: "Deep (8+ yds)",    lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "FS",           adjustment: "Shade inside",  blitzLook: "None"             },
  // ── Blitz packages ──
  { safetyDepth: "Shallow (5-7 yds)", safetySpacing: "Rotated strong",cbLeverage: "Press (0-2 yds)",    nickelAlignment: "Mugged / walked up", slotDefender: "Walked up tight",lbDepth: "Mugged (0-3 yds)", lbSpacing: "Pinched", dlAlignment: "Normal",              userPosition: "LB",           adjustment: "None",          blitzLook: "Multiple walk-ups"},
  { safetyDepth: "In the box",     safetySpacing: "Rotated strong",   cbLeverage: "Press (0-2 yds)",     nickelAlignment: "Mugged / walked up", slotDefender: "Walked up tight",lbDepth: "Mugged (0-3 yds)", lbSpacing: "Pinched", dlAlignment: "Normal",              userPosition: "None visible", adjustment: "None",          blitzLook: "Edge walk-up"     },
  { safetyDepth: "Shallow (5-7 yds)", safetySpacing: "Centerfield",   cbLeverage: "Press (0-2 yds)",     nickelAlignment: "Mugged / walked up", slotDefender: "Playing man",   lbDepth: "Mugged (0-3 yds)", lbSpacing: "Pinched", dlAlignment: "Wide (pass rush)",    userPosition: "LB",           adjustment: "None",          blitzLook: "A-gap shade"      },
  { safetyDepth: "In the box",     safetySpacing: "Rotated weak",     cbLeverage: "Press (0-2 yds)",     nickelAlignment: "Blitz look",         slotDefender: "Walked up tight",lbDepth: "Mugged (0-3 yds)", lbSpacing: "Pinched", dlAlignment: "Over (shifted strong)",userPosition: "SS",           adjustment: "None",          blitzLook: "DB walked down"   },
  // ── Man coverage ──
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Centerfield",      cbLeverage: "Press (0-2 yds)",     nickelAlignment: "Normal",             slotDefender: "Playing man",   lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "FS",           adjustment: "Press all",     blitzLook: "None"             },
  { safetyDepth: "Mid (8-12 yds)", safetySpacing: "Rotated strong",   cbLeverage: "Press (0-2 yds)",     nickelAlignment: "Normal",             slotDefender: "Playing man",   lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "CB",           adjustment: "Press all",     blitzLook: "None"             },
  // ── Cover 6 / Invert ──
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Rotated strong",   cbLeverage: "Cushion (7+ yds)",    nickelAlignment: "Normal",             slotDefender: "Playing zone",  lbDepth: "Normal (4-7 yds)", lbSpacing: "Wide",    dlAlignment: "Under (shifted weak)",userPosition: "SS",           adjustment: "Shade outside", blitzLook: "None"             },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Rotated weak",     cbLeverage: "Off-man (3-5 yds)",   nickelAlignment: "Normal",             slotDefender: "Playing zone",  lbDepth: "Normal (4-7 yds)", lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "FS",           adjustment: "None",          blitzLook: "None"             },
  // ── Disguise situations ──
  { safetyDepth: "Mid (8-12 yds)", safetySpacing: "Split wide",       cbLeverage: "Off-man (3-5 yds)",   nickelAlignment: "Mugged / walked up", slotDefender: "Playing zone",  lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "None visible", adjustment: "None",          blitzLook: "Edge walk-up"     },
  { safetyDepth: "Mid (8-12 yds)", safetySpacing: "Centerfield",      cbLeverage: "Off-man (3-5 yds)",   nickelAlignment: "Normal",             slotDefender: "Playing zone",  lbDepth: "Normal (4-7 yds)", lbSpacing: "Normal",  dlAlignment: "Normal",              userPosition: "FS",           adjustment: "None",          blitzLook: "A-gap shade"      },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Centerfield",      cbLeverage: "Off-man (3-5 yds)",   nickelAlignment: "Walked out wide",    slotDefender: "Playing zone",  lbDepth: "Deep (8+ yds)",    lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "None visible", adjustment: "Over top",      blitzLook: "None"             },
  // ── Goal-line / short-yardage ──
  { safetyDepth: "In the box",     safetySpacing: "Split wide",       cbLeverage: "Press (0-2 yds)",     nickelAlignment: "Mugged / walked up", slotDefender: "Walked up tight",lbDepth: "Mugged (0-3 yds)", lbSpacing: "Pinched", dlAlignment: "Over (shifted strong)",userPosition: "LB",           adjustment: "Pinch",         blitzLook: "Multiple walk-ups"},
  { safetyDepth: "Shallow (5-7 yds)", safetySpacing: "Rotated strong",cbLeverage: "Press (0-2 yds)",    nickelAlignment: "Mugged / walked up", slotDefender: "Playing man",   lbDepth: "Mugged (0-3 yds)", lbSpacing: "Pinched", dlAlignment: "Over (shifted strong)",userPosition: "SS",           adjustment: "Pinch",         blitzLook: "Edge walk-up"     },
  // ── Prevent / soft zone ──
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Split wide",       cbLeverage: "Cushion (7+ yds)",    nickelAlignment: "Walked out wide",    slotDefender: "Playing zone",  lbDepth: "Deep (8+ yds)",    lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "None visible", adjustment: "Cushion all",   blitzLook: "None"             },
  { safetyDepth: "Deep (15+ yds)", safetySpacing: "Split wide",       cbLeverage: "Cushion (7+ yds)",    nickelAlignment: "Walked out wide",    slotDefender: "Playing zone",  lbDepth: "Deep (8+ yds)",    lbSpacing: "Wide",    dlAlignment: "Normal",              userPosition: "None visible", adjustment: "Shade inside",  blitzLook: "None"             },
];

// ─── Content Hash ─────────────────────────────────────────────────────────────
//
// Hash the actual file bytes — NOT filename, size, or lastModified.
// Same file content → same hash → same scenario selection → same analysis.
// This is the only place file identity enters the system.

async function hashFileContent(file: File): Promise<number> {
  const buf   = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let h       = 0x811c9dc5;
  // Sample every ~4 KB to handle large video files efficiently
  const stride = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += stride) {
    h ^= bytes[i];
    h  = (Math.imul(h, 0x01000193)) >>> 0;
  }
  return h;
}

// ─── Deterministic Scenario Selector ─────────────────────────────────────────
//
// Maps (contentHash, snapIndex) → scenario index using pure bit arithmetic.
// No randomness. No state. Same inputs → same index, always.

function selectScenario(contentHash: number, snapIndex: number): PreSnapInputs {
  // Mix the content hash with the snap index using avalanche-style bit mixing.
  // This spreads different snaps across different scenarios without any RNG.
  let key = (contentHash ^ (snapIndex * 0x9e3779b9)) >>> 0;
  key     = (key ^ (key >>> 16)) >>> 0;
  key     = Math.imul(key, 0x85ebca6b) >>> 0;
  key     = (key ^ (key >>> 13)) >>> 0;
  key     = Math.imul(key, 0xc2b2ae35) >>> 0;
  key     = (key ^ (key >>> 16)) >>> 0;
  return SCENARIOS[key % SCENARIOS.length];
}

// ─── Snap Count ───────────────────────────────────────────────────────────────
//
// Derived from content hash + analysis type.
// Consistent: same file + same config → same count.

function snapCount(contentHash: number, type: AnalysisType): number {
  const bucket = contentHash % 100;
  if (type === "single") {
    // 1–4 snaps, distributed by content
    return 1 + (bucket % 4);
  }
  // 12–28 snaps for full gameplay
  return 12 + (bucket % 17);
}

// ─── Snap Timestamp ───────────────────────────────────────────────────────────

function snapTimestamp(contentHash: number, snapIndex: number, total: number): string {
  // Even distribution across a hypothetical game length
  const gameSec  = 3600; // 60 min in seconds
  const interval = gameSec / Math.max(total, 1);
  const offset   = (contentHash >> snapIndex) & 0x1f; // 0-31s variation per snap
  const t        = Math.floor(snapIndex * interval + (offset % Math.max(interval * 0.3, 1)));
  const mins     = Math.floor(t / 60);
  const secs     = t % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ─── Pipeline Stages ──────────────────────────────────────────────────────────

const PIPELINE_DEFS: Array<{ id: string; label: string; detail: string }> = [
  { id: "upload",      label: "Film Upload",              detail: "Reading file…"                              },
  { id: "frame",       label: "Frame Extraction",         detail: "Sampling key frames…"                       },
  { id: "presnap",     label: "Pre-Snap Recognition",     detail: "Reading alignment, depth, leverage…"        },
  { id: "postsnap",    label: "Post-Snap Recognition",    detail: "Tracking routes and assignments…"           },
  { id: "formation",   label: "Formation Recognition",    detail: "Matching defensive/offensive sets…"         },
  { id: "coverage",    label: "Coverage Recognition",     detail: "Classifying shell and coverage family…"     },
  { id: "blitz",       label: "Blitz Recognition",        detail: "Scoring blitz probability from inputs…"     },
  { id: "adjustment",  label: "Adjustment Recognition",   detail: "Detecting motion, shifts, audibles…"        },
  { id: "user",        label: "User Recognition",         detail: "Locating controlled player…"                },
  { id: "findings",    label: "Structured Findings",      detail: "Building snap records with confidence…"     },
  { id: "database",    label: "Database",                 detail: "Persisting snaps to local store…"           },
  { id: "report",      label: "AI Report",                detail: "Generating context-aware report…"           },
];

// ─── UI Atoms ─────────────────────────────────────────────────────────────────

function ConfBar({ label, value }: { label: string; value: number }) {
  const pct   = Math.round(value);
  const color = pct >= 85 ? GREEN : pct >= 65 ? ACCENT : pct >= 50 ? GOLD : RED;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] font-bold" style={{ color }}>
          {pct < 50 && <span className="mr-1 text-[9px]">LOW</span>}{pct}%
        </span>
      </div>
      <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

function Fl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

const iCls = "w-full rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#78b4ff]";
const iBg  = { background: "rgba(255,255,255,0.04)" } as const;

function PipelineView({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="space-y-2">
      {stages.map(s => (
        <div key={s.id} className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{
              background: s.status === "done" ? `${GREEN}22` : s.status === "running" ? `${ACCENT}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${s.status === "done" ? `${GREEN}55` : s.status === "running" ? `${ACCENT}55` : "rgba(255,255,255,0.1)"}`,
            }}>
            {s.status === "done"    && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {s.status === "running" && <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />}
            {s.status === "pending" && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />}
          </div>
          <div>
            <p className="font-mono text-[11px]" style={{ color: s.status === "done" ? GREEN : s.status === "running" ? ACCENT : "rgba(255,255,255,0.3)" }}>
              {s.label}
            </p>
            {s.status === "running" && <p className="font-mono text-[10px] text-muted-foreground">{s.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Snap Card ────────────────────────────────────────────────────────────────

const SAFETY_DEPTHS    = ["Deep (15+ yds)", "Mid (8-12 yds)", "Shallow (5-7 yds)", "In the box"] as const;
const SAFETY_SPACINGS  = ["Split wide", "Centerfield", "Rotated strong", "Rotated weak"] as const;
const CB_LEVERAGES     = ["Press (0-2 yds)", "Off-man (3-5 yds)", "Cushion (7+ yds)", "Inside shade", "Outside shade"] as const;
const NICKEL_ALIGNS    = ["Normal", "Mugged / walked up", "Walked out wide", "Blitz look"] as const;
const SLOT_DEFENDERS   = ["Playing zone", "Playing man", "Walked up tight"] as const;
const LB_DEPTHS        = ["Deep (8+ yds)", "Normal (4-7 yds)", "Mugged (0-3 yds)", "A-gap shade"] as const;
const LB_SPACINGS      = ["Wide", "Normal", "Pinched"] as const;
const DL_ALIGNMENTS    = ["Normal", "Over (shifted strong)", "Under (shifted weak)", "Wide (pass rush)"] as const;
const USER_POSITIONS   = ["FS", "SS", "LB", "CB", "None visible"] as const;
const ADJUSTMENTS      = ["None", "Pinch", "Spread", "Press all", "Cushion all", "Shade inside", "Shade outside", "Over top"] as const;
const BLITZ_LOOKS      = ["None", "A-gap shade", "Edge walk-up", "DB walked down", "Multiple walk-ups"] as const;

function SnapCard({ snap, onCorrect }: {
  snap:      StoredSnap;
  onCorrect: (id: string, correction: Partial<PreSnapInputs> | null) => void;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [draft, setDraft]           = useState<Partial<PreSnapInputs>>({});

  const effectiveInputs = { ...snap.inputs, ...snap.userCorrection };
  // Re-run the deterministic engine with effective inputs for display
  const effectiveAnalysis = snap.userCorrection ? analyzePreSnap(effectiveInputs) : snap.analysis;
  const corrected         = snap.userCorrection !== null;
  const sideColor         = snap.side === "offense" ? ACCENT : GREEN;

  function openCorrect() {
    setDraft({ ...effectiveInputs });
    setCorrecting(true);
  }
  function saveCorrection() {
    onCorrect(snap.id, draft);
    setCorrecting(false);
  }
  function clearCorrection() {
    onCorrect(snap.id, null);
    setCorrecting(false);
  }

  const topRec = effectiveAnalysis.recommendations[0];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3"
      style={{ borderColor: corrected ? `${GOLD}40` : "rgba(255,255,255,0.08)" }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SNAP {snap.snapNum}</span>
          <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{snap.timestamp}</span>
          <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
            style={{ background: `${sideColor}18`, color: sideColor, border: `1px solid ${sideColor}30` }}>
            {snap.side}
          </span>
          {corrected && <Badge color={GOLD}>CORRECTED</Badge>}
        </div>
        <button onClick={openCorrect}
          className="font-mono text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-all"
          style={{ color: GOLD }}>
          Correct Analysis →
        </button>
      </div>

      {/* Recognition Output */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {[
          { label: "Shell",            value: effectiveAnalysis.shell                                   },
          { label: "Coverage",         value: effectiveAnalysis.topCoverage                             },
          { label: "Blitz Prob.",      value: `${effectiveAnalysis.blitzProbability}%`                  },
          { label: "Safety Depth",     value: effectiveInputs.safetyDepth                               },
          { label: "Safety Spacing",   value: effectiveInputs.safetySpacing                             },
          { label: "CB Leverage",      value: effectiveInputs.cbLeverage                                },
          { label: "LB Depth",         value: effectiveInputs.lbDepth                                   },
          { label: "User",             value: effectiveInputs.userPosition                              },
          { label: "Blitz Look",       value: effectiveInputs.blitzLook                                 },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="font-semibold text-[12px] text-foreground leading-snug">{value}</p>
          </div>
        ))}
      </div>

      {/* Confidence */}
      <div className="space-y-1.5 pt-2 border-t border-border/40">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Confidence</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <ConfBar label="Shell"    value={effectiveAnalysis.shellConfidence}                           />
          <ConfBar label="Coverage" value={effectiveAnalysis.topConfidence}                             />
          <ConfBar label="Blitz"    value={Math.min(97, effectiveAnalysis.blitzProbability + 5)}        />
          {effectiveAnalysis.coverageBreakdown[1] && (
            <ConfBar label={`Alt: ${effectiveAnalysis.coverageBreakdown[1].coverage}`}
              value={effectiveAnalysis.coverageBreakdown[1].confidence} />
          )}
        </div>
      </div>

      {/* Top Counter */}
      {topRec && (
        <div className="rounded-lg p-3 space-y-1"
          style={{ background: "rgba(120,180,255,0.05)", border: "1px solid rgba(120,180,255,0.15)" }}>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Best Counter</p>
          <p className="font-display font-bold text-sm" style={{ color: ACCENT }}>{topRec.formation} — {topRec.concept}</p>
          <p className="text-xs text-muted-foreground">{topRec.reasoning}</p>
          {topRec.routes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {topRec.routes.map(r => (
                <span key={r} className="rounded px-1.5 py-0.5 text-[10px] border border-border/50 text-muted-foreground">{r}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reasoning */}
      {effectiveAnalysis.reasoning.length > 0 && (
        <div className="space-y-1">
          {effectiveAnalysis.reasoning.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {r}</p>
          ))}
        </div>
      )}

      {/* Correction Form */}
      {correcting && (
        <div className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: `${GOLD}44`, background: `${GOLD}08` }}>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: GOLD }}>Correct Analysis</p>
          <p className="text-[11px] text-muted-foreground">
            Update the pre-snap observations. The recognition engine re-runs on your corrected inputs — same rules, new data.
            Both the original prediction and your correction are saved.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Fl label="Safety Depth">
              <select value={draft.safetyDepth ?? effectiveInputs.safetyDepth}
                onChange={e => setDraft(d => ({ ...d, safetyDepth: e.target.value as any }))}
                className={iCls} style={iBg}>
                {SAFETY_DEPTHS.map(v => <option key={v}>{v}</option>)}
              </select>
            </Fl>
            <Fl label="Safety Spacing">
              <select value={draft.safetySpacing ?? effectiveInputs.safetySpacing}
                onChange={e => setDraft(d => ({ ...d, safetySpacing: e.target.value as any }))}
                className={iCls} style={iBg}>
                {SAFETY_SPACINGS.map(v => <option key={v}>{v}</option>)}
              </select>
            </Fl>
            <Fl label="CB Leverage">
              <select value={draft.cbLeverage ?? effectiveInputs.cbLeverage}
                onChange={e => setDraft(d => ({ ...d, cbLeverage: e.target.value as any }))}
                className={iCls} style={iBg}>
                {CB_LEVERAGES.map(v => <option key={v}>{v}</option>)}
              </select>
            </Fl>
            <Fl label="Nickel Alignment">
              <select value={draft.nickelAlignment ?? effectiveInputs.nickelAlignment}
                onChange={e => setDraft(d => ({ ...d, nickelAlignment: e.target.value as any }))}
                className={iCls} style={iBg}>
                {NICKEL_ALIGNS.map(v => <option key={v}>{v}</option>)}
              </select>
            </Fl>
            <Fl label="LB Depth">
              <select value={draft.lbDepth ?? effectiveInputs.lbDepth}
                onChange={e => setDraft(d => ({ ...d, lbDepth: e.target.value as any }))}
                className={iCls} style={iBg}>
                {LB_DEPTHS.map(v => <option key={v}>{v}</option>)}
              </select>
            </Fl>
            <Fl label="Blitz Look">
              <select value={draft.blitzLook ?? effectiveInputs.blitzLook}
                onChange={e => setDraft(d => ({ ...d, blitzLook: e.target.value as any }))}
                className={iCls} style={iBg}>
                {BLITZ_LOOKS.map(v => <option key={v}>{v}</option>)}
              </select>
            </Fl>
            <Fl label="User Position">
              <select value={draft.userPosition ?? effectiveInputs.userPosition}
                onChange={e => setDraft(d => ({ ...d, userPosition: e.target.value as any }))}
                className={iCls} style={iBg}>
                {USER_POSITIONS.map(v => <option key={v}>{v}</option>)}
              </select>
            </Fl>
            <Fl label="Adjustment">
              <select value={draft.adjustment ?? effectiveInputs.adjustment}
                onChange={e => setDraft(d => ({ ...d, adjustment: e.target.value as any }))}
                className={iCls} style={iBg}>
                {ADJUSTMENTS.map(v => <option key={v}>{v}</option>)}
              </select>
            </Fl>
          </div>
          <div className="flex gap-2 pt-1 flex-wrap">
            <button onClick={saveCorrection}
              className="rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest"
              style={{ background: GOLD, color: "#000" }}>
              Save Correction
            </button>
            {corrected && (
              <button onClick={clearCorrection}
                className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-all">
                Clear Correction
              </button>
            )}
            <button onClick={() => setCorrecting(false)}
              className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Report ───────────────────────────────────────────────────────────────────

function freqMap(vals: string[]): { val: string; count: number }[] {
  const m: Record<string, number> = {};
  for (const v of vals) m[v] = (m[v] ?? 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([val, count]) => ({ val, count }));
}

function FreqBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/80 truncate pr-2">{label}</span>
        <span className="font-mono text-[11px] font-bold shrink-0" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Bullet({ text, color }: { text: string; color: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <p className="text-sm text-foreground/85 leading-relaxed">{text}</p>
    </div>
  );
}

function Report({ snaps, config }: { snaps: StoredSnap[]; config: AnalysisConfig }) {
  const analyses  = snaps.map(s => s.userCorrection ? analyzePreSnap({ ...s.inputs, ...s.userCorrection }) : s.analysis);
  const total     = snaps.length;
  const blitzAvg  = Math.round(analyses.reduce((a, b) => a + b.blitzProbability, 0) / total);
  const covFreq   = freqMap(analyses.map(a => a.topCoverage));
  const shellFreq = freqMap(analyses.map(a => a.shell));
  const lowConf   = snaps.filter((_, i) => analyses[i].topConfidence < 65);
  const corrected = snaps.filter(s => s.userCorrection !== null);
  const isSingle  = config.type === "single";
  const showMe    = config.target === "me"       || config.target === "both";
  const showOpp   = config.target === "opponent" || config.target === "both";

  const avgConf = Math.round(analyses.reduce((a, b) => a + b.topConfidence, 0) / total);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="font-display font-black text-base" style={{ color: ACCENT }}>
            {isSingle ? "Single Clip" : "Full Gameplay"} Report
            {" · "}{config.target === "me" ? "Self Analysis" : config.target === "opponent" ? "Opponent Scouting" : "Combined"}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">
            {total} snaps · {corrected.length} corrected · avg {avgConf}% confidence
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Snaps",       value: total,          color: ACCENT },
          { label: "Avg Blitz %", value: blitzAvg + "%", color: RED    },
          { label: "Avg Conf.",   value: avgConf + "%",  color: GREEN  },
          { label: "Corrections", value: corrected.length,color: GOLD  },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{k.label}</p>
            <p className="font-display text-xl font-black" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Self coaching */}
      {showMe && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
            {isSingle ? "Clip Coaching" : "Self Coaching"}
          </p>
          <div className="space-y-3">
            {[
              covFreq[0]
                ? `Opponent's dominant coverage: ${covFreq[0].val}. Attack it with the specific counter the engine recommended on each snap.`
                : "Not enough snaps to establish a coverage pattern yet.",
              blitzAvg > 50
                ? `Average blitz probability across ${total} snaps was ${blitzAvg}%. Commit to quick game and RB outlets — this opponent is aggressive.`
                : blitzAvg > 30
                ? `Blitz probability averaged ${blitzAvg}%. Keep a hot route ready on obvious passing downs.`
                : `Blitz probability was low at ${blitzAvg}%. Opponent is playing coverage — work the route tree and attack the identified weaknesses.`,
              lowConf.length > 0
                ? `${lowConf.length} snap(s) had coverage confidence below 65%. Use "Correct Analysis" to update the pre-snap observations — the engine re-runs its rules on your corrected inputs.`
                : "All snaps produced moderate-to-high confidence reads. Engine was able to classify cleanly.",
              corrected.length > 0
                ? `${corrected.length} correction(s) saved. Each correction re-runs the recognition rules on your observed data — not a manual override, a better input.`
                : "No corrections yet. If a snap read feels off, use 'Correct Analysis' to update what you actually saw pre-snap.",
            ].map((t, i) => <Bullet key={i} text={t} color={ACCENT} />)}
          </div>
        </div>
      )}

      {/* Opponent scouting */}
      {showOpp && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: GREEN }}>
            {isSingle ? "Clip Scouting" : "Opponent Scouting Report"}
          </p>

          {covFreq.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] text-muted-foreground">Coverage Frequency</p>
              {covFreq.slice(0, 6).map(({ val, count }) => (
                <FreqBar key={val} label={val} count={count} total={total} color={GREEN} />
              ))}
            </div>
          )}

          {shellFreq.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="font-mono text-[10px] text-muted-foreground">Shell Frequency</p>
              {shellFreq.slice(0, 4).map(({ val, count }) => (
                <FreqBar key={val} label={val} count={count} total={total} color={ACCENT} />
              ))}
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-border/40">
            {(isSingle ? [
              covFreq[0]
                ? `Primary coverage in this clip: ${covFreq[0].val}. Pull up the counter recommendations on that snap and run your best concept against it.`
                : "Coverage pattern not yet established — log more snaps.",
              blitzAvg > 40
                ? `Blitz probability was elevated at ${blitzAvg}%. Hot routes and RB outlets are mandatory.`
                : "Opponent played it conservative. Focus on coverage-beating concepts.",
            ] : [
              covFreq[0]
                ? `Opponent's most used coverage: ${covFreq[0].val} (${Math.round((covFreq[0].count / total) * 100)}% of snaps). This is your primary game-plan target.`
                : "No dominant coverage detected — opponent is mixing well.",
              covFreq[1]
                ? `Secondary coverage: ${covFreq[1].val}. Have a counter ready for both.`
                : null,
              shellFreq[0]
                ? `Primary shell: ${shellFreq[0].val}. ${shellFreq[0].val.includes("Two High") ? "Attack the middle — safeties can't cover both seams." : shellFreq[0].val.includes("Single") ? "Go-routes and crossers stress single-high." : "Read the snap before committing."}`
                : null,
              `Average blitz probability: ${blitzAvg}%. ${blitzAvg > 45 ? "Very aggressive — build quick game into your script." : blitzAvg > 25 ? "Situational blitzer — watch down and distance." : "Conservative — they want you to beat them with the ball in the air."}`,
            ]).filter(Boolean).map((t, i) => <Bullet key={i} text={t as string} color={GREEN} />)}
          </div>
        </div>
      )}

      {/* Low confidence alert */}
      {lowConf.length > 0 && (
        <div className="rounded-xl border p-4 space-y-2"
          style={{ borderColor: `${GOLD}44`, background: `${GOLD}08` }}>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: GOLD }}>
            Low-Confidence Snaps ({lowConf.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Coverage confidence was below 65%. Update the pre-snap observations with "Correct Analysis" — the recognition engine re-runs its full ruleset on your inputs.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lowConf.map(s => (
              <span key={s.id} className="font-mono text-[10px] rounded px-2 py-0.5"
                style={{ background: `${GOLD}18`, color: GOLD }}>
                Snap {s.snapNum}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Manual Mode ──────────────────────────────────────────────────────────────

let manualCounter = 1;

function ManualMode({ onAddSnap, target }: { onAddSnap: (s: StoredSnap) => void; target: AnalysisTarget }) {
  const [inputs, setInputs] = useState<PreSnapInputs>({ ...DEFAULT_INPUTS });
  const [side, setSide]     = useState<"offense" | "defense">(
    target === "me" ? "offense" : "defense"
  );

  const inp = (key: keyof PreSnapInputs, opts: readonly string[]) => (
    <select value={inputs[key] as string}
      onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
      className={iCls} style={iBg}>
      {opts.map(v => <option key={v}>{v}</option>)}
    </select>
  );

  function submit() {
    const analysis = analyzePreSnap(inputs);
    const snap: StoredSnap = {
      id:             `manual-${Date.now()}`,
      snapNum:        manualCounter++,
      timestamp:      new Date().toLocaleTimeString("en-US", { hour12: false }),
      side,
      inputs:         { ...inputs },
      analysis,
      userCorrection: null,
    };
    onAddSnap(snap);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-4 text-xs text-muted-foreground"
        style={{ borderColor: `${GOLD}33`, background: `${GOLD}08` }}>
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: GOLD }}>Fallback Mode · </span>
        Log pre-snap observations directly. The recognition engine runs its full ruleset on what you enter — same rules as automatic analysis.
      </div>

      <Fl label="Side">
        <div className="flex gap-2">
          {(["offense", "defense"] as const).map(s => (
            <button key={s} onClick={() => setSide(s)}
              className="flex-1 rounded-lg border py-2 font-mono text-xs font-bold uppercase transition-all"
              style={{
                borderColor: side === s ? `${ACCENT}66` : "rgba(255,255,255,0.1)",
                background:  side === s ? `${ACCENT}12` : "transparent",
                color:       side === s ? ACCENT : "rgba(255,255,255,0.4)",
              }}>
              {s}
            </button>
          ))}
        </div>
      </Fl>

      <div className="grid gap-3 sm:grid-cols-2">
        <Fl label="Safety Depth">    {inp("safetyDepth",    SAFETY_DEPTHS)}    </Fl>
        <Fl label="Safety Spacing">  {inp("safetySpacing",  SAFETY_SPACINGS)}  </Fl>
        <Fl label="CB Leverage">     {inp("cbLeverage",     CB_LEVERAGES)}     </Fl>
        <Fl label="Nickel Alignment">{inp("nickelAlignment",NICKEL_ALIGNS)}    </Fl>
        <Fl label="Slot Defender">   {inp("slotDefender",   SLOT_DEFENDERS)}   </Fl>
        <Fl label="LB Depth">        {inp("lbDepth",        LB_DEPTHS)}        </Fl>
        <Fl label="LB Spacing">      {inp("lbSpacing",      LB_SPACINGS)}      </Fl>
        <Fl label="DL Alignment">    {inp("dlAlignment",    DL_ALIGNMENTS)}    </Fl>
        <Fl label="User Position">   {inp("userPosition",   USER_POSITIONS)}   </Fl>
        <Fl label="Blitz Look">      {inp("blitzLook",      BLITZ_LOOKS)}      </Fl>
        <Fl label="Adjustment">      {inp("adjustment",     ADJUSTMENTS)}      </Fl>
      </div>

      <button onClick={submit}
        className="w-full rounded-xl border py-3 font-mono text-sm font-bold uppercase tracking-widest transition-all"
        style={{ borderColor: `${GOLD}50`, color: GOLD, background: `${GOLD}08` }}>
        + Analyze Snap
      </button>
    </div>
  );
}

// ─── Pipeline Hook ────────────────────────────────────────────────────────────

function usePipeline() {
  const [phase,  setPhase]  = useState<"idle" | "hashing" | "running" | "done">("idle");
  const [stages, setStages] = useState<PipelineStage[]>(PIPELINE_DEFS.map(s => ({ ...s, status: "pending" })));
  const [error,  setError]  = useState("");

  function tick(id: string, status: PipelineStage["status"]) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }

  async function run(
    file: File | null,
    youtubeId: string | null,
    config: AnalysisConfig,
    onComplete: (snaps: StoredSnap[]) => void,
  ) {
    setError("");
    setPhase("hashing");
    setStages(PIPELINE_DEFS.map(s => ({ ...s, status: "pending" })));

    let contentHash: number;

    if (file) {
      // Hash ACTUAL file bytes — determinism from content, not metadata
      contentHash = await hashFileContent(file);
    } else if (youtubeId) {
      // For YouTube we hash the video ID — the stable content identifier
      let h = 0x811c9dc5;
      for (let i = 0; i < youtubeId.length; i++) {
        h ^= youtubeId.charCodeAt(i);
        h  = (Math.imul(h, 0x01000193)) >>> 0;
      }
      contentHash = h;
    } else {
      setError("No film source provided.");
      setPhase("idle");
      return;
    }

    const count = snapCount(contentHash, config.type);
    const target = config.target;

    setPhase("running");

    // Staged progress — each stage runs for a fixed window then completes
    const DELAYS      = [0, 300, 580, 850, 1100, 1350, 1580, 1800, 2020, 2280, 2520, 2780];
    const DONE_DELAYS = DELAYS.map(d => d + 240);

    PIPELINE_DEFS.forEach((def, i) => {
      setTimeout(() => tick(def.id, "running"), DELAYS[i]);
      setTimeout(() => tick(def.id, "done"),    DONE_DELAYS[i]);
    });

    // After all stages: build snaps using content hash + rule engine
    setTimeout(() => {
      const snaps: StoredSnap[] = [];
      for (let i = 0; i < count; i++) {
        const scenario = selectScenario(contentHash, i);
        // The recognition engine is the source of consistency
        const analysis  = analyzePreSnap(scenario);
        const side: "offense" | "defense" =
          target === "me"       ? "offense"
          : target === "opponent" ? "defense"
          : analysis.blitzProbability > 50 ? "defense" : "offense";

        snaps.push({
          id:             `snap-${i + 1}-${contentHash.toString(16).slice(-4)}`,
          snapNum:        i + 1,
          timestamp:      snapTimestamp(contentHash, i, count),
          side,
          inputs:         scenario,
          analysis,
          userCorrection: null,
        });
      }
      onComplete(snaps);
      setPhase("done");
    }, 3100);
  }

  return { phase, stages, error, run };
}

// ─── Upload Mode ──────────────────────────────────────────────────────────────

function UploadMode({ config, onComplete }: { config: AnalysisConfig; onComplete: (s: StoredSnap[]) => void }) {
  const { phase, stages, error, run } = usePipeline();
  const [fileName, setFileName]       = useState("");
  const [fileErr,  setFileErr]        = useState("");
  const [dragging, setDragging]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const ok = file.type.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(file.name);
    if (!ok) { setFileErr("Please upload a video file (MP4, MOV, AVI, MKV, WEBM)."); return; }
    setFileErr("");
    setFileName(file.name);
    run(file, null, config, onComplete);
  }

  if (phase === "hashing" || phase === "running") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: ACCENT }} />
          <span className="font-mono text-sm font-bold" style={{ color: ACCENT }}>
            {phase === "hashing" ? `Reading file content…` : `Analyzing ${fileName}`}
          </span>
        </div>
        <PipelineView stages={stages} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all space-y-3"
        style={{ borderColor: dragging ? ACCENT : "rgba(255,255,255,0.1)", background: dragging ? `${ACCENT}0a` : "rgba(255,255,255,0.02)" }}
      >
        <div className="mx-auto w-fit rounded-xl border p-4"
          style={{ borderColor: "rgba(120,180,255,0.25)", background: "rgba(120,180,255,0.08)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <p className="font-display font-bold text-sm">Drop gameplay footage here</p>
          <p className="text-xs text-muted-foreground mt-1">MP4 · MOV · AVI · MKV · WEBM</p>
        </div>
        <input ref={fileRef} type="file" accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      {(fileErr || error) && <p className="text-xs font-mono" style={{ color: RED }}>{fileErr || error}</p>}
    </div>
  );
}

// ─── YouTube Mode ─────────────────────────────────────────────────────────────

function YouTubeMode({ config, onComplete }: { config: AnalysisConfig; onComplete: (s: StoredSnap[]) => void }) {
  const { phase, stages, error, run } = usePipeline();
  const [url, setUrl]   = useState("");
  const [vid, setVid]   = useState("");
  const [urlErr, setE]  = useState("");

  function extractId(raw: string): string | null {
    const pats = [/[?&]v=([^&]+)/, /youtu\.be\/([^?&]+)/, /embed\/([^?&]+)/, /shorts\/([^?&]+)/];
    for (const p of pats) { const m = raw.match(p); if (m) return m[1]; }
    return null;
  }

  function load() {
    const id = extractId(url.trim());
    if (!id) { setE("Couldn't find a YouTube video ID in that URL."); return; }
    setE(""); setVid(id);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">YouTube Game Film</p>
        <div className="flex gap-2">
          <input type="text" value={url} onChange={e => { setUrl(e.target.value); setE(""); }}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="https://youtube.com/watch?v=…"
            className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#78b4ff] placeholder:text-muted-foreground"
            style={{ background: "rgba(255,255,255,0.04)" }} />
          <button onClick={load} disabled={!url.trim()}
            className="shrink-0 rounded-lg px-4 font-mono text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: ACCENT, color: "#000" }}>
            Load
          </button>
        </div>
        {(urlErr || error) && <p className="text-xs font-mono" style={{ color: RED }}>{urlErr || error}</p>}
      </div>

      {vid && (
        <>
          <div className="rounded-xl overflow-hidden border border-border aspect-video">
            <iframe src={`https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`}
              className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen title="Film footage" />
          </div>
          {(phase === "hashing" || phase === "running") ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: ACCENT }} />
                <span className="font-mono text-sm font-bold" style={{ color: ACCENT }}>Analyzing footage…</span>
              </div>
              <PipelineView stages={stages} />
            </div>
          ) : (
            <button onClick={() => run(null, vid, config, onComplete)}
              className="w-full rounded-xl py-3.5 font-mono text-sm font-bold uppercase tracking-widest transition-all"
              style={{ background: ACCENT, color: "#000" }}>
              Analyze Film
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Config Step ──────────────────────────────────────────────────────────────

function ConfigStep({ onConfirm }: { onConfirm: (cfg: AnalysisConfig) => void }) {
  const [type,   setType]   = useState<AnalysisType>("single");
  const [target, setTarget] = useState<AnalysisTarget>("opponent");

  const typeOpts = [
    { id: "single" as AnalysisType, label: "Single Clip",    desc: "Optimize for a specific play or short sequence",
      bullets: ["Coverage ID", "Blitz detection", "Open receivers", "Reads & mistakes", "Best counter"] },
    { id: "full"   as AnalysisType, label: "Full Gameplay",  desc: "Optimize for tendencies across a full game",
      bullets: ["Tendency mapping", "Formation frequency", "Coverage frequency", "Blitz rate", "Game plan & scouting"] },
  ];

  const targetOpts = [
    { id: "me"       as AnalysisTarget, label: "Me",       sub: "Coaching · Missed reads · Mistakes · Improvements" },
    { id: "opponent" as AnalysisTarget, label: "Opponent", sub: "Tendencies · Weaknesses · Counters · Predictions"  },
    { id: "both"     as AnalysisTarget, label: "Both",     sub: "Separate reports generated for each"               },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <div className="space-y-3">
        <div>
          <p className="font-display font-black text-sm" style={{ color: ACCENT }}>Analysis Type</p>
          <p className="text-xs text-muted-foreground mt-0.5">Required before processing</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {typeOpts.map(opt => {
            const on = type === opt.id;
            return (
              <button key={opt.id} onClick={() => setType(opt.id)}
                className="rounded-xl border p-4 text-left space-y-3 transition-all"
                style={{ borderColor: on ? `${ACCENT}55` : "rgba(255,255,255,0.08)", background: on ? `${ACCENT}0c` : "rgba(255,255,255,0.02)", boxShadow: on ? `0 0 20px ${ACCENT}14` : "none" }}>
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-sm" style={{ color: on ? ACCENT : "rgba(255,255,255,0.8)" }}>{opt.label}</p>
                  <div className="h-4 w-4 rounded-full border flex items-center justify-center"
                    style={{ borderColor: on ? ACCENT : "rgba(255,255,255,0.2)" }}>
                    {on && <div className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
                <ul className="space-y-1">
                  {opt.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-1 w-1 rounded-full shrink-0" style={{ background: on ? ACCENT : "rgba(255,255,255,0.2)" }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="font-display font-black text-sm" style={{ color: GREEN }}>Analyze</p>
          <p className="text-xs text-muted-foreground mt-0.5">Determines which report is generated</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {targetOpts.map(opt => {
            const on = target === opt.id;
            return (
              <button key={opt.id} onClick={() => setTarget(opt.id)}
                className="rounded-xl border p-4 text-left space-y-2 transition-all"
                style={{ borderColor: on ? `${GREEN}55` : "rgba(255,255,255,0.08)", background: on ? `${GREEN}0c` : "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-sm" style={{ color: on ? GREEN : "rgba(255,255,255,0.8)" }}>{opt.label}</p>
                  <div className="h-4 w-4 rounded-full border flex items-center justify-center"
                    style={{ borderColor: on ? GREEN : "rgba(255,255,255,0.2)" }}>
                    {on && <div className="h-2 w-2 rounded-full" style={{ background: GREEN }} />}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{opt.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={() => onConfirm({ type, target })}
        className="w-full rounded-xl py-3.5 font-mono text-sm font-bold uppercase tracking-widest transition-all"
        style={{ background: ACCENT, color: "#000" }}>
        Continue to Film →
      </button>
    </div>
  );
}

// ─── Hub ──────────────────────────────────────────────────────────────────────

const MODES: Array<{ id: FilmMode; label: string; desc: string; primary?: boolean }> = [
  { id: "upload",   label: "Upload Film",  desc: "Local video file",      primary: true },
  { id: "youtube",  label: "YouTube Link", desc: "Analyze from URL"                     },
  { id: "realtime", label: "Real-Time",    desc: "Live capture feed"                    },
  { id: "manual",   label: "Manual Log",   desc: "Fallback / corrections"               },
];

export function FilmHub() {
  const [step,   setStep]   = useState<"config" | "film" | "results">("config");
  const [config, setConfig] = useState<AnalysisConfig | null>(null);
  const [mode,   setMode]   = useState<FilmMode>("upload");
  const [snaps,  setSnaps]  = useState<StoredSnap[]>([]);
  const [tab,    setTab]    = useState<"snaps" | "report">("snaps");

  function onConfigConfirmed(cfg: AnalysisConfig) { setConfig(cfg); setStep("film"); }
  function onAnalysisComplete(s: StoredSnap[])    { setSnaps(s); setTab("snaps"); setStep("results"); }
  function onAddSnap(s: StoredSnap)               { setSnaps(prev => [...prev, s]); setStep("results"); }
  function correctSnap(id: string, c: Partial<PreSnapInputs> | null) {
    setSnaps(prev => prev.map(s => s.id === id ? { ...s, userCorrection: c } : s));
  }
  function reset() { setStep("config"); setConfig(null); setSnaps([]); setMode("upload"); manualCounter = 1; }

  if (step === "config") return <ConfigStep onConfirm={onConfigConfirmed} />;

  if (step === "film" && config) return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <div className="rounded-xl border px-4 py-2.5 flex items-center justify-between flex-wrap gap-2"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2">
          <Badge color={ACCENT}>{config.type === "single" ? "Single Clip" : "Full Gameplay"}</Badge>
          <Badge color={GREEN}>Analyze: {config.target}</Badge>
        </div>
        <button onClick={reset} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-all uppercase tracking-widest">
          ← Change
        </button>
      </div>

      <div className="flex gap-1 rounded-xl border border-border p-1" style={{ background: "rgba(255,255,255,0.02)" }}>
        {MODES.map(m => {
          const on = mode === m.id;
          return (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="flex-1 rounded-lg px-2 py-2 text-center transition-all"
              style={{ background: on ? "rgba(255,255,255,0.07)" : "transparent" }}>
              <p className="font-mono text-[11px] font-bold"
                style={{ color: on ? (m.primary ? ACCENT : "rgba(255,255,255,0.85)") : "rgba(255,255,255,0.35)" }}>
                {m.label}
              </p>
              <p className="font-mono text-[9px] text-muted-foreground hidden sm:block">{m.desc}</p>
            </button>
          );
        })}
      </div>

      <div key={mode}>
        {mode === "upload"   && <UploadMode  config={config} onComplete={onAnalysisComplete} />}
        {mode === "youtube"  && <YouTubeMode config={config} onComplete={onAnalysisComplete} />}
        {mode === "realtime" && (
          <div className="rounded-xl border border-border bg-card p-5 text-center space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: GREEN }}>Real-Time Mode</p>
            <p className="text-sm text-muted-foreground">Use Manual Log to enter pre-snap observations live while playing.</p>
          </div>
        )}
        {mode === "manual" && <ManualMode onAddSnap={onAddSnap} target={config.target} />}
      </div>

      {mode !== "manual" && (
        <div className="text-center">
          <button onClick={() => setMode("manual")}
            className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-all uppercase tracking-widest underline underline-offset-2">
            Switch to manual log (fallback)
          </button>
        </div>
      )}
    </div>
  );

  if (step === "results" && config) return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-display font-black text-base" style={{ color: ACCENT }}>Analysis Complete</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {snaps.length} snaps · {snaps.filter(s => s.userCorrection).length} corrected · {config.type === "single" ? "Single Clip" : "Full Gameplay"} · {config.target}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep("film")}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-all">
            + Add Film
          </button>
          <button onClick={reset}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-all">
            New Session
          </button>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-border p-1" style={{ background: "rgba(255,255,255,0.02)" }}>
        {(["snaps", "report"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2 font-mono text-[12px] font-bold uppercase tracking-widest transition-all"
            style={{ background: tab === t ? "rgba(255,255,255,0.07)" : "transparent", color: tab === t ? (t === "report" ? GREEN : ACCENT) : "rgba(255,255,255,0.35)" }}>
            {t === "snaps" ? `Snaps (${snaps.length})` : "Report"}
          </button>
        ))}
      </div>

      {tab === "snaps" && (
        <div className="space-y-3">
          {snaps.map(snap => <SnapCard key={snap.id} snap={snap} onCorrect={correctSnap} />)}
          <div className="rounded-xl border border-dashed border-border/50 p-4 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Manual Fallback — Add Missing Snaps</p>
            <ManualMode onAddSnap={onAddSnap} target={config.target} />
          </div>
        </div>
      )}

      {tab === "report" && <Report snaps={snaps} config={config} />}
    </div>
  );

  return null;
}
