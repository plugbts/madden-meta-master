import { useState } from "react";
import { PlayCard } from "@/components/PlayCard";
import type { Counter } from "@/lib/madden-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type Coverage =
  | "Cover 0" | "Cover 1 Robber" | "Cover 1 Press" | "Cover 2 Zone" | "Cover 2 Tampa"
  | "Cover 2 Man Under" | "Cover 3 Sky" | "Cover 3 Buzz" | "Cover 3 Cloud"
  | "Cover 4 Quarters" | "Cover 4 Palms" | "Cover 6" | "Man Free" | "Unknown";

type UserBehavior =
  | "Follows crossers" | "Overplays middle" | "Abandons flats" | "Bites on play action"
  | "Click-on tendency" | "Chases ball carrier" | "Brackets #1 WR" | "Doesn't rotate" | "None detected";

type BlitzType =
  | "No blitz" | "A-gap pressure" | "Edge blitz" | "Zero blitz" | "DB blitz" | "Mugged linebackers";

type Recommendation = {
  concept: string;
  confidence: number;
  reasoning: string;
  formation: string;
  keys: string[];
  tags: string[];
};

// ─── Recommendation Engine ────────────────────────────────────────────────────

const COVERAGE_COUNTERS: Record<string, Recommendation[]> = {
  "Cover 0": [
    { concept: "Hot Routes / Quick Slants", confidence: 96, formation: "Gun Spread / 5-Wide", reasoning: "Zero coverage means no safety help — every WR is 1-on-1. Throw it before the rush arrives. Slants and fades off the line win immediately.", keys: ["Snap count to beat rush", "Quick release", "Slant vs inside shade"], tags: ["high-urgency", "quick-game"] },
    { concept: "Fade to Best Matchup", confidence: 91, formation: "Gun Bunch / Gun Trips TE", reasoning: "Press-man coverage with no help. Fade away from the corner's leverage. The receiver just needs to win at the top.", keys: ["Identify softest corner", "Back shoulder if needed", "Lob early"], tags: ["1-on-1", "fade"] },
    { concept: "Drag / Mesh Cross", confidence: 88, formation: "Gun Empty", reasoning: "Two crossers create natural rubs. Against zero, the CB follows his man and gets picked. Short and instant.", keys: ["Two WRs crossing", "Natural rub underneath", "Throw on the break"], tags: ["rub", "quick-game"] },
  ],
  "Cover 1 Robber": [
    { concept: "Flood / Sail Concept", confidence: 90, formation: "Gun Bunch / Pistol Bunch", reasoning: "Robber covers the middle. Flood the flat with deep sail + flat combo. The flat is often uncovered once the robber drops to the middle.", keys: ["Attack the flat", "Outside deep ball away from robber", "Motion to stress coverage"], tags: ["flood", "zone-beater"] },
    { concept: "Post + Wheel", confidence: 87, formation: "Singleback Ace / Gun Trips", reasoning: "Post pulls the single safety deep. The wheel from the backfield comes open underneath. Robber can't cover both.", keys: ["QB pump fake to post", "RB wheel out of backfield", "High-low on safety"], tags: ["high-low", "wheel"] },
    { concept: "Back Shoulder Fade", confidence: 84, formation: "Gun Spread", reasoning: "CB is in man with no over-top help. Elite WR wins with a back shoulder on a fade route — safety stays in robber zone.", keys: ["Trust your WR", "Throw back shoulder", "High point the ball"], tags: ["1-on-1", "fade"] },
  ],
  "Cover 1 Press": [
    { concept: "Slant / Go (Pick Play)", confidence: 93, formation: "Gun Bunch", reasoning: "Press-man creates tight spacing — use it against them. Slant-go combo creates natural interference. Stack WRs to generate rubs pre-snap.", keys: ["Identify rub opportunity", "Slant first, look for go behind", "Snap on first sound"], tags: ["rub", "press-counter"] },
    { concept: "Drag + Seam (Mesh)", confidence: 90, formation: "Gun Empty", reasoning: "Mesh concept destroys press-man. Crossing routes create natural picks. The first crosser opens the second.", keys: ["Drag beneath the seam", "Release both WRs inside", "Throw on crossing point"], tags: ["mesh", "man-beater"] },
    { concept: "Streak All Day", confidence: 82, formation: "5-Wide / Gun Empty", reasoning: "If your WR can beat press off the line, streak wins immediately. Go-routes force CBs to turn and run.", keys: ["Beat the jam at the line", "Press release technique", "Look it in from 15+ yards"], tags: ["vertical", "1-on-1"] },
  ],
  "Cover 2 Zone": [
    { concept: "Smash / Corner-Hitch", confidence: 94, formation: "Gun Trips TE / Singleback Ace", reasoning: "Cover 2 corners squat on short routes. The corner route goes over their head into the deep half. Corner-route sits behind the flat and in front of the safety.", keys: ["Corner over squat CB", "Hitch holds CB", "Read corner depth"], tags: ["smash", "zone-beater"] },
    { concept: "Flood (3-Level)", confidence: 91, formation: "Gun Bunch / Pistol Bunch", reasoning: "Three receivers on one side at three different depths stress Cover 2. Deep, intermediate, and flat create an impossible read for the curl-flat defender.", keys: ["Deep ball takes safety", "Sit in hole behind CB", "Flat for checkdown"], tags: ["flood", "zone-beater"] },
    { concept: "Seam Routes", confidence: 88, formation: "Singleback Ace / I-Form Pro", reasoning: "Seams split Cover 2 safeties. Attack the middle between safeties or attack the corner-safety seam on the numbers.", keys: ["TE seam between safeties", "High-point between defenders", "Look for safety over-rotation"], tags: ["seam", "zone-beater"] },
  ],
  "Cover 2 Tampa": [
    { concept: "Deep Corner (Outside Sail)", confidence: 92, formation: "Gun Spread / Gun Empty", reasoning: "Tampa carries the flat receiver to the curl/flat, leaving the corner route wide open between the safety and the OLB. The corner is the golden route.", keys: ["Outside sail over OLB", "Force safety to choose", "Attack both sides simultaneously"], tags: ["sail", "zone-beater"] },
    { concept: "TE Seam / Cross", confidence: 87, formation: "Singleback Ace / I-Form Pro", reasoning: "Tampa can't cover the middle seam with the OLBs locked to receivers. TE crosses find the void between linebacker zones.", keys: ["Attack middle of field", "TE seam vs Tampa drops", "Short crosser underneath"], tags: ["seam", "cross"] },
  ],
  "Cover 3 Sky": [
    { concept: "Flood / Sail Concept", confidence: 95, formation: "Gun Bunch / Pistol Bunch", reasoning: "Cover 3 Sky keeps the SS flat — flood his zone with deep sail + underneath flat. 3 receivers vs 2 defenders on one side. The math wins.", keys: ["Deep sail behind SS flat zone", "Flat route to the boundary side", "High-low read"], tags: ["flood", "zone-beater"] },
    { concept: "Dagger (Post + Dig)", confidence: 91, formation: "Gun Spread / Singleback", reasoning: "Post pulls the corner deep, dig clears behind. Dagger hits the void behind zone drops at 12-15 yards.", keys: ["Post clears corner and safety", "Dig into the vacated zone", "Settle in the hole"], tags: ["dagger", "zone-beater"] },
    { concept: "Wheel Route (RB)", confidence: 88, formation: "Gun Trips TE / I-Form", reasoning: "Corner drops into deep third. Wheel from the flat catches the corner between zones — too deep for the LB, too far for the corner.", keys: ["RB releases to flat first", "Wheel up the sideline", "Corner stuck between zones"], tags: ["wheel", "zone-beater"] },
  ],
  "Cover 3 Buzz": [
    { concept: "Post Route / 4-Verts", confidence: 90, formation: "Gun Empty / 5-Wide", reasoning: "Buzz brings a safety into the box. The post attacks the vacated safety deep. 4-verts overloads 3 deep defenders.", keys: ["Post over vacated safety", "Vertical to boundary", "RB to flat as checkdown"], tags: ["vertical", "post"] },
    { concept: "Corner Route", confidence: 88, formation: "Gun Bunch / Gun Trips", reasoning: "Corner route settles behind the curl defender and in front of the corner — the sweet spot in Buzz zones.", keys: ["Attack the corner-safety gap", "Corner route at 15 yards", "Pump to hold safety"], tags: ["corner", "zone-beater"] },
  ],
  "Cover 3 Cloud": [
    { concept: "Smash / Corner", confidence: 93, formation: "Gun Trips TE / Singleback Ace", reasoning: "Cloud CBs squat. Corner route attacks the vacated deep third. Cloud side is vulnerable over the top.", keys: ["Attack cloud side corner", "Hitch holds the CB", "Corner wins at 15+"], tags: ["smash", "zone-beater"] },
    { concept: "Curl / Flat Combo", confidence: 87, formation: "Gun Spread", reasoning: "Cloud CB can't play both curl and flat. Curl pulls CB inside, flat is open outside.", keys: ["Curl holds CB in zones", "Flat immediately open", "Hit the flat quickly"], tags: ["curl-flat", "zone-beater"] },
  ],
  "Cover 4 Quarters": [
    { concept: "Mesh / Drive Crossers", confidence: 92, formation: "Gun Empty / Gun Spread", reasoning: "Cover 4 safeties play deep halves. Short and intermediate crossers destroy it underneath. Mesh finds the void between CBs and linebackers.", keys: ["Shallow crossers vs soft zones", "Drive route at 10-12 yards", "Attack between zones"], tags: ["mesh", "cross"] },
    { concept: "Run Game + Play Action", confidence: 90, formation: "I-Form / Singleback", reasoning: "Quarters can be vulnerable to the run. Establish run → play action pulls linebackers and exposes seams.", keys: ["Run 3-4 times first", "PA to TE seam", "Linebackers bite on PA"], tags: ["play-action", "run-setup"] },
    { concept: "4-Verts (Overload Quarters)", confidence: 86, formation: "Gun Empty / Shotgun 5-Wide", reasoning: "4-verts overloads Quarters at the safety level. Seams attack the #2 receiver coverage assignment.", keys: ["Seam vs safety assignment", "Force a decision", "Number your targets 1-4"], tags: ["vertical", "4-verts"] },
  ],
  "Cover 4 Palms": [
    { concept: "Seam + Post Combo", confidence: 91, formation: "Gun Trips TE / Gun Spread", reasoning: "Palms rotates safeties differently than Quarters. Post attacks the vacated safety. Seam finds the window.", keys: ["Identify safety rotation", "Post to open half", "High ball over CB"], tags: ["post", "seam"] },
    { concept: "Quick Outs / Flat Game", confidence: 87, formation: "Singleback / I-Form", reasoning: "Palms can leave CBs in tough off-man positions. Quick outs and flats attack before they can recover.", keys: ["Quick out route", "Release inside first", "Throw to the flat fast"], tags: ["flat", "quick-game"] },
  ],
  "Cover 6": [
    { concept: "Attack the Quarters Side", confidence: 89, formation: "Gun Trips (to quarters side)", reasoning: "Cover 6 is Cover 4 to one side and Cover 2 to the other. Flood the Cover 4 side with trips and run the 4-verts concept.", keys: ["Identify the 4 and 2 sides", "Trips to quarters side", "Smash to Cover 2 side"], tags: ["zone-beater", "split-field"] },
    { concept: "Smash to the 2 Side", confidence: 87, formation: "Singleback Ace", reasoning: "The Cover 2 side of Cover 6 is susceptible to the corner-hitch smash concept exactly like standard Cover 2.", keys: ["Corner route to 2 side", "Hitch holds the CB", "Attack the deep half gap"], tags: ["smash", "zone-beater"] },
  ],
  "Man Free": [
    { concept: "Rub / Stack Routes", confidence: 93, formation: "Gun Bunch / Pistol Bunch", reasoning: "Man Free has a single deep safety. Stack your receivers to create natural rubs. The inside man picks off the CB on the outside man.", keys: ["Stack inside-out", "Release inside man across CB's path", "Hit outside man on break"], tags: ["rub", "man-beater"] },
    { concept: "Mesh Concept", confidence: 90, formation: "Gun Empty", reasoning: "Mesh is the universal man-beater. Two crossers create contact — DBs get stuck in traffic.", keys: ["Time the crossing point", "Throw to first open", "Motion to stress coverage pre-snap"], tags: ["mesh", "man-beater"] },
  ],
  "Unknown": [
    { concept: "Flood Concept", confidence: 75, formation: "Gun Bunch", reasoning: "Flood works against both zone and man. Against zone it stresses the flat defender, against man it creates pick potential.", keys: ["Read deep first", "Curl in the middle", "Flat as checkdown"], tags: ["zone-beater", "man-beater"] },
    { concept: "Quick Slants (Both Sides)", confidence: 72, formation: "Gun Spread", reasoning: "Slants work vs press-man and some zones. Safe universal concept when coverage is unclear.", keys: ["Read coverage at the snap", "Quick release", "Hot route ready"], tags: ["quick-game"] },
  ],
};

