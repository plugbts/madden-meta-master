import { useState } from "react";
import { META_ENTRIES, type MetaEntry } from "@/lib/madden-data";

const popularityBadge = {
  dominant: { label: "DOMINANT", color: "bg-destructive/20 text-destructive border border-destructive/30" },
  popular: { label: "POPULAR", color: "bg-team-one/20 text-team-one border border-team-one/30" },
  emerging: { label: "EMERGING", color: "bg-team-two/20 text-team-two border border-team-two/30" },
} as const;

const tierLabel = {
  1: { label: "S-TIER", color: "bg-destructive text-destructive-foreground" },
  2: { label: "A-TIER", color: "bg-shield text-primary-foreground" },
  3: { label: "B-TIER", color: "bg-muted text-muted-foreground" },
} as const;

export function MetaTracker() {
  const [category, setCategory] = useState<"offense" | "defense" | "all">("all");

  const filtered = META_ENTRIES.filter((e) => category === "all" || e.category === category);
  const offense = filtered.filter((e) => e.category === "offense");
  const defense = filtered.filter((e) => e.category === "defense");

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-accent-1/30 bg-accent-1/5 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-md bg-accent-1/20 px-2 py-1 text-xs font-bold uppercase tracking-wider text-accent-1">Madden 26</div>
          <div>
            <p className="text-sm font-semibold">Current Meta Snapshot</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on community-observed usage patterns in online Ranked modes. Updated with each title update.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(["all", "offense", "defense"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${
              category === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {(category === "all" || category === "offense") && offense.length > 0 && (
          <MetaSection title="Offensive Meta" entries={offense} accentColor="team-one" />
        )}
        {(category === "all" || category === "defense") && defense.length > 0 && (
          <MetaSection title="Defensive Meta" entries={defense} accentColor="destructive" />
        )}
      </div>
    </div>
  );
}

function MetaSection({ title, entries, accentColor }: { title: string; entries: MetaEntry[]; accentColor: string }) {
  const textColor = accentColor === "team-one" ? "text-team-one" : "text-destructive";
  const borderColor = accentColor === "team-one" ? "border-team-one/20" : "border-destructive/20";

  const tier1 = entries.filter((e) => e.tierRank === 1);
  const tier2 = entries.filter((e) => e.tierRank === 2);
  const tier3 = entries.filter((e) => e.tierRank === 3);

  return (
    <div>
      <div className={`mb-4 text-xs font-bold uppercase tracking-[0.25em] ${textColor}`}>{title}</div>
      <div className="space-y-3">
        {tier1.length > 0 && <TierRow label="S-Tier" entries={tier1} accentColor={accentColor} />}
        {tier2.length > 0 && <TierRow label="A-Tier" entries={tier2} accentColor={accentColor} />}
        {tier3.length > 0 && <TierRow label="B-Tier" entries={tier3} accentColor={accentColor} />}
      </div>
    </div>
  );
}

function TierRow({ label, entries, accentColor }: { label: string; entries: MetaEntry[]; accentColor: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="w-16 shrink-0 pt-1">
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
          label === "S-Tier" ? "bg-destructive text-destructive-foreground" :
          label === "A-Tier" ? "bg-shield text-primary-foreground" :
          "bg-muted text-muted-foreground"
        }`}>{label}</span>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {entries.map((e) => <MetaCard key={e.id} entry={e} />)}
      </div>
    </div>
  );
}

function MetaCard({ entry }: { entry: MetaEntry }) {
  const [expanded, setExpanded] = useState(false);
  const badge = popularityBadge[entry.popularity];

  return (
    <div
      className={`flex-1 min-w-[260px] rounded-xl border bg-card p-4 transition-all ${
        entry.category === "offense" ? "border-team-one/20 hover:border-team-one/40" : "border-destructive/20 hover:border-destructive/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-display text-base leading-tight">{entry.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground capitalize">{entry.category}</div>
        </div>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${badge.color}`}>{badge.label}</span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Online Usage</span>
          <span className={`text-xs font-bold ${entry.category === "offense" ? "text-team-one" : "text-destructive"}`}>
            {entry.usageRate}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${entry.category === "offense" ? "bg-team-one" : "bg-destructive"}`}
            style={{ width: `${entry.usageRate}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
      >
        {expanded ? "Hide" : "Why Meta + Weakness"} {expanded ? "↑" : "↓"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-team-two">Why It's Meta</div>
            <p className="text-xs text-muted-foreground">{entry.whyMeta}</p>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">Weakness</div>
            <p className="text-xs text-muted-foreground">{entry.weakness}</p>
          </div>
        </div>
      )}
    </div>
  );
}
