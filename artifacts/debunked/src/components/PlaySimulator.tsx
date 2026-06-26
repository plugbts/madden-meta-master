import { useState, useEffect, useCallback } from "react";

export type SimCoverage = {
  name: string;
  category: "man" | "zone" | "blitz" | "formation";
};

export type SimPlay = {
  formation: string;
  concept: string;
  read: string;
  expected: string;
  motion?: string;
};

type Phase = 0 | 1 | 2 | 3 | 4;
// 0 = idle, 1 = snap, 2 = routes, 3 = coverage reacts, 4 = result

const W = 360;
const H = 280;
const LOS = 190;

type Pt = { x: number; y: number };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ── Route paths keyed by concept keyword ──────────────────────────────────────
function getRoutePaths(concept: string): { id: number; d: string; isHot: boolean }[] {
  const c = concept.toLowerCase();
  if (c.includes("mesh")) return [
    { id: 0, d: "M40,190 C80,165 200,165 280,155", isHot: false },
    { id: 1, d: "M280,190 C240,165 120,165 40,155", isHot: true },
    { id: 2, d: "M120,190 L120,130", isHot: false },
    { id: 3, d: "M200,190 L200,130", isHot: false },
  ];
  if (c.includes("smash") || c.includes("corner")) return [
    { id: 0, d: "M40,190 L35,160 C30,130 15,100 10,75", isHot: false },
    { id: 1, d: "M100,190 L100,165 L80,150", isHot: true },
    { id: 2, d: "M240,190 L240,165 L260,150", isHot: false },
    { id: 3, d: "M320,190 L325,160 C330,130 345,100 350,75", isHot: false },
  ];
  if (c.includes("vert") || c.includes("4-vert")) return [
    { id: 0, d: "M40,190 L40,30", isHot: false },
    { id: 1, d: "M110,190 L110,30", isHot: false },
    { id: 2, d: "M250,190 L250,30", isHot: true },
    { id: 3, d: "M320,190 L320,30", isHot: false },
  ];
  if (c.includes("fade")) return [
    { id: 0, d: "M40,190 C32,140 26,100 18,55", isHot: true },
    { id: 1, d: "M110,190 C105,140 100,100 96,55", isHot: false },
    { id: 2, d: "M250,190 C255,140 260,100 264,55", isHot: false },
    { id: 3, d: "M320,190 C328,140 334,100 342,55", isHot: false },
  ];
  if (c.includes("slant")) return [
    { id: 0, d: "M40,190 L55,170 L110,160", isHot: true },
    { id: 1, d: "M110,190 L125,170 L180,160", isHot: false },
    { id: 2, d: "M250,190 L235,170 L180,165", isHot: true },
    { id: 3, d: "M320,190 L305,170 L250,160", isHot: false },
  ];
  if (c.includes("curl") || c.includes("flat")) return [
    { id: 0, d: "M40,190 L40,150 L18,155", isHot: false },
    { id: 1, d: "M110,190 L110,155 L140,158", isHot: true },
    { id: 2, d: "M250,190 L250,155 L220,158", isHot: false },
    { id: 3, d: "M320,190 L320,150 L342,155", isHot: true },
  ];
  if (c.includes("drive") || c.includes("shallow") || c.includes("cross")) return [
    { id: 0, d: "M40,190 L40,165 C80,158 240,158 290,155", isHot: true },
    { id: 1, d: "M320,190 C280,170 140,168 50,168", isHot: false },
    { id: 2, d: "M250,190 L250,100", isHot: false },
  ];
  if (c.includes("flood") || c.includes("sail")) return [
    { id: 0, d: "M40,190 C36,140 30,100 22,65", isHot: false },
    { id: 1, d: "M110,190 C108,150 75,120 48,112", isHot: true },
    { id: 2, d: "M250,190 L250,168 L278,172", isHot: false },
  ];
  if (c.includes("angle") || c.includes("texas") || c.includes("rb")) return [
    { id: 0, d: "M180,200 L200,178 L158,168", isHot: true },
    { id: 1, d: "M110,190 L110,140 L205,135", isHot: false },
    { id: 2, d: "M250,190 L250,140 L155,135", isHot: false },
  ];
  if (c.includes("wheel")) return [
    { id: 0, d: "M40,190 L40,168 L22,160", isHot: false },
    { id: 1, d: "M110,190 L110,168 C80,140 60,100 55,60", isHot: true },
    { id: 2, d: "M250,190 L250,168 L275,162", isHot: false },
    { id: 3, d: "M320,190 L320,100", isHot: false },
  ];
  if (c.includes("post") || c.includes("dig")) return [
    { id: 0, d: "M40,190 L40,130 L90,95", isHot: false },
    { id: 1, d: "M110,190 L110,140 C130,110 180,100 210,95", isHot: true },
    { id: 2, d: "M250,190 L250,140 C230,110 180,100 150,95", isHot: false },
    { id: 3, d: "M320,190 L320,130 L270,95", isHot: false },
  ];
  // default: routes up
  return [
    { id: 0, d: "M40,190 L40,120", isHot: false },
    { id: 1, d: "M110,190 L110,120", isHot: false },
    { id: 2, d: "M250,190 L250,120", isHot: true },
    { id: 3, d: "M320,190 L320,120", isHot: false },
  ];
}

