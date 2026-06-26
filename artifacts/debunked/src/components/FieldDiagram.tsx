type Props = { concept: string; side: "OFF" | "DEF" };

export function FieldDiagram({ concept, side }: Props) {
  const isDef = side === "DEF";
  return (
    <div className="overflow-hidden rounded-xl border border-border field-bg">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="chalk text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
          {side === "OFF" ? "Route Concept" : "Coverage Shell"}
        </span>
        <span className="chalk text-xs font-semibold">{concept}</span>
      </div>
      <svg viewBox="0 0 320 240" className="block h-[260px] w-full">
        {[40, 80, 120, 160, 200].map((y) => (
          <line key={y} x1={10} x2={310} y1={y} y2={y} stroke="oklch(0.95 0.01 100 / 0.25)" strokeWidth={1} />
        ))}
        {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220].map((y) => (
          <g key={y}>
            <line x1={130} x2={138} y1={y} y2={y} stroke="white" strokeOpacity={0.5} />
            <line x1={182} x2={190} y1={y} y2={y} stroke="white" strokeOpacity={0.5} />
          </g>
        ))}
        <line x1={10} x2={310} y1={180} y2={180} stroke="white" strokeWidth={2} />
        {isDef ? <DefenseShell concept={concept} /> : <OffenseRoutes concept={concept} />}
      </svg>
    </div>
  );
}

function Player({ x, y, color = "white", label }: { x: number; y: number; color?: string; label?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill={color} stroke="black" strokeWidth={1} />
      {label && (
        <text x={x} y={y + 3} fontSize={8} textAnchor="middle" fontWeight={700} fill="black" fontFamily="JetBrains Mono, monospace">
          {label}
        </text>
      )}
    </g>
  );
}

function Route({ d, dashed = false }: { d: string; dashed?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="oklch(0.82 0.22 140)"
      strokeWidth={2.5}
      strokeDasharray={dashed ? "4 3" : undefined}
      markerEnd="url(#arrow)"
    />
  );
}

function OffenseRoutes({ concept }: { concept: string }) {
  const positions = [
    { x: 40, y: 180 },
    { x: 100, y: 180 },
    { x: 160, y: 180 },
    { x: 220, y: 180 },
    { x: 280, y: 180 },
  ];
  const lower = concept.toLowerCase();
  let routes: string[] = [];
  if (lower.includes("mesh")) {
    routes = [
      "M 40 180 C 80 160 200 160 280 150",
      "M 280 180 C 240 160 120 160 40 150",
      "M 100 180 L 100 130",
      "M 220 180 L 220 130",
    ];
  } else if (lower.includes("smash")) {
    routes = [
      "M 40 180 L 40 160 L 20 130",
      "M 100 180 C 100 120 60 90 30 80",
      "M 220 180 C 220 120 260 90 290 80",
      "M 280 180 L 280 160 L 300 130",
    ];
  } else if (lower.includes("vert")) {
    routes = positions.filter((_, i) => i !== 2).map((p) => `M ${p.x} 180 L ${p.x} 30`);
  } else if (lower.includes("fade")) {
    routes = [
      "M 40 180 C 30 130 25 90 20 50",
      "M 100 180 C 95 130 90 90 85 50",
      "M 220 180 C 225 130 230 90 235 50",
      "M 280 180 C 290 130 295 90 300 50",
    ];
  } else if (lower.includes("curl") || lower.includes("flat")) {
    routes = [
      "M 40 180 L 40 140 L 20 145",
      "M 100 180 L 100 150 L 130 155",
      "M 220 180 L 220 150 L 190 155",
      "M 280 180 L 280 140 L 300 145",
    ];
  } else if (lower.includes("drive") || lower.includes("shallow") || lower.includes("cross")) {
    routes = [
      "M 40 180 L 40 160 C 80 155 240 155 280 150",
      "M 280 180 C 240 165 120 165 40 165",
      "M 220 180 L 220 90",
    ];
  } else if (lower.includes("flood") || lower.includes("sail")) {
    routes = [
      "M 40 180 C 40 120 30 90 20 60",
      "M 100 180 C 100 140 60 110 30 105",
      "M 220 180 L 220 160 L 250 165",
    ];
  } else if (lower.includes("stick")) {
    routes = [
      "M 40 180 L 40 160 L 20 165",
      "M 100 180 L 100 155 L 130 155",
      "M 220 180 L 220 150",
      "M 280 180 L 280 90",
    ];
  } else if (lower.includes("angle") || lower.includes("texas")) {
    routes = [
      "M 160 195 L 180 175 L 140 165",
      "M 100 180 L 100 135 L 200 130",
      "M 220 180 L 220 135 L 120 130",
    ];
  } else {
    routes = [
      "M 40 180 L 40 130",
      "M 100 180 L 100 130",
      "M 220 180 L 220 130",
      "M 280 180 L 280 130",
    ];
  }
  return (
    <>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.82 0.22 140)" />
        </marker>
      </defs>
      {routes.map((d, i) => <Route key={i} d={d} />)}
      {positions.map((p, i) => (
        <Player key={i} x={p.x} y={p.y} color={i === 2 ? "oklch(0.75 0.18 60)" : "white"} label={i === 2 ? "QB" : ""} />
      ))}
    </>
  );
}

