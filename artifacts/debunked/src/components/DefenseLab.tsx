import { useMemo, useState } from "react";
import { OFFENSES } from "@/lib/madden-data";
import { FieldDiagram } from "./FieldDiagram";

const tierColor = {
  "A+": "bg-primary text-primary-foreground",
  A: "bg-shield text-primary-foreground",
  "B+": "bg-accent text-accent-foreground",
} as const;

export function DefenseLab({ onAddToBot }: { onAddToBot: (label: string, detail: string) => void }) {
  const [offId, setOffId] = useState(OFFENSES[0].id);
  const off = useMemo(() => OFFENSES.find((o) => o.id === offId)!, [offId]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const adj = off.adjustments[activeIdx] ?? off.adjustments[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-2">
        <h3 className="chalk mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Read the Offense</h3>
        {OFFENSES.map((o) => {
          const active = o.id === offId;
          return (
            <button
              key={o.id}
              onClick={() => {
                setOffId(o.id);
                setActiveIdx(0);
                setShowAnalysis(false);
              }}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                active
                  ? "border-destructive bg-destructive/10 shadow-[0_0_24px_-4px_var(--color-destructive)]"
                  : "border-border bg-card hover:border-destructive/50"
              }`}
            >
              <div className="font-display text-lg leading-tight">{o.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{o.family}</div>
            </button>
          );
        })}
      </aside>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="chalk text-xs uppercase tracking-[0.2em] text-muted-foreground">Offense Detected</div>
              <h2 className="font-display text-3xl">{off.name}</h2>
            </div>
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                showAnalysis ? "border-team-one bg-team-one/10 text-team-one" : "border-border text-muted-foreground hover:border-team-one/50"
              }`}
            >
              {showAnalysis ? "Hide Analysis" : "Formation Analysis"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {off.threats.map((t) => (
              <span key={t} className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                {t}
              </span>
            ))}
          </div>

          {showAnalysis && (
            <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-team-two">Offensive Strengths</div>
                <ul className="space-y-1">
                  {off.strengths.map((s) => (
                    <li key={s} className="flex gap-2 text-xs">
                      <span className="mt-0.5 text-team-two">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">Offensive Weaknesses</div>
                <ul className="space-y-1">
                  {off.weaknesses.map((w) => (
                    <li key={w} className="flex gap-2 text-xs">
                      <span className="mt-0.5 text-destructive">-</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {off.adjustments.map((a, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                i === activeIdx
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-border bg-card hover:border-destructive/60"
              }`}
            >
              <span className={`mr-2 inline-block rounded px-1.5 text-[10px] ${tierColor[a.tier]}`}>{a.tier}</span>
              {a.defense}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="chalk text-xs uppercase tracking-[0.2em] text-muted-foreground">{adj.defense}</div>
                <h3 className="font-display text-2xl">{adj.coverage}</h3>
                {adj.blitz && (
                  <div className="mt-1 inline-block rounded bg-blitz/15 px-2 py-0.5 text-xs font-bold uppercase text-blitz">
                    Blitz · {adj.blitz}
                  </div>
                )}
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${tierColor[adj.tier]}`}>Tier {adj.tier}</span>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              {adj.shifts.map((s) => (
                <li key={s} className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{s}</span>
                </li>
              ))}
              {adj.hotRoute && (
                <li className="flex gap-3 pt-2">
                  <span className="inline-flex h-5 min-w-[64px] items-center justify-center rounded bg-accent/15 px-1.5 text-[10px] font-bold tracking-wider text-accent">
                    HOT
                  </span>
                  <span>{adj.hotRoute}</span>
                </li>
              )}
            </ul>

            <p className="mt-4 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Why it works · </span>
              {adj.why}
            </p>

            <button
              onClick={() =>
                onAddToBot(
                  `DEFENSE vs ${off.name}`,
                  `${adj.defense} → ${adj.coverage}${adj.blitz ? ` + ${adj.blitz}` : ""}. ${adj.shifts.join("; ")}`,
                )
              }
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition hover:brightness-110"
            >
              + Add to Unstoppable Bot
            </button>
          </div>

          <FieldDiagram concept={adj.coverage} side="DEF" />
        </div>
      </div>
    </div>
  );
}
