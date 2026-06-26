import { useState, useRef, useEffect } from "react";
import { PlaySimulator, type SimCoverage, type SimPlay } from "./PlaySimulator";

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteKey =
  | "Streak" | "Fade" | "Post" | "Corner" | "Out" | "In"
  | "Slant" | "Flat" | "Drag" | "Wheel" | "Block" | "None";

type DesignationKey = "primary" | "secondary" | "checkdown" | "motion" | "user" | "none";

type PlayerDef = {
  id: string;
  pos: string;
  x: number;
  y: number;
  dir: "L" | "R" | "C";
  clickable: boolean;
  baseColor: string;
};

type PlayerState = {
  route: RouteKey;
  designation: DesignationKey;
};

type Formation = {
  id: string;
  name: string;
  players: PlayerDef[];
};

// ─── Field Constants ──────────────────────────────────────────────────────────

const VW = 600;
const VH = 400;
const LOS_Y = 252;

const OL: PlayerDef[] = [
  { id: "lt", pos: "LT", x: 237, y: LOS_Y, dir: "L",  clickable: false, baseColor: "#374151" },
  { id: "lg", pos: "LG", x: 266, y: LOS_Y, dir: "L",  clickable: false, baseColor: "#374151" },
  { id: "c",  pos: "C",  x: 300, y: LOS_Y, dir: "C",  clickable: false, baseColor: "#374151" },
  { id: "rg", pos: "RG", x: 334, y: LOS_Y, dir: "R",  clickable: false, baseColor: "#374151" },
  { id: "rt", pos: "RT", x: 363, y: LOS_Y, dir: "R",  clickable: false, baseColor: "#374151" },
];