function DefenseShell({ concept }: { concept: string }) {
  const lower = concept.toLowerCase();
  const dl = [{ x: 110, y: 175 }, { x: 145, y: 175 }, { x: 175, y: 175 }, { x: 210, y: 175 }];
  const lbs = [{ x: 130, y: 150 }, { x: 160, y: 150 }, { x: 190, y: 150 }];
  let safeties: { x: number; y: number }[] = [];
  let corners = [{ x: 30, y: 160 }, { x: 290, y: 160 }];
  let zones: { cx: number; cy: number; r: number }[] = [];
  if (lower.includes("cover 0")) {
    safeties = [];
  } else if (lower.includes("cover 1") || lower.includes("man free") || lower.includes("robber")) {
    safeties = [{ x: 160, y: 40 }];
  } else if (lower.includes("cover 2") || lower.includes("tampa")) {
    safeties = [{ x: 100, y: 50 }, { x: 220, y: 50 }];
    zones = [{ cx: 80, cy: 60, r: 50 }, { cx: 240, cy: 60, r: 50 }];
  } else if (lower.includes("cover 3")) {
    safeties = [{ x: 160, y: 40 }];
    zones = [{ cx: 40, cy: 70, r: 45 }, { cx: 160, cy: 50, r: 55 }, { cx: 280, cy: 70, r: 45 }];
  } else if (lower.includes("cover 4") || lower.includes("quarter") || lower.includes("palms")) {
    safeties = [{ x: 110, y: 50 }, { x: 210, y: 50 }];
    zones = [{ cx: 40, cy: 70, r: 40 }, { cx: 120, cy: 60, r: 45 }, { cx: 200, cy: 60, r: 45 }, { cx: 280, cy: 70, r: 40 }];
  } else if (lower.includes("cover 6")) {
    safeties = [{ x: 90, y: 50 }, { x: 200, y: 55 }];
    zones = [{ cx: 70, cy: 60, r: 55 }, { cx: 210, cy: 55, r: 45 }, { cx: 290, cy: 60, r: 35 }];
  } else {
    safeties = [{ x: 160, y: 50 }];
  }
  return (
    <>
      {zones.map((z, i) => (
        <circle key={i} cx={z.cx} cy={z.cy} r={z.r} fill="oklch(0.7 0.18 240 / 0.18)" stroke="oklch(0.7 0.18 240 / 0.6)" strokeDasharray="3 3" />
      ))}
      {dl.map((p, i) => <Player key={`dl${i}`} x={p.x} y={p.y} color="oklch(0.65 0.25 25)" label="DL" />)}
      {lbs.map((p, i) => <Player key={`lb${i}`} x={p.x} y={p.y} color="oklch(0.7 0.18 240)" label="LB" />)}
      {corners.map((p, i) => <Player key={`cb${i}`} x={p.x} y={p.y} color="oklch(0.7 0.18 240)" label="CB" />)}
      {safeties.map((p, i) => <Player key={`s${i}`} x={p.x} y={p.y} color="oklch(0.82 0.22 140)" label="S" />)}
    </>
  );
}
