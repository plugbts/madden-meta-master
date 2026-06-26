import { useState } from "react";
import { META_ENTRIES, type MetaEntry } from "@/lib/madden-data";

const TIER: Record<1 | 2 | 3, { label: string; color: string; bar: string }> = {
  1: { label: "S-TIER", color: "text-destructive border-destructive/40 bg-destructive/10", bar: "bg-destructive" },
  2: { label: "A-TIER", color: "text-shield border-shield/40 bg-shield/10", bar: "bg-shield" },
  3: { label: "B-TIER", color: "text-muted-foreground border-border bg-muted/40", bar: "bg-muted-foreground" },
};

const POP: Record<string, { label: string; color: string }> = {
  dominant: { label: "DOMINANT", color: "text-destructive" },
  popular:  { label: "POPULAR",  color: "text-team-one" },
  emerging: { label: "EMERGING", color: "text-team-two" },
};

function MetaCard({ entry }: { entry: MetaEntry }) {
  const [open, setOpen] = useState(false);
  const tier = TIER[entry.tierRank];
  const pop = POP[entry.popularity];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 hover:bg-muted/20 transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${tier.color}`}>{tier.label}</span>
              <span className={`text-[10px] font-bold tracking-wider ${pop.color}`}>{pop.label}</span>
            </div>
            <p className="font-semibold text-sm leading-tight">{entry.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-lg font-bold font-mono ${entry.usageRate >= 70 ? "text-destructive" : entry.usageRate >= 50 ? "text-accent-1" : "text-team-two"}`}>
              {entry.usageRate}%
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">usage</p>
          </div>
        </div>
        <div className="mt-3 h-1 rounded-full bg-border overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${tier.bar}`} style={{ width: `${entry.usageRate}%` }} />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-border animate-in fade-in-0 duration-200 pt-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Why It's Meta</p>
            <p className="text-sm text-foreground leading-relaxed">{entry.whyMeta}</p>
          </div>
          <div className="rounded-xl border border-team-two/20 bg-team-two/5 p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-team-two mb-1">How to Counter It</p>
            <p className="text-sm text-foreground">{entry.weakness}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function MetaCenter() {
  const [category, setCategory] = useState<"all" | "offense" | "defense">("all");

  const offense = META_ENTRIES.filter(e => e.category === "offense" && (category === "all" || category === "offense"));
  const defense = META_ENTRIES.filter(e => e.category === "defense" && (category === "all" || category === "defense"));

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-accent-1/30 bg-accent-1/5 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-md bg-accent-1/20 px-2 py-1 text-xs font-bold uppercase tracking-wider text-accent-1">
            Madden 26
          </div>
          <div>
            <p className="text-sm font-semibold">Meta Snapshot</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live usage trends from online Ranked. S-tier = dominant, A-tier = popular, B-tier = emerging counter. Click any card to see the counter.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(["all", "offense", "defense"] as const).map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition ${
              category === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {(category === "all" || category === "offense") && offense.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-team-one">Offensive Meta</h2>
              <div className="flex-1 h-px bg-team-one/20" />
            </div>
            {offense.map(e => <MetaCard key={e.id} entry={e} />)}
          </section>
        )}
        {(category === "all" || category === "defense") && defense.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-destructive">Defensive Meta</h2>
              <div className="flex-1 h-px bg-destructive/20" />
            </div>
            {defense.map(e => <MetaCard key={e.id} entry={e} />)}
          </section>
        )}
      </div>
    </div>
  );
}
