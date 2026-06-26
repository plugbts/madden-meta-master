import { useState } from "react";
import { PlaySimulator, type SimCoverage, type SimPlay } from "@/components/PlaySimulator";
import type { Counter } from "@/lib/madden-data";

// ─── Read progression parser ──────────────────────────────────────────────────

function parseReadProgression(read: string): string[] {
  const sep = read.includes(" > ") ? " > " : read.includes(" → ") ? " → " : read.includes("→") ? "→" : null;
  if (sep) return read.split(sep).map(s => s.trim()).filter(Boolean);
  const sentences = read.split(/[.;]/).map(s => s.trim()).filter(Boolean);
  if (sentences.length >= 2) return sentences.slice(0, 4);
  return [read];
}

const PROGRESSION_LABELS = ["Primary", "Secondary", "Third", "Checkdown"];
const PROGRESSION_COLORS = ["#78b4ff", "#6fdba8", "#ffc84a", "rgba(255,255,255,0.45)"];

// ─── Hot route derivation ──────────────────────────────────────────────────────

type HotRoute = { position: string; route: string };

function deriveHotRoutes(counter: Counter): HotRoute[] {
  if (counter.audibles && counter.audibles.length > 0) {
    return counter.audibles.slice(0, 4).map(a => {
      const parts = a.split(" — ").concat(a.split(" - "));
      const text = parts[0].trim();
      const has = (k: string) => text.toLowerCase().includes(k);
      const position =
        has("wr") || has("outside") || has("x ") || has("z ")     ? "WR" :
        has("slot") || has("slot wr") || has("inside")             ? "Slot" :
        has("te") || has("tight end")                              ? "TE" :
        has("rb") || has("back") || has("running")                 ? "RB" :
        has("corner") || has("cb")                                 ? "WR" : "WR";
      const route =
        has("slant")   ? "Slant" :
        has("corner")  ? "Corner" :
        has("wheel")   ? "Wheel" :
        has("streak") || has("go") || has("fade") ? "Streak" :
        has("flat")    ? "Flat" :
        has("curl")    ? "Curl" :
        has("dig")     ? "Dig" :
        has("post")    ? "Post" :
        has("out")     ? "Out" :
        has("in")      ? "In" :
        has("block")   ? "Block" :
        has("motion")  ? "Motion" : text.split(" ").slice(-1)[0];
      return { position, route };
    });
  }

  const c = counter.concept.toLowerCase();
  if (c.includes("mesh"))    return [{ position: "Slot", route: "Mesh" }, { position: "WR", route: "Streak" }];
  if (c.includes("smash"))   return [{ position: "WR", route: "Corner" }, { position: "Slot", route: "Curl" }];
  if (c.includes("vert"))    return [{ position: "Slot", route: "Streak" }, { position: "RB", route: "Wheel" }];
  if (c.includes("flood"))   return [{ position: "WR", route: "Corner" }, { position: "Slot", route: "Flat" }, { position: "RB", route: "Wheel" }];
  if (c.includes("slant"))   return [{ position: "WR", route: "Slant" }, { position: "Slot", route: "Slant" }];
  if (c.includes("curl"))    return [{ position: "WR", route: "Curl" }, { position: "Slot", route: "Flat" }];
  if (c.includes("post"))    return [{ position: "WR", route: "Post" }, { position: "Slot", route: "Dig" }];
  if (c.includes("wheel"))   return [{ position: "Slot", route: "Wheel" }, { position: "WR", route: "Streak" }];
  if (c.includes("dig"))     return [{ position: "WR", route: "Dig" }, { position: "Slot", route: "Cross" }];
  if (c.includes("fade"))    return [{ position: "WR", route: "Fade" }, { position: "WR", route: "Fade" }];
  if (c.includes("drive") || c.includes("cross")) return [{ position: "WR", route: "Cross" }, { position: "Slot", route: "Drag" }];
  return [{ position: "Slot", route: "Corner" }, { position: "RB", route: "Flat" }];
}

// ─── Inline field diagram ──────────────────────────────────────────────────────