const FORMATIONS: Formation[] = [
  {
    id: "gun-bunch", name: "Gun Bunch",
    players: [
      ...OL,
      { id: "qb",  pos: "QB", x: 300, y: 308, dir: "C", clickable: false, baseColor: "#f59e0b" },
      { id: "hb",  pos: "HB", x: 350, y: 310, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "x",   pos: "X",  x: 50,  y: 246, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "te",  pos: "TE", x: 390, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "y",   pos: "Y",  x: 428, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "z",   pos: "Z",  x: 464, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
    ],
  },
  {
    id: "gun-trips", name: "Gun Trips TE",
    players: [
      ...OL,
      { id: "qb",  pos: "QB", x: 300, y: 308, dir: "C", clickable: false, baseColor: "#f59e0b" },
      { id: "hb",  pos: "HB", x: 255, y: 310, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "x",   pos: "X",  x: 50,  y: 246, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "te",  pos: "TE", x: 396, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "y",   pos: "Y",  x: 436, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "z",   pos: "Z",  x: 476, y: 246, dir: "R", clickable: true,  baseColor: "#3b82f6" },
    ],
  },
  {
    id: "gun-empty", name: "Gun Empty",
    players: [
      ...OL,
      { id: "qb",  pos: "QB", x: 300, y: 308, dir: "C", clickable: false, baseColor: "#f59e0b" },
      { id: "x",   pos: "X",  x: 50,  y: 246, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "h",   pos: "H",  x: 158, y: 248, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "te",  pos: "TE", x: 388, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "y",   pos: "Y",  x: 434, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "z",   pos: "Z",  x: 524, y: 246, dir: "R", clickable: true,  baseColor: "#3b82f6" },
    ],
  },
  {
    id: "iform", name: "I-Formation",
    players: [
      ...OL,
      { id: "qb",  pos: "QB", x: 300, y: 267, dir: "C", clickable: false, baseColor: "#f59e0b" },
      { id: "fb",  pos: "FB", x: 300, y: 296, dir: "C", clickable: false, baseColor: "#6b7280" },
      { id: "hb",  pos: "HB", x: 300, y: 330, dir: "C", clickable: true,  baseColor: "#3b82f6" },
      { id: "x",   pos: "X",  x: 50,  y: 246, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "te",  pos: "TE", x: 387, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "z",   pos: "Z",  x: 527, y: 246, dir: "R", clickable: true,  baseColor: "#3b82f6" },
    ],
  },
  {
    id: "singleback", name: "Singleback Ace",
    players: [
      ...OL,
      { id: "qb",  pos: "QB", x: 300, y: 300, dir: "C", clickable: false, baseColor: "#f59e0b" },
      { id: "hb",  pos: "HB", x: 300, y: 336, dir: "C", clickable: true,  baseColor: "#3b82f6" },
      { id: "x",   pos: "X",  x: 50,  y: 246, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "fl",  pos: "FL", x: 202, y: 248, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "te",  pos: "TE", x: 387, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "z",   pos: "Z",  x: 527, y: 246, dir: "R", clickable: true,  baseColor: "#3b82f6" },
    ],
  },
  {
    id: "spread", name: "Shotgun Spread",
    players: [
      ...OL,
      { id: "qb",  pos: "QB", x: 300, y: 308, dir: "C", clickable: false, baseColor: "#f59e0b" },
      { id: "hb",  pos: "HB", x: 348, y: 310, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "x",   pos: "X",  x: 50,  y: 246, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "h",   pos: "H",  x: 163, y: 248, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "y",   pos: "Y",  x: 422, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "z",   pos: "Z",  x: 527, y: 246, dir: "R", clickable: true,  baseColor: "#3b82f6" },
    ],
  },
  {
    id: "pistol-bunch", name: "Pistol Bunch",
    players: [
      ...OL,
      { id: "qb",  pos: "QB", x: 300, y: 285, dir: "C", clickable: false, baseColor: "#f59e0b" },
      { id: "hb",  pos: "HB", x: 300, y: 322, dir: "C", clickable: true,  baseColor: "#3b82f6" },
      { id: "x",   pos: "X",  x: 50,  y: 246, dir: "L", clickable: true,  baseColor: "#3b82f6" },
      { id: "te",  pos: "TE", x: 395, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "y",   pos: "Y",  x: 432, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
      { id: "z",   pos: "Z",  x: 468, y: 248, dir: "R", clickable: true,  baseColor: "#3b82f6" },
    ],
  },
];

// ─── Route Path Generator ─────────────────────────────────────────────────────

function getRoutePath(x: number, y: number, route: RouteKey, dir: "L" | "R" | "C"): string {
  const d = dir === "L" ? -1 : 1;
  switch (route) {
    case "Streak":  return `M ${x} ${y} L ${x} ${y - 148}`;
    case "Fade":    return `M ${x} ${y} Q ${x + d * 18} ${y - 70} ${x + d * 46} ${y - 148}`;
    case "Post":    return `M ${x} ${y} L ${x} ${y - 82} Q ${x} ${y - 112} ${x - d * 52} ${y - 148}`;
    case "Corner":  return `M ${x} ${y} L ${x} ${y - 82} Q ${x} ${y - 112} ${x + d * 52} ${y - 148}`;
    case "Out":     return `M ${x} ${y} L ${x} ${y - 76} L ${x + d * 66} ${y - 76}`;
    case "In":      return `M ${x} ${y} L ${x} ${y - 76} L ${x - d * 66} ${y - 76}`;
    case "Slant":   return `M ${x} ${y} L ${x - d * 54} ${y - 58}`;
    case "Flat":    return `M ${x} ${y} Q ${x + d * 32} ${y + 3} ${x + d * 68} ${y + 3}`;
    case "Drag":    return `M ${x} ${y} Q ${x - d * 26} ${y - 11} ${x - d * 84} ${y - 18}`;
    case "Wheel":   return `M ${x} ${y} Q ${x + d * 46} ${y + 16} ${x + d * 72} ${y - 52} L ${x + d * 72} ${y - 148}`;
    case "Block":   return `M ${x} ${y} L ${x} ${y + 18}`;
    default:        return `M ${x} ${y}`;
  }
}

const ROUTE_LENGTHS: Record<RouteKey, number> = {
  Streak: 148, Fade: 155, Post: 175, Corner: 175, Out: 158,
  In: 158, Slant: 80, Flat: 74, Drag: 90, Wheel: 215, Block: 22, None: 0,
};

// ─── Route + Designation Data ─────────────────────────────────────────────────

const ROUTES: { key: RouteKey; label: string; color: string }[] = [
  { key: "Streak",  label: "Streak",  color: "#60a5fa" },
  { key: "Fade",    label: "Fade",    color: "#c084fc" },
  { key: "Post",    label: "Post",    color: "#34d399" },
  { key: "Corner",  label: "Corner",  color: "#fbbf24" },
  { key: "Out",     label: "Out",     color: "#f87171" },
  { key: "In",      label: "In",      color: "#fb923c" },
  { key: "Slant",   label: "Slant",   color: "#38bdf8" },
  { key: "Flat",    label: "Flat",    color: "#a3e635" },
  { key: "Drag",    label: "Drag",    color: "#22d3ee" },
  { key: "Wheel",   label: "Wheel",   color: "#e879f9" },
  { key: "Block",   label: "Block",   color: "#6b7280" },
  { key: "None",    label: "Clear",   color: "#4b5563" },
];

const ROUTE_COLOR: Record<RouteKey, string> = Object.fromEntries(
  ROUTES.map((r) => [r.key, r.color])
) as Record<RouteKey, string>;

const DESIGNATIONS: { key: DesignationKey; short: string; label: string; color: string; bg: string }[] = [
  { key: "primary",   short: "1", label: "Primary Read",   color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  { key: "secondary", short: "2", label: "Secondary Read", color: "#60a5fa", bg: "rgba(96,165,250,0.15)"  },
  { key: "checkdown", short: "3", label: "Checkdown",      color: "#9ca3af", bg: "rgba(156,163,175,0.12)"},
  { key: "motion",    short: "M", label: "Motion",         color: "#fb923c", bg: "rgba(251,146,60,0.15)"  },
  { key: "user",      short: "U", label: "User Control",   color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  { key: "none",      short: "",  label: "None",           color: "transparent", bg: "transparent" },
];

const DES_COLOR: Record<DesignationKey, string> = Object.fromEntries(
  DESIGNATIONS.map((d) => [d.key, d.color])
) as Record<DesignationKey, string>;

const DES_SHORT: Record<DesignationKey, string> = Object.fromEntries(
  DESIGNATIONS.map((d) => [d.key, d.short])
) as Record<DesignationKey, string>;

// ─── Animated Route Path ──────────────────────────────────────────────────────

function AnimatedRoute({ d, color, delay, length }: { d: string; color: string; delay: number; length: number }) {
  const ref = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.strokeDasharray = `${length}`;
    el.style.strokeDashoffset = `${length}`;
    const t = setTimeout(() => {
      el.style.transition = `stroke-dashoffset 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms`;
      el.style.strokeDashoffset = "0";
    }, 30);
    return () => clearTimeout(t);
  }, [d, length, delay]);

  return (
    <>
      <path d={d} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={9} strokeLinecap="round" />
      <path
        ref={ref}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#arrowhead-${color.replace("#", "")})`}
      />
    </>
  );
}

// ─── Player Node ──────────────────────────────────────────────────────────────

function PlayerNode({
  player, state, selected, onSelect,
}: {
  player: PlayerDef;
  state: PlayerState;
  selected: boolean;
  onSelect: () => void;
}) {
  const hasRoute  = state.route !== "None" && !!state.route;
  const routeClr  = ROUTE_COLOR[state.route] ?? player.baseColor;
  const fill      = hasRoute ? routeClr : player.baseColor;
  const des       = DESIGNATIONS.find((d) => d.key === state.designation);
  const hasDes    = des && des.key !== "none";

  return (
    <g
      onClick={player.clickable ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
      style={{ cursor: player.clickable ? "pointer" : "default" }}
    >
      {selected && <circle cx={player.x} cy={player.y} r={15} fill="none" stroke="#fff" strokeWidth={2} strokeOpacity={0.9} />}
      {hasRoute && !selected && (
        <circle cx={player.x} cy={player.y} r={13.5} fill="none" stroke={routeClr} strokeWidth={1.5} strokeOpacity={0.45} />
      )}
      <circle
        cx={player.x} cy={player.y} r={10}
        fill={fill} fillOpacity={0.95}
        stroke={selected ? "#fff" : "rgba(0,0,0,0.45)"}
        strokeWidth={selected ? 2 : 1}
      />
      <text
        x={player.x} y={player.y + 3.5}
        fontSize={7} textAnchor="middle"
        fill="white" fontWeight="700" fontFamily="'JetBrains Mono', monospace"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {player.pos}
      </text>
      {hasDes && (
        <g>
          <circle cx={player.x + 9} cy={player.y - 13} r={6} fill={des.color} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
          <text
            x={player.x + 9} y={player.y - 10}
            fontSize={6} textAnchor="middle"
            fill="#000" fontWeight="900" fontFamily="'JetBrains Mono', monospace"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {des.short}
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Hot Route Panel ──────────────────────────────────────────────────────────

function HotRoutePanel({
  player, state, onChange, onClose,
}: {
  player: PlayerDef;
  state: PlayerState;
  onChange: (s: Partial<PlayerState>) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute right-0 top-0 z-50 rounded-xl border border-border bg-card shadow-2xl"
      style={{ width: 276, maxHeight: "100%", overflowY: "auto" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <span className="font-display text-sm font-bold">{player.pos}</span>
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Hot Route</span>
        </div>
        <button onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground transition">✕</button>
      </div>

      {/* Routes */}
      <div className="p-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Route</div>
        <div className="grid grid-cols-4 gap-1.5">
          {ROUTES.map((r) => {
            const active = state.route === r.key;
            return (
              <button
                key={r.key}
                onClick={() => onChange({ route: r.key })}
                className="flex items-center justify-center rounded-lg border py-2.5 text-center transition-all"
                style={{
                  borderColor: active ? r.color : "rgba(255,255,255,0.07)",
                  backgroundColor: active ? `${r.color}22` : "transparent",
                }}
              >
                <span className="text-[10px] font-bold leading-tight" style={{ color: active ? r.color : "#6b7280" }}>
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Designations */}
      <div className="border-t border-border p-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Designation</div>
        <div className="grid grid-cols-2 gap-1.5">
          {DESIGNATIONS.filter((d) => d.short).map((d) => {
            const active = state.designation === d.key;
            return (
              <button
                key={d.key}
                onClick={() => onChange({ designation: d.key })}
                className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition-all"
                style={{
                  borderColor: active ? d.color : "rgba(255,255,255,0.07)",
                  backgroundColor: active ? d.bg : "transparent",
                  color: active ? d.color : "#6b7280",
                }}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-black"
                  style={{ backgroundColor: d.color, color: "#000" }}
                >
                  {d.short}
                </span>
                {d.label}
              </button>
            );
          })}
          <button
            onClick={() => onChange({ designation: "none" })}
            className={`rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition-all ${
              state.designation === "none"
                ? "border-border bg-border/40 text-muted-foreground"
                : "border-border/40 text-muted-foreground/50"
            }`}
          >
            None
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DEFENSES: SimCoverage[] = [
  { name: "Cover 0 Blitz",           category: "blitz"     },
  { name: "Cover 1 Robber",          category: "man"       },
  { name: "Cover 2 Zone",            category: "zone"      },
  { name: "Cover 2 Tampa",           category: "zone"      },
  { name: "Cover 3 Sky",             category: "zone"      },
  { name: "Cover 4 Quarters",        category: "zone"      },
  { name: "Double A-Gap Mug",        category: "blitz"     },
  { name: "Zero Blitz",              category: "blitz"     },
  { name: "Bear Blitz",              category: "blitz"     },
  { name: "Nickel 3-3-5",            category: "formation" },
];

export function PlayBuilder({ onAddToBot }: { onAddToBot: (label: string, detail: string) => void }) {
  const [formationId, setFormationId]   = useState("gun-bunch");
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [states, setStates]             = useState<Record<string, PlayerState>>({});
  const [animKey, setAnimKey]           = useState(0);
  const [defense, setDefense]           = useState<SimCoverage>(DEFENSES[2]);
  const [sim, setSim]                   = useState<{ coverage: SimCoverage; play: SimPlay } | null>(null);

  const formation = FORMATIONS.find((f) => f.id === formationId) ?? FORMATIONS[0];

  function getState(id: string): PlayerState {
    return states[id] ?? { route: "None", designation: "none" };
  }

  function updateState(id: string, patch: Partial<PlayerState>) {
    setStates((prev) => ({ ...prev, [id]: { ...getState(id), ...patch } }));
    if ("route" in patch) setAnimKey((k) => k + 1);
  }

  function clearAll() {
    setStates({});
    setSelectedId(null);
    setAnimKey((k) => k + 1);
  }

  function switchFormation(id: string) {
    setFormationId(id);
    setSelectedId(null);
    setStates({});
    setAnimKey((k) => k + 1);
  }

  const selectedPlayer = formation.players.find((p) => p.id === selectedId && p.clickable);

  const routedPlayers = formation.players.filter(
    (p) => p.clickable && getState(p.id).route !== "None"
  );

  const primaryRead = routedPlayers.find((p) => getState(p.id).designation === "primary");
  const allArrowColors = [...new Set(ROUTES.map((r) => r.color))];

  function handleSimulate() {
    const routeSummary = routedPlayers.map((p) => `${p.pos}: ${getState(p.id).route}`).join(", ");
    const play: SimPlay = {
      formation: formation.name,
      concept: routeSummary || "Custom play",
      read: primaryRead
        ? `Primary: ${primaryRead.pos} (${getState(primaryRead.id).route})`
        : "Read open receiver",
      expected: `${formation.name} vs ${defense.name} — execute the progression and attack the soft spot.`,
    };
    setSim({ coverage: defense, play });
  }

  function handleAddToBot() {
    const summary = routedPlayers.map((p) => `${p.pos}: ${getState(p.id).route}`).join(", ") || "Custom play";
    onAddToBot(
      `${formation.name} Play`,
      `${summary}${primaryRead ? ` · Read: ${primaryRead.pos}` : ""}`,
    );
  }

  return (
    <div className="space-y-4">
      {sim && (
        <PlaySimulator coverage={sim.coverage} play={sim.play} onClose={() => setSim(null)} />
      )}

      {/* Formation selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mr-1">Formation</span>
        {FORMATIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => switchFormation(f.id)}
            className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition-all ${
              formationId === f.id
                ? "border-team-one/70 bg-team-one/12 text-team-one"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {f.name}
          </button>
        ))}
        <button
          onClick={clearAll}
          className="ml-auto rounded-lg border border-border px-3 py-1.5 font-mono text-[10px] font-bold text-muted-foreground hover:border-destructive/60 hover:text-destructive transition-all"
        >
          CLEAR
        </button>
      </div>

      {/* Field wrapper */}
      <div className="relative overflow-hidden rounded-xl border border-border">
        {/* Instruction hint */}
        {routedPlayers.length === 0 && !selectedPlayer && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
            <span className="rounded-full border border-border bg-card/90 px-4 py-1.5 font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
              Click a player to assign a route
            </span>
          </div>
        )}

        {/* SVG Field */}
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="block w-full"
          style={{ background: "oklch(0.17 0.008 250)", maxHeight: 430 }}
          onClick={() => setSelectedId(null)}
        >
          <defs>
            {allArrowColors.map((color) => (
              <marker
                key={color}
                id={`arrowhead-${color.replace("#", "")}`}
                viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="5" markerHeight="5" orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            ))}
          </defs>

          {/* Endzone */}
          <rect x={0} y={0} width={VW} height={32} fill="oklch(0.78 0.14 210 / 0.06)" />
          <text x={VW / 2} y={21} fontSize={9} textAnchor="middle" fill="oklch(0.78 0.14 210 / 0.45)"
            fontFamily="'JetBrains Mono',monospace" fontWeight="700" letterSpacing="0.35em">
            ENDZONE
          </text>

          {/* Yard lines */}
          {[50, 90, 130, 170, 210].map((y) => (
            <line key={y} x1={20} x2={VW - 20} y1={y} y2={y}
              stroke="white" strokeOpacity={0.04} strokeWidth={1} />
          ))}

          {/* Hash marks */}
          {[40, 80, 120, 160, 200, 240].map((y) => (
            <g key={y}>
              <line x1={192} x2={204} y1={y} y2={y} stroke="white" strokeOpacity={0.15} />
              <line x1={396} x2={408} y1={y} y2={y} stroke="white" strokeOpacity={0.15} />
            </g>
          ))}

          {/* Sideline markers */}
          <line x1={10} x2={10} y1={0} y2={VH} stroke="white" strokeOpacity={0.15} strokeWidth={1} />
          <line x1={VW - 10} x2={VW - 10} y1={0} y2={VH} stroke="white" strokeOpacity={0.15} strokeWidth={1} />

          {/* LOS */}
          <line x1={10} x2={VW - 10} y1={LOS_Y} y2={LOS_Y}
            stroke="oklch(0.82 0.13 75 / 0.65)" strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={14} y={LOS_Y - 5} fontSize={8} fill="oklch(0.82 0.13 75 / 0.6)"
            fontFamily="'JetBrains Mono',monospace" fontWeight="700">LOS</text>

          {/* Routes (animated) */}
          <g key={animKey}>
            {formation.players.map((p, i) => {
              const st = getState(p.id);
              if (!st.route || st.route === "None") return null;
              const d   = getRoutePath(p.x, p.y, st.route, p.dir);
              const clr = ROUTE_COLOR[st.route];
              const len = ROUTE_LENGTHS[st.route];
              return (
                <AnimatedRoute key={p.id} d={d} color={clr} delay={i * 40} length={len} />
              );
            })}
          </g>

          {/* Players */}
          {formation.players.map((p) => (
            <PlayerNode
              key={p.id}
              player={p}
              state={getState(p.id)}
              selected={selectedId === p.id}
              onSelect={() => setSelectedId(p.id === selectedId ? null : p.id)}
            />
          ))}
        </svg>

        {/* Hot route panel overlay */}
        {selectedPlayer && (
          <HotRoutePanel
            player={selectedPlayer}
            state={getState(selectedPlayer.id)}
            onChange={(patch) => updateState(selectedPlayer.id, patch)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Active routes + legend */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Route summary */}
        <div>
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Active Routes</div>
          {routedPlayers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No routes assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {routedPlayers.map((p) => {
                const st  = getState(p.id);
                const clr = ROUTE_COLOR[st.route];
                const des = st.designation !== "none" ? DES_SHORT[st.designation] : null;
                const desClr = st.designation !== "none" ? DES_COLOR[st.designation] : null;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1"
                    style={{ borderColor: `${clr}44`, backgroundColor: `${clr}11` }}
                  >
                    <span className="font-mono text-[9px] text-muted-foreground">{p.pos}</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: clr }}>{st.route}</span>
                    {des && desClr && (
                      <span
                        className="flex h-3.5 w-3.5 items-center justify-center rounded-full font-mono text-[8px] font-black"
                        style={{ backgroundColor: desClr, color: "#000" }}
                      >
                        {des}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Icon legend */}
        <div>
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Icon Key</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {DESIGNATIONS.filter((d) => d.short).map((d) => (
              <div key={d.key} className="flex items-center gap-1.5">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full font-mono text-[8px] font-black"
                  style={{ backgroundColor: d.color, color: "#000" }}
                >
                  {d.short}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Defense selector */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Defense You're Facing</div>
        <div className="flex flex-wrap gap-2">
          {DEFENSES.map((d) => (
            <button
              key={d.name}
              onClick={() => setDefense(d)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                defense.name === d.name
                  ? d.category === "blitz"
                    ? "border-red-500/60 bg-red-500/10 text-red-400"
                    : d.category === "man"
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-blue-500/60 bg-blue-500/10 text-blue-400"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${
                d.category === "blitz" ? "bg-red-400" :
                d.category === "man"   ? "bg-primary"  : "bg-blue-400"
              }`} />
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSimulate}
          className="flex items-center gap-2 rounded-xl border border-team-one/50 bg-team-one/10 px-6 py-3.5 text-sm font-bold text-team-one transition-all hover:border-team-one hover:bg-team-one/20"
        >
          <span>▶</span> Simulate
        </button>
        <button
          onClick={handleAddToBot}
          disabled={routedPlayers.length === 0}
          className="flex-1 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/30 hover:text-foreground disabled:opacity-40"
        >
          + Add to Unstoppable Bot
        </button>
      </div>
    </div>
  );
}
