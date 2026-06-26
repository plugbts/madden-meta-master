// Madden 26 strategy knowledge base

export type CoverageCategory = "man" | "zone" | "blitz" | "formation";

export type Coverage = {
  id: string;
  name: string;
  shell: string;
  category: CoverageCategory;
  popular?: boolean;
  tells: string[];
  weakness: string;
  counters: Counter[];
};

export type Counter = {
  formation: string;
  play: string;
  concept: string;
  motion?: string;
  read: string;
  audibles?: string[];
  expected: string;
  tier: "A+" | "A" | "B+";
};

export const COVERAGES: Coverage[] = [
  {
    id: "cover-0",
    name: "Cover 0 Blitz",
    shell: "No deep safety — everyone in man, all-out pressure",
    category: "blitz",
    popular: true,
    tells: ["No deep safety", "DBs press at LOS", "7+ near the box"],
    weakness: "Zero help over the top. Hot routes win every time.",
    counters: [
      {
        formation: "Gun Bunch",
        play: "PA Y Shallow Cross",
        concept: "Mesh + Wheel",
        motion: "Motion #2 across to rub the press corner",
        read: "Snap → check unblocked gap → throw the hot slant on #1 before the rusher arrives",
        audibles: ["Hot slants on outside WRs", "Block TE in protection"],
        expected: "Free yards on slant or wide-open wheel against the late safety",
        tier: "A+",
      },
      {
        formation: "Singleback Trips TE",
        play: "Slot Fade",
        concept: "Fade-Fade-Fade",
        read: "1-on-1 outside fade vs press corner — let your WR win the jump ball",
        audibles: ["Outside fades both sides", "Quick out on slot if corner plays soft"],
        expected: "Touchdown shot over the top",
        tier: "A+",
      },
      {
        formation: "Shotgun 5 Wide",
        play: "All Quick Slants",
        concept: "Smash slants",
        read: "Fastest slant open — usually the slot",
        expected: "Easy 8-12 yards before pressure arrives",
        tier: "A",
      },
    ],
  },
  {
    id: "cover-1",
    name: "Cover 1 Robber / Man Free",
    shell: "Single high safety, robber lurking middle, press man outside",
    category: "man",
    popular: true,
    tells: ["1 deep safety", "Lurker reading QB eyes", "Corners turned to WRs"],
    weakness: "Pick concepts, deep crossers, RB isolating a LB.",
    counters: [
      {
        formation: "Gun Trips TE",
        play: "Drive",
        concept: "Drive + Dig (Mesh under)",
        motion: "Motion the TE to create a natural pick",
        read: "Crosser on the move > Dig > checkdown",
        audibles: ["Streak the X to clear the safety"],
        expected: "Crosser uncovered after the natural rub",
        tier: "A+",
      },
      {
        formation: "Singleback Ace",
        play: "PA Boot Over",
        concept: "Bootleg flood",
        read: "Deep over > flat > comeback",
        expected: "QB on the move, defender trailing on the crosser",
        tier: "A",
      },
      {
        formation: "Gun Empty",
        play: "RB Angle / Texas concept",
        concept: "RB iso vs LB",
        read: "Throw it where the LB isn't — angle breaks opposite",
        expected: "RB wins leverage on LB every time",
        tier: "A+",
      },
    ],
  },
  {
    id: "cover-2",
    name: "Cover 2 Zone",
    shell: "Two deep safeties splitting the field in half, 5 underneath zones",
    category: "zone",
    popular: true,
    tells: ["2 deep safeties", "Corners squatting the flat", "MLB drops middle"],
    weakness: "Seam between safety and CB, deep middle (Tampa hole with no MLB).",
    counters: [
      {
        formation: "Gun Trips TE",
        play: "Smash",
        concept: "Corner + Hitch",
        read: "Corner route over the squat CB — high/low the flat defender",
        audibles: ["Streak the slot to widen the safety"],
        expected: "Corner route 18-22 yds vs the sinking CB",
        tier: "A+",
      },
      {
        formation: "Singleback Doubles",
        play: "Four Verticals",
        concept: "Bender",
        read: "Bend the #2 seam into the void at 18 yds",
        expected: "Seam shot splits the two safeties",
        tier: "A+",
      },
      {
        formation: "Gun Bunch",
        play: "Stick Nod",
        concept: "Stick + flat + clear",
        read: "Stick nod vs the flat defender — 1st down every time",
        expected: "12-15 yd chunk",
        tier: "A",
      },
    ],
  },
  {
    id: "cover-3",
    name: "Cover 3 Sky / Buzz",
    shell: "3 deep thirds, 4 underneath zones",
    category: "zone",
    popular: true,
    tells: ["1 high safety + 2 deep corners", "FS centerfield", "Outside CB bails"],
    weakness: "Flats, curl/flat triangle, four verticals vs the middle third.",
    counters: [
      {
        formation: "Gun Tight Slots",
        play: "Curl Flat",
        concept: "Curl + Flat + Post",
        read: "Curl sits under the bailing CB, flat outside the OLB",
        expected: "Pick your poison: 8 yd curl or 4 yd flat — always a completion",
        tier: "A+",
      },
      {
        formation: "Gun Trey Open",
        play: "PA Y Cross",
        concept: "Levels + crosser",
        read: "Deep cross past the hook defender — find the window at 15-20 yds",
        expected: "20+ yds across the field",
        tier: "A+",
      },
      {
        formation: "Singleback Bunch",
        play: "Sail / Flood",
        concept: "Three-level sideline stretch",
        read: "Sail > Flat > Deep clear",
        expected: "Defender can't cover two levels — easy completion",
        tier: "A",
      },
    ],
  },
  {
    id: "dbl-mug",
    name: "Double A-Gap Mug",
    shell: "Both ILBs show A-gap pressure — could blitz, could drop",
    category: "blitz",
    popular: true,
    tells: ["Both ILBs creeping into A-gaps pre-snap", "QB hard to get into rhythm", "OL uncertain who to block"],
    weakness: "Hot routes, quick screen, any RB route to the perimeter.",
    counters: [
      {
        formation: "Gun Empty",
        play: "Stick Concept",
        concept: "Stick + flat bubble",
        motion: "Shift RB out wide for an immediate hot",
        read: "Pre-snap: ID if both mug backers actually come — if yes, hot to the perimeter; if no, work the stick",
        audibles: ["RB bubble screen away from pressure", "Slants into the vacated A-gap"],
        expected: "Either a free 8-10 yds on the hot or a wide-open slant through the cleared lane",
        tier: "A+",
      },
      {
        formation: "Shotgun Tight Doubles",
        play: "Inside Zone RPO — stick to bubble",
        concept: "RPO bubble",
        read: "Read the mugging backers — pull and throw the bubble if they crash",
        expected: "Numbers advantage on the perimeter for easy YAC",
        tier: "A+",
      },
      {
        formation: "Gun Trips TE",
        play: "PA Boot",
        concept: "Naked bootleg away from mug",
        motion: "Pre-snap motion to ID the blitz side",
        read: "Boot away from the mug — OLB is on the mug side, boot side is wide open",
        expected: "QB 1-on-1 with a LB in space — major yards",
        tier: "A",
      },
    ],
  },
  {
    id: "4de-blitz",
    name: "4 DE Formation Blitz",
    shell: "Four defensive ends on the line — elite edge speed rush with DB blitz overlay",
    category: "formation",
    popular: true,
    tells: ["4 fast DE/OLB types at the line", "No traditional DTs — all speed", "Max-blitz packages likely"],
    weakness: "Inside run, OL shifts, quick inside slants to exploit the lack of run-stopping DTs.",
    counters: [
      {
        formation: "I-Form Pro",
        play: "Inside Zone",
        concept: "Power run between tackles",
        read: "No DTs = soft interior. Attack the A/B gaps before they stunts",
        audibles: ["HB Dive", "Iso up the middle"],
        expected: "5-8 yds per carry against the undersized interior",
        tier: "A+",
      },
      {
        formation: "Shotgun Trips TE",
        play: "Quick Slants",
        concept: "Inside quick game",
        motion: "Shift the TE inside before snap",
        read: "Snap and throw immediately to the inside slant — DEs crash upfield and can't redirect",
        audibles: ["All quick slants inside", "Lob screen to the boundary"],
        expected: "Free inside release — 8-15 yards before DEs recover",
        tier: "A+",
      },
      {
        formation: "Gun Bunch",
        play: "Bunch Attack",
        concept: "Rub routes vs speed rush",
        read: "DEs can't redirect into coverage — rub routes cross in front of their chase lanes",
        expected: "Open crosser for easy 1st down",
        tier: "A",
      },
    ],
  },
  {
    id: "cover-1-press",
    name: "Cover 1 Press",
    shell: "Press man on every receiver, single deep free safety",
    category: "man",
    tells: ["Corners jammed at LOS", "1 safety deep", "LBs tight on slots"],
    weakness: "Jam releases, back shoulder fades, speed routes to the outside.",
    counters: [
      {
        formation: "Gun Spread",
        play: "4 Verticals",
        concept: "Fade + Seam",
        motion: "Motion the slot to get a free release",
        read: "Outside WR back-shoulder vs the pressing corner",
        audibles: ["Outside fades vs press", "Slant + Go on the slot"],
        expected: "Corner technique broken — big play potential",
        tier: "A+",
      },
      {
        formation: "Gun Bunch",
        play: "Mesh",
        concept: "Pick + Rub",
        read: "Natural rub at the LOS disrupts the press timing",
        expected: "Free crosser underneath for 10+ yards",
        tier: "A+",
      },
    ],
  },
  {
    id: "cover-2-man",
    name: "Cover 2 Man",
    shell: "2 deep safeties, man coverage underneath every receiver",
    category: "man",
    tells: ["2 safeties deep", "Defenders trailing WRs", "Press at LOS"],
    weakness: "Rub/pick routes, mesh concept, RB isolation.",
    counters: [
      {
        formation: "Gun Bunch",
        play: "Hank",
        concept: "Natural rubs from bunch",
        motion: "Quick motion to widen the bunch",
        read: "Whoever rubs free — usually the underneath crosser",
        expected: "Defender lost in traffic — free WR for big YAC",
        tier: "A+",
      },
      {
        formation: "Gun Trips",
        play: "Mesh Concept",
        concept: "Crossers + sit",
        read: "Crosser on the move beats the trail man every rep",
        expected: "Catch & run YAC",
        tier: "A+",
      },
    ],
  },
  {
    id: "cover-3-match",
    name: "Cover 3 Match",
    shell: "Cover 3 shell with man-match principles — defenders pattern match vs bunch/trips",
    category: "zone",
    tells: ["3 deep look at snap", "Underneath defenders follow route combinations", "Does NOT pass off like standard Cover 3"],
    weakness: "Drive concept, levels, anything that clears out a zone then floods it.",
    counters: [
      {
        formation: "Gun Trips TE",
        play: "Drive",
        concept: "Drive + Spot",
        read: "Drive clears the hook; the spot route sits in the vacated area",
        audibles: ["Motion to force the match rules to shift"],
        expected: "Spot route sitting wide open in the cleared window",
        tier: "A+",
      },
      {
        formation: "Gun Tight Slots",
        play: "Four Verticals",
        concept: "4 verts vs match rules",
        motion: "Shift slot motion to stress the match assignments",
        read: "Match rules create one-on-one matchups — attack your best WR",
        expected: "Leverage the OOP matchup created by the motion",
        tier: "A",
      },
    ],
  },
  {
    id: "cover-3-cloud",
    name: "Cover 3 Cloud",
    shell: "Cover 3 with corners clouding the flats — CB plays flat, SS deep third",
    category: "zone",
    tells: ["Corner is NOT bailing — staying flat", "SS shifts to deep third", "Flat zone owned by the corner"],
    weakness: "Deep corner routes, smash vs the cloud CB, vertical seams.",
    counters: [
      {
        formation: "Gun Trips TE",
        play: "Smash",
        concept: "Corner + Hitch vs Cloud",
        read: "The CB plays flat — throw the corner route over his head immediately",
        audibles: ["Corner route to every boundary WR"],
        expected: "Corner route wide open — CB can't bail and squat at same time",
        tier: "A+",
      },
      {
        formation: "Singleback Ace",
        play: "PA Deep Cross",
        concept: "Deep crosser vs cover-3 thirds",
        read: "Cross between the cloud CB (flat) and the deep third safety — throw before they converge",
        expected: "20+ yd cross over the shoulder",
        tier: "A",
      },
    ],
  },
  {
    id: "cover-4",
    name: "Cover 4 Quarters",
    shell: "4 deep safeties split the field in quarters, 3 underneath",
    category: "zone",
    tells: ["2 safeties 12+ yds deep", "CBs bail at snap", "Only 3 underneath zones"],
    weakness: "Underneath flats, RB swing, shallow crossers, mesh.",
    counters: [
      {
        formation: "Gun Bunch",
        play: "Mesh",
        concept: "Mesh + Sit",
        read: "First crosser open vs only 3 underneath defenders",
        expected: "Catch & run for 10+",
        tier: "A+",
      },
      {
        formation: "Gun Empty Y Saint",
        play: "All Flats",
        concept: "Quick game underneath",
        read: "Take whatever the LB doesn't cover",
        expected: "Free 6-8 yds on every snap",
        tier: "A",
      },
      {
        formation: "I Form Pro",
        play: "Inside Zone",
        concept: "Run at light box",
        read: "Only 6 in the box vs Cover 4 — gash the defense",
        expected: "5-7 yds a pop",
        tier: "A+",
      },
    ],
  },
  {
    id: "cover-6",
    name: "Cover 6 (Quarter-Quarter-Half)",
    shell: "Cover 4 to one side, Cover 2 to the other — asymmetric zone",
    category: "zone",
    tells: ["Asymmetric safety alignment", "One CB bails, the other squats"],
    weakness: "Attack the Cover 2 side with smash; attack the Cover 4 side underneath.",
    counters: [
      {
        formation: "Gun Trips TE",
        play: "Smash to Cover 2 side",
        concept: "Corner vs squat",
        read: "ID the squat corner pre-snap → throw the corner route over the top",
        expected: "Big shot to the boundary",
        tier: "A+",
      },
      {
        formation: "Gun Doubles",
        play: "Drive (to Cover 4 side)",
        concept: "Shallow + Dig",
        read: "Shallow under the 3-man underneath",
        expected: "Easy 8-12",
        tier: "A",
      },
    ],
  },
  {
    id: "tampa-2",
    name: "Tampa 2",
    shell: "Cover 2 look but the MLB peels to the deep middle hole",
    category: "zone",
    tells: ["MLB sprints straight back at snap", "2 deep safeties split the halves"],
    weakness: "Sidelines, deep corners, vertical seams outside.",
    counters: [
      {
        formation: "Gun Trips TE",
        play: "Smash",
        concept: "Corner + Hitch",
        read: "Corner route is wide open — MLB vacated the middle, corners still squat",
        expected: "20+ yd shot to the corner",
        tier: "A+",
      },
      {
        formation: "Singleback Doubles",
        play: "Verticals",
        concept: "4 verts outside",
        read: "Throw the outside vertical vs the sideline-only safety help",
        expected: "Shot play — 30+ yd potential",
        tier: "A",
      },
    ],
  },
  {
    id: "cover-2-sink",
    name: "Cover 2 Sink",
    shell: "Cover 2 shell with corners sinking into the curl/flat zones",
    category: "zone",
    tells: ["Corners drop back at snap but don't fully bail", "Safeties stay 2-deep", "Corners own curl/flat area"],
    weakness: "Hitch routes at 5-7 yds, speed outs, anything short of the sinking corners.",
    counters: [
      {
        formation: "Gun Trips TE",
        play: "Quick Hitches",
        concept: "Hitch + Flat",
        read: "Throw to the hitch before the corner sinks into that area — timing window is tight",
        audibles: ["Speed out vs sinking corner", "Slant in behind the sinking CB"],
        expected: "5-7 yd hitches all day — move the chains",
        tier: "A+",
      },
      {
        formation: "Gun Spread Flex",
        play: "Four Verticals",
        concept: "Seam + post attack",
        read: "Seam between the sinking corners and the 2-deep safeties — throw it there",
        expected: "Window at 15-18 yds between the two zone levels",
        tier: "A",
      },
    ],
  },
  {
    id: "zero-blitz",
    name: "Zero Blitz (All-Out)",
    shell: "Full-house pressure — every single DB in man, no safety help whatsoever",
    category: "blitz",
    tells: ["0 safeties visible pre-snap", "Every DB jammed onto a receiver", "8+ rushers likely"],
    weakness: "Any quick hot route destroys it — they bet you'll hesitate.",
    counters: [
      {
        formation: "Gun 5 Wide",
        play: "Quick Outs / Slants",
        concept: "Hot route all 5",
        read: "Pre-snap: see zero look → hot route everything → snap and fire immediately",
        audibles: ["Fade all outside WRs", "Quick outs to all five"],
        expected: "Ball out in 1.5 seconds — DB never closes before the catch",
        tier: "A+",
      },
      {
        formation: "Gun Trips TE",
        play: "PA Rollout",
        concept: "Sprint-out vs zero",
        motion: "Motion a WR out wide for immediate leverage",
        read: "Roll out immediately — don't let the pocket collapse. Throw fade to single-covered WR",
        expected: "1-on-1 fade with no safety. Instant TD chance",
        tier: "A+",
      },
    ],
  },
  {
    id: "bear-blitz",
    name: "Bear Front Blitz",
    shell: "8-man box — MLB over the center, DTs in A-gaps, edge pressure built in",
    category: "blitz",
    tells: ["NT directly over the center", "ILBs in A-gaps", "Only 3 DBs in coverage"],
    weakness: "Only 3 in coverage — any passing concept to 3+ receivers wins numbers.",
    counters: [
      {
        formation: "Shotgun Trips TE",
        play: "Flood / Sail",
        concept: "3-level flood",
        read: "3 routes vs 3 defenders — one is open by math. Attack the flat first, then the corner over the top",
        audibles: ["Bubble to the single WR side", "Hot slant inside the DT gap"],
        expected: "Flood wins 3 vs 3 — easy completion plus YAC",
        tier: "A+",
      },
      {
        formation: "Gun 5 Wide",
        play: "Spot / Curls",
        concept: "Spread the field vs 3 DBs",
        read: "5 receivers vs 3 DBs is pure math. Two are always wide open. Find the first one",
        expected: "Multiple wide-open receivers — big chunk play",
        tier: "A+",
      },
    ],
  },
  {
    id: "nickel-335",
    name: "Nickel 3-3-5 Odd",
    shell: "3 down linemen, 3 LBs, 5 DBs — versatile base nickel package",
    category: "formation",
    popular: true,
    tells: ["3-man DL", "3 LBs visible", "5 DBs on the field", "Great against spread"],
    weakness: "Power run, TE seams, anything that stresses the lighter DL.",
    counters: [
      {
        formation: "I-Form Tight",
        play: "HB Power",
        concept: "Power O vs light DL",
        read: "3-man DL can't stop the power — kick out the end, pull the guard",
        audibles: ["Iso", "Off-tackle to the TE side"],
        expected: "6-8 yds — smaller DL gets pushed around",
        tier: "A+",
      },
      {
        formation: "Gun Trips TE",
        play: "TE Seam",
        concept: "TE vs LB matchup",
        motion: "Shift the TE into the slot to create the LB matchup",
        read: "LB on TE = automatic advantage. Throw the seam immediately after the motion",
        expected: "LB overmatched — 15-20 yd seam on demand",
        tier: "A+",
      },
      {
        formation: "Singleback Ace Big",
        play: "Inside Zone",
        concept: "Power run at 3 DL",
        read: "Double team the nose, seal the backers — 3 DL can't hold the point of attack",
        expected: "Consistent 5-6 yd gains, wear them down",
        tier: "A",
      },
    ],
  },
];