const USER_BEHAVIOR_COUNTERS: Record<string, Recommendation[]> = {
  "Follows crossers": [
    { concept: "Post Behind the Cross", confidence: 94, reasoning: "User follows the crosser, vacating the post window. Drop the post in behind where the user was.", keys: ["Crosser as the decoy", "Post into vacated area", "QB eyes on crosser, throw post"], formation: "Gun Trips / Singleback", tags: ["user-exploit"] },
    { concept: "Corner Route Away", confidence: 90, reasoning: "User chases the cross to the middle — run a corner route to the opposite side where there's no user help.", keys: ["Run concept away from user", "Corner beats deep third", "Attack opposite hash"], formation: "Gun Spread", tags: ["user-exploit"] },
  ],
  "Overplays middle": [
    { concept: "Flood / Flat Attack", confidence: 96, reasoning: "If the user sits in the middle of the field, the outside is completely open. Flood the flat with speed.", keys: ["Three level flood outside", "HB flat as release valve", "Attack away from user"], formation: "Gun Bunch / Pistol Bunch", tags: ["user-exploit"] },
    { concept: "Corner + Flat Combo", confidence: 92, reasoning: "Corner route goes over the CB while the flat route goes underneath. User is stuck in the middle — neither throws threatened.", keys: ["Corner over soft CB", "Flat immediately open", "Don't look user off — throw away"], formation: "Singleback Ace", tags: ["user-exploit"] },
  ],
  "Abandons flats": [
    { concept: "RB Angle / Wheel", confidence: 97, reasoning: "If the user abandons the flat, the RB wheel or angle route is wide open every time. This is your primary read.", keys: ["Release RB to flat immediately", "Wheel if user bites inside", "Should be open instantly"], formation: "Gun Trips TE / I-Form", tags: ["user-exploit", "rb-route"] },
    { concept: "Curl / Flat", confidence: 93, reasoning: "Curl keeps the CB occupied. Flat is wide open the moment the user abandons it.", keys: ["Curl holds corner", "Flat on same side as user", "Quick throw to flat"], formation: "Gun Spread", tags: ["user-exploit", "curl-flat"] },
  ],
  "Bites on play action": [
    { concept: "PA Deep Shot", confidence: 95, reasoning: "If the user bites on play action, the deep ball is almost always open. Run PA and hit the seam or corner.", keys: ["Sell the run fake", "TE seam or post over biting LB", "Deep ball behind aggressive safety"], formation: "I-Form / Strong I", tags: ["play-action", "user-exploit"] },
    { concept: "PA Boot Away", confidence: 91, reasoning: "PA boot to the opposite side from the user's pursuit. QB rolls out — user is on the wrong side of the field.", keys: ["Boot away from user", "TE dragging underneath", "QB can run if receiver is covered"], formation: "I-Form / Singleback", tags: ["play-action", "user-exploit"] },
  ],
  "Click-on tendency": [
    { concept: "Pump + Double Move", confidence: 93, reasoning: "User will click on the first pump fake. After the click, the receiver breaks free for the real route.", keys: ["Pump at 10 yards", "Watch user leave feet", "Throw over the top immediately"], formation: "Gun Spread / Gun Empty", tags: ["user-exploit", "double-move"] },
    { concept: "Scramble Drill", confidence: 87, reasoning: "If user clicks toward the ball, QB scramble stresses the secondary. Break contain and attack the open seam.", keys: ["Hold the ball to draw user", "Scramble when user commits", "Receivers run scramble routes"], formation: "Any", tags: ["user-exploit", "mobility"] },
  ],
  "Chases ball carrier": [
    { concept: "Screen + Cut-Back", confidence: 90, reasoning: "User always chases the initial ball carrier. Screen to the opposite side and cut back against user pursuit.", keys: ["Screen away from user", "Let blockers set up", "Cut back when user over-runs"], formation: "Singleback / I-Form", tags: ["user-exploit", "screen"] },
  ],
  "Brackets #1 WR": [
    { concept: "Attack #2 and #3", confidence: 92, reasoning: "If the user brackets your best receiver, the other WRs are in single coverage. Attack the isolated receivers.", keys: ["Identify the bracketed WR", "Target #2 in the seam", "#3 on the backside curl"], formation: "Gun Trips TE", tags: ["user-exploit"] },
    { concept: "Run Into the Double Coverage Gap", confidence: 85, reasoning: "Two defenders on one receiver creates gap somewhere else. Find the void left by the bracket assignment.", keys: ["Two on one = one somewhere else", "Hit the open man quickly", "Don't force to bracketed WR"], formation: "Any", tags: ["user-exploit"] },
  ],
  "Doesn't rotate": [
    { concept: "Post / Seam Over Top", confidence: 91, reasoning: "If the user doesn't rotate with motion or formation shifts, the deep post or seam is wide open pre-snap.", keys: ["Motion to get a tell", "If no rotation, post is open", "Throw pre-snap read"], formation: "Gun Spread", tags: ["user-exploit", "motion"] },
  ],
  "None detected": [],
};