// ── Offense player positions ─────────────────────────────────────────────────
function getOffPlayers(): (Pt & { label: string; color: string })[] {
  return [
    { x: 40, y: LOS, label: "WR", color: "oklch(0.82 0.22 140)" },
    { x: 110, y: LOS, label: "WR", color: "oklch(0.82 0.22 140)" },
    { x: 180, y: LOS + 8, label: "QB", color: "oklch(0.82 0.13 75)" },
    { x: 250, y: LOS, label: "WR", color: "oklch(0.82 0.22 140)" },
    { x: 320, y: LOS, label: "WR", color: "oklch(0.82 0.22 140)" },
    // OL
    { x: 145, y: LOS, label: "OL", color: "oklch(0.82 0.22 140)" },
    { x: 160, y: LOS, label: "OL", color: "oklch(0.82 0.22 140)" },
    { x: 175, y: LOS, label: "OL", color: "oklch(0.82 0.22 140)" },
    { x: 190, y: LOS, label: "OL", color: "oklch(0.82 0.22 140)" },
    { x: 205, y: LOS, label: "OL", color: "oklch(0.82 0.22 140)" },
  ];
}

// ── Defense positions by coverage ────────────────────────────────────────────
function getDefPlayers(coverage: string): (Pt & { label: string; color: string; id: string })[] {
  const c = coverage.toLowerCase();
  const dl = [
    { x: 130, y: LOS - 15, label: "DL", color: "oklch(0.65 0.25 25)", id: "dl0" },
    { x: 160, y: LOS - 15, label: "DL", color: "oklch(0.65 0.25 25)", id: "dl1" },
    { x: 180, y: LOS - 15, label: "DL", color: "oklch(0.65 0.25 25)", id: "dl2" },
    { x: 210, y: LOS - 15, label: "DL", color: "oklch(0.65 0.25 25)", id: "dl3" },
  ];
  const lbs: (Pt & { label: string; color: string; id: string })[] = [
    { x: 140, y: LOS - 35, label: "LB", color: "oklch(0.7 0.18 240)", id: "lb0" },
    { x: 180, y: LOS - 35, label: "LB", color: "oklch(0.7 0.18 240)", id: "lb1" },
    { x: 220, y: LOS - 35, label: "LB", color: "oklch(0.7 0.18 240)", id: "lb2" },
  ];
  const cbs: (Pt & { label: string; color: string; id: string })[] = [
    { x: 40, y: LOS - 18, label: "CB", color: "oklch(0.7 0.18 240)", id: "cb0" },
    { x: 320, y: LOS - 18, label: "CB", color: "oklch(0.7 0.18 240)", id: "cb1" },
  ];

  if (c.includes("cover 0") || c.includes("zero")) {
    return [
      ...dl,
      // Extra blitzers
      { x: 120, y: LOS - 20, label: "CB", color: "oklch(0.65 0.25 25)", id: "blitz0" },
      { x: 240, y: LOS - 20, label: "CB", color: "oklch(0.65 0.25 25)", id: "blitz1" },
      { x: 35, y: LOS - 18, label: "CB", color: "oklch(0.7 0.18 240)", id: "cb0" },
      { x: 325, y: LOS - 18, label: "CB", color: "oklch(0.7 0.18 240)", id: "cb1" },
      ...lbs,
    ];
  }
  if (c.includes("cover 1") || c.includes("man free") || c.includes("robber")) {
    return [
      ...dl, ...lbs, ...cbs,
      { x: 180, y: 70, label: "S", color: "oklch(0.82 0.22 140)", id: "fs" },
      { x: 150, y: LOS - 45, label: "S", color: "oklch(0.7 0.13 180)", id: "rob" },
    ];
  }
  if (c.includes("cover 2") || c.includes("tampa")) {
    return [
      ...dl, ...lbs, ...cbs,
      { x: 110, y: 65, label: "S", color: "oklch(0.82 0.22 140)", id: "s0" },
      { x: 250, y: 65, label: "S", color: "oklch(0.82 0.22 140)", id: "s1" },
    ];
  }
  if (c.includes("cover 3")) {
    return [
      ...dl, ...lbs, ...cbs,
      { x: 180, y: 50, label: "S", color: "oklch(0.82 0.22 140)", id: "fs" },
    ];
  }
  if (c.includes("cover 4") || c.includes("quarters") || c.includes("palms")) {
    return [
      ...dl, ...lbs, ...cbs,
      { x: 110, y: 55, label: "S", color: "oklch(0.82 0.22 140)", id: "s0" },
      { x: 250, y: 55, label: "S", color: "oklch(0.82 0.22 140)", id: "s1" },
      { x: 40, y: 60, label: "CB", color: "oklch(0.7 0.18 240)", id: "cb0d" },
      { x: 320, y: 60, label: "CB", color: "oklch(0.7 0.18 240)", id: "cb1d" },
    ];
  }
  if (c.includes("blitz") || c.includes("mug") || c.includes("bear")) {
    return [
      ...dl,
      { x: 145, y: LOS - 8, label: "LB", color: "oklch(0.65 0.25 25)", id: "blitz_lb0" },
      { x: 215, y: LOS - 8, label: "LB", color: "oklch(0.65 0.25 25)", id: "blitz_lb1" },
      { x: 180, y: LOS - 30, label: "LB", color: "oklch(0.7 0.18 240)", id: "lb_mid" },
      ...cbs,
      { x: 180, y: 60, label: "S", color: "oklch(0.82 0.22 140)", id: "fs" },
    ];
  }
  // default cover 2-look
  return [
    ...dl, ...lbs, ...cbs,
    { x: 110, y: 70, label: "S", color: "oklch(0.82 0.22 140)", id: "s0" },
    { x: 250, y: 70, label: "S", color: "oklch(0.82 0.22 140)", id: "s1" },
  ];
}

