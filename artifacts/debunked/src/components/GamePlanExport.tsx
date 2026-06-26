import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import type { BotPiece } from "@/lib/madden-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tendency = {
  passRate: number;
  runRate: number;
  blitzRate: number;
  topCoverage: string;
  secondCoverage: string;
  topOffFormation: string;
  userBehavior: string;
  topConcept: string;
};

type CounterPick = { concept: string; confidence: number; note: string; color: string };

// ─── Preset Coverage Options ──────────────────────────────────────────────────

const COVERAGE_OPTIONS = [
  "Cover 0", "Cover 1 Robber", "Cover 1 Press", "Cover 2 Zone", "Cover 2 Tampa",
  "Cover 3 Sky", "Cover 3 Buzz", "Cover 4 Quarters", "Cover 4 Palms", "Cover 6",
  "Man Free", "Unknown / Mixed",
];

const FORMATION_OPTIONS = [
  "Gun Bunch", "Gun Trips TE", "Gun Tight Slots", "Gun Empty", "Shotgun 5-Wide",
  "Singleback Ace", "I-Form Pro", "I-Form Twins", "Strong I", "Pistol Bunch",
  "Nickel 3-3-5", "4-3 Base", "3-4 Base", "Dime",
];

const USER_BEHAVIORS = [
  "None / Unpredictable", "Follows crossers", "Overplays middle",
  "Abandons flats", "Bites on play action", "Click-on tendency",
  "Brackets #1 WR", "Chases ball carrier", "Doesn't rotate with motion",
];

const CONCEPT_OPTIONS = [
  "Flood / Sail", "Mesh / Crossers", "Smash / Corner", "4-Verts",
  "Slants", "Curl / Flat", "Post / Dig (Dagger)", "Wheel",
  "RB Screen", "Bubble Screen", "PA Deep Shot", "Hot Routes (vs Blitz)",
];

// ─── Confidence Colors ────────────────────────────────────────────────────────

const confColor = (c: number) =>
  c >= 90 ? "#22c55e" : c >= 80 ? "#fbbf24" : c >= 70 ? "#f97316" : "#ef4444";

// ─── Inline-safe Bar ─────────────────────────────────────────────────────────