const BLITZ_COUNTERS: Recommendation[] = [
  { concept: "Hot Routes (Slant / Flat)", confidence: 97, formation: "Any Formation", reasoning: "Blitz leaves the back end in 1-on-1 or man coverage with no time. Hot route the closest receiver to the blitz gap and throw immediately.", keys: ["ID blitz pre-snap", "Hot route toward blitz", "Snap and throw immediately"], tags: ["blitz-beater", "high-urgency"] },
  { concept: "Bubble Screen to the Blitz Side", confidence: 91, formation: "Gun Spread / Gun Trips", reasoning: "Bubble screen to the side the blitz is coming from. The WR blocks the corner — suddenly you have numbers outside.", keys: ["Outside WR blocks CB", "Quick toss to bubble", "Get outside leverage"], tags: ["blitz-beater", "screen"] },
  { concept: "Screen Pass (Behind LOS)", confidence: 89, formation: "I-Form / Singleback", reasoning: "Let the blitz come to you. RB/TE screen behind the line — the blitzers run past the play and become blockers.", keys: ["Release RB into space", "OL pull to block", "Get up field quickly"], tags: ["blitz-beater", "screen"] },
];

// ─── Confidence Meter ─────────────────────────────────────────────────────────

function ConfidenceMeter({ value }: { value: number }) {
  const color =
    value >= 90 ? "#34d399" :
    value >= 80 ? "#fbbf24" :
    value >= 70 ? "#fb923c" : "#f87171";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-border/60 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-sm font-bold tabular-nums w-10 shrink-0" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────────────────

function RecCard({ rec, rank, coverageName, coverageCategory }: { rec: Recommendation; rank: number; coverageName: string; coverageCategory: "man" | "zone" | "blitz" | "formation" }) {
  const [expanded, setExpanded] = useState(false);

  const syntheticCounter: Counter = {
    formation: rec.formation,
    play: rec.concept,
    concept: rec.concept,
    read: rec.keys.join(" > "),
    expected: rec.reasoning,
    tier: rec.confidence >= 90 ? "A+" : rec.confidence >= 80 ? "A" : "B+",
  };

  const rankColor =
    rank === 1 ? "#fbbf24" :
    rank === 2 ? "#9ca3af" :
    rank === 3 ? "#fb923c" : "#4b5563";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-4 hover:bg-foreground/3 transition-all"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-black mt-0.5"
            style={{ backgroundColor: `${rankColor}22`, color: rankColor, border: `1.5px solid ${rankColor}55` }}
          >
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm font-bold">{rec.concept}</div>
            <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{rec.formation}</div>
            <div className="mt-2">
              <ConfidenceMeter value={rec.confidence} />
            </div>
          </div>
          <div className="shrink-0 text-muted-foreground text-sm mt-1">
            {expanded ? "▲" : "▼"}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          <p className="text-xs text-foreground/80 leading-relaxed">{rec.reasoning}</p>
          <PlayCard
            counter={syntheticCounter}
            coverageName={coverageName}
            coverageCategory={coverageCategory}
          />
          <div className="flex flex-wrap gap-1.5">
            {rec.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CounterEngine() {
  const [coverage,    setCoverage]    = useState<Coverage>("Cover 3 Sky");
  const [userBehav,   setUserBehav]   = useState<UserBehavior>("None detected");
  const [blitzType,   setBlitzType]   = useState<BlitzType>("No blitz");
  const [generated,   setGenerated]   = useState(false);

  const COVERAGES: Coverage[] = [
    "Cover 0", "Cover 1 Robber", "Cover 1 Press", "Cover 2 Zone", "Cover 2 Tampa",
    "Cover 2 Man Under", "Cover 3 Sky", "Cover 3 Buzz", "Cover 3 Cloud",
    "Cover 4 Quarters", "Cover 4 Palms", "Cover 6", "Man Free", "Unknown",
  ];

  const USER_BEHAVIORS: UserBehavior[] = [
    "None detected", "Follows crossers", "Overplays middle", "Abandons flats",
    "Bites on play action", "Click-on tendency", "Chases ball carrier",
    "Brackets #1 WR", "Doesn't rotate",
  ];

  const BLITZ_TYPES: BlitzType[] = [
    "No blitz", "A-gap pressure", "Edge blitz", "Zero blitz", "DB blitz", "Mugged linebackers",
  ];

  // Build recommendations
  function buildRecommendations(): Recommendation[] {
    const recs: Recommendation[] = [];

    // Coverage-based counters
    const covKey = coverage in COVERAGE_COUNTERS ? coverage : "Unknown";
    const covRecs = COVERAGE_COUNTERS[covKey] ?? [];
    recs.push(...covRecs);

    // User behavior counters
    if (userBehav !== "None detected") {
      const ubRecs = USER_BEHAVIOR_COUNTERS[userBehav] ?? [];
      // Boost confidence for user-exploit recs when combined with detected coverage
      ubRecs.forEach((r) => {
        recs.push({ ...r, confidence: Math.min(99, r.confidence + 3) });
      });
    }

    // Blitz adjustments
    if (blitzType !== "No blitz") {
      const blitzRecs = BLITZ_COUNTERS.map((r) => ({
        ...r,
        confidence: Math.min(99, r.confidence + (blitzType === "Zero blitz" ? 3 : 0)),
        reasoning: `${r.reasoning} (${blitzType} detected)`,
      }));
      recs.push(...blitzRecs);
    }

    // De-duplicate by concept name, keep highest confidence
    const seen = new Map<string, Recommendation>();
    recs.forEach((r) => {
      if (!seen.has(r.concept) || (seen.get(r.concept)!.confidence < r.confidence)) {
        seen.set(r.concept, r);
      }
    });

    return [...seen.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 8);
  }

  const recommendations = generated ? buildRecommendations() : [];

  const pill = (active: boolean) =>
    `rounded-lg border px-3 py-2 font-mono text-[11px] font-bold transition-all text-left ${
      active
        ? "border-team-one/60 bg-team-one/12 text-team-one"
        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
    }`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display text-lg font-bold">Counter Engine</h2>
        <p className="font-mono text-xs text-muted-foreground mt-0.5">
          Input what you observe — get data-driven play recommendations with confidence scores
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Input Panel */}
        <div className="space-y-5">
          {/* Coverage */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Coverage Detected</div>
            <div className="grid grid-cols-2 gap-1.5">
              {COVERAGES.map((c) => (
                <button key={c} onClick={() => { setCoverage(c); setGenerated(false); }} className={pill(coverage === c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* User Behavior */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">User Behavior Detected</div>
            <div className="grid grid-cols-1 gap-1.5">
              {USER_BEHAVIORS.map((b) => (
                <button key={b} onClick={() => { setUserBehav(b); setGenerated(false); }} className={pill(userBehav === b)}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Blitz */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Blitz Detected</div>
            <div className="grid grid-cols-2 gap-1.5">
              {BLITZ_TYPES.map((b) => (
                <button
                  key={b}
                  onClick={() => { setBlitzType(b); setGenerated(false); }}
                  className={`rounded-lg border px-3 py-2 font-mono text-[11px] font-bold transition-all text-left ${
                    blitzType === b
                      ? b === "No blitz"
                        ? "border-border/60 bg-border/20 text-muted-foreground"
                        : "border-red-500/60 bg-red-500/12 text-red-400"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={() => setGenerated(true)}
            className="w-full rounded-xl border border-team-one/50 bg-team-one/10 py-4 font-display text-base font-bold text-team-one transition-all hover:border-team-one hover:bg-team-one/18"
          >
            Generate Counters
          </button>
        </div>

        {/* Output Panel */}
        <div>
          {!generated ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center h-full flex items-center justify-center">
              <div>
                <div className="font-display text-3xl font-black text-muted-foreground/20 mb-3">COUNTER</div>
                <div className="font-mono text-sm text-muted-foreground">
                  Select your inputs on the left and hit<br />
                  <strong className="text-foreground">Generate Counters</strong> to get recommendations.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Situation summary */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Detected Situation</div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 font-mono text-[11px] font-bold text-blue-400">
                    {coverage}
                  </span>
                  {userBehav !== "None detected" && (
                    <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 font-mono text-[11px] font-bold text-purple-400">
                      User: {userBehav}
                    </span>
                  )}
                  {blitzType !== "No blitz" && (
                    <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 font-mono text-[11px] font-bold text-red-400">
                      {blitzType}
                    </span>
                  )}
                </div>
              </div>

              {recommendations.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <div className="font-mono text-sm text-muted-foreground">No specific recommendations for this combination. Try adjusting inputs.</div>
                </div>
              ) : (
                <>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {recommendations.length} recommendations — ranked by confidence
                  </div>
                  <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <RecCard
                        key={rec.concept}
                        rec={rec}
                        rank={i + 1}
                        coverageName={coverage}
                        coverageCategory={
                          coverage === "Cover 0" || blitzType !== "No blitz" ? "blitz" :
                          coverage === "Cover 1 Robber" || coverage === "Cover 1 Press" || coverage === "Man Free" ? "man" :
                          "zone"
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