// ── Defender movement targets ─────────────────────────────────────────────────
function getDefTargets(coverage: string, players: ReturnType<typeof getDefPlayers>): Record<string, Pt> {
  const c = coverage.toLowerCase();
  const targets: Record<string, Pt> = {};

  players.forEach(p => {
    if (p.label === "DL" || p.id.startsWith("dl")) {
      targets[p.id] = { x: p.x + (p.x < 180 ? -5 : 5), y: p.y + 18 };
    }
    if (p.id.startsWith("blitz")) {
      targets[p.id] = { x: p.x, y: p.y + 30 };
    }
  });

  if (c.includes("cover 0") || c.includes("zero")) {
    players.forEach(p => {
      if (p.label === "CB") targets[p.id] = { x: p.x, y: p.y };
      if (p.label === "LB") targets[p.id] = { x: p.x, y: p.y + 25 };
    });
  } else if (c.includes("cover 1") || c.includes("man free") || c.includes("robber")) {
    targets["rob"] = { x: 155, y: LOS - 70 };
    targets["fs"] = { x: 180, y: 55 };
    players.filter(p => p.label === "CB").forEach(p => {
      targets[p.id] = { x: p.x, y: p.y - 15 };
    });
    players.filter(p => p.label === "LB").forEach(p => {
      targets[p.id] = { x: p.x, y: p.y - 10 };
    });
  } else if (c.includes("cover 2")) {
    targets["s0"] = { x: 90, y: 40 };
    targets["s1"] = { x: 270, y: 40 };
    players.filter(p => p.label === "CB").forEach(p => {
      targets[p.id] = { x: p.x, y: p.y + 15 }; // squat the flat
    });
    players.filter(p => p.label === "LB").forEach(p => {
      targets[p.id] = { x: p.x, y: p.y - 15 };
    });
  } else if (c.includes("cover 3")) {
    targets["fs"] = { x: 180, y: 40 };
    players.filter(p => p.label === "CB").forEach(p => {
      targets[p.id] = { x: p.x, y: p.y - 50 };
    });
    players.filter(p => p.label === "LB").forEach((p, i) => {
      targets[p.id] = { x: [130, 180, 230][i] ?? p.x, y: p.y - 20 };
    });
  } else if (c.includes("cover 4") || c.includes("quarters")) {
    players.filter(p => p.label === "CB" && !p.id.endsWith("d")).forEach(p => {
      targets[p.id] = { x: p.x, y: p.y - 55 };
    });
    players.filter(p => p.id.endsWith("d")).forEach(p => {
      targets[p.id] = { x: p.x, y: 45 };
    });
    targets["s0"] = { x: 100, y: 45 };
    targets["s1"] = { x: 260, y: 45 };
  } else if (c.includes("blitz")) {
    players.filter(p => p.id.startsWith("blitz_lb")).forEach(p => {
      targets[p.id] = { x: p.x, y: p.y + 40 };
    });
  }

  return targets;
}

