// ─── Madden 26 Defensive Play Database ────────────────────────────────────────
// Every play is an explicit, deterministic record.
// The elimination engine cross-references this database against observed signals.
// Source: Madden 26 playbooks, Madden School, community scouting data (2026).

// ─── Madden Terminology ───────────────────────────────────────────────────────
// Shell:          Cover 2 Shell | Cover 3 Shell | Cover 4 Shell | Cover 6 Shell | Cover 0 Shell
// Safety Depth:   Default | Tight | Over Top
// Safety Width:   Normal | Pinched | Spread
// CB Alignment:   Press | Default | Back Off
// DL:             Pinch | Spread | Shift Left | Shift Right
// LB:             Pinch | Spread
// Shading:        Inside | Outside | Over Top | Underneath

export type Shell =
  | "Cover 2 Shell"
  | "Cover 3 Shell"
  | "Cover 4 Shell"
  | "Cover 6 Shell"
  | "Cover 0 Shell"
  | "Disguised";

export type CoverageType =
  | "Cover 0 Man"
  | "Cover 1 Man Free"
  | "Cover 1 Press"
  | "Cover 1 Hole"
  | "Cover 1 Robber"
  | "Cover 2 Zone"
  | "Cover 2 Man"
  | "Tampa 2"
  | "Cover 2 Invert"
  | "Cover 3 Sky"
  | "Cover 3 Buzz"
  | "Cover 3 Cloud"
  | "Cover 3 Match"
  | "Cover 3 Seam"
  | "Cover 4 Quarters"
  | "Cover 4 Palms"
  | "Cover 6 Field"
  | "Cover 6 Boundary"
  | "Quarters"
  | "Pattern Match";

export type BlitzType =
  | "None"
  | "A-Gap"
  | "Double A-Gap"
  | "Edge"
  | "Corner Blitz"
  | "Safety Blitz"
  | "DB Blitz"
  | "Fire Zone"
  | "Overload";

export type Front =
  | "4-3 Even"
  | "4-3 Over"
  | "4-3 Under"
  | "3-4 Even"
  | "3-4 Odd"
  | "3-4 Over"
  | "Nickel"
  | "Dime"
  | "Dollar"
  | "Bear"
  | "Mug";

export type UserPositionType =
  | "DT" | "NT" | "LE" | "RE"
  | "LOLB" | "ROLB" | "MLB"
  | "CB" | "Slot CB" | "SS" | "FS"
  | "Nickel" | "Dollar" | "Dime" | "Sub LB" | "Edge" | "Spy"
  | "NB" | "DB" | "ILB"
  | "Unknown";

export type AdjustmentTell =
  | "LBs Mugged"
  | "Safeties Tight"
  | "Safeties Pinched"
  | "Safeties Spread"
  | "Safeties Over Top"
  | "Corners Press"
  | "Corners Back Off"
  | "Corners Default"
  | "DL Pinched"
  | "DL Spread"
  | "DL Shifted Left"
  | "DL Shifted Right"
  | "LBs Pinched"
  | "LBs Spread"
  | "Two High Split"
  | "Single High Centerfield"
  | "No High Safety"
  | "Safety Walked Down"
  | "Extra Rusher Visible"
  | "CB Walked Down"
  | "Corners Shading Inside"
  | "Corners Shading Outside";

export type Counter = {
  play:          string;
  formation:     string;
  concept:       string;
  whyItWorks:    string;
  risk:          "Low" | "Medium" | "High";
  difficulty:    1 | 2 | 3 | 4 | 5;
  readOrder:     string[];
  expectedYards: string;
  confidence:    number; // 0-100
};

export type MaddenPlay = {
  id:                 string;
  playbook:           string[];      // list of playbooks this appears in
  package:            string;        // e.g. "Nickel", "Base", "Dime"
  formation:          string;        // e.g. "Nickel DBL Mug"
  playName:           string;        // exact Madden in-game name
  coverage:           CoverageType;
  shell:              Shell;
  front:              Front;
  blitzType:          BlitzType;
  numRushers:         number;
  zoneDrops:          string[];      // zone assignment descriptions
  manAssignments:     string[];      // man coverage assignments
  matchCoverage:      boolean;
  responsibilities:   string[];      // what each unit does
  defaultAlignment:   string;        // where the unit starts pre-snap
  typicalUserPositions: UserPositionType[];
  commonAdjustments:  string[];      // Madden adjustment menu options
  commonTells:        AdjustmentTell[]; // observable pre-snap signals
  weaknesses:         string[];      // specific route concepts that beat it
  counters:           Counter[];
  moneyPlayRating:    number;        // 1-10 (10 = very exploitable)
  difficultyRating:   1 | 2 | 3 | 4 | 5;
  confidenceModifiers: Record<string, number>; // adjustments that raise/lower confidence
};

// ─── Play Database ─────────────────────────────────────────────────────────────

