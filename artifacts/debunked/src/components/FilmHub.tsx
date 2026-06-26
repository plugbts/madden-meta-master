// ─── FilmHub — Deterministic Film Analysis Engine ────────────────────────────
// Pipeline: Observed Facts → Elimination Engine → Ranked Plays → Counters
// AI only explains AFTER the engine finishes. The engine never guesses.

import { useState, useCallback } from "react";
import {
  runEliminationEngine,
  DEFAULT_ELIMINATION_INPUTS,
  type EliminationInputs,
  type EliminationResult,
  type SafetyDepth,
  type SafetyWidth,
  type CBAlignment,
  type DLAlignment,
  type LBAlignment,
  type CoverageShading,
  type NumSafeties,
  type BlitzRead,
} from "@/lib/elimination-engine";
import {
  addSnap,
  createBlankSnap,
  getAllSnaps,
  makeGameId,
  type FilmSnap,
  type SnapResult,
  type FieldHash,
} from "@/lib/film-snap-store";
import {
  rebuildProfile,
  type OpponentProfile,
} from "@/lib/opponent-learning-store";
import {
  ALL_FORMATIONS,
  PLAYBOOKS_LIST,
  type AdjustmentTell,
  type UserPositionType,
} from "@/lib/madden-play-db";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#78b4ff";
const GREEN  = "#6fdba8";
const GOLD   = "#ffc84a";
const RED    = "#f87171";
const PURPLE = "#e07fff";

// ─── Tells Checklist ──────────────────────────────────────────────────────────
// Every tell uses exact Madden in-game terminology.

const ALL_TELLS: AdjustmentTell[] = [
  "LBs Mugged",
  "Safeties Tight",
  "Safeties Pinched",
  "Safeties Spread",
  "Safeties Over Top",
  "Corners Press",
  "Corners Back Off",
  "Corners Default",
  "DL Pinched",
  "DL Spread",
  "DL Shifted Left",
  "DL Shifted Right",
  "LBs Pinched",
  "LBs Spread",
  "Two High Split",
  "Single High Centerfield",
  "No High Safety",
  "Safety Walked Down",
  "Extra Rusher Visible",
  "CB Walked Down",
  "Corners Shading Inside",
  "Corners Shading Outside",
];

const USER_POSITIONS: UserPositionType[] = [
  "Unknown", "DT", "NT", "LE", "RE",
  "LOLB", "ROLB", "MLB", "CB", "Slot CB",
  "SS", "FS", "Nickel", "Dollar", "Dime", "Sub LB", "Edge", "Spy",
];

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {children}
    </span>
  );
}

function ConfBar({ label, value, color }: { label: string; value: number; color?: string }) {
  const c = color ?? (value >= 80 ? GREEN : value >= 60 ? ACCENT : value >= 40 ? GOLD : RED);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] font-bold" style={{ color: c }}>{value}%</span>
      </div>
      <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: c }} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
      {children}
    </p>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">{label}</label>
      {children}
    </div>
  );
}

const selectCls = "w-full rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none transition-all";
const selectBg  = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" } as React.CSSProperties;

// ─── Step type ────────────────────────────────────────────────────────────────

type HubStep = "setup" | "presnap" | "results" | "log" | "report";

// ─── Game Session ─────────────────────────────────────────────────────────────

type GameSession = {
  gameId:       string;
  opponentName: string;
  playbook:     string;
  snaps:        FilmSnap[];
  snapCount:    number;
};

// ─── Offense Input ─────────────────────────────────────────────────────────────

type OffenseInput = {
  formation:  string;
  play:       string;
  concept:    string;
  motion:     boolean;
  hotRoutes:  boolean;
};

// ─── Snap Context ─────────────────────────────────────────────────────────────