export type OffenseFormation = {
  id: string;
  name: string;
  family: string;
  threats: string[];
  strengths: string[];
  weaknesses: string[];
  adjustments: DefAdjust[];
};

export type DefAdjust = {
  defense: string;
  coverage: string;
  blitz?: string;
  shifts: string[];
  hotRoute?: string;
  why: string;
  tier: "A+" | "A" | "B+";
};

export const OFFENSES: OffenseFormation[] = [
  {
    id: "gun-bunch",
    name: "Gun Bunch / Bunch TE",
    family: "Spread + rubs",
    threats: ["Mesh", "Stick", "Hank rubs", "PA crossers"],
    strengths: ["Natural rub routes defeat man coverage", "Flooding zone coverage with 3-level concepts", "Motion creates leverage vs every coverage"],
    weaknesses: ["Press coverage disrupts timing of rub routes", "Edge blitz beats the outside run game", "Flat buzz strangles the stick/hank concepts"],
    adjustments: [
      {
        defense: "Nickel 3-3-5 Odd",
        coverage: "Cover 2 Man Press",
        blitz: "DB Blitz off the bunch side edge",
        shifts: [
          "Press coverage ON",
          "Pinch the bunch (defenders crash inside to break the rub)",
          "Spotlight the bunch slot WR",
        ],
        hotRoute: "Curl-to-flat for the bunch LB",
        why: "Press denies the natural rub timing; edge pressure forces the QB to dump before mesh develops.",
        tier: "A+",
      },
      {
        defense: "Big Nickel",
        coverage: "Quarters Match (Palms vs trips)",
        shifts: ["Buzz the strong safety to the flat", "Match #2 vertical"],
        why: "Match coverage passes off the rubs cleanly. The flat buzz strangles stick/hank.",
        tier: "A",
      },
    ],
  },
  {
    id: "gun-trips-te",
    name: "Gun Trips TE",
    family: "3x1 with attached TE",
    threats: ["Drive", "Y Cross", "Smash", "Verts"],
    strengths: ["TE seam creates LB matchup nightmare", "Strong side overloads force coverage rotation", "4 verticals stretches any cover 3 deep"],
    weaknesses: ["Single WR side is easy to double", "TE seam alert defenders can lurk the middle", "Strong safety blitz off the TE side is hard to pick up"],
    adjustments: [
      {
        defense: "Nickel Double A Gap",
        coverage: "Cover 3 Buzz (strong side)",
        blitz: "Strong safety blitz off TE",
        shifts: [
          "Rotate the FS to the trips side",
          "Buzz the SS down to the TE seam",
          "Keep corner on the X in press",
        ],
        hotRoute: "MIKE drop into the TE seam window",
        why: "The SS buzz takes away the TE seam. The A-gap show confuses the OL.",
        tier: "A+",
      },
      {
        defense: "4-3 Over",
        coverage: "Cover 2 Man",
        shifts: ["Double the slot WR", "Walk the DE to the TE"],
        why: "Double the slot eliminates the drive route. DE on TE takes away the seam.",
        tier: "A",
      },
    ],
  },
  {
    id: "gun-empty",
    name: "Gun Empty",
    family: "Spread 5-wide",
    threats: ["Quick game", "RB routes", "All-curl", "Horizontal stretch"],
    strengths: ["Forces defense to show coverage early", "RB vs LB isolation is automatic winner", "Quick game beats any blitz"],
    weaknesses: ["Zero run threat lets defense pin ears back", "Man coverage with 5 rushers can overwhelm OL", "Shallow routes vs zone lurkers can get picked off"],
    adjustments: [
      {
        defense: "Dime 2-3-6",
        coverage: "Cover 0 Man Blitz",
        blitz: "Zero pressure — all 6 come",
        shifts: [
          "Press all 5 receivers",
          "Disguise coverage until snap",
          "Overload one side with 3 rushers",
        ],
        hotRoute: "DB spy on the RB checkdown",
        why: "Empty has no blocker for the 6th rusher. Pre-snap disguise prevents hot routes.",
        tier: "A+",
      },
      {
        defense: "Nickel 3-3-5",
        coverage: "Cover 2 Zone",
        shifts: ["Bail corners into flat zones", "LBs rotate under seams"],
        why: "Zone sits under the quick game. Flat zones take away the RB angle route.",
        tier: "A",
      },
    ],
  },
  {
    id: "i-form",
    name: "I-Formation (Pro/Tight)",
    family: "Power run + play action",
    threats: ["Power O", "Counter", "PA Waggle", "PA Deep Cross"],
    strengths: ["Downhill running punishes light boxes", "PA bootleg exploits run-committed defenders", "FB lead creates extra gap for HB"],
    weaknesses: ["Spread defenses create numbers problems in the box", "Predictable tendencies based on formation", "TE gets double teamed frequently"],
    adjustments: [
      {
        defense: "4-3 Under",
        coverage: "Cover 2 Zone",
        blitz: "Weak side linebacker blitz",
        shifts: [
          "Slant DL away from the run",
          "Walk the WILL linebacker into the B-gap",
          "Keep SS in run support",
        ],
        hotRoute: "MLB spy in the QB scramble lane",
        why: "Slanting DL disrupts zone blocking. WILL blitz hits the FB lead lane before he can seal.",
        tier: "A+",
      },
      {
        defense: "3-4 Odd",
        coverage: "Cover 3",
        shifts: ["Jam both TEs at the line", "OLBs set the edge hard"],
        why: "Jamming TEs disrupts PA timing. OLBs contain the bootleg and keep the QB in the pocket.",
        tier: "A",
      },
    ],
  },
  {
    id: "singleback-ace",
    name: "Singleback Ace",
    family: "Balanced pro set",
    threats: ["Outside zone", "PA Boot", "Smash", "4 Verticals"],
    strengths: ["Balanced formation forces defense to prepare for everything", "Boot action exploits linebacker run keys", "Strong TE presence in both run and pass"],
    weaknesses: ["No FB limits gap creation on runs", "Zone coverage handles the 2x2 route combinations well", "Predictable run direction with single HB"],
    adjustments: [
      {
        defense: "4-3 Over",
        coverage: "Cover 4 Quarters",
        shifts: ["Walk the SS down to cover the TE", "Corners bail into quarters coverage"],
        why: "Quarters takes away the 4 verts shot. SS on TE eliminates the seam.",
        tier: "A+",
      },
      {
        defense: "3-4 Base",
        coverage: "Cover 2 Man",
        blitz: "Weak OLB dog blitz",
        shifts: ["Outside shade on TE", "CB presses the X receiver"],
        why: "Man press forces early release. Dog blitz hits the boot quarterback.",
        tier: "A",
      },
    ],
  },
  {
    id: "shotgun-spread",
    name: "Shotgun Spread / 4-Wide",
    family: "4-wide spread",
    threats: ["RPO", "Quick game", "Bubble screens", "Mesh"],
    strengths: ["RPO puts the defender in a conflict every play", "Bubble screen punishes aggressive CBs", "Forces nickel/dime packages that reduce run defense"],
    weaknesses: ["Single RB means one blocker for blitzes", "Cover 0 man + press can overwhelm quick game", "Speed of execution required to maximize the RPO"],
    adjustments: [
      {
        defense: "3-3-5 Stack",
        coverage: "Cover 2 Man Press",
        shifts: ["Press all 4 WRs", "Show pressure pre-snap", "Backers match RB immediately"],
        why: "Press disrupts bubble timing. Showing pressure masks coverage and prevents pre-snap reads.",
        tier: "A+",
      },
      {
        defense: "Nickel 3-3-5",
        coverage: "Cover 3 Match",
        shifts: ["Flat buzz to disrupt screens", "Match slot receivers man"],
        why: "Match coverage handles rub routes. Flat buzz takes away the bubble.",
        tier: "A",
      },
    ],
  },
];

