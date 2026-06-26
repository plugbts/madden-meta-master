import { useState } from "react";
import { NANO_BLITZES, LURK_ALERTS, type NanoBlitz } from "@/lib/madden-data";
import { PlaySimulator, type SimCoverage, type SimPlay } from "./PlaySimulator";

const pressureLabel = {
  "instant": { label: "INSTANT", color: "bg-destructive text-destructive-foreground" },
  "1-2s": { label: "1-2 SEC", color: "bg-blitz/20 text-blitz" },
  "2-3s": { label: "2-3 SEC", color: "bg-accent/20 text-accent-foreground" },
} as const;

const tierColor = {
  S: "bg-team-one text-background",
  "A+": "bg-primary text-primary-foreground",
  A: "bg-shield text-primary-foreground",
} as const;

type SubTab = "blitzes" | "lurk";

export function BlitzLab({ onAddToBot }: { onAddToBot: (label: string, detail: string) => void }) {
  const [subTab, setSubTab] = useState<SubTab>("blitzes");
  const [activeId, setActiveId] = useState(NANO_BLITZES[0].id);
  const [sim, setSim] = useState<{ coverage: SimCoverage; play: SimPlay } | null>(null);
  const active = NANO_BLITZES.find((b) => b.id === activeId) ?? NANO_BLITZES[0];

  function openBlitzSim(blitz: NanoBlitz) {
    // Simulate the COUNTER to this blitz — show how offense beats it
    const counterText = blitz.counters[0] ?? "Hot slants";
    // Parse concept from counter text
    const concept = counterText.toLowerCase().includes("slant") ? "All Slants"
      : counterText.toLowerCase().includes("mesh") ? "Mesh"
      : counterText.toLowerCase().includes("fade") ? "All Fade"
      : counterText.toLowerCase().includes("cross") ? "Drive / Shallow Cross"
      : counterText.toLowerCase().includes("vert") ? "Verticals / 4-Verts"
      : counterText.toLowerCase().includes("curl") ? "Curl / Flat"
      : "All Slants";

    setSim({
      coverage: { name: blitz.name, category: "blitz" },
      play: {
        formation: "Gun Bunch",
        concept,
        read: blitz.counters.join(" > "),
        expected: `Beat ${blitz.name}: ${blitz.counters[0]}`,
        motion: "Motion WR to create rub on the blitzing DB",
      },
    });
  }

  return (
    <>
      {sim && <PlaySimulator coverage={sim.coverage} play={sim.play} onClose={() => setSim(null)} />}

      <div className="space-y-6">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
          <button
            onClick={() => setSubTab("blitzes")}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              subTab === "blitzes" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Nano Blitz Database
          </button>
          <button
            onClick={() => setSubTab("lurk")}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              subTab === "lurk" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lurk Alert System
          </button>
        </div>

        {subTab === "blitzes" && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-2">
              <h3 className="chalk mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Blitz Catalog</h3>
              {NANO_BLITZES.map((b) => {
                const isActive = b.id === activeId;
                const pressure = pressureLabel[b.pressure];
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveId(b.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                      isActive
                        ? "border-destructive bg-destructive/10 shadow-[0_0_24px_-4px_var(--color-destructive)]"
                        : "border-border bg-card hover:border-destructive/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${tierColor[b.tier]}`}>{b.tier}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${pressure.color}`}>{pressure.label}</span>
                    </div>
                    <div className="font-display text-sm leading-tight">{b.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">{b.package}</div>
                  </button>
                );
              })}
            </aside>

            <BlitzCard blitz={active} onAddToBot={onAddToBot} onSimulate={() => openBlitzSim(active)} />
          </div>
        )}

        {subTab === "lurk" && <LurkAlerts />}
      </div>
    </>
  );
}