type SnapContext = {
  quarter:       number;
  clock:         string;
  down:          number;
  distance:      number;
  hash:          FieldHash;
  scoreUser:     number;
  scoreOpponent: number;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function FilmHub() {
  const [step, setStep]       = useState<HubStep>("setup");
  const [tab, setTab]         = useState<"snap" | "log" | "report">("snap");

  // Session
  const [session, setSession] = useState<GameSession | null>(null);
  const [sessionForm, setSessionForm] = useState({ opponentName: "", playbook: "All" });

  // Pre-snap inputs
  const [inputs, setInputs]   = useState<EliminationInputs>({ ...DEFAULT_ELIMINATION_INPUTS });
  const [offense, setOffense] = useState<OffenseInput>({ formation: "", play: "", concept: "", motion: false, hotRoutes: false });
  const [ctx, setCtx]         = useState<SnapContext>({ quarter: 1, clock: "15:00", down: 1, distance: 10, hash: "Middle", scoreUser: 0, scoreOpponent: 0 });

  // Result
  const [result, setResult]   = useState<EliminationResult | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult>("Success");
  const [yardsGained, setYardsGained] = useState(0);
  const [resultFlags, setResultFlags] = useState({ td: false, firstDown: false, turnover: false, sack: false, explosive: false });
  const [actualPlay, setActualPlay]   = useState("");

  // Report
  const [profile, setProfile] = useState<OpponentProfile | null>(null);

  // ── Toggle a tell ──────────────────────────────────────────────────────────
  const toggleTell = useCallback((tell: AdjustmentTell) => {
    setInputs(prev => {
      const has = prev.observedTells.includes(tell);
      return {
        ...prev,
        observedTells: has
          ? prev.observedTells.filter(t => t !== tell)
          : [...prev.observedTells, tell],
      };
    });
  }, []);

  // ── Start session ──────────────────────────────────────────────────────────
  function startSession() {
    if (!sessionForm.opponentName.trim()) return;
    const gameId = makeGameId();
    setSession({
      gameId,
      opponentName: sessionForm.opponentName.trim(),
      playbook:     sessionForm.playbook,
      snaps:        [],
      snapCount:    0,
    });
    setInputs(prev => ({ ...prev, opponentPlaybook: sessionForm.playbook }));
    setStep("presnap");
    setTab("snap");
  }

  // ── Run engine ────────────────────────────────────────────────────────────
  function runEngine() {
    const engineResult = runEliminationEngine(inputs);
    setResult(engineResult);
  }

  // ── Save snap ─────────────────────────────────────────────────────────────
  function saveSnap() {
    if (!session || !result) return;

    const snap = createBlankSnap(session.gameId, session.opponentName, session.snapCount + 1);
    const topPlay = result.topPlay;

    const saved: FilmSnap = {
      ...snap,
      quarter:          ctx.quarter,
      clock:            ctx.clock,
      down:             ctx.down,
      distance:         ctx.distance,
      hash:             ctx.hash,
      scoreUser:        ctx.scoreUser,
      scoreOpponent:    ctx.scoreOpponent,
      offFormation:     offense.formation,
      offPlay:          offense.play,
      offConcept:       offense.concept,
      offMotion:        offense.motion,
      offHotRoutes:     offense.hotRoutes,
      defTeam:          session.opponentName,
      defPlaybook:      inputs.opponentPlaybook,
      defFormation:     inputs.defFormation,
      defCoverage:      topPlay?.play.coverage ?? "",
      defShell:         topPlay?.play.shell ?? result.shellConclusion ?? "",
      defFront:         topPlay?.play.front ?? "",
      defPlayName:      topPlay?.play.playName ?? "",
      defUser:          inputs.userPosition,
      defBlitz:         topPlay ? topPlay.play.blitzType !== "None" : result.blitzProbability >= 70,
      defBlitzType:     topPlay?.play.blitzType ?? "None",
      defAdjustments:   inputs.observedTells,
      defPressure:      topPlay ? topPlay.play.numRushers >= 5 : result.blitzProbability >= 70,
      result:           snapResult,
      yardsGained:      yardsGained,
      td:               resultFlags.td,
      firstDown:        resultFlags.firstDown,
      turnover:         resultFlags.turnover,
      sack:             resultFlags.sack,
      explosivePlay:    yardsGained >= 20,
      eliminationInputs:  inputs,
      eliminationResult:  result,
      enginePrediction:   topPlay ? `${topPlay.play.playName} (${topPlay.confidence}%)` : "Unknown",
      actualPlay:         actualPlay,
    };

    addSnap(saved);

    const updated = {
      ...session,
      snaps:     [...session.snaps, saved],
      snapCount: session.snapCount + 1,
    };
    setSession(updated);

    // Reset for next snap
    setResult(null);
    setActualPlay("");
    setSnapResult("Success");
    setYardsGained(0);
    setResultFlags({ td: false, firstDown: false, turnover: false, sack: false, explosive: false });
    setInputs(prev => ({
      ...DEFAULT_ELIMINATION_INPUTS,
      opponentPlaybook: prev.opponentPlaybook,
      defFormation:     prev.defFormation,
    }));
    setOffense({ formation: "", play: "", concept: "", motion: false, hotRoutes: false });

    // Advance down automatically
    setCtx(prev => ({
      ...prev,
      down:     prev.down < 4 ? prev.down + 1 : 1,
      distance: prev.down < 4 ? Math.max(1, prev.distance - Math.max(yardsGained, 0)) : 10,
    }));
  }

  // ── Build learning report ──────────────────────────────────────────────────
  function buildReport() {
    if (!session) return;
    const prof = rebuildProfile(session.opponentName);
    setProfile(prof);
    setTab("report");
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ── RENDER ──────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────────

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in-0 duration-200">
        <div className="space-y-2">
          <h2
            className="font-display font-black"
            style={{ fontSize: "1.6rem", letterSpacing: "-0.04em", color: ACCENT }}
          >
            Film Analysis Engine
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Deterministic play identification through elimination. Log what you see pre-snap.
            The engine eliminates impossible plays and ranks what remains. No guessing — ever.
          </p>
        </div>

        {/* Engine pipeline graphic */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "rgba(120,180,255,0.04)", border: "1px solid rgba(120,180,255,0.12)" }}
        >
          <SectionLabel>Recognition Pipeline</SectionLabel>
          <div className="flex flex-wrap gap-1.5 items-center text-[11px] font-mono">
            {["Observe Facts", "Eliminate Impossible", "Rank Remaining", "Show Evidence", "Counter Engine"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1.5">
                <span style={{ color: ACCENT }}>{s}</span>
                {i < arr.length - 1 && <span style={{ color: "rgba(255,255,255,0.2)" }}>→</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border p-5 space-y-4" style={{ background: "rgba(0,0,0,0.3)" }}>
          <SectionLabel>Start Session</SectionLabel>

          <FieldBlock label="Opponent Name">
            <input
              value={sessionForm.opponentName}
              onChange={e => setSessionForm(p => ({ ...p, opponentName: e.target.value }))}
              placeholder="Enter gamertag or name"
              className={selectCls}
              style={selectBg}
              onKeyDown={e => e.key === "Enter" && startSession()}
            />
          </FieldBlock>

          <FieldBlock label="Their Playbook">
            <select
              value={sessionForm.playbook}
              onChange={e => setSessionForm(p => ({ ...p, playbook: e.target.value }))}
              className={selectCls}
              style={selectBg}
            >
              {PLAYBOOKS_LIST.map(pb => <option key={pb} value={pb}>{pb}</option>)}
            </select>
          </FieldBlock>

          <button
            onClick={startSession}
            disabled={!sessionForm.opponentName.trim()}
            className="w-full rounded-xl py-3 font-display font-black uppercase tracking-widest transition-all disabled:opacity-40"
            style={{ background: ACCENT, color: "#000", fontSize: "0.85rem" }}
          >
            Start Analyzing
          </button>
        </div>

        {/* Previous snaps summary */}
        {getAllSnaps().length > 0 && (
          <div className="rounded-xl border border-border/50 p-4 space-y-2" style={{ background: "rgba(0,0,0,0.2)" }}>
            <SectionLabel>Stored Snaps</SectionLabel>
            <p className="text-sm text-muted-foreground">
              {getAllSnaps().length} snaps logged across sessions — all searchable in the report.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Main analysis view ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-in fade-in-0 duration-200">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-display font-black text-base" style={{ color: ACCENT }}>
            {session?.opponentName ?? "Session"}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {session?.snaps.length ?? 0} snaps · {session?.playbook} · Elimination Engine Active
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTab("report"); buildReport(); }}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-all"
          >
            Report
          </button>
          <button
            onClick={() => { setStep("setup"); setSession(null); setResult(null); }}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-all"
          >
            New Session
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-border p-1" style={{ background: "rgba(255,255,255,0.02)" }}>
        {(["snap", "log", "report"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "report") buildReport(); }}
            className="flex-1 rounded-lg py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-all"
            style={{
              background: tab === t ? "rgba(255,255,255,0.07)" : "transparent",
              color: tab === t
                ? (t === "snap" ? ACCENT : t === "log" ? GOLD : GREEN)
                : "rgba(255,255,255,0.3)",
            }}
          >
            {t === "snap" ? "Analyze Snap" : t === "log" ? `Log (${session?.snaps.length ?? 0})` : "Report"}
          </button>
        ))}
      </div>

      {/* ── TAB: ANALYZE SNAP ──────────────────────────────────────────────── */}
      {tab === "snap" && (
        <div className="space-y-5">

          {/* Situation */}
          <div className="rounded-xl border border-border p-4 space-y-4" style={{ background: "rgba(0,0,0,0.25)" }}>
            <SectionLabel>Situation</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FieldBlock label="Quarter">
                <select value={ctx.quarter} onChange={e => setCtx(p => ({ ...p, quarter: +e.target.value }))} className={selectCls} style={selectBg}>
                  {[1,2,3,4].map(q => <option key={q}>{q}</option>)}
                </select>
              </FieldBlock>
              <FieldBlock label="Clock">
                <input value={ctx.clock} onChange={e => setCtx(p => ({ ...p, clock: e.target.value }))} placeholder="14:32" className={selectCls} style={selectBg} />
              </FieldBlock>
              <FieldBlock label="Down">
                <select value={ctx.down} onChange={e => setCtx(p => ({ ...p, down: +e.target.value }))} className={selectCls} style={selectBg}>
                  {[1,2,3,4].map(d => <option key={d}>{d}</option>)}
                </select>
              </FieldBlock>
              <FieldBlock label="Distance">
                <input type="number" min={1} max={50} value={ctx.distance} onChange={e => setCtx(p => ({ ...p, distance: +e.target.value }))} className={selectCls} style={selectBg} />
              </FieldBlock>
              <FieldBlock label="Hash">
                <select value={ctx.hash} onChange={e => setCtx(p => ({ ...p, hash: e.target.value as FieldHash }))} className={selectCls} style={selectBg}>
                  {["Left","Middle","Right"].map(h => <option key={h}>{h}</option>)}
                </select>
              </FieldBlock>
              <FieldBlock label="Your Score">
                <input type="number" value={ctx.scoreUser} onChange={e => setCtx(p => ({ ...p, scoreUser: +e.target.value }))} className={selectCls} style={selectBg} />
              </FieldBlock>
              <FieldBlock label="Opp Score">
                <input type="number" value={ctx.scoreOpponent} onChange={e => setCtx(p => ({ ...p, scoreOpponent: +e.target.value }))} className={selectCls} style={selectBg} />
              </FieldBlock>
            </div>
          </div>

          {/* Offense */}
          <div className="rounded-xl border border-border p-4 space-y-4" style={{ background: "rgba(0,0,0,0.25)" }}>
            <SectionLabel>Your Offense</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldBlock label="Formation">
                <input value={offense.formation} onChange={e => setOffense(p => ({ ...p, formation: e.target.value }))} placeholder="Gun Trips TE" className={selectCls} style={selectBg} />
              </FieldBlock>
              <FieldBlock label="Play">
                <input value={offense.play} onChange={e => setOffense(p => ({ ...p, play: e.target.value }))} placeholder="Mesh" className={selectCls} style={selectBg} />
              </FieldBlock>
              <FieldBlock label="Concept">
                <input value={offense.concept} onChange={e => setOffense(p => ({ ...p, concept: e.target.value }))} placeholder="Crossers" className={selectCls} style={selectBg} />
              </FieldBlock>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={offense.motion} onChange={e => setOffense(p => ({ ...p, motion: e.target.checked }))} className="rounded" />
                Motion
              </label>
              <label className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={offense.hotRoutes} onChange={e => setOffense(p => ({ ...p, hotRoutes: e.target.checked }))} className="rounded" />
                Hot Routes
              </label>
            </div>
          </div>

          {/* Defense Recognition */}
          <div className="rounded-xl border p-4 space-y-5" style={{ background: "rgba(120,180,255,0.03)", borderColor: "rgba(120,180,255,0.15)" }}>
            <div className="flex items-center justify-between">
              <SectionLabel>Pre-Snap Defense Recognition</SectionLabel>
              <Pill color={ACCENT}>Madden Terminology</Pill>
            </div>

            {/* Formation & Playbook */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldBlock label="Defensive Formation">
                <select
                  value={inputs.defFormation}
                  onChange={e => setInputs(p => ({ ...p, defFormation: e.target.value }))}
                  className={selectCls} style={selectBg}
                >
                  <option value="">— Any Formation —</option>
                  {ALL_FORMATIONS.map(f => <option key={f}>{f}</option>)}
                </select>
              </FieldBlock>
              <FieldBlock label="Their Playbook">
                <select
                  value={inputs.opponentPlaybook}
                  onChange={e => setInputs(p => ({ ...p, opponentPlaybook: e.target.value }))}
                  className={selectCls} style={selectBg}
                >
                  {PLAYBOOKS_LIST.map(pb => <option key={pb}>{pb}</option>)}
                </select>
              </FieldBlock>
            </div>

            {/* Safety Read — most critical */}
            <div>
              <SectionLabel>Safety Read (Shell Indicator)</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FieldBlock label="Safeties Visible">
                  <select value={inputs.numSafeties} onChange={e => setInputs(p => ({ ...p, numSafeties: e.target.value as NumSafeties }))} className={selectCls} style={selectBg}>
                    <option>Unknown</option>
                    <option>Two High</option>
                    <option>Single High</option>
                    <option>Zero</option>
                  </select>
                </FieldBlock>
                <FieldBlock label="Safety Depth">
                  <select value={inputs.safetyDepth} onChange={e => setInputs(p => ({ ...p, safetyDepth: e.target.value as SafetyDepth }))} className={selectCls} style={selectBg}>
                    <option>Default</option>
                    <option>Tight</option>
                    <option>Over Top</option>
                  </select>
                </FieldBlock>
                <FieldBlock label="Safety Width">
                  <select value={inputs.safetyWidth} onChange={e => setInputs(p => ({ ...p, safetyWidth: e.target.value as SafetyWidth }))} className={selectCls} style={selectBg}>
                    <option>Normal</option>
                    <option>Pinched</option>
                    <option>Spread</option>
                  </select>
                </FieldBlock>
              </div>
            </div>

            {/* CB, LB, DL */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <FieldBlock label="CB Alignment">
                <select value={inputs.cbAlignment} onChange={e => setInputs(p => ({ ...p, cbAlignment: e.target.value as CBAlignment }))} className={selectCls} style={selectBg}>
                  <option>Default</option>
                  <option>Press</option>
                  <option>Back Off</option>
                </select>
              </FieldBlock>
              <FieldBlock label="Coverage Shading">
                <select value={inputs.coverageShading} onChange={e => setInputs(p => ({ ...p, coverageShading: e.target.value as CoverageShading }))} className={selectCls} style={selectBg}>
                  <option>None</option>
                  <option>Inside</option>
                  <option>Outside</option>
                  <option>Over Top</option>
                  <option>Underneath</option>
                </select>
              </FieldBlock>
              <FieldBlock label="LB Alignment">
                <select value={inputs.lbAlignment} onChange={e => setInputs(p => ({ ...p, lbAlignment: e.target.value as LBAlignment }))} className={selectCls} style={selectBg}>
                  <option>Normal</option>
                  <option>Mugged</option>
                  <option>Pinch</option>
                  <option>Spread</option>
                </select>
              </FieldBlock>
              <FieldBlock label="DL Alignment">
                <select value={inputs.dlAlignment} onChange={e => setInputs(p => ({ ...p, dlAlignment: e.target.value as DLAlignment }))} className={selectCls} style={selectBg}>
                  <option>Normal</option>
                  <option>Pinch</option>
                  <option>Spread</option>
                  <option>Shift Left</option>
                  <option>Shift Right</option>
                </select>
              </FieldBlock>
            </div>

            {/* Blitz Read */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldBlock label="Blitz Read">
                <select value={inputs.blitzRead} onChange={e => setInputs(p => ({ ...p, blitzRead: e.target.value as BlitzRead }))} className={selectCls} style={selectBg}>
                  <option>None</option>
                  <option>A-Gap Shade</option>
                  <option>Edge Walk-Up</option>
                  <option>DB Walked Down</option>
                  <option>Multiple Walk-Ups</option>
                  <option>Corner Walk-Down</option>
                </select>
              </FieldBlock>
                      <FieldBlock label="User Position (green circle / first movement)">
                <select value={inputs.userPosition} onChange={e => setInputs(p => ({ ...p, userPosition: e.target.value as UserPositionType | "Unknown" }))} className={selectCls} style={selectBg}>
                  {USER_POSITIONS.map(pos => <option key={pos}>{pos}</option>)}
                </select>
              </FieldBlock>
            </div>

            {/* Extra rushers toggle */}
            <label className="flex items-center gap-2.5 font-mono text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={inputs.extraRushers}
                onChange={e => setInputs(p => ({ ...p, extraRushers: e.target.checked }))}
                className="rounded"
              />
              <span>Extra rusher(s) visible / walking up</span>
            </label>

            {/* Tells checklist */}
            <div>
              <SectionLabel>Observable Tells (check all that apply)</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {ALL_TELLS.map(tell => {
                  const active = inputs.observedTells.includes(tell);
                  return (
                    <button
                      key={tell}
                      onClick={() => toggleTell(tell)}
                      className="rounded-lg px-2.5 py-1 font-mono text-[10px] transition-all"
                      style={{
                        background: active ? `${ACCENT}22` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${active ? ACCENT : "rgba(255,255,255,0.1)"}`,
                        color: active ? ACCENT : "rgba(255,255,255,0.45)",
                      }}
                    >
                      {tell}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Run engine */}
            <button
              onClick={runEngine}
              className="w-full rounded-xl py-3 font-display font-black uppercase tracking-widest transition-all"
              style={{ background: ACCENT, color: "#000", fontSize: "0.85rem" }}
            >
              Run Elimination Engine
            </button>
          </div>

          {/* ── Engine Results ──────────────────────────────────────────────── */}
          {result && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">

              {/* Shell + Blitz read */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-4 space-y-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <SectionLabel>Shell Detected</SectionLabel>
                  <p className="font-display font-black text-lg" style={{ color: ACCENT }}>
                    {result.shellConclusion !== "Unknown" ? result.shellConclusion : "Unknown"}
                  </p>
                  <ConfBar label="Confidence" value={result.shellConfidence} />
                </div>
                <div className="rounded-xl border border-border p-4 space-y-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <SectionLabel>Blitz Probability</SectionLabel>
                  <p className="font-display font-black text-lg" style={{ color: result.blitzProbability >= 60 ? RED : GOLD }}>
                    {result.blitzProbability}%
                  </p>
                  <ConfBar label="Blitz Risk" value={result.blitzProbability} color={result.blitzProbability >= 60 ? RED : GOLD} />
                </div>
              </div>

              {/* Elimination chain */}
              {result.eliminationChain.length > 0 && (
                <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "rgba(0,0,0,0.25)" }}>
                  <SectionLabel>Elimination Chain</SectionLabel>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>Starting pool</span>
                      <span className="font-bold" style={{ color: GOLD }}>{result.startingPool.length} plays</span>
                    </div>
                    {result.eliminationChain.map((step, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                          <span className="font-mono text-[10px] font-bold" style={{ color: ACCENT }}>
                            {step.filterName}: <span style={{ color: GOLD }}>{step.filterValue}</span>
                          </span>
                          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[11px] pl-2">
                          <span className="text-muted-foreground">{step.reason}</span>
                          <span className="font-bold shrink-0 ml-2" style={{ color: RED }}>
                            −{step.before - step.after} eliminated
                          </span>
                        </div>
                        {step.eliminated.length > 0 && (
                          <div className="flex flex-wrap gap-1 pl-2">
                            {step.eliminated.slice(0, 6).map(name => (
                              <span key={name} className="rounded px-1.5 py-0.5 font-mono text-[9px] line-through"
                                style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)" }}>
                                {name}
                              </span>
                            ))}
                            {step.eliminated.length > 6 && (
                              <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                                +{step.eliminated.length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>Remaining</span>
                          <span className="font-bold" style={{ color: GREEN }}>{step.after} plays</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top play result */}
              {result.topPlay && (
                <div
                  className="rounded-xl p-5 space-y-4"
                  style={{ background: "rgba(120,180,255,0.06)", border: "1px solid rgba(120,180,255,0.2)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <SectionLabel>Most Likely Play</SectionLabel>
                      <p className="font-display font-black text-2xl leading-tight" style={{ color: ACCENT }}>
                        {result.topPlay.play.playName}
                      </p>
                      <p className="font-mono text-[11px] mt-0.5 text-muted-foreground">
                        {result.topPlay.play.formation} · {result.topPlay.play.coverage}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-black text-3xl" style={{ color: result.topPlay.confidence >= 75 ? GREEN : GOLD }}>
                        {result.topPlay.confidence}%
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">confidence</p>
                    </div>
                  </div>

                  {/* Evidence trail */}
                  <div>
                    <SectionLabel>Evidence</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {result.evidence.map((e, i) => (
                        <span key={i} className="flex items-center gap-1 font-mono text-[10px] rounded-lg px-2 py-1"
                          style={{ background: "rgba(111,219,168,0.08)", color: GREEN, border: "1px solid rgba(111,219,168,0.2)" }}>
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Alternatives */}
                  {result.alternatives.length > 0 && (
                    <div>
                      <SectionLabel>Alternatives</SectionLabel>
                      <div className="space-y-1.5">
                        {result.alternatives.map(alt => (
                          <div key={alt.play.id} className="flex items-center justify-between font-mono text-[11px]">
                            <div>
                              <span style={{ color: "rgba(255,255,255,0.7)" }}>{alt.play.playName}</span>
                              <span className="ml-2 text-muted-foreground text-[10px]">{alt.play.coverage}</span>
                            </div>
                            <span className="font-bold" style={{ color: GOLD }}>{alt.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Play details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/40">
                    {[
                      ["Shell", result.topPlay.play.shell],
                      ["Front", result.topPlay.play.front],
                      ["Rushers", String(result.topPlay.play.numRushers)],
                      ["Blitz", result.topPlay.play.blitzType],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className="font-mono text-[11px] font-bold text-foreground mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Counters */}
              {result.counters.length > 0 && (
                <div className="space-y-3">
                  <SectionLabel>Counter Engine — {result.topPlay?.play.playName ?? "Selected Play"}</SectionLabel>
                  {result.counters.map((counter, i) => {
                    const diffColor = counter.difficulty <= 2 ? GREEN : counter.difficulty === 3 ? GOLD : RED;
                    const riskColor = counter.risk === "Low" ? GREEN : counter.risk === "Medium" ? GOLD : RED;
                    return (
                      <div
                        key={i}
                        className="rounded-xl p-4 space-y-3"
                        style={{
                          background: i === 0 ? "rgba(111,219,168,0.06)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${i === 0 ? "rgba(111,219,168,0.2)" : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {i === 0 && <Pill color={GREEN}>Best Counter</Pill>}
                              <p className="font-display font-black text-base" style={{ color: i === 0 ? GREEN : ACCENT }}>
                                {counter.play}
                              </p>
                            </div>
                            <p className="font-mono text-[10px] text-muted-foreground">{counter.formation} · {counter.concept}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display font-black text-xl" style={{ color: i === 0 ? GREEN : ACCENT }}>
                              {counter.confidence}%
                            </p>
                            <p className="font-mono text-[9px] text-muted-foreground">confidence</p>
                          </div>
                        </div>

                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                          <span style={{ color: GREEN }}>Why it works: </span>{counter.whyItWorks}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Read Order</p>
                            <ol className="space-y-0.5">
                              {counter.readOrder.map((r, j) => (
                                <li key={j} className="font-mono text-[10px] text-muted-foreground">
                                  <span style={{ color: ACCENT }}>{j + 1}.</span> {r}
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Expected Yards</p>
                              <p className="font-mono text-[11px] font-bold" style={{ color: ACCENT }}>{counter.expectedYards}</p>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-mono text-[9px] rounded px-1.5 py-0.5" style={{ background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}>
                                Risk: {counter.risk}
                              </span>
                              <span className="font-mono text-[9px] rounded px-1.5 py-0.5" style={{ background: `${diffColor}15`, color: diffColor, border: `1px solid ${diffColor}30` }}>
                                Diff: {counter.difficulty}/5
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Log result */}
              <div className="rounded-xl border border-border p-4 space-y-4" style={{ background: "rgba(0,0,0,0.25)" }}>
                <SectionLabel>Log Snap Result</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <FieldBlock label="Result">
                    <select value={snapResult} onChange={e => setSnapResult(e.target.value as SnapResult)} className={selectCls} style={selectBg}>
                      <option>Success</option>
                      <option>Failure</option>
                      <option>Sack</option>
                      <option>TD</option>
                      <option>Turnover</option>
                      <option>Pressure</option>
                      <option>Incomplete</option>
                      <option>First Down</option>
                    </select>
                  </FieldBlock>
                  <FieldBlock label="Yards Gained">
                    <input type="number" value={yardsGained} onChange={e => setYardsGained(+e.target.value)} className={selectCls} style={selectBg} />
                  </FieldBlock>
                  <FieldBlock label="Actual Play (if known)">
                    <input value={actualPlay} onChange={e => setActualPlay(e.target.value)} placeholder="Mid Blitz" className={selectCls} style={selectBg} />
                  </FieldBlock>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { key: "td", label: "TD" },
                    { key: "firstDown", label: "First Down" },
                    { key: "turnover", label: "Turnover" },
                    { key: "sack", label: "Sack" },
                    { key: "explosive", label: "Explosive (20+ yds)" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resultFlags[key as keyof typeof resultFlags]}
                        onChange={e => setResultFlags(p => ({ ...p, [key]: e.target.checked }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <button
                  onClick={saveSnap}
                  className="w-full rounded-xl py-3 font-display font-black uppercase tracking-widest transition-all"
                  style={{ background: GREEN, color: "#000", fontSize: "0.85rem" }}
                >
                  Save Snap → Next
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ── TAB: LOG ────────────────────────────────────────────────────────── */}
      {tab === "log" && (
        <div className="space-y-3">
          {session && session.snaps.length === 0 && (
            <div className="rounded-xl border border-border/50 p-10 text-center space-y-2">
              <p className="font-display text-base text-muted-foreground">No snaps logged yet.</p>
              <p className="font-mono text-[11px] text-muted-foreground">Go to Analyze Snap to log your first snap.</p>
            </div>
          )}
          {session?.snaps.map((snap, i) => (
            <div
              key={snap.id}
              className="rounded-xl border border-border p-4 space-y-2"
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold" style={{ color: GOLD }}>#{i + 1}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Q{snap.quarter} {snap.clock} · {snap.down}&amp;{snap.distance}
                  </span>
                  {snap.defShell && <Pill color={ACCENT}>{snap.defShell}</Pill>}
                  {snap.defBlitz && <Pill color={RED}>Blitz</Pill>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold" style={{
                    color: snap.yardsGained >= 10 ? GREEN : snap.yardsGained >= 5 ? GOLD : snap.yardsGained <= 0 ? RED : "rgba(255,255,255,0.6)",
                  }}>
                    {snap.yardsGained > 0 ? "+" : ""}{snap.yardsGained} yds
                  </span>
                  {snap.td && <Pill color={GREEN}>TD</Pill>}
                  {snap.sack && <Pill color={RED}>Sack</Pill>}
                  {snap.turnover && <Pill color={RED}>TO</Pill>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground">Engine Prediction</p>
                  <p className="font-mono text-[10px] text-foreground">{snap.enginePrediction || "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground">Actual Play</p>
                  <p className="font-mono text-[10px] text-foreground">{snap.actualPlay || "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground">Def Formation</p>
                  <p className="font-mono text-[10px] text-foreground">{snap.defFormation || "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground">User</p>
                  <p className="font-mono text-[10px] text-foreground">{snap.defUser || "—"}</p>
                </div>
              </div>
              {snap.defAdjustments.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {snap.defAdjustments.slice(0, 5).map(adj => (
                    <span key={adj} className="rounded px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {adj}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: REPORT ─────────────────────────────────────────────────────── */}
      {tab === "report" && (
        <div className="space-y-5">
          {!profile && (
            <div className="rounded-xl border border-border/50 p-10 text-center space-y-2">
              <p className="font-display text-base text-muted-foreground">Log snaps first to generate a report.</p>
            </div>
          )}
          {profile && (
            <>
              <div className="rounded-xl border border-border p-5 space-y-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-black text-lg" style={{ color: GREEN }}>{profile.opponentName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {profile.totalSnaps} snaps · {profile.gamesPlayed} game{profile.gamesPlayed !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-black text-2xl" style={{ color: profile.blitzRate >= 50 ? RED : GOLD }}>
                      {profile.blitzRate}%
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">blitz rate</p>
                  </div>
                </div>
              </div>

              {/* Insights */}
              {profile.insights.length > 0 && (
                <div className="space-y-3">
                  <SectionLabel>AI Coaching Insights</SectionLabel>
                  {profile.insights.map((ins, i) => {
                    const col = ins.severity === "Critical" ? RED : ins.severity === "High" ? GOLD : ins.severity === "Medium" ? ACCENT : GREEN;
                    return (
                      <div key={i} className="rounded-xl p-4 space-y-2"
                        style={{ background: `${col}08`, border: `1px solid ${col}22` }}>
                        <div className="flex items-center gap-2">
                          <Pill color={col}>{ins.severity}</Pill>
                          <span className="font-mono text-[11px] font-bold" style={{ color: col }}>{ins.category}</span>
                        </div>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{ins.insight}</p>
                        <p className="text-[12px] leading-relaxed" style={{ color: GREEN }}>
                          <span style={{ color: "rgba(255,255,255,0.5)" }}>Exploit: </span>{ins.exploit}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Coverage frequency */}
              {profile.shellFrequency.length > 0 && (
                <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "rgba(0,0,0,0.25)" }}>
                  <SectionLabel>Shell Frequency</SectionLabel>
                  {profile.shellFrequency.slice(0, 6).map(item => (
                    <ConfBar key={item.label} label={`${item.label} (${item.count}x)`} value={item.pct} />
                  ))}
                </div>
              )}

              {/* Coverage frequency */}
              {profile.coverageFrequency.length > 0 && (
                <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "rgba(0,0,0,0.25)" }}>
                  <SectionLabel>Coverage Frequency</SectionLabel>
                  {profile.coverageFrequency.slice(0, 6).map(item => (
                    <ConfBar key={item.label} label={`${item.label} (${item.count}x)`} value={item.pct} />
                  ))}
                </div>
              )}

              {/* Blitz by down */}
              {profile.totalSnaps >= 3 && (
                <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "rgba(0,0,0,0.25)" }}>
                  <SectionLabel>Blitz Rate by Down</SectionLabel>
                  {[1,2,3,4].map(d => (
                    <ConfBar
                      key={d}
                      label={`${d}${d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"} Down`}
                      value={profile.blitzByDown[String(d)] ?? 0}
                      color={(profile.blitzByDown[String(d)] ?? 0) >= 60 ? RED : GOLD}
                    />
                  ))}
                </div>
              )}

              {/* Favorite formations */}
              {profile.favoriteFormations.length > 0 && (
                <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "rgba(0,0,0,0.25)" }}>
                  <SectionLabel>Favorite Formations</SectionLabel>
                  {profile.favoriteFormations.slice(0, 5).map(item => (
                    <div key={item.label} className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[10px]">{item.count}x</span>
                        <span className="font-bold" style={{ color: ACCENT }}>{item.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* User position tendency */}
              {profile.userPositionFrequency.length > 0 && (
                <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "rgba(0,0,0,0.25)" }}>
                  <SectionLabel>User Position Tendency</SectionLabel>
                  {profile.userPositionFrequency.slice(0, 4).map(item => (
                    <ConfBar key={item.label} label={`${item.label} (${item.count}x)`} value={item.pct} />
                  ))}
                </div>
              )}

              {/* AI Summary */}
              {profile.totalSnaps >= 3 && (
                <div className="rounded-xl p-5 space-y-2"
                  style={{ background: "rgba(111,219,168,0.05)", border: "1px solid rgba(111,219,168,0.15)" }}>
                  <SectionLabel>AI Coaching Summary</SectionLabel>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {profile.opponentName} runs{" "}
                    {profile.shellFrequency[0] ? <span style={{ color: ACCENT }}>{profile.shellFrequency[0].label}</span> : "mixed coverage"}{" "}
                    {profile.shellFrequency[0]?.pct ? `${profile.shellFrequency[0].pct}% of the time` : ""}
                    {profile.blitzRate >= 50
                      ? `, blitzing at an elevated rate of ${profile.blitzRate}% — well above average. Prepare hot routes and quick game on every passing down.`
                      : profile.blitzRate >= 30
                      ? `, with a moderate blitz rate of ${profile.blitzRate}%. Stay alert on 3rd down.`
                      : `. Their blitz rate of ${profile.blitzRate}% is conservative — take your shot shots down the field.`}
                    {profile.favoriteFormations[0]
                      ? ` They line up in ${profile.favoriteFormations[0].label} ${profile.favoriteFormations[0].pct}% of the time — study that formation's tells before the game.`
                      : ""}
                    {profile.userPositionFrequency[0]
                      ? ` User tendency: ${profile.userPositionFrequency[0].label} (${profile.userPositionFrequency[0].pct}% of snaps) — account for that defender in your read progression.`
                      : ""}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