// ── Coverage zones ────────────────────────────────────────────────────────────
function getCoverageZones(coverage: string): { cx: number; cy: number; rx: number; ry: number }[] {
  const c = coverage.toLowerCase();
  if (c.includes("cover 2")) return [
    { cx: 90, cy: 75, rx: 75, ry: 55 },
    { cx: 270, cy: 75, rx: 75, ry: 55 },
  ];
  if (c.includes("cover 3")) return [
    { cx: 35, cy: 90, rx: 40, ry: 65 },
    { cx: 180, cy: 75, rx: 70, ry: 70 },
    { cx: 325, cy: 90, rx: 40, ry: 65 },
  ];
  if (c.includes("cover 4") || c.includes("quarters")) return [
    { cx: 30, cy: 95, rx: 38, ry: 55 },
    { cx: 115, cy: 80, rx: 48, ry: 55 },
    { cx: 245, cy: 80, rx: 48, ry: 55 },
    { cx: 330, cy: 95, rx: 38, ry: 55 },
  ];
  return [];
}

// ── Route endpoint (where WR ends up) ────────────────────────────────────────
function getRouteEndpoint(d: string): Pt {
  // parse last coordinate from SVG path
  const matches = d.match(/[\d.]+,[\d.]+/g);
  if (!matches || matches.length === 0) return { x: 180, y: 100 };
  const last = matches[matches.length - 1].split(",");
  return { x: parseFloat(last[0]), y: parseFloat(last[1]) };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  coverage: SimCoverage;
  play: SimPlay;
  onClose: () => void;
}

