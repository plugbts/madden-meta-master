import { useMemo, useState } from "react";
import { COVERAGES, type Counter, type Coverage } from "@/lib/madden-data";
import { NFL_TEAMS, getPackages, type TeamDef, type DefPlay, type DefFormation, type DefPackage } from "@/lib/playbook-data";

// ─── helpers ───────────────────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  "A+": "bg-team-one text-background",
  "A":  "bg-shield/80 text-background",
  "B+": "bg-muted text-muted-foreground",
};

const COVERAGE_BADGE: Record<string, string> = {
  blitz:     "bg-destructive/20 text-destructive border border-destructive/30",
  man:       "bg-team-one/15 text-team-one border border-team-one/25",
  zone:      "bg-team-two/15 text-team-two border border-team-two/25",
  formation: "bg-accent-1/15 text-accent-1 border border-accent-1/25",
};

function getCoverage(id: string): Coverage | undefined {
  return COVERAGES.find((c) => c.id === id);
}

// ─── types ─────────────────────────────────────────────────────────────────
type Step = "team" | "formation" | "play";

// ─── main component ────────────────────────────────────────────────────────
export function OffenseLab({ onAddToBot }: { onAddToBot: (label: string, detail: string) => void }) {
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

  const coverage = useMemo(
    () => (play ? getCoverage(play.coverageId) : null),
    [play],
  );
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

  // filtered teams
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

  // group teams by division
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
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
        <button
          onClick={() => goBack("team")}
          className={`transition-colors ${step === "team" ? "text-foreground font-semibold" : "hover:text-foreground"}`}
        >
          Playbook
        </button>
        {team && (
          <>
            <span className="opacity-40">/</span>
            <button
              onClick={() => goBack("formation")}
              className={`transition-colors ${step === "formation" ? "text-foreground font-semibold" : "hover:text-foreground"}`}
            >
              {team.abbr}
            </button>
          </>
        )}
        {formation && (
          <>
            <span className="opacity-40">/</span>
            <button
              onClick={() => setStep("play")}
              className={`transition-colors ${step === "play" ? "text-foreground font-semibold" : "hover:text-foreground"}`}
            >
              {formation.name}
            </button>
          </>
        )}
        {play && (
          <>
            <span className="opacity-40">/</span>
            <span className="text-team-one font-semibold">{play.name}</span>
          </>
        )}
      </nav>

      {/* ── STEP 1: TEAM PICKER ── */}
      {step === "team" && (
        <div key="team" className="animate-[var(--animate-fade-in)] space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono mr-1">Select Defensive Playbook</p>
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
              {(["all", "AFC", "NFC"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setConfFilter(c)}
                  className={`rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition ${
                    confFilter === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
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
              className="h-7 rounded-md border border-border bg-card px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-team-one/60 transition-colors"
            />
          </div>

          <div className="space-y-4">
            {grouped.map(([divKey, teams]) => (
              <div key={divKey}>
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70 font-mono">{divKey}</div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {teams.map((t) => (
                    <TeamCard key={t.abbr} team={t} onSelect={selectTeam} />
                  ))}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No teams found</div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: FORMATION PICKER ── */}
      {step === "formation" && team && (
        <div key={`formation-${team.abbr}`} className="animate-[var(--animate-slide-right)] space-y-3">
          {/* Team header */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded font-display text-[11px] font-bold bg-foreground/8 text-foreground">
              {team.abbr}
            </div>
            <div>
              <div className="font-display text-sm font-semibold leading-tight">{team.city} {team.team}</div>
              <div className="text-[10px] text-muted-foreground">{team.scheme}</div>
            </div>
            <button onClick={() => goBack("team")} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition">← Change</button>
          </div>

          {/* Package tabs */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5 w-fit">
            {packages.map((pkg, i) => (
              <button
                key={pkg.name}
                onClick={() => { setPkgIdx(i); setFormation(null); setPlay(null); }}
                className={`rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                  pkgIdx === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pkg.shortName}
              </button>
            ))}
          </div>

          {/* Formations grid */}
          {packages[pkgIdx] && (
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {packages[pkgIdx].formations.map((f) => (
                <FormationCard key={f.name} formation={f} onSelect={selectFormation} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: PLAY PICKER + COUNTER ── */}
      {step === "play" && formation && team && (
        <div key={`play-${formation.name}`} className="animate-[var(--animate-slide-right)]">
          {/* Formation header */}
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
            <div>
              <div className="font-display text-sm font-semibold">{formation.name}</div>
              <div className="text-[10px] text-muted-foreground">{team.abbr} · {packages[pkgIdx]?.shortName}</div>
            </div>
            <button onClick={() => goBack("formation")} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition">← Back</button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
            {/* Play list */}
            <div className="space-y-1">
              <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground font-mono">Plays</div>
              {formation.plays.map((p) => {
                const cov = getCoverage(p.coverageId);
                const active = play?.name === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => selectPlay(p)}
                    className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-all ${
                      active
                        ? "border-team-one/60 bg-team-one/8 neon-glow"
                        : "border-border bg-card hover:border-foreground/20 hover:bg-card/80"
                    }`}
                  >
                    <div>
                      <div className={`text-[12px] font-semibold leading-tight ${active ? "text-team-one" : ""}`}>{p.name}</div>
                      {cov && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-[160px]">{cov.shell}</div>
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
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
                  ← Select a play to see the counter
                </div>
              )}
              {play && coverage && (
                <div key={play.name} className="animate-[var(--animate-scale-in)] space-y-3">
                  {/* Coverage info */}
                  <div className="rounded-lg border border-border bg-card p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Coverage Detected</div>
                        <div className="font-display text-lg font-bold leading-tight">{coverage.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{coverage.shell}</div>
                      </div>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COVERAGE_BADGE[coverage.category] ?? ""}`}>
                        {coverage.category}
                      </span>
                    </div>

                    {/* Tells */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {coverage.tells.map((t) => (
                        <span key={t} className="rounded border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Weakness */}
                    <div className="rounded-md bg-destructive/8 border border-destructive/20 px-2.5 py-1.5 text-[11px] text-destructive">
                      <span className="font-bold">Exploit: </span>{coverage.weakness}
                    </div>
                  </div>

                  {/* Counter tabs */}
                  <div>
                    <div className="mb-2 text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Best Counters</div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {coverage.counters.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setCounterIdx(i)}
                          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            i === counterIdx
                              ? "border-team-one/60 bg-team-one/10 text-team-one"
                              : "border-border bg-card hover:border-foreground/30"
                          }`}
                        >
                          <span className={`rounded px-1 text-[9px] font-bold ${TIER_COLOR[c.tier] ?? ""}`}>{c.tier}</span>
                          {c.play}
                        </button>
                      ))}
                    </div>

                    {/* Counter detail */}
                    {counter && (
                      <div key={counterIdx} className="animate-[var(--animate-flash-in)] rounded-lg border border-border bg-card p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-[10px] text-muted-foreground font-mono">{counter.formation}</div>
                            <div className="font-display text-base font-bold leading-tight">{counter.play}</div>
                            <div className="text-[11px] text-muted-foreground">Concept: {counter.concept}</div>
                          </div>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${TIER_COLOR[counter.tier] ?? ""}`}>
                            Tier {counter.tier}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[12px]">
                          {counter.motion && (
                            <Row label="MOTION" tone="muted">{counter.motion}</Row>
                          )}
                          <Row label="READ" tone="cyan">{counter.read}</Row>
                          {counter.audibles?.map((a) => (
                            <Row key={a} label="AUDIBLE" tone="green">{a}</Row>
                          ))}
                          <Row label="RESULT" tone="gold">{counter.expected}</Row>
                        </div>

                        <button
                          onClick={() =>
                            onAddToBot(
                              `vs ${coverage.name}`,
                              `${counter.formation} → ${counter.play} (${counter.concept}). ${counter.read}`,
                            )
                          }
                          className="mt-1 w-full rounded-md bg-team-one px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-background transition hover:opacity-90"
                        >
                          + Add to Bot
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── sub-components ────────────────────────────────────────────────────────

function TeamCard({ team, onSelect }: { team: TeamDef; onSelect: (t: TeamDef) => void }) {
  return (
    <button
      onClick={() => onSelect(team)}
      className="group flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left transition-all hover:border-foreground/25 hover:bg-card/80 hover:neon-glow"
    >
      <div className={`h-2 w-2 shrink-0 rounded-full ${team.colorClass}`} />
      <div className="min-w-0">
        <div className="font-display text-[12px] font-semibold leading-tight truncate">{team.city} {team.team}</div>
        <div className="text-[9px] text-muted-foreground font-mono truncate">{team.scheme}</div>
      </div>
      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground font-bold group-hover:text-foreground transition">{team.abbr}</span>
    </button>
  );
}

function FormationCard({ formation, onSelect }: { formation: DefFormation; onSelect: (f: DefFormation) => void }) {
  const blitzCount = formation.plays.filter((p) => p.isBlitz).length;
  const cats = [...new Set(formation.plays.map((p) => getCoverage(p.coverageId)?.category).filter(Boolean))];

  return (
    <button
      onClick={() => onSelect(formation)}
      className="group rounded-md border border-border bg-card px-3 py-2.5 text-left transition-all hover:border-foreground/25 hover:neon-glow"
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
      <div className="text-[10px] text-muted-foreground">{formation.plays.length} plays →</div>
    </button>
  );
}

function Row({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "muted" | "cyan" | "green" | "gold";
  children: React.ReactNode;
}) {
  const labelMap = {
    muted: "bg-muted/60 text-muted-foreground",
    cyan:  "bg-team-one/15 text-team-one",
    green: "bg-team-two/15 text-team-two",
    gold:  "bg-accent-1/15 text-accent-1",
  };
  return (
    <div className="flex gap-2">
      <span className={`inline-flex shrink-0 h-[18px] items-center justify-center rounded px-1.5 text-[8px] font-bold tracking-wider ${labelMap[tone]}`}>
        {label}
      </span>
      <span className="text-foreground/85">{children}</span>
    </div>
  );
}