export const MADDEN_PLAY_DB: MaddenPlay[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // NICKEL DBL MUG
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "nickel-dbl-mug-mid-blitz",
    playbook: ["Bills", "Cowboys", "Eagles", "Chiefs", "Bengals", "Ravens", "Steelers", "Browns"],
    package: "Nickel",
    formation: "Nickel DBL Mug",
    playName: "Mid Blitz",
    coverage: "Cover 0 Man",
    shell: "Cover 2 Shell",
    front: "Mug",
    blitzType: "Double A-Gap",
    numRushers: 6,
    zoneDrops: [],
    manAssignments: ["CB1 → WR1", "CB2 → WR2", "NB → Slot", "SS → TE", "MLB → HB"],
    matchCoverage: false,
    responsibilities: ["DTs blow A-gaps", "LBs add pressure through B-gaps", "DBs lock man with no safety help"],
    defaultAlignment: "LBs mugged over center, safeties tight, corners press",
    typicalUserPositions: ["DT", "MLB", "Edge"],
    commonAdjustments: ["Pinch DL", "Pinch LBs", "Press", "Shade Inside", "Safety Tight", "Safety Pinched"],
    commonTells: ["LBs Mugged", "Safeties Tight", "Safeties Pinched", "Corners Press", "DL Pinched"],
    weaknesses: ["HB Wheel", "Mesh", "Texas Route", "Quick Slant", "Delay Fade", "RB Angle", "Bubble Screen"],
    counters: [
      { play: "Mesh", formation: "Gun Bunch TE", concept: "Crossing routes pick off mugged LBs", whyItWorks: "Mugged LBs can't react quickly enough to trail both crossers", risk: "Low", difficulty: 2, readOrder: ["Back crosser vs mugged MLB", "Front crosser off LB pick", "HB flat checkdown"], expectedYards: "8-14 yards", confidence: 92 },
      { play: "HB Wheel", formation: "Gun Trips TE", concept: "RB releases to the flat then up the sideline", whyItWorks: "MLB assigned to HB can't stay with the wheel route — too fast out of backfield", risk: "Low", difficulty: 2, readOrder: ["HB wheel vs MLB in man", "TE drag underneath", "WR slant backside"], expectedYards: "15-30 yards", confidence: 88 },
      { play: "Texas Route", formation: "Gun Spread", concept: "RB short flat, QB rollout", whyItWorks: "Blitz opens flat immediately — RB catches and runs with 6v5 in space", risk: "Low", difficulty: 1, readOrder: ["RB flat immediately", "Scramble if flat is covered"], expectedYards: "6-12 yards", confidence: 85 },
      { play: "Quick Slant", formation: "Gun Tight Slots", concept: "Inside slants vs press corners", whyItWorks: "Press CBs can't recover after slant release — inside leverage exploited", risk: "Medium", difficulty: 2, readOrder: ["Slot slant vs NB", "Outside slant vs CB1", "Backside slant"], expectedYards: "5-10 yards", confidence: 80 },
      { play: "Delay Fade", formation: "Gun Y Trips", concept: "Fade to boundary WR on 1-on-1", whyItWorks: "No safety over top — boundary CB is all alone on 1v1 fade", risk: "Medium", difficulty: 3, readOrder: ["Boundary fade vs CB1", "Slot out as checkdown"], expectedYards: "20-45 yards (TD)", confidence: 75 },
    ],
    moneyPlayRating: 9,
    difficultyRating: 2,
    confidenceModifiers: { "LBs Mugged": 25, "Safeties Tight": 20, "Safeties Pinched": 20, "Corners Press": 15, "No High Safety": 30 },
  },

  {
    id: "nickel-dbl-mug-dbl-a-gap",
    playbook: ["Bills", "Eagles", "Steelers", "49ers", "Packers"],
    package: "Nickel",
    formation: "Nickel DBL Mug",
    playName: "Double A Gap",
    coverage: "Cover 0 Man",
    shell: "Cover 0 Shell",
    front: "Mug",
    blitzType: "Double A-Gap",
    numRushers: 7,
    zoneDrops: [],
    manAssignments: ["CB1 → WR1", "CB2 → WR2", "NB → Slot", "SS → TE", "FS → HB"],
    matchCoverage: false,
    responsibilities: ["Both ILBs + both DTs attack A-gaps", "FS and SS drop into man", "CBs press all"],
    defaultAlignment: "Both LBs directly over center, safeties in box, all DBs pressed",
    typicalUserPositions: ["DT", "NT", "MLB"],
    commonAdjustments: ["Pinch DL", "Pinch LBs", "Press", "Safety Tight"],
    commonTells: ["LBs Mugged", "No High Safety", "Safeties Tight", "Corners Press", "Extra Rusher Visible"],
    weaknesses: ["Any hot route", "Quick out", "Fade", "Screen pass", "Slant", "Bubble"],
    counters: [
      { play: "Quick Out", formation: "Gun 5 Wide", concept: "Hot route all receivers outside", whyItWorks: "7 rushers = 4 DBs in coverage vs 5 WRs. Math wins.", risk: "Low", difficulty: 1, readOrder: ["Fire to any open WR immediately at snap", "Ball out in 1.2 seconds"], expectedYards: "5-15 yards", confidence: 95 },
      { play: "Bubble Screen", formation: "Gun Trips", concept: "Bubble to trips side", whyItWorks: "Only 4 DBs vs 5 receivers — numbers advantage in space", risk: "Low", difficulty: 1, readOrder: ["Bubble to trips WR", "Block assignments seal edge"], expectedYards: "8-18 yards", confidence: 90 },
      { play: "Fade", formation: "Gun Y Trips", concept: "Boundary 1v1 fade", whyItWorks: "0 safeties. Boundary CB alone on fade. Automatic TD look.", risk: "Medium", difficulty: 2, readOrder: ["Fade to boundary", "Slant backside if fade is covered"], expectedYards: "TD", confidence: 82 },
    ],
    moneyPlayRating: 10,
    difficultyRating: 1,
    confidenceModifiers: { "No High Safety": 40, "LBs Mugged": 20, "Extra Rusher Visible": 25, "Safeties Tight": 15 },
  },

  {
    id: "nickel-dbl-mug-3-seam",
    playbook: ["Bills", "Cowboys", "Chiefs", "Ravens"],
    package: "Nickel",
    formation: "Nickel DBL Mug",
    playName: "3 Seam Strike",
    coverage: "Cover 2 Zone",
    shell: "Cover 2 Shell",
    front: "Mug",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["CB1 → Flat Left", "CB2 → Flat Right", "SS → Deep Half Left", "FS → Deep Half Right", "MLB → Hook-Curl", "ROLB → Curl-Flat"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["CBs drop into flats", "Safeties split deep halves", "LBs hold underneath zones", "DL 4-man rush"],
    defaultAlignment: "LBs appear mugged but drop into zones at snap",
    typicalUserPositions: ["MLB", "SS", "FS"],
    commonAdjustments: ["Pinch LBs", "Safety Tight", "Shade Inside"],
    commonTells: ["LBs Mugged", "Safeties Tight", "Two High Split"],
    weaknesses: ["Corner route", "Smash concept", "Levels", "Seam route", "Post"],
    counters: [
      { play: "Smash", formation: "Gun Trips TE", concept: "Corner-flat combination", whyItWorks: "Flat CB has to choose corner or flat — one is always open", risk: "Low", difficulty: 2, readOrder: ["Corner route vs CB in flat", "Hitch under if corner is covered", "Seam over the top"], expectedYards: "12-20 yards", confidence: 88 },
      { play: "Levels", formation: "Gun Bunch", concept: "Three-level stretch vs zone", whyItWorks: "Cover 2 zones are stretched vertically — seams beat the LB-safety gap", risk: "Low", difficulty: 2, readOrder: ["High-low the safety", "Seam between CB and safety", "Flat checkdown"], expectedYards: "10-18 yards", confidence: 84 },
    ],
    moneyPlayRating: 6,
    difficultyRating: 3,
    confidenceModifiers: { "LBs Mugged": 15, "Two High Split": 20, "Safeties Tight": 10 },
  },

  {
    id: "nickel-dbl-mug-cover2-man",
    playbook: ["Bills", "Cowboys", "Eagles", "Bengals", "Chiefs"],
    package: "Nickel",
    formation: "Nickel DBL Mug",
    playName: "Cover 2 Man",
    coverage: "Cover 2 Man",
    shell: "Cover 2 Shell",
    front: "Mug",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["SS → Deep Half Left", "FS → Deep Half Right"],
    manAssignments: ["CB1 → WR1", "CB2 → WR2", "NB → Slot", "MLB → HB", "LOLB → TE"],
    matchCoverage: false,
    responsibilities: ["Safeties split deep halves as help", "All DBs man underneath", "LBs in man vs TE/HB"],
    defaultAlignment: "Mugged look but safeties bail to deep halves at snap",
    typicalUserPositions: ["MLB", "SS", "FS"],
    commonAdjustments: ["Pinch LBs", "Press", "Safety Tight", "Shade Outside"],
    commonTells: ["LBs Mugged", "Safeties Tight", "Two High Split", "Corners Press"],
    weaknesses: ["Post route", "Dig route", "In-breaking routes", "Mesh", "Deep cross"],
    counters: [
      { play: "Post", formation: "Gun Tight Slots", concept: "Post into the safety split", whyItWorks: "Post beats both safeties — falls between deep halves in the void", risk: "Medium", difficulty: 3, readOrder: ["Post to field side WR", "Dig backside if post is bracketed", "HB flat"], expectedYards: "20-40 yards", confidence: 80 },
      { play: "Mesh", formation: "Gun Bunch", concept: "Dual crossers create picks on man CBs", whyItWorks: "Safeties are deep — crossing routes pick off man coverage underneath", risk: "Low", difficulty: 2, readOrder: ["Lead crosser", "Trail crosser off pick", "Flat checkdown"], expectedYards: "8-15 yards", confidence: 86 },
    ],
    moneyPlayRating: 7,
    difficultyRating: 3,
    confidenceModifiers: { "LBs Mugged": 15, "Two High Split": 20, "Corners Press": 15, "Safeties Tight": 10 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 4-3 EVEN / OVER / UNDER
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "43-even-cover2",
    playbook: ["Cowboys", "Eagles", "Buccaneers", "Rams", "Panthers", "Cardinals"],
    package: "Base",
    formation: "4-3 Even",
    playName: "Cover 2",
    coverage: "Cover 2 Zone",
    shell: "Cover 2 Shell",
    front: "4-3 Even",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["CB1 → Flat Left", "CB2 → Flat Right", "SS → Deep Half Left", "FS → Deep Half Right", "MLB → Hook-Curl", "LOLB → Curl-Flat Left", "ROLB → Curl-Flat Right"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["CBs play flats", "Safeties own deep halves", "LBs defend curl-hook windows"],
    defaultAlignment: "4 DL standard, LBs at 4-5 yards, safeties split deep",
    typicalUserPositions: ["MLB", "SS", "FS"],
    commonAdjustments: ["Safety Tight", "Shade Inside", "Pinch LBs"],
    commonTells: ["Two High Split", "Safeties Over Top", "Corners Default"],
    weaknesses: ["Corner route", "Smash", "Post", "Deep crosser", "Seam between safeties"],
    counters: [
      { play: "Smash", formation: "Gun Trips TE", concept: "Corner-flat high-low", whyItWorks: "Flat CB has to play hitch or corner — never both", risk: "Low", difficulty: 2, readOrder: ["Corner vs flat CB bail", "Hitch vs inside CB", "Back seam over linebacker"], expectedYards: "10-20 yards", confidence: 87 },
      { play: "Four Verticals", formation: "Gun Empty Trey", concept: "Seams stress deep halves", whyItWorks: "Two safeties can't cover all four verticals — seams split them", risk: "Medium", difficulty: 3, readOrder: ["Seam between safeties", "Outside vertical vs CB dropping into flat", "TE seam backside"], expectedYards: "15-30 yards", confidence: 78 },
    ],
    moneyPlayRating: 5,
    difficultyRating: 3,
    confidenceModifiers: { "Two High Split": 25, "Safeties Over Top": 15, "Corners Default": 10 },
  },

  {
    id: "43-even-cover3-sky",
    playbook: ["Cowboys", "Eagles", "Buccaneers", "Bears", "Falcons"],
    package: "Base",
    formation: "4-3 Even",
    playName: "Cover 3 Sky",
    coverage: "Cover 3 Sky",
    shell: "Cover 3 Shell",
    front: "4-3 Even",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["CB1 → Deep Third Left", "CB2 → Deep Third Right", "FS → Deep Middle Third", "SS → Strong Flat", "MLB → Hook-Curl", "LOLB → Weak Flat", "ROLB → Hook"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["CBs and FS own deep thirds", "SS plays strong flat", "LBs cover underneath"],
    defaultAlignment: "4 DL, CBs at 8+ yards, FS single high centerfield, SS near box",
    typicalUserPositions: ["FS", "MLB", "SS"],
    commonAdjustments: ["Safety Tight", "Shade Inside", "Corners Back Off"],
    commonTells: ["Single High Centerfield", "Safeties Tight", "Corners Default"],
    weaknesses: ["Curl-flat", "Drive concept", "Spacing", "In-breaking routes vs flat", "Flood"],
    counters: [
      { play: "Curl-Flat", formation: "Gun Bunch TE", concept: "High-low the flat defender", whyItWorks: "SS in flat can't cover both curl and flat simultaneously", risk: "Low", difficulty: 2, readOrder: ["Curl vs SS bailing to flat", "Flat vs SS if he commits to curl", "Seam behind FS"], expectedYards: "8-15 yards", confidence: 88 },
      { play: "Flood", formation: "Gun Y Trips", concept: "Three-level vertical flood", whyItWorks: "Trips overloads one side of Cover 3 — flat, curl, and deep third can't all be covered", risk: "Low", difficulty: 2, readOrder: ["Deep corner vs CB in third", "Drag under flat defender", "HB flat under everything"], expectedYards: "10-18 yards", confidence: 85 },
    ],
    moneyPlayRating: 6,
    difficultyRating: 3,
    confidenceModifiers: { "Single High Centerfield": 30, "Safeties Tight": 15, "Corners Default": 10 },
  },

  {
    id: "43-even-cover1-man-free",
    playbook: ["Cowboys", "Eagles", "Bears", "Chargers", "Broncos"],
    package: "Base",
    formation: "4-3 Even",
    playName: "Cover 1 Man Free",
    coverage: "Cover 1 Man Free",
    shell: "Cover 3 Shell",
    front: "4-3 Even",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["FS → Deep Middle (Centerfield)"],
    manAssignments: ["CB1 → WR1", "CB2 → WR2", "SS → TE", "MLB → HB", "ROLB → Slot/TE2"],
    matchCoverage: false,
    responsibilities: ["FS roams centerfield as free safety", "All other DBs/LBs in man coverage"],
    defaultAlignment: "FS single high, CBs off-man, LBs at normal depth",
    typicalUserPositions: ["FS", "MLB", "SS"],
    commonAdjustments: ["Press", "Shade Inside", "Shade Outside"],
    commonTells: ["Single High Centerfield", "Corners Default", "Safeties Tight"],
    weaknesses: ["Slant", "Mesh", "Pick routes", "HB wheel", "Comeback"],
    counters: [
      { play: "Mesh", formation: "Gun Trips TE", concept: "Crossing routes create natural picks", whyItWorks: "Man CBs can't navigate through pick routes — one always comes free", risk: "Low", difficulty: 2, readOrder: ["Back crosser", "Front crosser off pick", "HB checkdown in flat"], expectedYards: "8-15 yards", confidence: 88 },
      { play: "HB Wheel", formation: "Gun Spread", concept: "RB runs wheel route vs MLB in man", whyItWorks: "MLB assigned to HB gets beat on the wheel — can't keep up out of backfield", risk: "Low", difficulty: 2, readOrder: ["HB wheel up sideline", "Deep out over corner", "Slant backside"], expectedYards: "15-25 yards", confidence: 82 },
    ],
    moneyPlayRating: 7,
    difficultyRating: 2,
    confidenceModifiers: { "Single High Centerfield": 25, "Corners Default": 10 },
  },

  {
    id: "43-even-mike-blitz-0",
    playbook: ["Cowboys", "Eagles", "Buccaneers", "Chargers"],
    package: "Base",
    formation: "4-3 Even",
    playName: "Mike Blitz 0",
    coverage: "Cover 0 Man",
    shell: "Cover 0 Shell",
    front: "4-3 Even",
    blitzType: "A-Gap",
    numRushers: 5,
    zoneDrops: [],
    manAssignments: ["CB1 → WR1", "CB2 → WR2", "SS → TE", "FS → Slot", "ROLB → HB"],
    matchCoverage: false,
    responsibilities: ["MLB blitzes A-gap", "5-man rush with 5 in man", "No safety help"],
    defaultAlignment: "MLB walks up, safeties tight or in box, corners press",
    typicalUserPositions: ["MLB", "FS", "SS"],
    commonAdjustments: ["Press", "Pinch DL", "Safety Tight"],
    commonTells: ["No High Safety", "Safeties Tight", "Corners Press", "Safety Walked Down"],
    weaknesses: ["Quick out", "Hot routes", "Slant", "Screen", "Fade"],
    counters: [
      { play: "Quick Out", formation: "Gun 4 Wide", concept: "Immediate hot route to any WR", whyItWorks: "5 in man + 5 rushing = math doesn't work. Any quick throw wins.", risk: "Low", difficulty: 1, readOrder: ["Hot route at snap", "Any WR vs man CB"], expectedYards: "5-12 yards", confidence: 93 },
    ],
    moneyPlayRating: 9,
    difficultyRating: 1,
    confidenceModifiers: { "No High Safety": 35, "Corners Press": 20, "Safety Walked Down": 20, "Safeties Tight": 15 },
  },

  {
    id: "43-over-cover4-quarters",
    playbook: ["Cowboys", "Bears", "Rams", "Panthers", "Cardinals"],
    package: "Base",
    formation: "4-3 Over",
    playName: "Cover 4 Quarters",
    coverage: "Cover 4 Quarters",
    shell: "Cover 4 Shell",
    front: "4-3 Over",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["CB1 → Deep Quarter Left", "CB2 → Deep Quarter Right", "SS → Deep Quarter Strong", "FS → Deep Quarter Weak", "MLB → Hook-Curl", "LOLB → Hook", "ROLB → Hook"],
    manAssignments: [],
    matchCoverage: true,
    responsibilities: ["4 defenders own deep quarters", "LBs hold underneath hook zones", "CBs and safeties read #2 receiver"],
    defaultAlignment: "4 DL, safeties at 10-12 yards splitting the field, CBs at 8+ yards",
    typicalUserPositions: ["SS", "FS", "MLB"],
    commonAdjustments: ["Safety Tight", "Shade Inside", "Corners Back Off"],
    commonTells: ["Two High Split", "Safeties Over Top", "Corners Default"],
    weaknesses: ["Crossing routes", "Drive concept", "Shallow cross", "4 Verts vs match", "TE seam"],
    counters: [
      { play: "Drive Concept", formation: "Gun Trips TE", concept: "Shallow cross breaks down pattern match", whyItWorks: "Pattern match rules force defenders to pass off routes — shallow creates conflict", risk: "Low", difficulty: 2, readOrder: ["Shallow cross over MLB", "Dig 12-15 yards behind shallow", "Backside slant"], expectedYards: "10-20 yards", confidence: 84 },
      { play: "Four Verticals", formation: "Gun Empty Trey", concept: "Stress all four quarters simultaneously", whyItWorks: "Four defenders cover four verticals — boundary WR is usually single-covered", risk: "Medium", difficulty: 3, readOrder: ["Boundary fade vs CB", "Seam vs safety", "Inside seam vs MLB gap"], expectedYards: "20-40 yards", confidence: 75 },
    ],
    moneyPlayRating: 5,
    difficultyRating: 3,
    confidenceModifiers: { "Two High Split": 25, "Safeties Over Top": 20, "Corners Default": 15 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NICKEL 3-3-5
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "nickel-335-cover2",
    playbook: ["Browns", "Falcons", "Giants", "Jets", "Raiders", "Seahawks"],
    package: "Nickel",
    formation: "Nickel 3-3-5",
    playName: "Cover 2",
    coverage: "Cover 2 Zone",
    shell: "Cover 2 Shell",
    front: "Nickel",
    blitzType: "None",
    numRushers: 3,
    zoneDrops: ["CB1 → Flat Left", "CB2 → Flat Right", "SS → Deep Half Left", "FS → Deep Half Right", "MLB → Hook-Curl", "LOLB → Curl-Flat", "ROLB → Curl-Flat", "NB → Slot Zone"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["3 DL rush", "3 LBs hold mid zones", "3 DBs in deep thirds/flats"],
    defaultAlignment: "3 DL, 3 LBs normal depth, NB over slot, safeties deep split",
    typicalUserPositions: ["MLB", "FS", "NB"],
    commonAdjustments: ["Shade Inside", "Safety Tight"],
    commonTells: ["Two High Split", "Corners Default", "Safeties Over Top"],
    weaknesses: ["Corner route", "Post", "Smash", "Seam", "In-breaking routes"],
    counters: [
      { play: "Smash", formation: "Gun Bunch", concept: "Corner-flat combination vs 3-3-5", whyItWorks: "Only 3 DL rushing means more time — Smash attacks the corner-flat conflict", risk: "Low", difficulty: 2, readOrder: ["Corner vs flat CB", "Hitch under if CB stays", "Seam split safeties"], expectedYards: "12-20 yards", confidence: 85 },
    ],
    moneyPlayRating: 5,
    difficultyRating: 3,
    confidenceModifiers: { "Two High Split": 20, "Corners Default": 10 },
  },

  {
    id: "nickel-335-sam-will-blitz",
    playbook: ["Browns", "Falcons", "Giants", "Jets"],
    package: "Nickel",
    formation: "Nickel 3-3-5",
    playName: "Sam Will Blitz",
    coverage: "Cover 1 Man Free",
    shell: "Cover 3 Shell",
    front: "Nickel",
    blitzType: "Edge",
    numRushers: 5,
    zoneDrops: ["FS → Centerfield"],
    manAssignments: ["CB1 → WR1", "CB2 → WR2", "NB → Slot", "MLB → HB", "SS → TE"],
    matchCoverage: false,
    responsibilities: ["SAM and WILL blitz edges", "FS stays single high", "Everyone else in man"],
    defaultAlignment: "LOLB/ROLB walk up near edges, FS shows single high",
    typicalUserPositions: ["MLB", "FS", "NB"],
    commonAdjustments: ["Press", "Shade Inside"],
    commonTells: ["Single High Centerfield", "CB Walked Down", "Extra Rusher Visible"],
    weaknesses: ["Screen pass", "Quick slant", "Out routes", "HB wheel away from blitz"],
    counters: [
      { play: "Screen Pass", formation: "Gun Y Trips", concept: "Flip to HB screen away from edge blitz", whyItWorks: "Edge blitzers run right by the screen — HB has blockers in open space", risk: "Low", difficulty: 2, readOrder: ["Flip screen to opposite side of blitz", "HB with blockers"], expectedYards: "8-20 yards", confidence: 87 },
      { play: "Quick Slant", formation: "Gun Spread", concept: "Slant away from blitzing edge", whyItWorks: "Edge blitzers don't cover — slant is automatic vs any 2-man rush edge", risk: "Low", difficulty: 1, readOrder: ["Slant to WR opposite the blitz", "Flat checkdown"], expectedYards: "6-12 yards", confidence: 84 },
    ],
    moneyPlayRating: 7,
    difficultyRating: 2,
    confidenceModifiers: { "Single High Centerfield": 20, "Extra Rusher Visible": 20, "CB Walked Down": 15 },
  },

  {
    id: "nickel-335-cover3-buzz",
    playbook: ["Browns", "Falcons", "Giants", "Jets", "Seahawks"],
    package: "Nickel",
    formation: "Nickel 3-3-5",
    playName: "Cover 3 Buzz",
    coverage: "Cover 3 Buzz",
    shell: "Cover 3 Shell",
    front: "Nickel",
    blitzType: "None",
    numRushers: 3,
    zoneDrops: ["CB1 → Deep Third Left", "CB2 → Deep Third Right", "FS → Deep Middle", "SS → Curl-Flat (Buzz zone)", "MLB → Hook-Curl", "LOLB → Flat Left", "ROLB → Flat Right", "NB → Slot Zone"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["SS buzzes into curl-flat area", "CBs and FS own deep thirds", "LBs underneath"],
    defaultAlignment: "SS shows near box then buzzes to curl-flat at snap",
    typicalUserPositions: ["SS", "MLB", "FS"],
    commonAdjustments: ["Shade Inside", "Safety Tight"],
    commonTells: ["Single High Centerfield", "Safety Walked Down", "Corners Default"],
    weaknesses: ["Post", "Corner route", "Deep in-breaking", "Seam"],
    counters: [
      { play: "Post", formation: "Gun Spread", concept: "Post into the void behind SS buzz", whyItWorks: "SS leaves deep middle to buzz — post hits the vacated area between CB thirds", risk: "Medium", difficulty: 3, readOrder: ["Post to field side", "In route between buzz zone and FS", "HB flat"], expectedYards: "15-30 yards", confidence: 78 },
    ],
    moneyPlayRating: 6,
    difficultyRating: 3,
    confidenceModifiers: { "Single High Centerfield": 25, "Safety Walked Down": 15 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DIME 4-2-5
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "dime-425-cover2",
    playbook: ["Chargers", "Broncos", "Raiders", "Dolphins", "Patriots", "Jets"],
    package: "Dime",
    formation: "Dime 4-2-5",
    playName: "Cover 2",
    coverage: "Cover 2 Zone",
    shell: "Cover 2 Shell",
    front: "Dime",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["CB1 → Flat Left", "CB2 → Flat Right", "SS → Deep Half Left", "FS → Deep Half Right", "DB → Slot Zone", "MLB → Hook-Curl", "ILB → Curl-Flat"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["6 DBs give pass coverage advantage", "Only 2 LBs hold underneath zones"],
    defaultAlignment: "4 DL, 2 LBs, 5 DBs — heavy pass coverage set",
    typicalUserPositions: ["SS", "FS", "DB"],
    commonAdjustments: ["Shade Inside", "Safety Tight", "Corners Back Off"],
    commonTells: ["Two High Split", "Safeties Over Top", "Corners Default"],
    weaknesses: ["Run plays (soft vs run)", "Deep post", "Corner route", "In-breaking routes"],
    counters: [
      { play: "Post", formation: "Gun Empty Trey", concept: "Post between safety halves", whyItWorks: "2 LBs leave wide zones underneath — post hits the seam between safeties", risk: "Medium", difficulty: 3, readOrder: ["Post vs safety", "Drag under", "Out route flat"], expectedYards: "20-35 yards", confidence: 76 },
    ],
    moneyPlayRating: 5,
    difficultyRating: 3,
    confidenceModifiers: { "Two High Split": 20, "Safeties Over Top": 15 },
  },

  {
    id: "dime-425-corner-blitz",
    playbook: ["Chargers", "Broncos", "Dolphins", "Patriots"],
    package: "Dime",
    formation: "Dime 4-2-5",
    playName: "Corner Blitz",
    coverage: "Cover 1 Man Free",
    shell: "Cover 3 Shell",
    front: "Dime",
    blitzType: "Corner Blitz",
    numRushers: 5,
    zoneDrops: ["FS → Centerfield"],
    manAssignments: ["CB1 → WR1", "SS → WR2", "DB → Slot", "MLB → TE", "ILB → HB"],
    matchCoverage: false,
    responsibilities: ["CB2 walks down and blitzes off the edge", "FS single high", "All others man"],
    defaultAlignment: "CB2 walked close to LOS, shows press then blitzes",
    typicalUserPositions: ["FS", "MLB", "CB"],
    commonAdjustments: ["Press", "Safety Tight"],
    commonTells: ["CB Walked Down", "Single High Centerfield", "Extra Rusher Visible", "No High Safety"],
    weaknesses: ["Quick out away from CB blitz", "Slant to blitzing CB side", "Screen"],
    counters: [
      { play: "Quick Out", formation: "Gun Trips", concept: "Throw away from the blitzing CB", whyItWorks: "CB blitzers vacate their coverage — the WR they left is wide open", risk: "Low", difficulty: 1, readOrder: ["Throw to WR away from corner blitz immediately", "WR open by math"], expectedYards: "6-15 yards", confidence: 90 },
    ],
    moneyPlayRating: 8,
    difficultyRating: 2,
    confidenceModifiers: { "CB Walked Down": 25, "Extra Rusher Visible": 20, "Single High Centerfield": 15 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DOLLAR 3-2-6
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "dollar-326-cover4",
    playbook: ["Patriots", "Chargers", "Saints", "Dolphins"],
    package: "Dollar",
    formation: "Dollar 3-2-6",
    playName: "Cover 4",
    coverage: "Cover 4 Quarters",
    shell: "Cover 4 Shell",
    front: "Dime",
    blitzType: "None",
    numRushers: 3,
    zoneDrops: ["CB1 → Deep Quarter", "CB2 → Deep Quarter", "SS → Deep Quarter", "FS → Deep Quarter", "DB1 → Slot Zone", "DB2 → Slot Zone", "ILB1 → Hook-Curl", "ILB2 → Hook-Curl"],
    manAssignments: [],
    matchCoverage: true,
    responsibilities: ["6 DBs divide field into zones", "Quarters pattern-match reads"],
    defaultAlignment: "Very soft — 6 DBs all at depth, soft shell look",
    typicalUserPositions: ["FS", "SS", "DB"],
    commonAdjustments: ["Safety Tight", "Corners Back Off", "Shade Inside"],
    commonTells: ["Two High Split", "Safeties Spread", "Corners Default"],
    weaknesses: ["Shallow cross", "Drive", "Mesh", "TE seam", "Quick slant"],
    counters: [
      { play: "Drive Concept", formation: "Gun Y Trips", concept: "Shallow cross attacks pattern match", whyItWorks: "Dollar has only 2 LBs — shallow cross floods underneath and forces DBs into conflict", risk: "Low", difficulty: 2, readOrder: ["Shallow cross over LBs", "10-yard dig behind shallow", "TE seam over deep zone"], expectedYards: "10-18 yards", confidence: 83 },
    ],
    moneyPlayRating: 4,
    difficultyRating: 4,
    confidenceModifiers: { "Two High Split": 20, "Safeties Spread": 15, "Corners Default": 10 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 3-4 ODD
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "34-odd-cover3",
    playbook: ["Steelers", "Ravens", "Chiefs", "Dolphins", "Saints", "Broncos"],
    package: "Base",
    formation: "3-4 Odd",
    playName: "Cover 3",
    coverage: "Cover 3 Sky",
    shell: "Cover 3 Shell",
    front: "3-4 Odd",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["CB1 → Deep Third Left", "CB2 → Deep Third Right", "FS → Deep Middle", "SS → Strong Flat", "ILB1 → Hook-Curl", "ILB2 → Hook-Curl", "LOLB → Weak Flat"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["ROLB rushes with DL for 4-man pressure", "3-4 base coverage responsibilities"],
    defaultAlignment: "3 DL, 4 LBs, FS single high, SS near box",
    typicalUserPositions: ["FS", "ILB", "SS"],
    commonAdjustments: ["Safety Tight", "Shade Inside", "Pinch LBs"],
    commonTells: ["Single High Centerfield", "Safeties Tight", "Corners Default"],
    weaknesses: ["Flood", "Curl-flat", "Drive concept", "Seam"],
    counters: [
      { play: "Flood", formation: "Gun Y Trips", concept: "Flood the side SS is vacating", whyItWorks: "SS leaving box to flat leaves seam open — flood concept stresses both", risk: "Low", difficulty: 2, readOrder: ["Deep corner vs CB in third", "Drag/out under SS", "HB flat under drag"], expectedYards: "10-20 yards", confidence: 85 },
    ],
    moneyPlayRating: 6,
    difficultyRating: 3,
    confidenceModifiers: { "Single High Centerfield": 25, "Safeties Tight": 15, "Corners Default": 10 },
  },

  {
    id: "34-odd-zero-blitz",
    playbook: ["Steelers", "Ravens", "Chiefs", "Patriots"],
    package: "Base",
    formation: "3-4 Odd",
    playName: "Zero Blitz",
    coverage: "Cover 0 Man",
    shell: "Cover 0 Shell",
    front: "3-4 Odd",
    blitzType: "A-Gap",
    numRushers: 6,
    zoneDrops: [],
    manAssignments: ["CB1 → WR1", "CB2 → WR2", "SS → TE", "FS → Slot", "ILB1 → HB"],
    matchCoverage: false,
    responsibilities: ["All four OLBs/ILBs can blitz", "Zero safety help — all in man"],
    defaultAlignment: "Multiple LBs walking up, safeties in box or pressed, 0 deep safeties",
    typicalUserPositions: ["ILB", "SS", "FS"],
    commonAdjustments: ["Pinch DL", "Press", "Safety Tight"],
    commonTells: ["No High Safety", "Safeties Tight", "Corners Press", "LBs Mugged", "Extra Rusher Visible"],
    weaknesses: ["Any hot route", "Quick game", "Screen", "Fade"],
    counters: [
      { play: "Hot Routes", formation: "Gun 5 Wide", concept: "Pre-snap hot route everything", whyItWorks: "Zero coverage = every WR is 1v1 with no safety help. Hot routes win automatically.", risk: "Low", difficulty: 1, readOrder: ["Identify 0 pre-snap", "Hot route outside WRs to fades", "Fire at snap to first open WR"], expectedYards: "10-TD", confidence: 92 },
    ],
    moneyPlayRating: 10,
    difficultyRating: 1,
    confidenceModifiers: { "No High Safety": 40, "Corners Press": 20, "Safeties Tight": 20, "Extra Rusher Visible": 15 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NICKEL 2-4-5 (FIRE ZONE)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "nickel-245-fire-zone",
    playbook: ["Eagles", "Buccaneers", "Cowboys", "Panthers"],
    package: "Nickel",
    formation: "Nickel 2-4-5",
    playName: "Fire Zone",
    coverage: "Cover 3 Sky",
    shell: "Cover 3 Shell",
    front: "Nickel",
    blitzType: "Fire Zone",
    numRushers: 5,
    zoneDrops: ["CB1 → Deep Third Left", "CB2 → Deep Third Right", "FS → Deep Middle", "MLB1 → Hook Zone", "NB → Flat Zone"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["5-man pressure with 3-deep zone behind it", "Designed to confuse quick reads"],
    defaultAlignment: "LB or DB walked up on one side, disguised zone shell behind",
    typicalUserPositions: ["MLB", "FS", "NB"],
    commonAdjustments: ["Shade Inside", "Safety Tight"],
    commonTells: ["Single High Centerfield", "Extra Rusher Visible", "Safety Walked Down"],
    weaknesses: ["Flat route", "Seam", "Corner route", "3-level flood"],
    counters: [
      { play: "Flood", formation: "Gun Trips TE", concept: "Attack flat zone left by fire zone blitzer", whyItWorks: "Fire zone vacates a flat — trips flood hits empty zone", risk: "Low", difficulty: 2, readOrder: ["Flat route to blitzing side (now empty)", "Corner route over flat CB", "Drag under FS"], expectedYards: "10-20 yards", confidence: 82 },
    ],
    moneyPlayRating: 7,
    difficultyRating: 3,
    confidenceModifiers: { "Single High Centerfield": 15, "Extra Rusher Visible": 20, "Safety Walked Down": 15 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COVER 6 (FIELD/BOUNDARY)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "43-over-cover6-field",
    playbook: ["Rams", "Cowboys", "Saints", "Eagles", "Seahawks"],
    package: "Base",
    formation: "4-3 Over",
    playName: "Cover 6",
    coverage: "Cover 6 Field",
    shell: "Cover 6 Shell",
    front: "4-3 Over",
    blitzType: "None",
    numRushers: 4,
    zoneDrops: ["FS → Deep Quarter Field", "CB1 → Deep Quarter Boundary", "SS → Deep Half Field", "CB2 → Flat Boundary", "MLB → Hook-Curl", "LOLB → Flat Field", "ROLB → Hook"],
    manAssignments: [],
    matchCoverage: false,
    responsibilities: ["Field side plays Cover 4", "Boundary side plays Cover 2"],
    defaultAlignment: "FS rotated field, SS deeper, asymmetric coverage shell",
    typicalUserPositions: ["FS", "SS", "MLB"],
    commonAdjustments: ["Shade Inside", "Safety Tight"],
    commonTells: ["Two High Split", "Safeties Over Top", "Corners Default"],
    weaknesses: ["Boundary corner route", "Field seam", "Post to field side", "Boundary comeback"],
    counters: [
      { play: "Boundary Corner", formation: "Gun Bunch Weak", concept: "Attack Cover 2 side on boundary", whyItWorks: "Cover 2 on boundary = CB in flat, safety in half — corner route splits them perfectly", risk: "Medium", difficulty: 3, readOrder: ["Corner route to boundary WR", "Hitch under if CB bails", "Seam to field side safety split"], expectedYards: "15-25 yards", confidence: 80 },
    ],
    moneyPlayRating: 6,
    difficultyRating: 4,
    confidenceModifiers: { "Two High Split": 15, "Safeties Over Top": 20, "Corners Default": 10 },
  },
];

// ─── Database Lookup Functions ────────────────────────────────────────────────

export function getAllFormations(): string[] {
  return [...new Set(MADDEN_PLAY_DB.map(p => p.formation))].sort();
}

export function getAllPackages(): string[] {
  return [...new Set(MADDEN_PLAY_DB.map(p => p.package))].sort();
}

export function getPlaysByFormation(formation: string): MaddenPlay[] {
  return MADDEN_PLAY_DB.filter(p => p.formation === formation);
}

export function getPlaysByPackage(pkg: string): MaddenPlay[] {
  return MADDEN_PLAY_DB.filter(p => p.package === pkg);
}

export function getPlaysByShell(shell: Shell): MaddenPlay[] {
  return MADDEN_PLAY_DB.filter(p => p.shell === shell);
}

export function getPlaysByPlaybook(playbook: string): MaddenPlay[] {
  return MADDEN_PLAY_DB.filter(p => p.playbook.includes(playbook));
}

export function getPlayById(id: string): MaddenPlay | undefined {
  return MADDEN_PLAY_DB.find(p => p.id === id);
}

export const ALL_SHELLS: Shell[] = [
  "Cover 2 Shell", "Cover 3 Shell", "Cover 4 Shell", "Cover 6 Shell", "Cover 0 Shell", "Disguised",
];

export const ALL_FORMATIONS = getAllFormations();
export const ALL_PACKAGES = getAllPackages();

export const PLAYBOOKS_LIST = [
  "All", "49ers", "Bears", "Bengals", "Bills", "Broncos", "Browns", "Buccaneers",
  "Cardinals", "Chargers", "Chiefs", "Colts", "Cowboys", "Dolphins", "Eagles",
  "Falcons", "Giants", "Jaguars", "Jets", "Lions", "Packers", "Panthers",
  "Patriots", "Raiders", "Rams", "Ravens", "Saints", "Seahawks", "Steelers",
  "Texans", "Titans", "Vikings",
];