export function PlaySimulator({ coverage, play, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>(0);
  const [speed, setSpeed] = useState<1 | 2>(1);

  const routes = getRoutePaths(play.concept);
  const offPlayers = getOffPlayers();
  const defInitial = getDefPlayers(coverage.name);
  const defTargets = getDefTargets(coverage.name, defInitial);
  const zones = getCoverageZones(coverage.name);
  const hotRoute = routes.find(r => r.isHot);
  const hotEndpoint = hotRoute ? getRouteEndpoint(hotRoute.d) : { x: 180, y: 120 };

  const timings = speed === 2
    ? [0, 300, 900, 1600, 2400]
    : [0, 600, 1600, 2800, 4200];

  const run = useCallback(() => {
    setPhase(0);
    const delays = timings;
    setTimeout(() => setPhase(1), delays[1]);
    setTimeout(() => setPhase(2), delays[2]);
    setTimeout(() => setPhase(3), delays[3]);
    setTimeout(() => setPhase(4), delays[4]);
  }, [speed]);

  useEffect(() => {
    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, []);

  const phaseLabel = ["PRE-SNAP", "SNAP!", "ROUTES DEVELOP", "DEFENSE REACTS", "THROW HERE ▶"][phase];
  const phaseLabelColor = ["oklch(0.7 0.0 0)", "oklch(0.9 0.18 30)", "oklch(0.82 0.22 140)", "oklch(0.7 0.18 240)", "oklch(0.82 0.22 140)"][phase];

  const transTime = speed === 2 ? "0.4s" : "0.7s";
  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              {coverage.name}
            </div>
            <div className="font-display text-lg font-bold text-foreground">{play.formation} — {play.concept}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <button
                onClick={() => setSpeed(1)}
                className={`rounded px-2 py-1 text-xs font-bold transition-colors ${speed === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >1×</button>
              <button
                onClick={() => setSpeed(2)}
                className={`rounded px-2 py-1 text-xs font-bold transition-colors ${speed === 2 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >2×</button>
            </div>
            <button
              onClick={run}
              className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
            >↺ Replay</button>
            <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">✕</button>
          </div>
        </div>

        <div className="flex gap-0">
          {/* Field SVG */}
          <div className="relative flex-1">
            {/* Phase indicator */}
            <div className="absolute left-3 top-3 z-10">
              <span
                className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                style={{ background: "oklch(0.16 0.005 250 / 0.9)", color: phaseLabelColor, border: `1px solid ${phaseLabelColor}40`, transition: "color 0.3s" }}
              >
                {phaseLabel}
              </span>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ background: "oklch(0.18 0.01 150)" }}>
              {/* Field lines */}
              <defs>
                <marker id="sim-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.82 0.22 140)" />
                </marker>
                <marker id="blitz-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.65 0.25 25)" />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Yard lines */}
              {[40, 80, 120, 160, 200, 240].map(y => (
                <line key={y} x1={0} x2={W} y1={y} y2={y} stroke="white" strokeOpacity={0.08} strokeWidth={1} />
              ))}
              {/* Hash marks */}
              {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260].map(y => (
                <g key={y}>
                  <line x1={148} x2={156} y1={y} y2={y} stroke="white" strokeOpacity={0.25} />
                  <line x1={204} x2={212} y1={y} y2={y} stroke="white" strokeOpacity={0.25} />
                </g>
              ))}
              {/* Line of scrimmage */}
              <line x1={0} x2={W} y1={LOS} y2={LOS} stroke="oklch(0.82 0.13 75)" strokeWidth={2} strokeOpacity={0.8} />
              <text x={6} y={LOS - 4} fontSize={8} fill="oklch(0.82 0.13 75 / 0.7)" fontFamily="JetBrains Mono" fontWeight={700}>LINE OF SCRIMMAGE</text>

              {/* Coverage zones (appear at phase 3) */}
              {zones.map((z, i) => (
                <ellipse
                  key={i}
                  cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                  fill="oklch(0.7 0.18 240 / 0.12)"
                  stroke="oklch(0.7 0.18 240 / 0.5)"
                  strokeDasharray="4 3"
                  style={{
                    opacity: phase >= 3 ? 1 : 0,
                    transition: `opacity 0.5s ease-out`,
                  }}
                />
              ))}

              {/* Routes (draw progressively in phase 2) */}
              {routes.map((route) => (
                <path
                  key={route.id}
                  d={route.d}
                  fill="none"
                  stroke={route.isHot ? "oklch(0.82 0.22 140)" : "oklch(0.6 0.1 140 / 0.5)"}
                  strokeWidth={route.isHot ? 2.5 : 1.5}
                  strokeDasharray="1"
                  strokeDashoffset="1"
                  pathLength="1"
                  markerEnd="url(#sim-arrow)"
                  style={{
                    strokeDashoffset: phase >= 2 ? "0" : "1",
                    transition: `stroke-dashoffset ${transTime} ${easing} ${route.id * 0.12}s`,
                    filter: route.isHot && phase >= 4 ? "url(#glow)" : undefined,
                  }}
                />
              ))}

              {/* "THROW HERE" glow on open receiver endpoint */}
              {phase >= 4 && (
                <g style={{ animation: "pulse 0.8s ease-in-out infinite alternate" }}>
                  <circle
                    cx={hotEndpoint.x} cy={hotEndpoint.y} r={18}
                    fill="oklch(0.82 0.22 140 / 0.2)"
                    stroke="oklch(0.82 0.22 140)"
                    strokeWidth={2}
                    style={{ filter: "url(#glow)" }}
                  />
                  <text x={hotEndpoint.x} y={hotEndpoint.y - 22} fontSize={9} textAnchor="middle"
                    fill="oklch(0.82 0.22 140)" fontFamily="JetBrains Mono" fontWeight={700}>
                    OPEN
                  </text>
                </g>
              )}

              {/* Defensive players */}
              {defInitial.map((p) => {
                const target = defTargets[p.id];
                const isBlitzing = p.id.startsWith("blitz") || (phase >= 1 && p.label === "DL");
                const tx = phase >= 3 && target ? target.x : (phase >= 1 && p.label === "DL" ? p.x + (p.x < 180 ? -4 : 4) : p.x);
                const ty = phase >= 3 && target ? target.y : (phase >= 1 && p.label === "DL" ? p.y + 18 : p.y);
                const actualTy = isBlitzing && phase >= 1 ? Math.min(ty, p.y + (phase >= 3 ? 22 : 10)) : ty;
                return (
                  <g
                    key={p.id}
                    style={{
                      transform: `translate(${tx}px, ${(phase >= 3 && target) ? target.y : actualTy}px)`,
                      transition: `transform ${transTime} ${easing}`,
                    }}
                  >
                    <circle cx={0} cy={0} r={7} fill={p.color} stroke="black" strokeWidth={1} />
                    <text x={0} y={3} fontSize={7} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">
                      {p.label}
                    </text>
                  </g>
                );
              })}

              {/* Offensive players */}
              {offPlayers.map((p, i) => {
                const isQB = p.label === "QB";
                const isOL = p.label === "OL";
                const tx = p.x;
                const ty = isQB && phase >= 1 ? p.y + 20 : p.y;
                const isReceiver = !isQB && !isOL;
                const routeForPlayer = isReceiver ? routes[i <= 1 ? i : i - 3] : undefined;
                const endpoint = routeForPlayer && phase >= 2 ? getRouteEndpoint(routeForPlayer.d) : null;
                const finalX = endpoint ? endpoint.x : tx;
                const finalY = endpoint ? endpoint.y : ty;
                return (
                  <g
                    key={i}
                    style={{
                      transform: `translate(${finalX}px, ${finalY}px)`,
                      transition: `transform ${parseFloat(transTime) + 0.2}s ${easing} ${isReceiver ? 0.3 : 0}s`,
                    }}
                  >
                    <circle
                      cx={0} cy={0} r={isOL ? 5 : 7}
                      fill={p.color}
                      stroke="black"
                      strokeWidth={1}
                      style={{
                        filter: routeForPlayer?.isHot && phase >= 4 ? "url(#glow)" : undefined,
                      }}
                    />
                    {!isOL && (
                      <text x={0} y={3} fontSize={7} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono">
                        {p.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Ball snap animation */}
              {phase >= 1 && (
                <circle
                  cx={180}
                  cy={LOS + (phase >= 1 ? 20 : 8)}
                  r={3}
                  fill="oklch(0.65 0.12 50)"
                  stroke="white"
                  strokeWidth={0.5}
                  style={{ transition: `cy ${transTime} ${easing}` }}
                />
              )}
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-4 px-3 py-2 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-4 rounded-full" style={{ background: "oklch(0.82 0.22 140)" }} />
                <span className="text-[10px] text-muted-foreground">Hot route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-4 rounded-full opacity-50" style={{ background: "oklch(0.6 0.1 140)" }} />
                <span className="text-[10px] text-muted-foreground">Secondary</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ background: "oklch(0.65 0.25 25)" }} />
                <span className="text-[10px] text-muted-foreground">Defense</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ background: "oklch(0.82 0.22 140)" }} />
                <span className="text-[10px] text-muted-foreground">Offense</span>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="w-56 border-l border-border flex flex-col">
            {/* Coverage info */}
            <div className="border-b border-border p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Defense</div>
              <div className="text-sm font-bold text-foreground mb-1">{coverage.name}</div>
              <div className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                coverage.category === "blitz" ? "bg-destructive/20 text-destructive" :
                coverage.category === "man" ? "bg-primary/10 text-primary" :
                "bg-blue-500/10 text-blue-400"
              }`}>{coverage.category}</div>
            </div>

            {/* Read progression */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Read Progression</div>
              <div
                className="space-y-2"
                style={{ opacity: phase >= 2 ? 1 : 0.3, transition: "opacity 0.5s" }}
              >
                {play.read.split(" > ").map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2"
                    style={{
                      opacity: phase >= Math.min(i + 2, 4) ? 1 : 0.2,
                      transition: "opacity 0.5s",
                    }}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>

              {play.motion && (
                <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 mb-1">Motion</div>
                  <div className="text-[11px] text-muted-foreground">{play.motion}</div>
                </div>
              )}

              {/* Result box */}
              <div
                className="mt-4 rounded-lg border border-border p-3"
                style={{
                  borderColor: phase >= 4 ? "oklch(0.82 0.22 140 / 0.5)" : undefined,
                  background: phase >= 4 ? "oklch(0.82 0.22 140 / 0.05)" : undefined,
                  transition: "all 0.5s",
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {phase >= 4 ? "✓ Expected Result" : "Expected Result"}
                </div>
                <div className="text-[11px] text-foreground leading-relaxed" style={{ opacity: phase >= 3 ? 1 : 0.3, transition: "opacity 0.5s" }}>
                  {play.expected}
                </div>
              </div>

              {/* Counters to THIS defense */}
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Why it works vs {coverage.name.split(" ").slice(0, 2).join(" ")}
                </div>
                <div
                  className="text-[11px] text-muted-foreground leading-relaxed"
                  style={{ opacity: phase >= 3 ? 1 : 0.3, transition: "opacity 0.5s" }}
                >
                  {coverage.category === "blitz"
                    ? "Quick routes beat the rush. Snap → hot route → throw before pressure arrives. Their blitz leaves WRs 1-on-1."
                    : coverage.category === "man"
                    ? "Pick/rub routes create natural traffic. The mesh naturally crosses defenders. Hold the safety with a streak."
                    : "Attack the seams between zones. Time the route to hit at the zone boundary where no defender owns the space."}
                </div>
              </div>
            </div>

            {/* Replay button */}
            <div className="border-t border-border p-3">
              <button
                onClick={run}
                className="w-full rounded-lg bg-primary/10 border border-primary/30 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                ↺ Run Play Again
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.6; transform: scale(1); }
          to { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