export type BotPiece = {
  side: "OFF" | "DEF";
  label: string;
  detail: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// NANO BLITZ DATABASE
// ──────────────────────────────────────────────────────────────────────────────

export type NanoBlitz = {
  id: string;
  name: string;
  package: string;
  setup: string;
  pressurePath: string;
  pressure: "instant" | "1-2s" | "2-3s";
  tells: string[];
  counters: string[];
  vulnerable: string[];
  tier: "S" | "A+" | "A";
};

export const NANO_BLITZES: NanoBlitz[] = [
  {
    id: "lightning-a",
    name: "Lightning A-Gap Nano",
    package: "Nickel 3-3-5",
    setup: "Stack both ILBs directly over the center. Show a 2-high safety look. At snap, both ILBs and a DB all crash the same A-gap simultaneously.",
    pressurePath: "Both ILBs burst through the A-gap unblocked. The center cannot double-block, guard has no help.",
    pressure: "instant",
    tells: ["Both ILBs head up the center", "Safety creeping down late", "DB walked into the box last second"],
    counters: ["Hot slant away from the A-gap pressure", "RB quick flat route (RB must be motioned out)", "Snap count variation (draw the offside)"],
    vulnerable: ["Empty formations with RB motioned wide", "Quick mesh concepts", "Any play with pre-snap RB motion"],
    tier: "S",
  },
  {
    id: "overload-edge",
    name: "Overload Edge Nano",
    package: "4-3 Over / Big Nickel",
    setup: "Line up 3 rushers on the same edge — DE, OLB, and a walked-up DB. Remaining rusher stunts inside to occupy the tackle.",
    pressurePath: "Triple edge pressure with stunt inside. One of three edge rushers is always free as the tackle/TE can't account for all three.",
    pressure: "instant",
    tells: ["3 defenders stacked on one edge", "Only 3 in coverage", "Safety walked close pre-snap"],
    counters: ["Hot route the backside WR on a fade", "Screen to the RB away from overload", "Slide protection to the overload side"],
    vulnerable: ["No TE on the overload side", "Single-back formations", "Any slide protection away from the overload"],
    tier: "S",
  },
  {
    id: "zero-lurk",
    name: "Zero Lurk Nano",
    package: "Dime 2-3-6",
    setup: "Show Cover 0 with all DBs in man. One DB walks into the box at the last second acting as an extra rusher but drops into a lurk zone at the snap.",
    pressurePath: "Only 5 actual rushers but the lurker in the middle intercepts any crossing route or checkdown the QB fires to beat the blitz.",
    pressure: "1-2s",
    tells: ["DB appears to blitz but doesn't get into stance", "MLB dropped back unusually deep", "Coverage looks like zero but safety alignment is off"],
    counters: ["Deep shot over the lurker (he can't cover deep)", "RB swing out wide away from lurk zone", "Back shoulder throws to WRs on fades"],
    vulnerable: ["Four verticals attacks the deep space behind the lurk", "RB wheel routes force the lurk to commit"],
    tier: "A+",
  },
  {
    id: "db-fire",
    name: "DB Fire Zone",
    package: "Nickel / Dime",
    setup: "DB blitz from the slot with zone coverage behind it. The slot CB rushes while the LB drops into the slot zone — creates confusion for the QB.",
    pressurePath: "Slot CB gets a free run as OL doesn't account for slot blitzer. QB expects the slot receiver to be open but finds a LB sitting there.",
    pressure: "1-2s",
    tells: ["Slot CB in tight stance near LOS", "LB shifting to the interior late", "5-man look with DBs in unusual alignment"],
    counters: ["Immediate hot to the slot — throw before the LB drops", "Shallow route to the boundary WR away from DB fire", "Audible to a run when you see the slot CB come down"],
    vulnerable: ["Quick game to the boundary", "Outside run away from the slot blitz"],
    tier: "A+",
  },
  {
    id: "bear-zero",
    name: "Bear Zero Nano",
    package: "Bear Front",
    setup: "Bear front (NT over center, DTs in A-gaps) combined with zero man coverage. Every eligible receiver is locked up 1-on-1 with no safety help.",
    pressurePath: "NT immediately occupies center, DTs split both guards, leaving A and B gaps wide open for LB clean-up rushers.",
    pressure: "instant",
    tells: ["NT directly over the center snapper", "Both DTs shaded into A-gaps", "No safeties visible"],
    counters: ["Any quick slant inside — DTs crash upfield, can't drop", "Motion RB out wide for immediate hot route", "Fake the snap count to draw the NT offside"],
    vulnerable: ["All empty sets", "Any RB motioned wide before snap", "Quick inside releases by slot receivers"],
    tier: "S",
  },
  {
    id: "cover-2-fire",
    name: "Cover 2 Fire Blitz",
    package: "4-2-5 Nickel",
    setup: "Show Cover 2 look with 2 safeties deep. At snap, one safety fires the B-gap blitz while the other rotates to single high. Looks like Cover 2, plays like Cover 1 + blitz.",
    pressurePath: "Safety fires unblocked through the B-gap as the OL sets for the 4-man rush. The QB expects 2 deep safeties but there is only one.",
    pressure: "2-3s",
    tells: ["Safety crept in closer than normal Cover 2 depth", "CB shade changes slightly at the line", "Pre-snap rotation looks slightly off"],
    counters: ["Smash concept — safety rotated to single high, the corner still squats", "Deep ball on a post into the vacated deep half", "Run at the safety blitz side — he's gone"],
    vulnerable: ["Post routes attacking the vacated half", "Corner routes on the squat CB side"],
    tier: "A",
  },
  {
    id: "wr-spy-blitz",
    name: "WR Spy + Blitz",
    package: "Specialty packages",
    setup: "Bring an extra rusher while a LB or SS spies the WR that typically runs a hot route. The spy follows the WR instead of rushing — eliminates the hot route option.",
    pressurePath: "6-man pressure creates a free rusher. The spy LB takes away the automatic hot route answer, forcing the QB to hold the ball an extra 0.5 seconds — long enough for the free rusher to arrive.",
    pressure: "instant",
    tells: ["LB mirroring a specific WR pre-snap", "Extra rusher walked to the line late", "6 or 7 near the line of scrimmage"],
    counters: ["Identify the spy and run the WR on a deep route — spy can't cover vertical", "Screen to the RB (spy is on a WR, not the RB)", "Double-move on the spied WR to beat the spy deep"],
    vulnerable: ["Any deep route by the spied WR", "RB flat or wheel routes"],
    tier: "A",
  },
  {
    id: "safety-corner",
    name: "Safety-Corner Blitz",
    package: "Nickel / Cover 2 Shell",
    setup: "Both the safety and corner blitz from the same side simultaneously. Forces a 2-on-1 at the edge that the RT and RB cannot account for.",
    pressurePath: "RT takes the DE, RB picks up the safety blitz, but the corner comes free off the edge with zero blocker available.",
    pressure: "1-2s",
    tells: ["Corner walking up close to the LOS", "Safety shifted toward the blitz side", "Only 2 defenders deep in a 4-man rush look"],
    counters: ["Throw the quick slant to the blitz-side WR before the corner leaves", "Screen to the RB away from the blitz", "Slide OL protection toward the blitz side"],
    vulnerable: ["RB checkdown to the opposite side of the blitz", "Quick slant thrown on a fast cadence"],
    tier: "A+",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// SITUATIONAL PLAYS
// ──────────────────────────────────────────────────────────────────────────────

export type SituationalZone = "redzone" | "goalline" | "4thdown";

export type SituationalPlay = {
  id: string;
  name: string;
  formation: string;
  play: string;
  concept: string;
  zone: SituationalZone;
  distance?: string;
  motion?: string;
  read: string;
  expected: string;
  coverageToAvoid?: string;
  tier: "A+" | "A" | "B+";
};

export const SITUATIONAL_PLAYS: SituationalPlay[] = [
  // ── RED ZONE ──────────────────────────────────────────────────────────────
  {
    id: "rz-flood",
    name: "Red Zone Flood",
    formation: "Gun Trips TE",
    play: "Sail / Flood",
    concept: "3-level flood to the trips side",
    zone: "redzone",
    read: "Safety cheats on the high route → throw the flat. Corner squats → throw the sail over his head. Both cheat → hit the middle crosser.",
    expected: "One of three routes is always open in a compressed red zone — pick the uncovered level",
    coverageToAvoid: "Cover 0 (too quick of a read needed)",
    tier: "A+",
  },
  {
    id: "rz-stack",
    name: "Stack Route Red Zone",
    formation: "Gun Trips Left",
    play: "Stack Routes",
    concept: "Stacked WRs create a pick at the top of the route",
    zone: "redzone",
    motion: "Stack slot behind the outside WR before snap",
    read: "The inside WR runs a slant that picks the outside WR's defender — outside WR runs the corner route wide open",
    expected: "Corner route TD with 1-2 yards of separation — CB can't fight through the pick",
    tier: "A+",
  },
  {
    id: "rz-pa-dig",
    name: "PA Dig Red Zone",
    formation: "I-Form Pro",
    play: "PA Deep Dig",
    concept: "Play action freezes linebackers, dig route splits the zones",
    zone: "redzone",
    read: "Fake the run → linebacker steps up → throw the dig behind him at 10 yards",
    expected: "LB bites on PA, the dig is wide open in the vacated zone — high percentage TD",
    coverageToAvoid: "Cover 0 (no time for PA)",
    tier: "A+",
  },
  {
    id: "rz-rpo",
    name: "RPO Fade-Slant Red Zone",
    formation: "Shotgun Spread",
    play: "Inside Zone RPO with Fade/Slant",
    concept: "Read the CB — fade if he bails, slant if he presses",
    zone: "redzone",
    read: "Pre-snap: CB pressing → throw the inside slant. CB bailing → throw the fade on the sideline.",
    expected: "Either the slant or fade is a guaranteed 1-on-1 depending on CB technique",
    tier: "A",
  },
  {
    id: "rz-corner-post",
    name: "Corner-Post Red Zone",
    formation: "Gun Bunch",
    play: "Corner-Post",
    concept: "Inside WR runs post, outside WR runs corner",
    zone: "redzone",
    motion: "Motion inside WR to widen the bunch",
    read: "Safety goes with the post → throw the corner. Safety squats → throw the post splitting the safeties.",
    expected: "One of the two routes is always a TD shot — high/low concept attacks both safeties",
    tier: "A+",
  },
  {
    id: "rz-back-shoulder",
    name: "Back Shoulder Fade",
    formation: "Singleback Ace",
    play: "Fade Route",
    concept: "Back shoulder throw to the boundary WR",
    zone: "redzone",
    read: "CB in press → throw the back shoulder at the 2-3 yd line. WR turns back, CB can't adjust.",
    expected: "Back shoulder is unguardable when executed properly — TD near the pylon",
    tier: "A+",
  },
  {
    id: "rz-wheel",
    name: "RB Wheel Route",
    formation: "Gun Tight Slots",
    play: "Wheel Concept",
    concept: "RB runs flat → turns up the sideline on a wheel",
    zone: "redzone",
    motion: "Motion RB to the flat before snap",
    read: "LB follows flat route, then can't keep up when RB wheels up the sideline",
    expected: "RB wide open up the sideline — LBs can't cover wheels in the red zone",
    tier: "A",
  },
  // ── GOAL LINE ──────────────────────────────────────────────────────────────
  {
    id: "gl-jumbo",
    name: "Jumbo Power Right",
    formation: "Goal Line / Jumbo",
    play: "HB Power / Off Tackle",
    concept: "Full power blocking with lead FB",
    zone: "goalline",
    read: "Follow the FB into the hole. If the B-gap is sealed, press inside. If edge defender crashes, bounce outside.",
    expected: "Physical TD — your 5 blockers vs their 5 defenders in the box",
    tier: "A+",
  },
  {
    id: "gl-qb-sneak",
    name: "QB Sneak",
    formation: "Under Center (Any)",
    play: "QB Sneak",
    concept: "QB behind center dives into the pile",
    zone: "goalline",
    distance: "1 yard or less",
    read: "Snap and immediately drive forward behind the center. OL double-teams the NT.",
    expected: "Near automatic in Madden 26 — QBs have too much strength rating to stop on short yardage",
    tier: "A+",
  },
  {
    id: "gl-te-corner",
    name: "TE Corner Route GL",
    formation: "Goal Line (2 TE)",
    play: "TE Corner",
    concept: "TE runs corner route from tight formation",
    zone: "goalline",
    read: "TE releases inside then cuts to the pylon. Safety crashes on run fake → TE is wide open in the corner of the end zone.",
    expected: "Safety bites on the run action and TE gets a free corner route TD",
    coverageToAvoid: "Cover 4 (safety stays deep)",
    tier: "A+",
  },
  {
    id: "gl-fade",
    name: "Back Shoulder GL Fade",
    formation: "Goal Line",
    play: "Fade",
    concept: "Outside fade to the boundary",
    zone: "goalline",
    read: "1-on-1 outside — throw back shoulder at the pylon. CB can't both defend the jump ball and the back shoulder.",
    expected: "50/50 ball that your WR wins — physical mismatch on CB",
    tier: "A",
  },
  {
    id: "gl-rollout",
    name: "QB Rollout TD",
    formation: "Goal Line",
    play: "PA Rollout",
    concept: "Sprint-out with back shoulder throw",
    zone: "goalline",
    motion: "Motion a TE or FB across pre-snap",
    read: "Roll out, force the edge defender to choose run or pass. Throw fade or flat based on who opens up.",
    expected: "Defenders crash on run action — QB has easy pitch-and-catch near the pylon",
    tier: "A",
  },
  // ── 4TH DOWN ──────────────────────────────────────────────────────────────
  {
    id: "4th-short",
    name: "4th and Short (1-2 yds)",
    formation: "I-Form Pro",
    play: "HB Dive / QB Sneak",
    concept: "Pure power — one gap, full speed",
    zone: "4thdown",
    distance: "1-2 yards",
    read: "Don't overthink it. Power off center (QB sneak) or HB dive. Commit and go.",
    expected: "High percentage conversion — defense can't stop pure power at 1-2 yards",
    tier: "A+",
  },
  {
    id: "4th-medium",
    name: "4th and Medium (3-5 yds)",
    formation: "Gun Trips TE",
    play: "Drive / Mesh",
    concept: "Pick play guarantees 5 yards",
    zone: "4thdown",
    distance: "3-5 yards",
    read: "Run a pick play (mesh/drive) — the natural rub creates guaranteed separation for 5+ yards.",
    expected: "Pick route is automatic first down on 4th and medium — can't be covered perfectly",
    tier: "A+",
  },
  {
    id: "4th-long",
    name: "4th and Long (6+ yds)",
    formation: "Gun Empty",
    play: "Four Verticals",
    concept: "4 verts + shot play",
    zone: "4thdown",
    distance: "6+ yards",
    motion: "Motion a WR to stress the defense pre-snap",
    read: "Identify the safety rotation pre-snap. Attack the single-covered WR over the top — your best speed WR vs their worst corner.",
    expected: "Explosive play potential — defense can't cover every vertical route in 4th-and-long desperation",
    tier: "A",
  },
  {
    id: "4th-screen",
    name: "4th and 4-6: Screen Conversion",
    formation: "Shotgun Spread",
    play: "HB Screen / WR Screen",
    concept: "Quick screen with blocking setup",
    zone: "4thdown",
    distance: "4-6 yards",
    read: "Defense crashes on 4th down — screen sets up blockers in space. Flip it quickly and let your player win in the open field.",
    expected: "7-12 yards on a well-timed screen — defense over-commits in 4th down desperation",
    tier: "A",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// META TRACKER
// ──────────────────────────────────────────────────────────────────────────────

export type MetaEntry = {
  id: string;
  category: "offense" | "defense";
  name: string;
  tierRank: 1 | 2 | 3;
  whyMeta: string;
  weakness: string;
  popularity: "dominant" | "popular" | "emerging";
  usageRate: number;
};

export const META_ENTRIES: MetaEntry[] = [
  // Offense meta
  {
    id: "meta-gun-bunch",
    category: "offense",
    name: "Gun Bunch / Bunch TE",
    tierRank: 1,
    whyMeta: "Natural rub routes are nearly un-coverable in man. Mesh and stick concepts create automatic conversions against any coverage shell.",
    weakness: "Press coverage with edge pressure off the bunch side can disrupt timing before the rub develops.",
    popularity: "dominant",
    usageRate: 78,
  },
  {
    id: "meta-trips-te",
    category: "offense",
    name: "Gun Trips TE",
    tierRank: 1,
    whyMeta: "TE seam vs LB is automatic. Drive concept beats every coverage. Four verticals stresses any single-high safety.",
    weakness: "Strong safety blitz off the TE side with cover 3 behind it can confuse the reads.",
    popularity: "dominant",
    usageRate: 71,
  },
  {
    id: "meta-empty",
    category: "offense",
    name: "Gun Empty (Various)",
    tierRank: 2,
    whyMeta: "Forces defense to show coverage. RB vs LB isolation is automatic. Quick game beats any blitz package.",
    weakness: "Zero blitz with 6 rushers overwhelms the empty set. No run threat lets defense pin ears back.",
    popularity: "popular",
    usageRate: 64,
  },
  {
    id: "meta-rpo-spread",
    category: "offense",
    name: "RPO Spread (4-Wide)",
    tierRank: 2,
    whyMeta: "RPO puts every defender in a conflict. Bubble screens punish aggressive corners. Converts nickel packages that reduce run defense.",
    weakness: "Press man with 5 rushers overwhelms quick game timing. Needs precise execution.",
    popularity: "popular",
    usageRate: 58,
  },
  {
    id: "meta-i-form",
    category: "offense",
    name: "I-Formation Power",
    tierRank: 3,
    whyMeta: "Emerging counter to nickel-heavy defenses. PA waggle off Power O is near unstoppable once you've established the run.",
    weakness: "Spread defenses and dime packages create numbers problems in the box.",
    popularity: "emerging",
    usageRate: 41,
  },
  // Defense meta
  {
    id: "meta-nickel-335",
    category: "defense",
    name: "Nickel 3-3-5 Odd",
    tierRank: 1,
    whyMeta: "Versatile base against spread. Three LBs give blitz flexibility. Cover 2 man press disrupts rub routes.",
    weakness: "Power run tears through the 3-man DL. TE seam matchups are tough for the LBs.",
    popularity: "dominant",
    usageRate: 82,
  },
  {
    id: "meta-dbl-a-gap",
    category: "defense",
    name: "Double A-Gap Mug",
    tierRank: 1,
    whyMeta: "Freezes the QB pre-snap. Creates free rushers by conflicting the OL. Works from multiple packages.",
    weakness: "Empty with RB motioned out eliminates the threat. Quick hot routes destroy the mug.",
    popularity: "dominant",
    usageRate: 75,
  },
  {
    id: "meta-cover-3-match",
    category: "defense",
    name: "Cover 3 Match",
    tierRank: 1,
    whyMeta: "Pattern matching handles rub routes that destroy man coverage. Flexible enough to convert to man principles.",
    weakness: "Drive-spot concept reliably attacks the match zone. Levels concept floods the vacated hook zone.",
    popularity: "popular",
    usageRate: 68,
  },
  {
    id: "meta-cover-0",
    category: "defense",
    name: "Cover 0 All-Out Blitz",
    tierRank: 2,
    whyMeta: "Instant pressure forces panic throws. In online play, many users freeze when they see zero coverage.",
    weakness: "Any user who pre-snaps reads the coverage and hot routes destroys it. Expert players feast on Cover 0.",
    popularity: "popular",
    usageRate: 62,
  },
  {
    id: "meta-4de",
    category: "defense",
    name: "4 DE Formation",
    tierRank: 2,
    whyMeta: "Elite edge speed creates havoc in passing situations. Mixed with DB blitzes creates near-unblockable pressure.",
    weakness: "Inside run with big formation absolutely demolishes it. Quick inside slants before the DEs can redirect.",
    popularity: "popular",
    usageRate: 55,
  },
  {
    id: "meta-cover-2-man",
    category: "defense",
    name: "Cover 2 Man Press",
    tierRank: 3,
    whyMeta: "Emerging as a counter to bunch formations. Press timing disrupts rub routes before they develop.",
    weakness: "Motion and mesh concepts still attack the man principles. Back shoulder fades vs press are deadly.",
    popularity: "emerging",
    usageRate: 38,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// LURK ALERT SYSTEM
// ──────────────────────────────────────────────────────────────────────────────

export type LurkAlert = {
  id: string;
  coverage: string;
  lurkPosition: string;
  dangerZone: string;
  howToRecognize: string;
  avoidThrow: string;
  beatIt: string;
};

export const LURK_ALERTS: LurkAlert[] = [
  {
    id: "lurk-cover-1-robber",
    coverage: "Cover 1 Robber",
    lurkPosition: "MLB or SS sitting 8-12 yards deep in the middle",
    dangerZone: "Middle of the field at 8-15 yards — the classic robber window",
    howToRecognize: "Single high safety but there's a second defender sitting unusually deep in the middle. QB eyes = interception.",
    avoidThrow: "Do NOT stare down the middle crosser or the dig route. The robber follows your eyes.",
    beatIt: "Attack the sidelines. Deep comeback routes on the outside beat the robber. Flood the flat away from the lurker.",
  },
  {
    id: "lurk-cover-2-hook",
    coverage: "Cover 2 Hook-Curl",
    lurkPosition: "Both ILBs dropping into curl-flat windows",
    dangerZone: "Curl zones at 10-15 yards on both sides of the field",
    howToRecognize: "Linebackers drop very deep pre-snap. CBs stay near the flats instead of bailing. Deep safeties shade inside.",
    avoidThrow: "Do NOT throw a curl route or comeback into either LB window. They're sitting on it.",
    beatIt: "Throw behind the LBs (hitches at 5-7 yards) or over them (seam routes splitting the safeties).",
  },
  {
    id: "lurk-cover-3-hook",
    coverage: "Cover 3 Hook Zone",
    lurkPosition: "Hook zone defender sitting 12-15 yards in the middle",
    dangerZone: "Middle of the field at 12-18 yards — the hook zone",
    howToRecognize: "Three deep defenders plus a linebacker dropping all the way to 15 yards. Any inside throw at that depth is picked.",
    avoidThrow: "Do NOT throw a drag, shallow cross, or dig into the hook zone when the backer is sitting that deep.",
    beatIt: "Flood the flat first to hold the hook defender, then throw the curl over the flat defender or the corner over the CB.",
  },
  {
    id: "lurk-user-lb",
    coverage: "User Linebacker (Any Coverage)",
    lurkPosition: "Human-controlled LB sitting in QB throwing lane",
    dangerZone: "Wherever the user LB positions himself — he's reading your eyes",
    howToRecognize: "One defender moves suspiciously to where your target is. He's user-controlled and reading your eyes.",
    avoidThrow: "Never stare down your primary receiver. Look off the user LB by reading a different area of the field first.",
    beatIt: "Pump fake to draw the user LB, then throw to the vacated area. RB routes force the user to make a choice.",
  },
  {
    id: "lurk-tampa-2",
    coverage: "Tampa 2 MLB",
    lurkPosition: "MLB peeling to deep middle at snap",
    dangerZone: "Deep middle at 20-30 yards — the Tampa hole",
    howToRecognize: "MLB literally sprints straight back at the snap. Deep seam routes are death — he's sitting there waiting.",
    avoidThrow: "Do NOT throw a deep seam or post into the Tampa 2 MLB window. This is his only job and he is very good at it.",
    beatIt: "Smash concept attacks the sideline over the squatting CB. Outside verticals stretch the boundary safety half.",
  },
];
