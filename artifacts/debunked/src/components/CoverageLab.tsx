import { useState } from "react";
import { COVERAGES, LURK_ALERTS, type Coverage, type CoverageCategory } from "@/lib/madden-data";

const CATEGORY_COLORS: Record<CoverageCategory | "formation", string> = {
  man:       "border-shield/40 bg-shield/10 text-shield",
  zone:      "border-accent-1/40 bg-accent-1/10 text-accent-1",
  blitz:     "border-destructive/40 bg-destructive/10 text-destructive",
  formation: "border-muted/40 bg-muted/20 text-muted-foreground",
};

const SHELL_DIAGRAMS: Record<string, string> = {
  "cover-0":     "○ ○ ○ ○ ○  ← All 5 rush  |  ✗ No safeties",
  "cover-1":     "         ◉         ← 1 deep FS  |  M M M M M ← Man underneath",
  "cover-2":     "   ◉         ◉     ← Split safeties  |  C  C  ← CBs in flats",
  "cover-3":     " ◉     ◉     ◉     ← 3 deep  |  C  LB  LB  C ← Zone underneath",
  "cover-4":     " ◉  ◉     ◉  ◉     ← 4 deep quarters  |  LB zone underneath",
  "tampa-2":     "   ◉    MLB    ◉   ← 2 safeties + MLB goes deep  |  CBs bail to flats",
  "cover-2-man": "   ◉         ◉     ← 2 safeties  |  M M M M M ← Press man under",
  "cover-6":     " ◉         ◉  ◉   ← Cov 2 boundary + Cov 4 field",
};

const FILTERS: Array<{ id: CoverageCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "man", label: "Man" },
  { id: "zone", label: "Zone" },
  { id: "blitz", label: "Blitz" },
];

export function CoverageLab() {
  const [filter, setFilter] = useState<CoverageCategory | "all">("all");
  const [selected, setSelected] = useState<Coverage | null>(null);

  const visible = COVERAGES.filter(c => filter === "all" || c.category === filter);
  const lurk = selected ? LURK_ALERTS.find(l =>
    l.coverage.toLowerCase().includes(selected.name.toLowerCase().split(" ")[0]) ||
    l.id.includes(selected.id.split("-").slice(0, 2).join("-"))
  ) : null;

  const tierColor = { "A+": "text-team-two border-team-two/30 bg-team-two/10", "A": "text-accent-1 border-accent-1/30 bg-accent-1/10", "B+": "text-muted-foreground border-border bg-muted/40" };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-team-one/30 bg-team-one/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-team-one mb-1">Coverage Lab — Educational</p>
        <p className="text-sm text-muted-foreground">
          Learn to read every coverage pre-snap. Select a coverage to see its shell, tells, weaknesses, and the highest-confidence counters from the knowledge base.
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setSelected(null); }}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
              filter === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id === selected?.id ? null : c)}
            className={`text-left rounded-xl border p-4 transition hover:border-foreground/40 ${
              selected?.id === c.id
                ? "border-foreground/60 bg-card"
                : "border-border bg-card/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-sm leading-tight">{c.name}</p>
              {c.popular && <span className="shrink-0 text-[10px] font-bold text-accent-1">★ META</span>}
            </div>
            <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[c.category]}`}>
              {c.category}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{selected.shell}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${CATEGORY_COLORS[selected.category]}`}>
              {selected.category}
            </span>
          </div>

          {SHELL_DIAGRAMS[selected.id] && (
            <div className="rounded-xl bg-muted/30 border border-border p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Shell Diagram</p>
              <p className="font-mono text-sm text-foreground whitespace-pre">{SHELL_DIAGRAMS[selected.id]}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Pre-Snap Tells</p>
              <ul className="space-y-2">
                {selected.tells.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-team-two" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Primary Weakness</p>
              <div className="rounded-xl border border-team-two/20 bg-team-two/5 p-3">
                <p className="text-sm text-foreground">{selected.weakness}</p>
              </div>
            </div>
          </div>

          {lurk && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-destructive">⚠ Lurk Zone — {lurk.lurkPosition}</p>
              <p className="text-sm text-muted-foreground">{lurk.avoidThrow}</p>
              <p className="text-sm font-medium text-foreground">{lurk.beatIt}</p>
              <p className="text-xs text-muted-foreground">Danger zone: {lurk.dangerZone}</p>
            </div>
          )}

          {selected.counters.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Counter Plays — Knowledge Base</p>
              {selected.counters.map((c, i) => (
                <div key={i} className="rounded-xl border border-border bg-background p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{c.formation}</p>
                      <p className="text-xs text-muted-foreground">{c.play} · {c.concept}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${tierColor[c.tier]}`}>{c.tier}</span>
                  </div>
                  {c.motion && (
                    <p className="text-xs text-muted-foreground"><span className="text-foreground">Motion:</span> {c.motion}</p>
                  )}
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Read</p>
                    <p className="text-sm">{c.read}</p>
                  </div>
                  {c.expected && <p className="text-xs text-team-two font-medium">{c.expected}</p>}
                  {c.audibles && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.audibles.map((a, j) => (
                        <span key={j} className="rounded bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