const ROUTE_PATHS: Record<string, string[]> = {
  mesh:    ["M40,90 C80,70 210,70 280,60", "M280,90 C240,70 110,70 40,60", "M120,90 L120,50", "M200,90 L200,50"],
  smash:   ["M40,90 L38,70 C34,50 20,35 10,20", "M100,90 L100,72 L80,65", "M230,90 L230,72 L250,65", "M310,90 L312,70 C316,50 330,35 340,20"],
  vert:    ["M40,90 L40,10", "M110,90 L110,10", "M240,90 L240,10", "M310,90 L310,10"],
  fade:    ["M40,90 C33,60 26,35 18,10", "M110,90 C105,60 100,35 96,10", "M240,90 C245,60 250,35 254,10", "M310,90 C317,60 324,35 332,10"],
  slant:   ["M40,90 L62,68 L120,62", "M110,90 L132,68 L190,62", "M240,90 L218,68 L160,65", "M310,90 L288,68 L230,62"],
  curl:    ["M40,90 L40,58 L18,62", "M110,90 L110,60 L138,63", "M240,90 L240,60 L212,63", "M310,90 L310,58 L332,62"],
  flood:   ["M40,90 C36,55 28,30 20,10", "M110,90 C108,62 82,44 52,40", "M240,90 L240,74 L268,78"],
  cross:   ["M40,90 L40,72 C82,65 238,65 288,62", "M310,90 C270,78 138,76 48,75", "M240,90 L240,35"],
  wheel:   ["M40,90 L40,72 L18,65", "M110,90 L110,72 C82,48 60,22 55,10", "M240,90 L240,72 L265,67", "M310,90 L310,35"],
  post:    ["M40,90 L40,50 L88,30", "M110,90 L110,52 C130,28 178,18 208,15", "M240,90 L240,52 C220,28 172,18 142,15", "M310,90 L310,50 L262,30"],
  default: ["M40,90 L40,35", "M110,90 L110,35", "M240,90 L240,35", "M310,90 L310,35"],
};

function getRoutePaths(concept: string): { d: string; isHot: boolean }[] {
  const c = concept.toLowerCase();
  const key =
    c.includes("mesh")   ? "mesh" :
    c.includes("smash")  ? "smash" :
    c.includes("vert")   ? "vert" :
    c.includes("fade")   ? "fade" :
    c.includes("slant")  ? "slant" :
    c.includes("curl") || c.includes("flat") ? "curl" :
    c.includes("flood") || c.includes("sail") ? "flood" :
    c.includes("drive") || c.includes("cross") || c.includes("mesh") ? "cross" :
    c.includes("wheel")  ? "wheel" :
    c.includes("post") || c.includes("dig") ? "post" : "default";
  return (ROUTE_PATHS[key] ?? ROUTE_PATHS.default).map((d, i) => ({ d, isHot: i === 0 }));
}

function parseReadEndpoint(d: string): { x: number; y: number } {
  const m = d.match(/[\d.]+,[\d.]+/g);
  if (!m || !m.length) return { x: 175, y: 40 };
  const [x, y] = m[m.length - 1].split(",").map(Number);
  return { x, y };
}

// Hot route visual positions (where labels render on the field)
const HOT_LABEL_POSITIONS = [
  { x: 40, y: 14 },
  { x: 110, y: 14 },
  { x: 240, y: 14 },
  { x: 310, y: 14 },
];

