import { useState } from "react";
import { Home } from "@/pages/Home";
import { FilmHub } from "@/components/FilmHub";
import { ScoutOpponent } from "@/components/ScoutOpponent";
import { AICoach } from "@/components/AICoach";
import { PlayBuilder } from "@/components/PlayBuilder";
import { CoverageLab } from "@/components/CoverageLab";
import { MetaCenter } from "@/components/MetaCenter";
import { IntelCenter } from "@/components/IntelCenter";

type View = "home" | "app";
type Tab = "film" | "scout" | "coach" | "playbuilder" | "coverage" | "meta" | "intel";

const TABS: Array<{ id: Tab; label: string; badge?: string; desc: string; accent: string }> = [
  { id: "film",        label: "Analyze Film",   desc: "Log snaps. Get counters.",           accent: "#78b4ff" },
  { id: "scout",       label: "Scout Opponent", desc: "Build a scouting report.",            accent: "#ffc84a" },
  { id: "intel",       label: "Intel",          desc: "Persistent opponent intelligence.",   accent: "#6fdba8", badge: "DB" },
  { id: "coach",       label: "AI Coach",       desc: "In-game call recommendations.",       accent: "#6fdba8" },
  { id: "playbuilder", label: "Play Builder",   desc: "Design route concepts.",              accent: "#78b4ff", badge: "LAB" },
  { id: "coverage",    label: "Coverage Lab",   desc: "Learn every coverage shell.",         accent: "#e07fff" },
  { id: "meta",        label: "Meta Center",    desc: "What's dominating ranked.",           accent: "#ffc84a" },
];

const HEADER_BG = "rgba(0,0,0,0.82)";
const NAV_BG    = "rgba(0,0,0,0.75)";
const BLUR      = "blur(24px)";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [tab, setTab]   = useState<Tab>("film");

  if (view === "home") {
    return <Home onEnter={() => setView("app")} />;
  }

  const active = TABS.find(t => t.id === tab)!;

  return (
    <div className="min-h-screen text-foreground flex flex-col" style={{ background: "#000" }}>
      <div className="flex flex-col flex-1">
        {/* ── Header ── */}
        <header
          className="sticky top-0 z-50"
          style={{
            background: HEADER_BG,
            backdropFilter: BLUR,
            WebkitBackdropFilter: BLUR,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex h-14 items-center justify-between">
              <button onClick={() => setView("home")} className="flex items-center gap-3">
                <span
                  className="font-display font-black text-white"
                  style={{ fontSize: "1.1rem", letterSpacing: "-0.04em" }}
                >
                  DEBUNKED.
                </span>
                <span className="hidden sm:block font-mono text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                  MADDEN 26
                </span>
              </button>

              <div className="flex items-center gap-2">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "#6fdba8",
                    boxShadow: "0 0 8px rgba(111,219,168,0.9)",
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                />
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Engine Active
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Tab Bar ── */}
        <nav
          className="sticky top-14 z-40"
          style={{
            background: NAV_BG,
            backdropFilter: BLUR,
            WebkitBackdropFilter: BLUR,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex overflow-x-auto scrollbar-hide">
              {TABS.map(t => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="relative shrink-0 flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all whitespace-nowrap"
                    style={{
                      color: isActive ? t.accent : "rgba(255,255,255,0.35)",
                      borderBottom: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
                      textShadow: isActive ? `0 0 18px ${t.accent}88` : "none",
                      transition: "color 0.18s, border-color 0.18s, text-shadow 0.18s",
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
                  >
                    {t.label}
                    {t.badge && (
                      <span
                        className="font-mono text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: `${t.accent}22`,
                          color: t.accent,
                          border: `1px solid ${t.accent}44`,
                        }}
                      >
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* ── Page header ── */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.4)" }}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4">
            <h1
              className="font-display font-black"
              style={{
                fontSize: "1.4rem",
                letterSpacing: "-0.03em",
                color: active.accent,
                textShadow: `0 0 28px ${active.accent}66`,
              }}
            >
              {active.label}
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{active.desc}</p>
          </div>
        </div>

        {/* ── Content ── */}
        <main className="flex-1 relative mx-auto w-full max-w-5xl px-4 sm:px-6 py-8">
          <div
            className="mini-wheel"
            style={{ top: "-60px", right: "-80px" }}
          />
          <div className="relative z-10">
            {tab === "film"        && <FilmHub />}
            {tab === "scout"       && <ScoutOpponent />}
            {tab === "intel"       && <IntelCenter />}
            {tab === "coach"       && <AICoach />}
            {tab === "playbuilder" && <PlayBuilder />}
            {tab === "coverage"    && <CoverageLab />}
            {tab === "meta"        && <MetaCenter />}
          </div>
        </main>

        {/* ── Footer ── */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "1rem 0" }}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <p className="text-center font-mono text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.22)" }}>
              DEBUNKED. · Intelligence Engine v3 · All data stored locally
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
