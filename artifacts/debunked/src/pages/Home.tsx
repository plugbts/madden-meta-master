import { useMemo, useState } from "react";
import { NFL_TEAMS, getPackages, type TeamDef, type DefFormation, type DefPackage, type DefPlay } from "@/lib/playbook-data";
import { COVERAGES, type Coverage, type Counter } from "@/lib/madden-data";

type Step = "team" | "formation" | "play";

const CONF_FILTER = ["all", "AFC", "NFC"] as const;

const COVERAGE_BADGE: Record<string, string> = {
  blitz:     "bg-destructive/20 text-destructive border border-destructive/30",
  man:       "bg-team-one/15 text-team-one border border-team-one/25",
  zone:      "bg-team-two/15 text-team-two border border-team-two/25",
  formation: "bg-accent-1/15 text-accent-1 border border-accent-1/25",
};

const TIER_STYLE: Record<string, string> = {
  "A+": "bg-team-one text-background",
  "A":  "bg-shield/80 text-background",
  "B+": "bg-muted text-muted-foreground",
};

function getCoverage(id: string): Coverage | undefined {
  return COVERAGES.find((c) => c.id === id);
}

interface HomeProps {
  onEnter: () => void;
}

export function Home({ onEnter }: HomeProps) {
  const [step, setStep] = useState<Step>("team");
  const [team, setTeam] = useState<TeamDef | null>(null);
  const [pkgIdx, setPkgIdx] = useState(0);
  const [formation, setFormation] = useState<DefFormation | null>(null);
  const [play, setPlay] = useState<DefPlay | null>(null);
  const [confFilter, setConfFilter] = useState<"all" | "AFC" | "NFC">("all");
  const [search, setSearch] = useState("");
  const [counterIdx, setCounterIdx] = useState(0);

  const packages: DefPackage[] = useMemo(
    () => (team ? getPackages(team.schemeKey) : []),
    [team],
  );

  const coverage = useMemo(() => (play ? getCoverage(play.coverageId) : null), [play]);
  const counter: Counter | null = coverage?.counters[counterIdx] ?? null;

  function selectTeam(t: TeamDef) {
    setTeam(t);
    setPkgIdx(0);
    setFormation(null);
    setPlay(null);
    setCounterIdx(0);
    setStep("formation");
  }

  function selectFormation(f: DefFormation) {
    setFormation(f);
    setPlay(null);
    setCounterIdx(0);
    setStep("play");
  }

  function selectPlay(p: DefPlay) {
    setPlay(p);
    setCounterIdx(0);
  }

  function goBack(to: Step) {
    setStep(to);
    if (to === "team") { setTeam(null); setFormation(null); setPlay(null); }
    if (to === "formation") { setFormation(null); setPlay(null); }
  }

  const filteredTeams = useMemo(() => {
    let list = NFL_TEAMS;
    if (confFilter !== "all") list = list.filter((t) => t.conf === confFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.team.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.abbr.toLowerCase().includes(q),
      );
    }
    return list;
  }, [confFilter, search]);

  const grouped = useMemo(() => {
    const g: Record<string, TeamDef[]> = {};
    for (const t of filteredTeams) {
      const key = `${t.conf} ${t.div}`;
      if (!g[key]) g[key] = [];
      g[key].push(t);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTeams]);

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#000" }}>
      <div className="flex flex-col min-h-screen">
        {/* ── Header ── */}
        <header
          className="sticky top-0 z-50 border-b border-border/40"
          style={{
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex h-13 items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="font-display font-black"
                  style={{
                    fontSize: "1.1rem",
                    letterSpacing: "-0.04em",
                    textShadow: "0 0 24px rgba(120,180,255,0.35)",
                  }}
                >
                  DEBUNKED.
                </span>
                <span className="hidden sm:block font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  MADDEN 26
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "#6fdba8",
                      boxShadow: "0 0 8px rgba(111,219,168,0.90)",
                      animation: "pulse 2s ease-in-out infinite",
                    }}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:block">
                    Engine Active
                  </span>
                </div>
                <div
                  className="h-5 w-px"
                  style={{ background: "rgba(255,255,255,0.10)" }}
                />
                <button
                  onClick={onEnter}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Tools →
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Breadcrumb ── */}
        <div
          className="border-b border-border/30 sticky top-13 z-40"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex items-center gap-1.5 py-2.5 text-[11px] font-mono">
              <button
                onClick={() => goBack("team")}
                className={`transition-colors ${step === "team" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Playbook
              </button>
              {team && (
                <>
                  <span className="text-muted-foreground/40">/</span>
                  <button
                    onClick={() => goBack("formation")}
                    className={`transition-colors ${step === "formation" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {team.abbr}
                  </button>
                </>
              )}
              {formation && (
                <>
                  <span className="text-muted-foreground/40">/</span>
                  <button
                    onClick={() => setStep("play")}
                    className={`transition-colors ${step === "play" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {formation.name}
                  </button>
                </>
              )}
              {play && (
                <>
                  <span className="text-muted-foreground/40">/</span>
                  <span style={{ color: "#78b4ff" }} className="font-semibold">{play.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6">

          {/* STEP 1 — Team picker */}
          {step === "team" && (
            <div className="space-y-4 animate-[var(--animate-fade-in)]">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
                  Select Defensive Playbook
                </p>
                <div
                  className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {CONF_FILTER.map((c) => (
                    <button
                      key={c}
                      onClick={() => setConfFilter(c)}
                      className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all ${
                        confFilter === c
                          ? "text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={confFilter === c ? {
                        background: "#78b4ff",
                        boxShadow: "0 0 12px rgba(120,180,255,0.40)",
                      } : undefined}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Search team…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 rounded-md border border-border/60 px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(8px)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(120,180,255,0.60)")}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                />
              </div>

              <div className="space-y-5">
                {grouped.map(([divKey, teams]) => (
                  <div key={divKey}>
                    <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 font-mono">
                      {divKey}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {teams.map((t) => (
                        <TeamCard key={t.abbr} team={t} onSelect={selectTeam} />
                      ))}
                    </div>
                  </div>
                ))}
                {grouped.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">No teams found</div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — Formation picker */}
          {step === "formation" && team && (
            <div className="space-y-4 animate-[var(--animate-slide-right)]">
              <div
                className="flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3"
                style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-[11px] font-bold"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {team.abbr}
                </div>
                <div className="flex-1">
                  <div className="font-display text-sm font-semibold leading-tight">{team.city} {team.team}</div>
                  <div className="text-[10px] text-muted-foreground">{team.scheme}</div>
                </div>
                <button
                  onClick={() => goBack("team")}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition font-mono"
                >
                  ← Change
                </button>
              </div>

              {/* Package tabs */}
              <div
                className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5 w-fit"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                {packages.map((pkg, i) => (
                  <button
                    key={pkg.name}
                    onClick={() => { setPkgIdx(i); setFormation(null); setPlay(null); }}
                    className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                      pkgIdx === i ? "text-background" : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={pkgIdx === i ? {
                      background: "#78b4ff",
                      boxShadow: "0 0 12px rgba(120,180,255,0.35)",
                    } : undefined}
                  >
                    {pkg.shortName}
                  </button>
                ))}
              </div>

              {packages[pkgIdx] && (
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {packages[pkgIdx].formations.map((f) => (
                    <FormationCard key={f.name} formation={f} onSelect={selectFormation} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Play picker + counter */}
          {step === "play" && formation && team && (
            <div className="animate-[var(--animate-slide-right)]">
              <div
                className="mb-4 flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3"
                style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
              >
                <div className="flex-1">
                  <div className="font-display text-sm font-semibold">{formation.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {team.abbr} · {packages[pkgIdx]?.shortName}
                  </div>
                </div>
                <button
                  onClick={() => goBack("formation")}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition font-mono"
                >
                  ← Back
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                {/* Play list */}
                <div className="space-y-1">
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 font-mono">
                    Plays
                  </div>
                  {formation.plays.map((p) => {
                    const cov = getCoverage(p.coverageId);
                    const active = play?.name === p.name;
                    return (
                      <button
                        key={p.name}
                        onClick={() => selectPlay(p)}
                        className="w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-all"
                        style={{
                          background: active
                            ? "rgba(120,180,255,0.08)"
                            : "rgba(255,255,255,0.04)",
                          borderColor: active
                            ? "rgba(120,180,255,0.50)"
                            : "rgba(255,255,255,0.09)",
                          boxShadow: active
                            ? "0 0 16px rgba(120,180,255,0.12)"
                            : "none",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <div>
                          <div
                            className="text-[12px] font-semibold leading-tight"
                            style={{ color: active ? "#78b4ff" : undefined }}
                          >
                            {p.name}
                          </div>
                          {cov && (
                            <div className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-[160px]">
                              {cov.shell}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {cov && (
                            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${COVERAGE_BADGE[cov.category] ?? COVERAGE_BADGE.zone}`}>
                              {cov.category}
                            </span>
                          )}
                          {p.isBlitz && (
                            <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-destructive/15 text-destructive border border-destructive/25">
                              blitz
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Counter panel */}
                <div>
                  {!play && (
                    <div
                      className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
                      style={{
                        borderColor: "rgba(255,255,255,0.09)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      ← Select a play to see the counter
                    </div>
                  )}
                  {play && coverage && (
                    <div key={play.name} className="space-y-3 animate-[var(--animate-scale-in)]">
                      {/* Coverage card */}
                      <div
                        className="rounded-xl border border-border/50 p-4"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">
                              Coverage Detected
                            </div>
                            <div className="font-display text-lg font-bold leading-tight">{coverage.name}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{coverage.shell}</div>
                          </div>
                          <span className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COVERAGE_BADGE[coverage.category] ?? ""}`}>
                            {coverage.category}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {coverage.tells.map((t) => (
                            <span
                              key={t}
                              className="rounded border px-2 py-0.5 text-[10px] text-muted-foreground"
                              style={{
                                borderColor: "rgba(255,255,255,0.07)",
                                background: "rgba(0,0,0,0.65)",
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>

                        <div
                          className="rounded-lg px-3 py-2 text-[11px] text-destructive"
                          style={{
                            background: "rgba(220,80,60,0.08)",
                            border: "1px solid rgba(220,80,60,0.20)",
                          }}
                        >
                          <span className="font-bold">Exploit: </span>{coverage.weakness}
                        </div>
                      </div>

                      {/* Counter tabs */}
                      <div>
                        <div className="mb-2 text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                          Best Counters
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {coverage.counters.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => setCounterIdx(i)}
                              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all"
                              style={{
                                background: i === counterIdx
                                  ? "rgba(120,180,255,0.10)"
                                  : "rgba(255,255,255,0.05)",
                                borderColor: i === counterIdx
                                  ? "rgba(120,180,255,0.50)"
                                  : "rgba(255,255,255,0.09)",
                                color: i === counterIdx ? "#78b4ff" : undefined,
                                boxShadow: i === counterIdx
                                  ? "0 0 12px rgba(120,180,255,0.15)"
                                  : "none",
                              }}
                            >
                              <span className={`rounded px-1 text-[9px] font-bold ${TIER_STYLE[c.tier] ?? ""}`}>
                                {c.tier}
                              </span>
                              {c.play}
                            </button>
                          ))}
                        </div>

                        {counter && (
                          <div
                            key={counterIdx}
                            className="rounded-xl border p-4 space-y-3 animate-[var(--animate-flash-in)]"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              borderColor: "rgba(255,255,255,0.09)",
                              backdropFilter: "blur(12px)",
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-[10px] text-muted-foreground font-mono">{counter.formation}</div>
                                <div className="font-display text-base font-bold leading-tight">{counter.play}</div>
                                <div className="text-[11px] text-muted-foreground">Concept: {counter.concept}</div>
                              </div>
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${TIER_STYLE[counter.tier] ?? ""}`}>
                                Tier {counter.tier}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-[12px]">
                              {counter.motion && (
                                <CounterRow label="MOTION" tone="muted">{counter.motion}</CounterRow>
                              )}
                              <CounterRow label="READ" tone="cyan">{counter.read}</CounterRow>
                              {counter.audibles?.map((a) => (
                                <CounterRow key={a} label="AUDIBLE" tone="green">{a}</CounterRow>
                              ))}
                              <CounterRow label="RESULT" tone="gold">{counter.expected}</CounterRow>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer
          className="border-t border-border/20 py-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 flex items-center justify-between">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              DEBUNKED. · Knowledge Engine v2
            </p>
            <button
              onClick={onEnter}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors"
            >
              All Tools →
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TeamCard({ team, onSelect }: { team: TeamDef; onSelect: (t: TeamDef) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative" style={{ isolation: "isolate" }}>
      <div className="card-glow" />
      <button
        onClick={() => onSelect(team)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative z-10 w-full group flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all"
        style={{
          background: hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          borderColor: hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)",
          backdropFilter: "blur(10px)",
          transition: "all 0.2s ease",
        }}
      >
        <div className={`h-2 w-2 shrink-0 rounded-full ${team.colorClass}`} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[12px] font-semibold leading-tight truncate">
            {team.city} {team.team}
          </div>
          <div className="text-[9px] font-mono truncate" style={{ color: "rgba(255,255,255,0.38)" }}>{team.scheme}</div>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-bold"
          style={{ color: hovered ? "#78b4ff" : "rgba(255,255,255,0.35)" }}
        >
          {team.abbr}
        </span>
      </button>
    </div>
  );
}

function FormationCard({ formation, onSelect }: { formation: DefFormation; onSelect: (f: DefFormation) => void }) {
  const [hovered, setHovered] = useState(false);
  const blitzCount = formation.plays.filter((p) => p.isBlitz).length;
  const cats = [...new Set(formation.plays.map((p) => getCoverage(p.coverageId)?.category).filter(Boolean))];

  return (
    <div className="relative" style={{ isolation: "isolate" }}>
      <div className="card-glow" />
      <button
        onClick={() => onSelect(formation)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative z-10 w-full rounded-lg border px-3 py-3 text-left transition-all"
        style={{
          background: hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          borderColor: hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)",
          backdropFilter: "blur(10px)",
          transition: "all 0.2s ease",
        }}
      >
        <div className="font-display text-[13px] font-semibold leading-tight mb-1.5">{formation.name}</div>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {cats.slice(0, 3).map((cat) => (
            <span key={cat} className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${COVERAGE_BADGE[cat!] ?? ""}`}>
              {cat}
            </span>
          ))}
          {blitzCount > 0 && (
            <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-destructive/15 text-destructive border border-destructive/25">
              {blitzCount} blitz
            </span>
          )}
        </div>
        <div className="text-[10px]" style={{ color: hovered ? "#78b4ff" : "rgba(255,255,255,0.38)" }}>
          {formation.plays.length} plays →
        </div>
      </button>
    </div>
  );
}

function CounterRow({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "muted" | "cyan" | "green" | "gold";
  children: React.ReactNode;
}) {
  const labelStyle: Record<string, React.CSSProperties> = {
    muted: { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" },
    cyan:  { background: "rgba(120,180,255,0.15)", color: "#78b4ff" },
    green: { background: "rgba(111,219,168,0.15)", color: "#6fdba8" },
    gold:  { background: "rgba(255,200,74,0.15)", color: "#ffc84a" },
  };
  return (
    <div className="flex gap-2">
      <span
        className="inline-flex shrink-0 h-[18px] items-center justify-center rounded px-1.5 text-[8px] font-bold tracking-wider"
        style={labelStyle[tone]}
      >
        {label}
      </span>
      <span className="text-foreground/85">{children}</span>
    </div>
  );
}