function InlineField({ concept, coverageName }: { concept: string; coverageName: string }) {
  const routes = getRoutePaths(concept);
  const hotRoute = routes.find(r => r.isHot);
  const hotPt = hotRoute ? parseReadEndpoint(hotRoute.d) : { x: 175, y: 40 };

  // Defensive positions by coverage
  const c = coverageName.toLowerCase();
  const hasTwoSafeties =
    c.includes("cover 2") || c.includes("tampa") ||
    c.includes("cover 4") || c.includes("quarters") || c.includes("palms") || c.includes("cover 6");
  const hasOneSafety = !hasTwoSafeties && !c.includes("cover 0");
  const isBlitz = c.includes("blitz") || c.includes("cover 0");

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: "rgba(255,255,255,0.1)", background: "oklch(0.14 0.012 150)" }}
    >
      <svg viewBox="0 0 360 130" className="block w-full" style={{ height: 140 }}>
        <defs>
          <marker id="pc-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.82 0.22 140)" />
          </marker>
          <marker id="pc-arr-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.6 0.1 140 / 0.55)" />
          </marker>
          <filter id="pc-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Yard lines */}
        {[32, 64, 96].map(y => (
          <line key={y} x1={0} x2={360} y1={y} y2={y} stroke="white" strokeOpacity={0.06} strokeWidth={1} />
        ))}
        {/* Hash marks */}
        {[16, 32, 48, 64, 80, 96, 112].map(y => (
          <g key={y}>
            <line x1={150} x2={158} y1={y} y2={y} stroke="white" strokeOpacity={0.2} />
            <line x1={202} x2={210} y1={y} y2={y} stroke="white" strokeOpacity={0.2} />
          </g>
        ))}

        {/* Line of scrimmage */}
        <line x1={0} x2={360} y1={100} y2={100} stroke="oklch(0.82 0.13 75 / 0.7)" strokeWidth={1.5} />
        <text x={6} y={96} fontSize={6} fill="oklch(0.82 0.13 75 / 0.6)" fontFamily="JetBrains Mono" fontWeight={700} letterSpacing="0.05em">LOS</text>

        {/* Coverage zones */}
        {hasTwoSafeties && !isBlitz && (
          <>
            <ellipse cx={90} cy={30} rx={72} ry={26} fill="oklch(0.7 0.18 240 / 0.10)" stroke="oklch(0.7 0.18 240 / 0.35)" strokeDasharray="3 3" />
            <ellipse cx={270} cy={30} rx={72} ry={26} fill="oklch(0.7 0.18 240 / 0.10)" stroke="oklch(0.7 0.18 240 / 0.35)" strokeDasharray="3 3" />
          </>
        )}
        {hasOneSafety && !hasTwoSafeties && (
          <ellipse cx={180} cy={22} rx={90} ry={20} fill="oklch(0.7 0.18 240 / 0.10)" stroke="oklch(0.7 0.18 240 / 0.35)" strokeDasharray="3 3" />
        )}
        {isBlitz && (
          <>
            {[{ x: 130, y: 90 }, { x: 230, y: 90 }].map((p, i) => (
              <path key={i} d={`M${p.x},${p.y} L${p.x + (i === 0 ? -3 : 3)},${p.y + 18}`}
                stroke="oklch(0.65 0.25 25)" strokeWidth={2} strokeDasharray="3 2"
                markerEnd="url(#pc-arr-dim)" fill="none" />
            ))}
          </>
        )}

        {/* Routes */}
        {routes.map((r, i) => (
          <path key={i} d={r.d} fill="none"
            stroke={r.isHot ? "oklch(0.82 0.22 140)" : "oklch(0.6 0.1 140 / 0.5)"}
            strokeWidth={r.isHot ? 2.5 : 1.5}
            markerEnd={r.isHot ? "url(#pc-arr)" : "url(#pc-arr-dim)"}
            strokeDasharray={r.isHot ? undefined : "3 2"}
          />
        ))}

        {/* OPEN glow on hot route endpoint */}
        <g filter="url(#pc-glow)">
          <circle cx={hotPt.x} cy={hotPt.y} r={9} fill="oklch(0.82 0.22 140 / 0.2)" stroke="oklch(0.82 0.22 140)" strokeWidth={1.5} />
        </g>
        <text x={hotPt.x} y={hotPt.y - 13} fontSize={7} textAnchor="middle" fill="oklch(0.82 0.22 140)" fontFamily="JetBrains Mono" fontWeight={700} letterSpacing="0.05em">OPEN</text>

        {/* Offensive players (WRs + OL + QB) */}
        {/* OL */}
        {[148, 161, 175, 189, 202].map((x, i) => (
          <g key={`ol${i}`}>
            <circle cx={x} cy={100} r={5} fill="oklch(0.82 0.22 140 / 0.7)" stroke="black" strokeWidth={0.8} />
          </g>
        ))}
        {/* QB */}
        <g>
          <circle cx={175} cy={108} r={7} fill="oklch(0.82 0.13 75)" stroke="black" strokeWidth={1} />
          <text x={175} y={111} fontSize={6} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">QB</text>
        </g>
        {/* WRs / skill players */}
        {[
          { x: 40, y: 100, label: "WR" },
          { x: 110, y: 100, label: "WR" },
          { x: 240, y: 100, label: "WR" },
          { x: 310, y: 100, label: "WR" },
        ].map((p, i) => (
          <g key={`wr${i}`}>
            <circle cx={p.x} cy={p.y} r={7}
              fill={i === 0 ? "oklch(0.82 0.22 140)" : "oklch(0.75 0.16 140 / 0.75)"}
              stroke="black" strokeWidth={1} />
            <text x={p.x} y={p.y + 3} fontSize={6} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">
              {p.label}
            </text>
          </g>
        ))}

        {/* Defensive players */}
        {/* DL */}
        {[130, 155, 180, 205].map((x, i) => (
          <g key={`dl${i}`}>
            <circle cx={x} cy={88} r={6} fill="oklch(0.65 0.25 25)" stroke="black" strokeWidth={0.8} />
            <text x={x} y={91} fontSize={5.5} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">DL</text>
          </g>
        ))}
        {/* LBs */}
        {!isBlitz && [140, 180, 220].map((x, i) => (
          <g key={`lb${i}`}>
            <circle cx={x} cy={74} r={6} fill="oklch(0.7 0.18 240)" stroke="black" strokeWidth={0.8} />
            <text x={x} y={77} fontSize={5.5} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">LB</text>
          </g>
        ))}
        {isBlitz && [140, 180, 220].map((x, i) => (
          <g key={`blb${i}`}>
            <circle cx={x} cy={74} r={6} fill="oklch(0.65 0.25 25 / 0.9)" stroke="black" strokeWidth={0.8} />
            <text x={x} y={77} fontSize={5.5} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">LB</text>
          </g>
        ))}
        {/* CBs */}
        <g><circle cx={40} cy={88} r={6} fill="oklch(0.7 0.18 240)" stroke="black" strokeWidth={0.8}/><text x={40} y={91} fontSize={5.5} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">CB</text></g>
        <g><circle cx={310} cy={88} r={6} fill="oklch(0.7 0.18 240)" stroke="black" strokeWidth={0.8}/><text x={310} y={91} fontSize={5.5} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">CB</text></g>
        {/* Safeties */}
        {hasTwoSafeties && (
          <>
            <g><circle cx={110} cy={40} r={7} fill="oklch(0.82 0.22 140 / 0.7)" stroke="black" strokeWidth={1}/><text x={110} y={43} fontSize={6} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">S</text></g>
            <g><circle cx={250} cy={40} r={7} fill="oklch(0.82 0.22 140 / 0.7)" stroke="black" strokeWidth={1}/><text x={250} y={43} fontSize={6} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">S</text></g>
          </>
        )}
        {hasOneSafety && (
          <g><circle cx={180} cy={28} r={7} fill="oklch(0.82 0.22 140 / 0.7)" stroke="black" strokeWidth={1}/><text x={180} y={31} fontSize={6} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">S</text></g>
        )}

        {/* Conflict highlight — where routes stress the defense */}
        {hotPt && (
          <ellipse cx={hotPt.x} cy={hotPt.y} rx={22} ry={14}
            fill="oklch(0.82 0.22 140 / 0.06)"
            stroke="oklch(0.82 0.22 140 / 0.25)"
            strokeDasharray="2 2" />
        )}
      </svg>

      {/* Field legend */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-5 rounded-full" style={{ background: "oklch(0.82 0.22 140)" }} />
          <span className="font-mono text-[9px] text-muted-foreground">Hot route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-5 rounded-full opacity-45" style={{ background: "oklch(0.6 0.1 140)" }} />
          <span className="font-mono text-[9px] text-muted-foreground">Secondary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "oklch(0.65 0.25 25)" }} />
          <span className="font-mono text-[9px] text-muted-foreground">Defense</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="h-2 w-2 rounded-full" style={{ background: "oklch(0.82 0.22 140)" }} />
          <span className="font-mono text-[9px]" style={{ color: "oklch(0.82 0.22 140)" }}>OPEN</span>
        </div>
      </div>
    </div>
  );
}