function Bar({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height: 6, background: "#1e2433", borderRadius: 3, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

// ─── The Exportable Game Plan Document ───────────────────────────────────────

function GamePlanDocument({
  opponent, pieces, tendency, counters, notes, exportRef,
}: {
  opponent: string;
  pieces: BotPiece[];
  tendency: Tendency;
  counters: CounterPick[];
  notes: string;
  exportRef: React.RefObject<HTMLDivElement | null>;
}) {
  const offPlays = pieces.filter((p) => p.side === "OFF");
  const defPlays = pieces.filter((p) => p.side === "DEF");
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const S = {
    // Root
    doc: {
      width: 1200,
      background: "#0a0c12",
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      color: "#f1f5f9",
      padding: "0 0 32px",
      display: "flex" as const,
      flexDirection: "column" as const,
    } as React.CSSProperties,

    // Header
    header: {
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
      borderBottom: "3px solid #312e81",
      padding: "20px 36px",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    } as React.CSSProperties,

    logoText: {
      fontSize: 28, fontWeight: 900, letterSpacing: "0.15em",
      background: "linear-gradient(90deg, #818cf8 0%, #c084fc 100%)",
      WebkitBackgroundClip: "text" as const,
      WebkitTextFillColor: "transparent" as const,
      display: "inline-block" as const,
    } as React.CSSProperties,

    // Grid
    grid: {
      display: "grid" as const,
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      padding: "20px 28px 0",
    } as React.CSSProperties,

    fullRow: {
      gridColumn: "1 / -1" as const,
    } as React.CSSProperties,

    // Section card
    card: (accent: string): React.CSSProperties => ({
      background: "#111827",
      border: `1.5px solid ${accent}44`,
      borderRadius: 12,
      overflow: "hidden" as const,
    }),

    sectionHeader: (accent: string, bg: string): React.CSSProperties => ({
      background: bg,
      borderBottom: `2px solid ${accent}`,
      padding: "10px 16px",
      display: "flex" as const,
      alignItems: "center" as const,
      gap: 10,
    }),

    sectionTitle: {
      fontSize: 11, fontWeight: 800, letterSpacing: "0.3em",
      textTransform: "uppercase" as const,
    } as React.CSSProperties,

    sectionBody: {
      padding: "14px 16px",
    } as React.CSSProperties,

    // Play item
    playItem: (accent: string): React.CSSProperties => ({
      background: `${accent}0d`,
      border: `1px solid ${accent}22`,
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 8,
    }),

    playLabel: {
      fontWeight: 700, fontSize: 13, marginBottom: 4,
    } as React.CSSProperties,

    playDetail: {
      fontSize: 10, color: "#94a3b8", lineHeight: "1.5",
    } as React.CSSProperties,

    // Tendency row
    tendRow: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: 10,
      marginBottom: 10,
    } as React.CSSProperties,

    tendLabel: {
      fontSize: 10, color: "#94a3b8", width: 90, flexShrink: 0 as const,
    } as React.CSSProperties,

    tendValue: {
      fontSize: 11, fontWeight: 700, width: 42, textAlign: "right" as const, flexShrink: 0 as const,
    } as React.CSSProperties,

    // Counter card
    counterCard: (color: string, rank: number): React.CSSProperties => ({
      background: `${color}0d`,
      border: `1.5px solid ${color}44`,
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 10,
    }),
  };

  // Rank circle colors
  const rankColors = ["#fbbf24", "#94a3b8", "#f97316", "#6b7280"];

  return (
    <div ref={exportRef} style={S.doc}>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div>
          <div style={S.logoText}>DEBUNKED.</div>
          <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.25em", marginTop: 4 }}>
            MADDEN 26 · GAME PLAN
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          {opponent && (
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.06em", marginBottom: 4 }}>
              vs {opponent.toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.2em" }}>{today}</div>
        </div>
      </div>

      <div style={S.grid}>

        {/* ── OFFENSIVE PLAYS ── */}
        <div style={S.card("#3b82f6")}>
          <div style={S.sectionHeader("#3b82f6", "rgba(59,130,246,0.12)")}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6" }} />
            <span style={{ ...S.sectionTitle, color: "#60a5fa" }}>
              ⚡ Offensive Plays
            </span>
            <span style={{ marginLeft: "auto", fontSize: 9, color: "#60a5fa80", letterSpacing: "0.2em" }}>
              {offPlays.length} PLAYS
            </span>
          </div>
          <div style={S.sectionBody}>
            {offPlays.length === 0 ? (
              <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic" }}>
                No offensive plays added. Use the Play Builder or other labs and click "Add to Bot".
              </div>
            ) : (
              offPlays.map((p, i) => (
                <div key={i} style={S.playItem("#3b82f6")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", background: "#3b82f6",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900, color: "#fff", flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ ...S.playLabel, color: "#93c5fd" }}>{p.label}</div>
                  </div>
                  <div style={S.playDetail}>
                    {p.detail.split("·").map((seg, j) => (
                      <span key={j}>
                        {j > 0 && <span style={{ color: "#3b82f644", margin: "0 4px" }}>·</span>}
                        {seg.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── DEFENSIVE PLAYS ── */}
        <div style={S.card("#ef4444")}>
          <div style={S.sectionHeader("#ef4444", "rgba(239,68,68,0.12)")}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ ...S.sectionTitle, color: "#f87171" }}>
              🛡 Defensive Calls
            </span>
            <span style={{ marginLeft: "auto", fontSize: 9, color: "#f8717180", letterSpacing: "0.2em" }}>
              {defPlays.length} CALLS
            </span>
          </div>
          <div style={S.sectionBody}>
            {defPlays.length === 0 ? (
              <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic" }}>
                No defensive calls added. Use the Defense or Blitz Lab and click "Add to Bot".
              </div>
            ) : (
              defPlays.map((p, i) => (
                <div key={i} style={S.playItem("#ef4444")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", background: "#ef4444",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900, color: "#fff", flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ ...S.playLabel, color: "#fca5a5" }}>{p.label}</div>
                  </div>
                  <div style={S.playDetail}>{p.detail}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── OPPONENT TENDENCIES ── */}
        <div style={S.card("#f59e0b")}>
          <div style={S.sectionHeader("#f59e0b", "rgba(245,158,11,0.12)")}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
            <span style={{ ...S.sectionTitle, color: "#fbbf24" }}>
              📋 Opponent Tendencies
            </span>
          </div>
          <div style={S.sectionBody}>
            {/* Pass / Run / Blitz bars */}
            <div style={{ marginBottom: 16 }}>
              <div style={S.tendRow}>
                <div style={S.tendLabel}>Pass Rate</div>
                <Bar value={tendency.passRate} color="#60a5fa" />
                <div style={{ ...S.tendValue, color: "#60a5fa" }}>{tendency.passRate}%</div>
              </div>
              <div style={S.tendRow}>
                <div style={S.tendLabel}>Run Rate</div>
                <Bar value={tendency.runRate} color="#34d399" />
                <div style={{ ...S.tendValue, color: "#34d399" }}>{tendency.runRate}%</div>
              </div>
              <div style={S.tendRow}>
                <div style={S.tendLabel}>Blitz Rate</div>
                <Bar value={tendency.blitzRate} color="#f87171" />
                <div style={{ ...S.tendValue, color: "#f87171" }}>{tendency.blitzRate}%</div>
              </div>
            </div>

            {/* Key intel rows */}
            <div style={{ borderTop: "1px solid #1e2433", paddingTop: 12 }}>
              {[
                { icon: "🔵", label: "Primary Coverage", value: tendency.topCoverage },
                { icon: "🔷", label: "Secondary Coverage", value: tendency.secondCoverage },
                { icon: "🏈", label: "Fav. Off Formation", value: tendency.topOffFormation },
                { icon: "⚡", label: "Fav. Concept", value: tendency.topConcept },
                { icon: "🎮", label: "User Behavior", value: tendency.userBehavior },
              ].filter((row) => row.value).map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{row.icon} {row.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#fde68a", maxWidth: 200, textAlign: "right" }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COUNTER RECOMMENDATIONS ── */}
        <div style={S.card("#22c55e")}>
          <div style={S.sectionHeader("#22c55e", "rgba(34,197,94,0.12)")}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ ...S.sectionTitle, color: "#4ade80" }}>
              🎯 Counter Recommendations
            </span>
          </div>
          <div style={S.sectionBody}>
            {counters.length === 0 ? (
              <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic" }}>
                No counters selected. Add them in the form on the left.
              </div>
            ) : (
              counters.map((c, i) => (
                <div key={i} style={S.counterCard(c.color, i)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {/* Rank circle */}
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: rankColors[i] ?? "#4b5563",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900, color: "#000", flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{c.concept}</div>
                    {/* Confidence badge */}
                    <div style={{
                      background: `${confColor(c.confidence)}22`,
                      border: `1.5px solid ${confColor(c.confidence)}66`,
                      borderRadius: 20, padding: "3px 10px",
                      fontSize: 12, fontWeight: 900, color: confColor(c.confidence),
                    }}>{c.confidence}%</div>
                  </div>
                  {/* Confidence bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: c.note ? 8 : 0 }}>
                    <div style={{ fontSize: 9, color: "#64748b", width: 70, flexShrink: 0 }}>Confidence</div>
                    <Bar value={c.confidence} color={confColor(c.confidence)} />
                  </div>
                  {c.note && (
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, lineHeight: 1.5 }}>
                      ▸ {c.note}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── NOTES / ADJUSTMENTS (full width) ── */}
        {notes.trim() && (
          <div style={{ ...S.card("#8b5cf6"), ...S.fullRow }}>
            <div style={S.sectionHeader("#8b5cf6", "rgba(139,92,246,0.12)")}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6" }} />
              <span style={{ ...S.sectionTitle, color: "#a78bfa" }}>
                📝 Notes &amp; Adjustments
              </span>
            </div>
            <div style={{ ...S.sectionBody, fontSize: 11, color: "#cbd5e1", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {notes}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ ...S.fullRow, borderTop: "1px solid #1e2433", marginTop: 8, padding: "12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>
            DEBUNKED. · MADDEN 26 STRATEGY · debunked.app
          </div>
          <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>
            {offPlays.length} OFF · {defPlays.length} DEF · {counters.length} COUNTERS
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Counter Builder ──────────────────────────────────────────────────────────

const COUNTER_COLORS = ["#22c55e", "#60a5fa", "#f59e0b", "#c084fc", "#f87171", "#38bdf8"];

function CounterBuilder({
  counters, onChange,
}: {
  counters: CounterPick[];
  onChange: (c: CounterPick[]) => void;
}) {
  const [concept, setConcept]     = useState(CONCEPT_OPTIONS[0]);
  const [confidence, setConf]     = useState(85);
  const [note, setNote]           = useState("");

  function add() {
    if (counters.length >= 6) return;
    const color = COUNTER_COLORS[counters.length % COUNTER_COLORS.length];
    onChange([...counters, { concept, confidence, note, color }]);
    setNote("");
    setConf(85);
  }

  function remove(i: number) {
    onChange(counters.filter((_, idx) => idx !== i));
  }

  const sel = "w-full rounded-lg border border-[#1e2433] bg-[#0d0f14] px-3 py-2 font-mono text-xs text-foreground focus:border-team-one focus:outline-none";

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Concept</div>
          <select value={concept} onChange={(e) => setConcept(e.target.value)} className={sel}>
            {CONCEPT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Confidence: {confidence}%</div>
          <input
            type="range" min={50} max={99} value={confidence}
            onChange={(e) => setConf(Number(e.target.value))}
            className="w-full accent-team-one"
          />
        </div>
      </div>
      <div className="space-y-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Key Note (optional)</div>
        <input
          type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Attack the flat once safety bites..."
          className={sel + " placeholder:text-muted-foreground/40"}
        />
      </div>
      <button
        onClick={add}
        disabled={counters.length >= 6}
        className="w-full rounded-lg border border-team-one/50 bg-team-one/10 py-2 font-mono text-[11px] font-bold text-team-one hover:bg-team-one/18 transition-all disabled:opacity-40"
      >
        + Add Counter (max 6)
      </button>
      {counters.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {counters.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="font-mono text-[11px] flex-1 text-foreground">{c.concept}</span>
              <span className="font-mono text-[10px] font-bold" style={{ color: confColor(c.confidence) }}>{c.confidence}%</span>
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive transition text-xs ml-1">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export Component ────────────────────────────────────────────────────

export function GamePlanExport({ pieces }: { pieces: BotPiece[] }) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const [opponent,    setOpponent]    = useState("");
  const [tendency,    setTendency]    = useState<Tendency>({
    passRate: 60, runRate: 40, blitzRate: 30,
    topCoverage: "Cover 3 Sky", secondCoverage: "Cover 1 Robber",
    topOffFormation: "Gun Bunch", userBehavior: "Follows crossers",
    topConcept: "Mesh / Crossers",
  });
  const [counters, setCounters] = useState<CounterPick[]>([]);
  const [notes,    setNotes]    = useState("");

  function updateTendency(patch: Partial<Tendency>) {
    setTendency((prev) => ({ ...prev, ...patch }));
  }

  async function handleExport() {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#0a0c12",
        scale: 2,
        useCORS: true,
        logging: false,
        width: 1200,
      });
      const link = document.createElement("a");
      link.download = `gameplan-${opponent || "debunked"}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  }

  const fieldSel = "w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-team-one focus:outline-none";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">Game Plan Export</h2>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            Build your complete game plan — download as a high-res PNG image
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-xl border border-team-one/60 bg-team-one/12 px-6 py-3 font-mono text-sm font-bold text-team-one transition-all hover:border-team-one hover:bg-team-one/20 disabled:opacity-60"
        >
          {exporting ? (
            <><span className="animate-spin">⟳</span> Rendering...</>
          ) : (
            <><span>↓</span> Download PNG</>
          )}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* ── LEFT: Form ── */}
        <div className="space-y-4">

          {/* Opponent */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Opponent Info</div>
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] text-muted-foreground">Opponent Name / Gamertag</div>
              <input
                type="text" value={opponent} onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g. xSlugBts or Team Name..."
                className={fieldSel + " placeholder:text-muted-foreground/40"}
              />
            </div>
          </div>

          {/* Tendencies */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Opponent Tendencies</div>

            {/* Pass/Run slider */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>Pass Rate</span>
                <span className="text-blue-400 font-bold">{tendency.passRate}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={tendency.passRate}
                onChange={(e) => { const v = Number(e.target.value); updateTendency({ passRate: v, runRate: 100 - v }); }}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
                <span className="text-blue-400">Pass {tendency.passRate}%</span>
                <span className="text-green-400">Run {tendency.runRate}%</span>
              </div>
            </div>

            {/* Blitz slider */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>Blitz Rate</span>
                <span className="text-red-400 font-bold">{tendency.blitzRate}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={tendency.blitzRate}
                onChange={(e) => updateTendency({ blitzRate: Number(e.target.value) })}
                className="w-full accent-red-500"
              />
            </div>

            {/* Dropdowns */}
            {[
              { label: "Primary Coverage",     key: "topCoverage",     options: COVERAGE_OPTIONS },
              { label: "Secondary Coverage",   key: "secondCoverage",  options: COVERAGE_OPTIONS },
              { label: "Fav. Off Formation",   key: "topOffFormation", options: FORMATION_OPTIONS },
              { label: "Fav. Concept",         key: "topConcept",      options: CONCEPT_OPTIONS  },
              { label: "User Behavior",        key: "userBehavior",    options: USER_BEHAVIORS   },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <div className="font-mono text-[10px] text-muted-foreground">{field.label}</div>
                <select
                  value={(tendency as any)[field.key]}
                  onChange={(e) => updateTendency({ [field.key]: e.target.value } as Partial<Tendency>)}
                  className={fieldSel}
                >
                  {field.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Counter Recommendations */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Counter Recommendations</div>
            <CounterBuilder counters={counters} onChange={setCounters} />
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Notes &amp; Adjustments</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any mid-game adjustments, audibles, or tendencies to remember..."
              rows={4}
              className={fieldSel + " resize-none placeholder:text-muted-foreground/40"}
            />
          </div>

          {/* Bot pieces indicator */}
          {pieces.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Loaded from Bot</div>
              <div className="flex gap-3 font-mono text-xs">
                <span className="text-blue-400 font-bold">{pieces.filter((p) => p.side === "OFF").length} OFF plays</span>
                <span className="text-red-400 font-bold">{pieces.filter((p) => p.side === "DEF").length} DEF calls</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground mt-1">
                Add more plays from the labs and click "Add to Bot"
              </div>
            </div>
          )}

          {pieces.length === 0 && (
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="font-mono text-[10px] text-muted-foreground">
                💡 Add plays from the other labs using "Add to Bot" and they'll appear in the export automatically.
              </div>
            </div>
          )}

          {/* Export button (bottom) */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full rounded-xl border border-team-one/60 bg-team-one/12 py-4 font-display text-base font-bold text-team-one transition-all hover:border-team-one hover:bg-team-one/20 disabled:opacity-60"
          >
            {exporting ? "Rendering image…" : "↓ Download PNG Game Plan"}
          </button>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Live Preview</div>
            <div className="font-mono text-[9px] text-muted-foreground/50">Updates as you type</div>
          </div>
          <div className="overflow-auto rounded-xl border border-border">
            {/* Scale-down wrapper so it fits in viewport */}
            <div style={{ transform: "scale(0.52)", transformOrigin: "top left", width: 1200, height: "auto" }}>
              <GamePlanDocument
                exportRef={exportRef}
                opponent={opponent}
                pieces={pieces}
                tendency={tendency}
                counters={counters}
                notes={notes}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
