import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlaySide = "off" | "def";
type Down = 1 | 2 | 3 | 4;
type Distance = "short" | "medium" | "long";
type Situation = "normal" | "redzone" | "goalline" | "2min" | "4th";
type PlayType = "run" | "pass";

type FilmPlay = {
  id: string;
  side: PlaySide;
  down: Down;
  distance: Distance;
  situation: Situation;
  offFormation: string;
  defFormation: string;
  coverage: string;
  blitz: boolean;
  userPosition: string;
  playType: PlayType;
  concept: string;
  gain: number;
  note: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OFF_FORMATIONS = [
  "Gun Bunch", "Gun Trips TE", "Gun Tight Slots", "Gun Empty", "Gun Y Trips",
  "Shotgun 5 Wide", "Singleback Ace", "Singleback Trips TE", "I-Form Pro",
  "I-Form Twins", "Strong I", "Weak I", "Pistol Bunch", "Pistol Y Trips",
  "Goal Line", "Other",
];

const DEF_FORMATIONS = [
  "4-3", "3-4", "4-3 Nickel", "3-4 Nickel", "Nickel 3-3-5",
  "Dime 4-2-5", "Dollar", "Goal Line", "4-4", "Other",
];

const COVERAGES = [
  "Cover 0", "Cover 1 Robber", "Cover 1 Press", "Cover 2 Zone",
  "Cover 2 Tampa", "Cover 2 Man Under", "Cover 3 Sky", "Cover 3 Buzz",
  "Cover 3 Cloud", "Cover 4 Quarters", "Cover 4 Palms", "Cover 6",
  "Cover 2 Invert", "Man Free", "Quarters Palms", "Unknown",
];

const CONCEPTS = [
  "Mesh", "Flood", "Verticals", "Smash", "Curl/Flat", "Slants",
  "Crossers", "Deep Ball", "Wheel", "Post/Dig", "Stick", "PA Boot",
  "Inside Zone", "Outside Zone", "Power", "Counter", "Draw", "Jet Sweep", "Other",
];

const USER_POSITIONS = [
  "None / Unknown", "MLB", "Free Safety", "Strong Safety", "Corner",
  "Slot Corner", "OLB", "D-End", "D-Tackle", "Linebacker",
];

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Stat helpers ─────────────────────────────────────────────────────────────

type TendencyReport = {
  plays: FilmPlay[];
  passRate: number;
  runRate: number;
  blitzRate: number;
  topOffFormations: [string, number][];
  topDefFormations: [string, number][];
  topCoverages: [string, number][];
  userPositions: [string, number][];
  downAndDistance: Record<string, { pass: number; run: number; total: number }>;
  offTendencies: string[];
  defTendencies: string[];
  userTendencies: string[];
  avgGainPass: number;
  avgGainRun: number;
};

function buildReport(plays: FilmPlay[]): TendencyReport {
  if (plays.length === 0) {
    return {
      plays, passRate: 0, runRate: 0, blitzRate: 0,
      topOffFormations: [], topDefFormations: [], topCoverages: [],
      userPositions: [], downAndDistance: {},
      offTendencies: [], defTendencies: [], userTendencies: [],
      avgGainPass: 0, avgGainRun: 0,
    };
  }

  function freq<T extends string>(arr: T[]): [T, number][] {
    const map: Record<string, number> = {};
    arr.forEach((v) => { map[v] = (map[v] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]) as [T, number][];
  }

  const passes    = plays.filter((p) => p.playType === "pass");
  const runs      = plays.filter((p) => p.playType === "run");
  const blitzes   = plays.filter((p) => p.blitz);
  const passGains = passes.map((p) => p.gain);
  const runGains  = runs.map((p) => p.gain);

  const dnd: Record<string, { pass: number; run: number; total: number }> = {};
  plays.forEach((p) => {
    const key = `${p.down}&${p.distance === "short" ? "S" : p.distance === "medium" ? "M" : "L"}`;
    if (!dnd[key]) dnd[key] = { pass: 0, run: 0, total: 0 };
    dnd[key].total++;
    if (p.playType === "pass") dnd[key].pass++; else dnd[key].run++;
  });

  const topCovs    = freq(plays.filter((p) => p.coverage !== "Unknown").map((p) => p.coverage));
  const topOffFmt  = freq(plays.map((p) => p.offFormation));
  const topDefFmt  = freq(plays.map((p) => p.defFormation));
  const topUser    = freq(plays.map((p) => p.userPosition));

  // Derived offensive tendencies
  const offTend: string[] = [];
  const pr = plays.length > 0 ? passes.length / plays.length : 0;
  if (pr > 0.7) offTend.push(`Heavy pass tendency (${Math.round(pr * 100)}% pass rate)`);
  if (pr < 0.4) offTend.push(`Run-heavy offense (${Math.round((1 - pr) * 100)}% run rate)`);

  const shortDownPasses = plays.filter((p) => p.down <= 2 && p.distance === "short" && p.playType === "pass");
  if (shortDownPasses.length >= 2) offTend.push("Passes frequently on short-yardage downs");

  const redzonePasses = plays.filter((p) => p.situation === "redzone" && p.playType === "pass");
  if (redzonePasses.length >= 2) offTend.push("Pass-heavy in red zone");

  const topOff = topOffFmt[0];
  if (topOff && topOff[1] >= 3) offTend.push(`Heavily favors ${topOff[0]} (${topOff[1]} uses)`);

  const topConceptArr = freq(plays.filter((p) => p.playType === "pass").map((p) => p.concept));
  if (topConceptArr[0] && topConceptArr[0][1] >= 2)
    offTend.push(`Favorite concept: ${topConceptArr[0][0]} (${topConceptArr[0][1]} times)`);

  // Derived defensive tendencies
  const defTend: string[] = [];
  const blitzPct = plays.length > 0 ? blitzes.length / plays.length : 0;
  if (blitzPct > 0.5) defTend.push(`Aggressive blitz tendency (${Math.round(blitzPct * 100)}% blitz rate)`);
  if (blitzPct < 0.15 && plays.length >= 5) defTend.push(`Conservative, low blitz rate (${Math.round(blitzPct * 100)}%)`);

  const topCov = topCovs[0];
  if (topCov) defTend.push(`Primary coverage: ${topCov[0]} (${topCov[1]} uses)`);
  if (topCovs[1]) defTend.push(`Secondary coverage: ${topCovs[1][0]} (${topCovs[1][1]} uses)`);

  const thirdDownBlitz = plays.filter((p) => p.down === 3 && p.blitz);
  if (thirdDownBlitz.length >= 2)
    defTend.push(`Blitzes heavily on 3rd down (${thirdDownBlitz.length} recorded)`);

  // User behavior tendencies
  const userTend: string[] = [];
  const topU = topUser[0];
  if (topU && topU[0] !== "None / Unknown") {
    const uPct = Math.round((topU[1] / plays.length) * 100);
    userTend.push(`Controls ${topU[0]} most frequently (${uPct}% of plays)`);
  }

  const mlbUser = plays.filter((p) => p.userPosition === "MLB");
  if (mlbUser.length >= 2)
    userTend.push(`Frequently users MLB — exploit middle of field and crossers`);

  const safetyUser = plays.filter((p) => p.userPosition === "Free Safety" || p.userPosition === "Strong Safety");
  if (safetyUser.length >= 2)
    userTend.push(`Safety user — attack opposite hash and corner routes`);

  const cbUser = plays.filter((p) => p.userPosition === "Corner" || p.userPosition === "Slot Corner");
  if (cbUser.length >= 2)
    userTend.push(`Corner user — attack opposite side or run crossers away`);

  return {
    plays, passRate: pr, runRate: 1 - pr,
    blitzRate: blitzPct,
    topOffFormations: topOffFmt.slice(0, 5),
    topDefFormations: topDefFmt.slice(0, 5),
    topCoverages: topCovs.slice(0, 5),
    userPositions: topUser.slice(0, 5),
    downAndDistance: dnd,
    offTendencies: offTend,
    defTendencies: defTend,
    userTendencies: userTend,
    avgGainPass: passGains.length ? passGains.reduce((a, b) => a + b, 0) / passGains.length : 0,
    avgGainRun:  runGains.length  ? runGains.reduce((a, b) => a + b, 0)  / runGains.length  : 0,
  };
}

// ─── Quick Log Form ───────────────────────────────────────────────────────────

function QuickLogForm({ onLog }: { onLog: (play: FilmPlay) => void }) {
  const [down,       setDown]       = useState<Down>(1);
  const [distance,   setDistance]   = useState<Distance>("medium");
  const [situation,  setSituation]  = useState<Situation>("normal");
  const [offFmt,     setOffFmt]     = useState(OFF_FORMATIONS[0]);
  const [defFmt,     setDefFmt]     = useState(DEF_FORMATIONS[0]);
  const [coverage,   setCoverage]   = useState(COVERAGES[0]);
  const [blitz,      setBlitz]      = useState(false);
  const [userPos,    setUserPos]    = useState(USER_POSITIONS[0]);
  const [playType,   setPlayType]   = useState<PlayType>("pass");
  const [concept,    setConcept]    = useState(CONCEPTS[0]);
  const [gain,       setGain]       = useState(0);
  const [note,       setNote]       = useState("");

  function submit() {
    onLog({
      id: uid(), down, distance, situation, offFormation: offFmt,
      defFormation: defFmt, coverage, blitz, userPosition: userPos,
      playType, concept, gain, note, side: "off",
    });
    setNote("");
    setGain(0);
    setBlitz(false);
  }

  const pill = (active: boolean, danger?: boolean) =>
    `rounded-lg border px-3 py-1.5 font-mono text-[11px] font-bold transition-all ${
      active
        ? danger
          ? "border-red-500/60 bg-red-500/12 text-red-400"
          : "border-team-one/60 bg-team-one/12 text-team-one"
        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
    }`;

  const select = "w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-team-one focus:outline-none";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Log Play</div>

      {/* Down & Distance */}
      <div className="space-y-2">
        <div className="font-mono text-[10px] text-muted-foreground">Down</div>
        <div className="flex gap-2">
          {([1, 2, 3, 4] as Down[]).map((d) => (
            <button key={d} onClick={() => setDown(d)} className={pill(down === d)}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="font-mono text-[10px] text-muted-foreground">Distance</div>
        <div className="flex gap-2">
          {(["short", "medium", "long"] as Distance[]).map((d) => (
            <button key={d} onClick={() => setDistance(d)} className={pill(distance === d)}>
              {d === "short" ? "Short (1-3)" : d === "medium" ? "Med (4-7)" : "Long (8+)"}
            </button>
          ))}
        </div>
      </div>

      {/* Situation */}
      <div className="space-y-2">
        <div className="font-mono text-[10px] text-muted-foreground">Situation</div>
        <div className="flex flex-wrap gap-2">
          {(["normal", "redzone", "goalline", "2min", "4th"] as Situation[]).map((s) => (
            <button key={s} onClick={() => setSituation(s)} className={pill(situation === s)}>
              {s === "normal" ? "Normal" : s === "redzone" ? "Red Zone" : s === "goalline" ? "Goal Line" : s === "2min" ? "2-Min" : "4th Down"}
            </button>
          ))}
        </div>
      </div>

      {/* Formations */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] text-muted-foreground">Offensive Formation</div>
          <select value={offFmt} onChange={(e) => setOffFmt(e.target.value)} className={select}>
            {OFF_FORMATIONS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] text-muted-foreground">Defensive Formation</div>
          <select value={defFmt} onChange={(e) => setDefFmt(e.target.value)} className={select}>
            {DEF_FORMATIONS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Coverage + Blitz */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] text-muted-foreground">Coverage</div>
          <select value={coverage} onChange={(e) => setCoverage(e.target.value)} className={select}>
            {COVERAGES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] text-muted-foreground">Blitz?</div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setBlitz(true)}  className={pill(blitz, true)}>Yes — Blitz</button>
            <button onClick={() => setBlitz(false)} className={pill(!blitz)}>No Blitz</button>
          </div>
        </div>
      </div>

      {/* User position */}
      <div className="space-y-1.5">
        <div className="font-mono text-[10px] text-muted-foreground">User Defender Position</div>
        <select value={userPos} onChange={(e) => setUserPos(e.target.value)} className={select}>
          {USER_POSITIONS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Play type + concept */}
      <div className="space-y-2">
        <div className="font-mono text-[10px] text-muted-foreground">Play Type</div>
        <div className="flex gap-2">
          <button onClick={() => setPlayType("pass")} className={pill(playType === "pass")}>Pass</button>
          <button onClick={() => setPlayType("run")}  className={pill(playType === "run")}>Run</button>
        </div>
      </div>

      {playType === "pass" && (
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] text-muted-foreground">Concept / Route</div>
          <select value={concept} onChange={(e) => setConcept(e.target.value)} className={select}>
            {CONCEPTS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Gain + note */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] text-muted-foreground">Yards Gained</div>
          <input
            type="number"
            value={gain}
            onChange={(e) => setGain(Number(e.target.value))}
            className={select + " [appearance:textfield]"}
          />
        </div>
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] text-muted-foreground">Note (optional)</div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. QB scrambled left..."
            className={select}
          />
        </div>
      </div>

      <button
        onClick={submit}
        className="w-full rounded-xl border border-team-one/50 bg-team-one/10 py-3 font-mono text-sm font-bold text-team-one transition-all hover:border-team-one hover:bg-team-one/18"
      >
        + Log Play
      </button>
    </div>
  );
}

// ─── Tendency Bar ─────────────────────────────────────────────────────────────

function TendencyBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-foreground">{label}</span>
        <span className="font-mono text-[11px] font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Report Panel ─────────────────────────────────────────────────────────────

function ReportPanel({ report, onReset }: { report: TendencyReport; onReset: () => void }) {
  const { plays } = report;
  const n = plays.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-base font-bold">Tendency Report</div>
          <div className="font-mono text-[11px] text-muted-foreground">{n} plays analyzed</div>
        </div>
        <button
          onClick={onReset}
          className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-all"
        >
          Clear &amp; Restart
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pass Rate",    value: Math.round(report.passRate * 100) + "%",    color: "#60a5fa" },
          { label: "Run Rate",     value: Math.round(report.runRate  * 100) + "%",    color: "#34d399" },
          { label: "Blitz Rate",   value: Math.round(report.blitzRate * 100) + "%",   color: "#f87171" },
          { label: "Avg Pass Yds", value: report.avgGainPass.toFixed(1) + " yds",     color: "#fbbf24" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">{kpi.label}</div>
            <div className="font-display text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Offensive Tendencies */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Offensive Tendencies</div>
          <div className="space-y-3">
            <TendencyBar label="Pass %" value={plays.filter((p) => p.playType === "pass").length} total={n} color="#60a5fa" />
            <TendencyBar label="Run %"  value={plays.filter((p) => p.playType === "run").length}  total={n} color="#34d399" />
          </div>
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Top Formations</div>
            {report.topOffFormations.slice(0, 4).map(([fmt, cnt]) => (
              <div key={fmt} className="flex justify-between items-center">
                <span className="font-mono text-[11px] text-foreground">{fmt}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{cnt}×</span>
              </div>
            ))}
          </div>
          {report.offTendencies.length > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              {report.offTendencies.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="mt-0.5 text-team-one shrink-0">▸</span>
                  <span className="text-foreground/80">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Defensive Tendencies */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Defensive Tendencies</div>
          <div className="space-y-3">
            <TendencyBar label="Blitz %" value={plays.filter((p) => p.blitz).length} total={n} color="#f87171" />
          </div>
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Coverage Usage</div>
            {report.topCoverages.slice(0, 5).map(([cov, cnt]) => (
              <div key={cov} className="flex justify-between items-center">
                <span className="font-mono text-[11px] text-foreground">{cov}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{cnt}×</span>
              </div>
            ))}
          </div>
          {report.defTendencies.length > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              {report.defTendencies.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="mt-0.5 text-blue-400 shrink-0">▸</span>
                  <span className="text-foreground/80">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Tendencies */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">User Tendencies</div>
          <div className="space-y-3">
            {report.userPositions.filter(([pos]) => pos !== "None / Unknown").slice(0, 5).map(([pos, cnt]) => (
              <TendencyBar key={pos} label={pos} value={cnt} total={n} color="#e879f9" />
            ))}
            {report.userPositions.every(([pos]) => pos === "None / Unknown") && (
              <p className="font-mono text-[11px] text-muted-foreground">No user position data logged.</p>
            )}
          </div>
          {report.userTendencies.length > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              {report.userTendencies.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="mt-0.5 text-purple-400 shrink-0">▸</span>
                  <span className="text-foreground/80">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Down & Distance breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Down &amp; Distance Tendencies</div>
        {Object.keys(report.downAndDistance).length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No data yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(report.downAndDistance)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, stat]) => {
                const [down, dist] = key.split("&");
                const distLabel = dist === "S" ? "Short" : dist === "M" ? "Medium" : "Long";
                const passRate = Math.round((stat.pass / stat.total) * 100);
                return (
                  <div key={key} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-foreground">{down} &amp; {distLabel}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{stat.total} plays</span>
                    </div>
                    <div className="flex gap-3 text-[11px] font-mono">
                      <span className="text-blue-400">Pass: {passRate}%</span>
                      <span className="text-green-400">Run: {100 - passRate}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Play log */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Play Log ({n})</div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {plays.slice().reverse().map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-[10px] font-mono">
              <span className="text-muted-foreground/60 shrink-0 w-4 text-right">{n - i}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.playType === "pass" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"}`}>
                {p.playType.toUpperCase()}
              </span>
              <span className="text-foreground/80">{p.down}&amp;{p.distance === "short" ? "S" : p.distance === "medium" ? "M" : "L"}</span>
              <span className="text-muted-foreground shrink-0">{p.offFormation}</span>
              <span className="text-muted-foreground shrink-0">vs {p.coverage}</span>
              {p.blitz && <span className="text-red-400 shrink-0">BLITZ</span>}
              <span className={`ml-auto font-bold shrink-0 ${p.gain > 0 ? "text-green-400" : p.gain < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                {p.gain > 0 ? "+" : ""}{p.gain} yds
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function FilmAnalysis() {
  const [plays, setPlays]       = useState<FilmPlay[]>([]);
  const [view,  setView]        = useState<"log" | "report">("log");
  const [opponent, setOpponent] = useState("");

  function logPlay(play: FilmPlay) {
    setPlays((prev) => [...prev, play]);
  }

  const report = buildReport(plays);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">Film Analysis</h2>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            Log opponent plays from film study → generate tendency report
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="Opponent name..."
            className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-team-one focus:outline-none"
          />
          <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setView("log")}
              className={`rounded-lg px-4 py-1.5 font-mono text-[11px] font-bold transition-all ${
                view === "log" ? "bg-team-one/15 text-team-one" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Log
            </button>
            <button
              onClick={() => setView("report")}
              className={`rounded-lg px-4 py-1.5 font-mono text-[11px] font-bold transition-all ${
                view === "report" ? "bg-team-one/15 text-team-one" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Report {plays.length > 0 && <span className="ml-1 text-[9px]">({plays.length})</span>}
            </button>
          </div>
        </div>
      </div>

      {opponent && (
        <div className="rounded-lg border border-team-one/30 bg-team-one/8 px-4 py-2.5">
          <span className="font-mono text-xs text-team-one">Studying: <strong>{opponent}</strong></span>
        </div>
      )}

      {view === "log" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <QuickLogForm onLog={logPlay} />
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Progress</div>
              <div className="font-display text-2xl font-bold text-team-one">{plays.length}</div>
              <div className="font-mono text-xs text-muted-foreground">plays logged</div>
              <div className="mt-3 text-[11px] font-mono text-muted-foreground">
                {plays.length < 5
                  ? `Log ${5 - plays.length} more for initial patterns`
                  : plays.length < 10
                  ? `Log ${10 - plays.length} more for full report`
                  : "Enough data — check the report!"}
              </div>
              {plays.length >= 5 && (
                <button
                  onClick={() => setView("report")}
                  className="mt-4 w-full rounded-xl border border-team-one/50 bg-team-one/10 py-2.5 font-mono text-sm font-bold text-team-one transition-all hover:border-team-one hover:bg-team-one/18"
                >
                  View Report →
                </button>
              )}
            </div>
            {plays.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Recent Plays</div>
                {plays.slice(-5).reverse().map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${p.playType === "pass" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"}`}>
                      {p.playType[0].toUpperCase()}
                    </span>
                    <span>{p.down}&amp;{p.distance[0].toUpperCase()}</span>
                    <span className="text-foreground/60 truncate">{p.offFormation}</span>
                    <span className="ml-auto font-bold shrink-0 text-team-one">{p.gain > 0 ? "+" : ""}{p.gain}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        plays.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <div className="font-display text-base text-muted-foreground">No plays logged yet.</div>
            <div className="font-mono text-xs text-muted-foreground mt-1">Switch to Log and record at least 5 plays to generate a report.</div>
            <button onClick={() => setView("log")} className="mt-4 rounded-xl border border-border px-5 py-2.5 font-mono text-sm text-muted-foreground hover:text-foreground transition">
              Go to Log →
            </button>
          </div>
        ) : (
          <ReportPanel report={report} onReset={() => { setPlays([]); setView("log"); }} />
        )
      )}
    </div>
  );
}