// ─── PlayCard ─────────────────────────────────────────────────────────────────

interface PlayCardProps {
  counter: Counter;
  coverageName: string;
  coverageCategory: "man" | "zone" | "blitz" | "formation";
  rank?: number;
}

const TIER_STYLE: Record<string, React.CSSProperties> = {
  "A+": { background: "#78b4ff", color: "#000" },
  "A":  { background: "#6fdba8", color: "#000" },
  "B+": { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" },
};

const RANK_COLOR = ["#78b4ff", "#6fdba8", "#ffc84a"];

export function PlayCard({ counter, coverageName, coverageCategory, rank }: PlayCardProps) {
  const [simOpen, setSimOpen] = useState(false);
  const [showField, setShowField] = useState(true);

  const reads = parseReadProgression(counter.read);
  const hotRoutes = deriveHotRoutes(counter);

  const simCoverage: SimCoverage = { name: coverageName, category: coverageCategory };
  const simPlay: SimPlay = {
    formation: counter.formation,
    concept: counter.concept,
    read: reads.join(" > "),
    expected: counter.expected,
    motion: counter.motion,
  };

  return (
    <>
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-start gap-3 min-w-0">
            {rank !== undefined && (
              <div
                className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full font-mono text-[11px] font-black"
                style={{ background: `${RANK_COLOR[rank] ?? "rgba(255,255,255,0.1)"}22`, color: RANK_COLOR[rank] ?? "rgba(255,255,255,0.5)", border: `1px solid ${RANK_COLOR[rank] ?? "rgba(255,255,255,0.15)"}44` }}
              >
                {rank + 1}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{counter.formation}</p>
              <p className="font-display font-bold text-base text-foreground leading-tight">{counter.play}</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">Concept: {counter.concept}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-lg px-2.5 py-1 font-mono text-[11px] font-black"
              style={TIER_STYLE[counter.tier] ?? TIER_STYLE["B+"]}>
              Tier {counter.tier}
            </span>
          </div>
        </div>

        {/* Hot Route Package */}
        {hotRoutes.length > 0 && (
          <div className="px-5 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2.5">Hot Route Package</p>
            <div className="flex flex-wrap gap-2">
              {hotRoutes.map((hr, i) => (
                <div key={i}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border"
                  style={{
                    borderColor: i === 0 ? "rgba(120,180,255,0.35)" : "rgba(255,255,255,0.1)",
                    background: i === 0 ? "rgba(120,180,255,0.08)" : "rgba(255,255,255,0.04)",
                  }}>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: i === 0 ? "#78b4ff" : "rgba(255,255,255,0.4)" }}>
                    {hr.position}
                  </span>
                  <span className="font-mono text-[10px]"
                    style={{ color: i === 0 ? "#78b4ff" : "rgba(255,255,255,0.7)" }}>
                    → {hr.route}
                  </span>
                  {i === 0 && (
                    <span className="font-mono text-[8px] font-bold uppercase tracking-wider rounded px-1"
                      style={{ background: "rgba(120,180,255,0.15)", color: "#78b4ff" }}>
                      HOT
                    </span>
                  )}
                </div>
              ))}
            </div>
            {counter.motion && (
              <div className="mt-2 flex items-start gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0"
                  style={{ background: "rgba(255,200,74,0.15)", color: "#ffc84a" }}>
                  MOTION
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">{counter.motion}</span>
              </div>
            )}
          </div>
        )}

        {/* Field diagram + Read progression grid */}
        <div className="grid gap-0 sm:grid-cols-[1fr_200px]">
          {/* Field */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Play Visual</p>
              <button
                onClick={() => setShowField(v => !v)}
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showField ? "Hide" : "Show"} Field
              </button>
            </div>
            {showField && <InlineField concept={counter.concept} coverageName={coverageName} />}
          </div>

          {/* Read Progression */}
          <div className="border-l sm:border-t-0 border-t p-4 space-y-3"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Read Progression</p>
            <div className="space-y-2.5">
              {reads.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div
                    className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full font-mono text-[10px] font-black mt-0.5"
                    style={{
                      background: `${PROGRESSION_COLORS[i] ?? "rgba(255,255,255,0.1)"}1a`,
                      color: PROGRESSION_COLORS[i] ?? "rgba(255,255,255,0.4)",
                      border: `1px solid ${PROGRESSION_COLORS[i] ?? "rgba(255,255,255,0.1)"}44`,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-0.5"
                      style={{ color: PROGRESSION_COLORS[i] ?? "rgba(255,255,255,0.35)" }}>
                      {PROGRESSION_LABELS[i] ?? `Read ${i + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
                  </div>
                </div>
              ))}
            </div>
            {counter.expected && (
              <div className="rounded-lg p-2.5 mt-2"
                style={{ background: "rgba(111,219,168,0.07)", border: "1px solid rgba(111,219,168,0.2)" }}>
                <p className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: "#6fdba8" }}>Expected</p>
                <p className="text-xs leading-relaxed" style={{ color: "#6fdba8" }}>{counter.expected}</p>
              </div>
            )}
          </div>
        </div>

        {/* Simulate Play button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setSimOpen(true)}
            className="w-full rounded-xl py-3 font-mono text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2.5"
            style={{ background: "rgba(120,180,255,0.1)", border: "1px solid rgba(120,180,255,0.3)", color: "#78b4ff" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(120,180,255,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(120,180,255,0.1)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Simulate Play
          </button>
        </div>
      </div>

      {/* Play Simulator modal */}
      {simOpen && (
        <PlaySimulator
          coverage={simCoverage}
          play={simPlay}
          onClose={() => setSimOpen(false)}
        />
      )}
    </>
  );
}
