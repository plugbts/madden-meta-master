import { useState } from "react";
import { SITUATIONAL_PLAYS, type SituationalZone, type SituationalPlay } from "@/lib/madden-data";

const tierColor = {
  "A+": "bg-primary text-primary-foreground",
  A: "bg-shield text-primary-foreground",
  "B+": "bg-accent text-accent-foreground",
} as const;

const ZONES: { id: SituationalZone; label: string; desc: string; color: string }[] = [
  { id: "redzone", label: "Red Zone", desc: "Inside the 20 — where TDs are made or lost", color: "destructive" },
  { id: "goalline", label: "Goal Line", desc: "1-5 yards from the end zone — pure execution", color: "blitz" },
  { id: "4thdown", label: "4th Down", desc: "Conversions, desperation shots, and going for it", color: "team-one" },
];

const zoneStyles: Record<SituationalZone, { border: string; bg: string; text: string; activeBorder: string; activeBg: string }> = {
  redzone: {
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    text: "text-destructive",
    activeBorder: "border-destructive",
    activeBg: "bg-destructive/10",
  },
  goalline: {
    border: "border-blitz/30",
    bg: "bg-blitz/5",
    text: "text-blitz",
    activeBorder: "border-blitz",
    activeBg: "bg-blitz/10",
  },
  "4thdown": {
    border: "border-team-one/30",
    bg: "bg-team-one/5",
    text: "text-team-one",
    activeBorder: "border-team-one",
    activeBg: "bg-team-one/10",
  },
};

export function SituationalLab({ onAddToBot }: { onAddToBot: (label: string, detail: string) => void }) {
  const [zone, setZone] = useState<SituationalZone>("redzone");
  const [activeId, setActiveId] = useState(SITUATIONAL_PLAYS.filter((p) => p.zone === "redzone")[0]?.id ?? "");

  const plays = SITUATIONAL_PLAYS.filter((p) => p.zone === zone);
  const active = plays.find((p) => p.id === activeId) ?? plays[0];
  const styles = zoneStyles[zone];

  function selectZone(z: SituationalZone) {
    setZone(z);
    const first = SITUATIONAL_PLAYS.find((p) => p.zone === z);
    if (first) setActiveId(first.id);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {ZONES.map((z) => {
          const s = zoneStyles[z.id];
          const isActive = zone === z.id;
          return (
            <button
              key={z.id}
              onClick={() => selectZone(z.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isActive ? `${s.activeBorder} ${s.activeBg}` : `border-border bg-card hover:${s.border}`
              }`}
            >
              <div className={`text-xs font-bold uppercase tracking-[0.2em] ${s.text}`}>{z.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{z.desc}</div>
              <div className={`mt-2 text-xs font-semibold ${s.text}`}>{plays.length > 0 || zone !== z.id ? SITUATIONAL_PLAYS.filter((p) => p.zone === z.id).length : 0} plays</div>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-1.5">
            <h3 className="chalk mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {ZONES.find((z) => z.id === zone)?.label} Plays
            </h3>
            {plays.map((p) => {
              const isActive = p.id === (active?.id ?? "");
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                    isActive
                      ? `${styles.activeBorder} ${styles.activeBg}`
                      : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-sm leading-tight">{p.name}</div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold ${tierColor[p.tier]}`}>{p.tier}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">{p.formation}</div>
                  {p.distance && (
                    <div className={`mt-1 text-[10px] font-semibold ${styles.text}`}>{p.distance}</div>
                  )}
                </button>
              );
            })}
          </aside>

          <PlayCard play={active} onAddToBot={onAddToBot} zone={zone} />
        </div>
      )}
    </div>
  );
}

function PlayCard({ play, onAddToBot, zone }: { play: SituationalPlay; onAddToBot: (label: string, detail: string) => void; zone: SituationalZone }) {
  const styles = zoneStyles[zone];
  const zoneLabel = ZONES.find((z) => z.id === zone)?.label ?? "";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${styles.text}`}>{zoneLabel}</div>
            <h2 className="font-display text-3xl">{play.name}</h2>
            <div className="text-sm text-muted-foreground">{play.formation} · {play.play}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${tierColor[play.tier]}`}>Tier {play.tier}</span>
            {play.distance && (
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${styles.border} ${styles.text}`}>{play.distance}</span>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-md border border-border/60 bg-background/40 px-3 py-2">
          <span className="text-xs text-muted-foreground">Concept · </span>
          <span className="text-sm font-semibold">{play.concept}</span>
        </div>

        <ul className="mt-4 space-y-3 text-sm">
          {play.motion && (
            <li className="flex gap-3">
              <Tag>MOTION</Tag>
              <span>{play.motion}</span>
            </li>
          )}
          <li className="flex gap-3">
            <Tag tone="primary">READ</Tag>
            <span>{play.read}</span>
          </li>
          <li className="flex gap-3">
            <Tag tone="shield">RESULT</Tag>
            <span>{play.expected}</span>
          </li>
          {play.coverageToAvoid && (
            <li className="flex gap-3">
              <Tag tone="destructive">AVOID</Tag>
              <span>{play.coverageToAvoid}</span>
            </li>
          )}
        </ul>

        <button
          onClick={() =>
            onAddToBot(
              `${zoneLabel.toUpperCase()}: ${play.name}`,
              `${play.formation} → ${play.play} (${play.concept}). Read: ${play.read}`,
            )
          }
          className={`mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition hover:brightness-110 ${
            zone === "redzone" || zone === "goalline"
              ? "bg-destructive text-destructive-foreground"
              : "bg-team-one text-background"
          }`}
        >
          + Add to Unstoppable Bot
        </button>
      </div>
    </div>
  );
}

function Tag({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "accent" | "shield" | "destructive";
}) {
  const map = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/15 text-accent",
    shield: "bg-shield/15 text-shield",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`inline-flex h-5 min-w-[64px] items-center justify-center rounded px-1.5 text-[10px] font-bold tracking-wider ${map[tone]}`}>
      {children}
    </span>
  );
}