function BlitzCard({
  blitz,
  onAddToBot,
  onSimulate,
}: {
  blitz: NanoBlitz;
  onAddToBot: (label: string, detail: string) => void;
  onSimulate: () => void;
}) {
  const pressure = pressureLabel[blitz.pressure];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="chalk text-xs uppercase tracking-[0.2em] text-muted-foreground">{blitz.package}</div>
            <h2 className="font-display text-3xl">{blitz.name}</h2>
          </div>
          <div className="flex gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${tierColor[blitz.tier]}`}>Tier {blitz.tier}</span>
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${pressure.color}`}>{pressure.label}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoBlock label="SETUP" color="team-one">{blitz.setup}</InfoBlock>
          <InfoBlock label="PRESSURE PATH" color="destructive">{blitz.pressurePath}</InfoBlock>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pre-Snap Tells</div>
          <div className="flex flex-wrap gap-2">
            {blitz.tells.map((t) => (
              <span key={t} className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-team-two/30 bg-team-two/5 p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-team-two">Counters (Offense)</div>
          <ul className="space-y-2">
            {blitz.counters.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-team-two font-bold">{i + 1}.</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">Vulnerable Against</div>
          <ul className="space-y-2">
            {blitz.vulnerable.map((v, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-destructive">!</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onSimulate}
          className="inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/20 hover:border-primary"
        >
          <span>▶</span> Simulate Counter Play
        </button>
        <button
          onClick={() =>
            onAddToBot(
              `BLITZ: ${blitz.name}`,
              `${blitz.package} — ${blitz.setup} Counter: ${blitz.counters[0]}`,
            )
          }
          className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition hover:brightness-110"
        >
          + Add to Bot
        </button>
      </div>
    </div>
  );
}

function InfoBlock({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  const borderMap: Record<string, string> = {
    "team-one": "border-team-one/30 bg-team-one/5",
    "destructive": "border-destructive/30 bg-destructive/5",
  };
  const labelMap: Record<string, string> = {
    "team-one": "text-team-one",
    "destructive": "text-destructive",
  };
  return (
    <div className={`rounded-lg border p-3 ${borderMap[color] ?? "border-border bg-card"}`}>
      <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${labelMap[color] ?? "text-muted-foreground"}`}>{label}</div>
      <p className="text-sm">{children}</p>
    </div>
  );
}

function LurkAlerts() {
  const [activeId, setActiveId] = useState(LURK_ALERTS[0].id);
  const active = LURK_ALERTS.find((l) => l.id === activeId) ?? LURK_ALERTS[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent-1/30 bg-accent-1/5 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-1 mb-1">What is a Lurk?</div>
        <p className="text-sm text-muted-foreground">
          A lurk is when a human-controlled defender positions himself in your throwing lane rather than rushing the QB.
          Staring down your target = interception. Learn to recognize these setups and exploit the space the lurker vacated.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LURK_ALERTS.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveId(l.id)}
            className={`rounded-xl border p-4 text-left transition-all ${
              l.id === activeId
                ? "border-accent-1/60 bg-accent-1/10 shadow-[0_0_20px_-4px_var(--color-accent-1)]"
                : "border-border bg-card hover:border-accent-1/40"
            }`}
          >
            <div className="font-display text-sm leading-tight">{l.coverage}</div>
            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{l.lurkPosition}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <div className="chalk text-xs uppercase tracking-[0.2em] text-muted-foreground">Coverage</div>
          <h3 className="font-display text-2xl">{active.coverage}</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-accent-1/30 bg-accent-1/5 p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-1">Lurk Position</div>
            <p className="text-sm">{active.lurkPosition}</p>
          </div>
          <div className="rounded-lg border border-accent-1/30 bg-accent-1/5 p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-1">Danger Zone</div>
            <p className="text-sm">{active.dangerZone}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">How to Recognize</div>
          <p className="text-sm">{active.howToRecognize}</p>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">Avoid Throwing</div>
          <p className="text-sm">{active.avoidThrow}</p>
        </div>

        <div className="rounded-lg border border-team-two/30 bg-team-two/5 p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-team-two">How to Beat It</div>
          <p className="text-sm">{active.beatIt}</p>
        </div>
      </div>
    </div>
  );
}
