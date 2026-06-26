// Madden 26 — Defensive Playbooks by Team
// Covers all 32 NFL teams, packages, formations, and plays
// Each play maps to a coverageId in madden-data.ts COVERAGES array

export type SchemeKey = "34" | "43" | "multiple" | "335";

export type DefPlay = {
  name: string;
  coverageId: string;
  isBlitz?: boolean;
};

export type DefFormation = {
  name: string;
  plays: DefPlay[];
};

export type DefPackage = {
  name: string;
  shortName: string;
  formations: DefFormation[];
};

export type TeamDef = {
  team: string;
  city: string;
  abbr: string;
  conf: "AFC" | "NFC";
  div: "East" | "North" | "South" | "West";
  scheme: string;
  schemeKey: SchemeKey;
  colorClass: string; // tailwind bg color for team dot
};

// ─────────────────────────────────────────────────────────────
// SCHEME PACKAGES — formations & plays per scheme type
// ─────────────────────────────────────────────────────────────

const PKG_34: DefPackage[] = [
  {
    name: "Base Defense",
    shortName: "Base",
    formations: [
      {
        name: "3-4 Base",
        plays: [
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Tampa 2", coverageId: "tampa-2" },
          { name: "Cover 3 Sky", coverageId: "cover-3" },
          { name: "Cover 3 Buzz", coverageId: "cover-3" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
        ],
      },
      {
        name: "3-4 Odd",
        plays: [
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Overload Edge Blitz", coverageId: "4de-blitz", isBlitz: true },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
        ],
      },
      {
        name: "3-4 Over",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Cover 2 Sink", coverageId: "cover-2-sink" },
          { name: "Cover 3 Cloud", coverageId: "cover-3-cloud" },
          { name: "Cover 1 Press", coverageId: "cover-1-press" },
          { name: "Cover 4 Palms", coverageId: "cover-4" },
          { name: "Bear Zero", coverageId: "bear-blitz", isBlitz: true },
        ],
      },
      {
        name: "3-4 Under",
        plays: [
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 3 Sky", coverageId: "cover-3" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 6 QQ Half", coverageId: "cover-6" },
        ],
      },
    ],
  },
  {
    name: "Nickel",
    shortName: "Nickel",
    formations: [
      {
        name: "Nickel 3-3-5",
        plays: [
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
        ],
      },
      {
        name: "Nickel 3-3-5 Odd",
        plays: [
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Cover 3 Buzz", coverageId: "cover-3" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "DB Fire Zone", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
        ],
      },
      {
        name: "Nickel DBL A Gap",
        plays: [
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 3 Buzz", coverageId: "cover-3" },
        ],
      },
      {
        name: "Big Nickel Over G",
        plays: [
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
          { name: "Cover 6 QQ Half", coverageId: "cover-6" },
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Tampa 2", coverageId: "tampa-2" },
        ],
      },
    ],
  },
  {
    name: "Dime",
    shortName: "Dime",
    formations: [
      {
        name: "Dime 3-2-6",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
        ],
      },
      {
        name: "Dime 2-3-6",
        plays: [
          { name: "Cover 1 Press", coverageId: "cover-1-press" },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Cover 3 Sky", coverageId: "cover-3" },
        ],
      },
    ],
  },
  {
    name: "Goal Line",
    shortName: "GL",
    formations: [
      {
        name: "Goal Line",
        plays: [
          { name: "Bear Zero", coverageId: "bear-blitz", isBlitz: true },
          { name: "Cover 0 Goal Line", coverageId: "cover-0", isBlitz: true },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Goal Line Stand", coverageId: "cover-2-man" },
        ],
      },
      {
        name: "Goal Line Stand",
        plays: [
          { name: "Bear Zero", coverageId: "bear-blitz", isBlitz: true },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Cover 1 Press", coverageId: "cover-1-press" },
        ],
      },
    ],
  },
];

const PKG_43: DefPackage[] = [
  {
    name: "Base Defense",
    shortName: "Base",
    formations: [
      {
        name: "4-3 Over",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Tampa 2", coverageId: "tampa-2" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 3 Sky", coverageId: "cover-3" },
        ],
      },
      {
        name: "4-3 Under",
        plays: [
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Cover 3 Buzz", coverageId: "cover-3" },
          { name: "Cover 2 Sink", coverageId: "cover-2-sink" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
        ],
      },
      {
        name: "4-3 Even",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
          { name: "Cover 1 Press", coverageId: "cover-1-press" },
          { name: "Cover 6 QQ Half", coverageId: "cover-6" },
        ],
      },
      {
        name: "4-3 Wide",
        plays: [
          { name: "Cover 3 Sky", coverageId: "cover-3" },
          { name: "Cover 3 Cloud", coverageId: "cover-3-cloud" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "4 DE Overload Blitz", coverageId: "4de-blitz", isBlitz: true },
        ],
      },
    ],
  },
  {
    name: "Nickel",
    shortName: "Nickel",
    formations: [
      {
        name: "Nickel 2-4-5",
        plays: [
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
        ],
      },
      {
        name: "Nickel Normal",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Tampa 2", coverageId: "tampa-2" },
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "DB Fire Zone", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
        ],
      },
      {
        name: "Nickel DBL A Gap",
        plays: [
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 3 Buzz", coverageId: "cover-3" },
        ],
      },
    ],
  },
  {
    name: "Dime",
    shortName: "Dime",
    formations: [
      {
        name: "Dime Normal",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
        ],
      },
      {
        name: "Dime 4-1-6",
        plays: [
          { name: "Cover 1 Press", coverageId: "cover-1-press" },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
        ],
      },
    ],
  },
  {
    name: "Goal Line",
    shortName: "GL",
    formations: [
      {
        name: "Goal Line",
        plays: [
          { name: "Cover 0 Goal Line", coverageId: "cover-0", isBlitz: true },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Bear Zero", coverageId: "bear-blitz", isBlitz: true },
          { name: "Goal Line Stand", coverageId: "cover-2-man" },
        ],
      },
    ],
  },
];

const PKG_335: DefPackage[] = [
  {
    name: "Base Defense",
    shortName: "Base",
    formations: [
      {
        name: "3-3-5 Stack",
        plays: [
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 3 Buzz", coverageId: "cover-3" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
        ],
      },
      {
        name: "3-3-5 Odd",
        plays: [
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
        ],
      },
      {
        name: "3-3-5 Wide",
        plays: [
          { name: "Cover 3 Sky", coverageId: "cover-3" },
          { name: "Cover 3 Cloud", coverageId: "cover-3-cloud" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
          { name: "Cover 6 QQ Half", coverageId: "cover-6" },
          { name: "4 DE Overload", coverageId: "4de-blitz", isBlitz: true },
        ],
      },
    ],
  },
  {
    name: "Nickel",
    shortName: "Nickel",
    formations: [
      {
        name: "Nickel 3-3-5",
        plays: [
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
        ],
      },
      {
        name: "Nickel DBL A Gap",
        plays: [
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 3 Buzz", coverageId: "cover-3" },
        ],
      },
      {
        name: "Nickel 3-3-5 Odd",
        plays: [
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "DB Fire Zone", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
        ],
      },
    ],
  },
  {
    name: "Dime",
    shortName: "Dime",
    formations: [
      {
        name: "Dime 3-2-6",
        plays: [
          { name: "Cover 1 Press", coverageId: "cover-1-press" },
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
        ],
      },
      {
        name: "Dime Normal",
        plays: [
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
        ],
      },
    ],
  },
  {
    name: "Goal Line",
    shortName: "GL",
    formations: [
      {
        name: "Goal Line",
        plays: [
          { name: "Bear Zero", coverageId: "bear-blitz", isBlitz: true },
          { name: "Cover 0 Goal Line", coverageId: "cover-0", isBlitz: true },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
        ],
      },
    ],
  },
];

const PKG_MULTIPLE: DefPackage[] = [
  {
    name: "Base Defense",
    shortName: "Base",
    formations: [
      {
        name: "4-3 Over",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Tampa 2", coverageId: "tampa-2" },
          { name: "Cover 3 Sky", coverageId: "cover-3" },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 4 Quarters", coverageId: "cover-4" },
        ],
      },
      {
        name: "3-4 Odd",
        plays: [
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 3 Buzz", coverageId: "cover-3" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
        ],
      },
      {
        name: "4-4 Split",
        plays: [
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Bear Zero", coverageId: "bear-blitz", isBlitz: true },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
        ],
      },
    ],
  },
  {
    name: "Nickel",
    shortName: "Nickel",
    formations: [
      {
        name: "Nickel 3-3-5",
        plays: [
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 2 Man", coverageId: "cover-2-man" },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
        ],
      },
      {
        name: "Nickel Normal",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Cover 1 Robber", coverageId: "cover-1" },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
        ],
      },
      {
        name: "Nickel DBL A Gap",
        plays: [
          { name: "Double A Gap", coverageId: "dbl-mug", isBlitz: true },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 0 Blitz", coverageId: "cover-0", isBlitz: true },
          { name: "Cover 1 Press", coverageId: "cover-1-press" },
        ],
      },
    ],
  },
  {
    name: "Dime",
    shortName: "Dime",
    formations: [
      {
        name: "Dime Normal",
        plays: [
          { name: "Cover 2", coverageId: "cover-2" },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Zero Blitz", coverageId: "zero-blitz", isBlitz: true },
          { name: "Cover 3 Match", coverageId: "cover-3-match" },
        ],
      },
    ],
  },
  {
    name: "Goal Line",
    shortName: "GL",
    formations: [
      {
        name: "Goal Line",
        plays: [
          { name: "Cover 0 Goal Line", coverageId: "cover-0", isBlitz: true },
          { name: "Cover 1 Man Free", coverageId: "cover-1" },
          { name: "Bear Zero", coverageId: "bear-blitz", isBlitz: true },
        ],
      },
    ],
  },
];

export function getPackages(schemeKey: SchemeKey): DefPackage[] {
  switch (schemeKey) {
    case "34": return PKG_34;
    case "43": return PKG_43;
    case "335": return PKG_335;
    case "multiple": return PKG_MULTIPLE;
  }
}

// ─────────────────────────────────────────────────────────────
// ALL 32 NFL TEAMS
// ─────────────────────────────────────────────────────────────

export const NFL_TEAMS: TeamDef[] = [
  // AFC East
  { team: "Bills", city: "Buffalo", abbr: "BUF", conf: "AFC", div: "East", scheme: "4-3 Multiple", schemeKey: "multiple", colorClass: "bg-blue-600" },
  { team: "Dolphins", city: "Miami", abbr: "MIA", conf: "AFC", div: "East", scheme: "3-3-5 Zone", schemeKey: "335", colorClass: "bg-cyan-500" },
  { team: "Patriots", city: "New England", abbr: "NE", conf: "AFC", div: "East", scheme: "3-4 Base", schemeKey: "34", colorClass: "bg-blue-900" },
  { team: "Jets", city: "New York", abbr: "NYJ", conf: "AFC", div: "East", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-green-700" },
  // AFC North
  { team: "Ravens", city: "Baltimore", abbr: "BAL", conf: "AFC", div: "North", scheme: "Multiple / Aggressive", schemeKey: "multiple", colorClass: "bg-purple-700" },
  { team: "Steelers", city: "Pittsburgh", abbr: "PIT", conf: "AFC", div: "North", scheme: "3-4 Base", schemeKey: "34", colorClass: "bg-yellow-500" },
  { team: "Browns", city: "Cleveland", abbr: "CLE", conf: "AFC", div: "North", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-orange-600" },
  { team: "Bengals", city: "Cincinnati", abbr: "CIN", conf: "AFC", div: "North", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-orange-500" },
  // AFC South
  { team: "Texans", city: "Houston", abbr: "HOU", conf: "AFC", div: "South", scheme: "4-3 Aggressive", schemeKey: "43", colorClass: "bg-red-700" },
  { team: "Colts", city: "Indianapolis", abbr: "IND", conf: "AFC", div: "South", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-blue-700" },
  { team: "Jaguars", city: "Jacksonville", abbr: "JAX", conf: "AFC", div: "South", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-teal-600" },
  { team: "Titans", city: "Tennessee", abbr: "TEN", conf: "AFC", div: "South", scheme: "3-4 Base", schemeKey: "34", colorClass: "bg-blue-500" },
  // AFC West
  { team: "Chiefs", city: "Kansas City", abbr: "KC", conf: "AFC", div: "West", scheme: "4-3 Blitz-Heavy", schemeKey: "43", colorClass: "bg-red-600" },
  { team: "Raiders", city: "Las Vegas", abbr: "LV", conf: "AFC", div: "West", scheme: "3-4 Base", schemeKey: "34", colorClass: "bg-gray-500" },
  { team: "Broncos", city: "Denver", abbr: "DEN", conf: "AFC", div: "West", scheme: "3-4 Odd", schemeKey: "34", colorClass: "bg-orange-600" },
  { team: "Chargers", city: "Los Angeles", abbr: "LAC", conf: "AFC", div: "West", scheme: "3-4 Zone", schemeKey: "34", colorClass: "bg-blue-500" },
  // NFC East
  { team: "Cowboys", city: "Dallas", abbr: "DAL", conf: "NFC", div: "East", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-blue-800" },
  { team: "Eagles", city: "Philadelphia", abbr: "PHI", conf: "NFC", div: "East", scheme: "4-3 Aggressive", schemeKey: "43", colorClass: "bg-green-800" },
  { team: "Giants", city: "New York", abbr: "NYG", conf: "NFC", div: "East", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-blue-900" },
  { team: "Commanders", city: "Washington", abbr: "WSH", conf: "NFC", div: "East", scheme: "3-4 Base", schemeKey: "34", colorClass: "bg-red-800" },
  // NFC North
  { team: "Bears", city: "Chicago", abbr: "CHI", conf: "NFC", div: "North", scheme: "Multiple / 4-3", schemeKey: "multiple", colorClass: "bg-blue-950" },
  { team: "Lions", city: "Detroit", abbr: "DET", conf: "NFC", div: "North", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-blue-500" },
  { team: "Packers", city: "Green Bay", abbr: "GB", conf: "NFC", div: "North", scheme: "3-4 Base", schemeKey: "34", colorClass: "bg-green-700" },
  { team: "Vikings", city: "Minnesota", abbr: "MIN", conf: "NFC", div: "North", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-purple-700" },
  // NFC South
  { team: "Falcons", city: "Atlanta", abbr: "ATL", conf: "NFC", div: "South", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-red-700" },
  { team: "Panthers", city: "Carolina", abbr: "CAR", conf: "NFC", div: "South", scheme: "4-3 Base", schemeKey: "43", colorClass: "bg-blue-500" },
  { team: "Saints", city: "New Orleans", abbr: "NO", conf: "NFC", div: "South", scheme: "3-4 Multiple", schemeKey: "multiple", colorClass: "bg-yellow-600" },
  { team: "Buccaneers", city: "Tampa Bay", abbr: "TB", conf: "NFC", div: "South", scheme: "4-2-5 Nickel", schemeKey: "335", colorClass: "bg-red-700" },
  // NFC West
  { team: "Cardinals", city: "Arizona", abbr: "ARI", conf: "NFC", div: "West", scheme: "3-4 Odd", schemeKey: "34", colorClass: "bg-red-600" },
  { team: "Rams", city: "Los Angeles", abbr: "LAR", conf: "NFC", div: "West", scheme: "3-4 Base", schemeKey: "34", colorClass: "bg-blue-700" },
  { team: "49ers", city: "San Francisco", abbr: "SF", conf: "NFC", div: "West", scheme: "3-4 Odd / Zone", schemeKey: "34", colorClass: "bg-red-700" },
  { team: "Seahawks", city: "Seattle", abbr: "SEA", conf: "NFC", div: "West", scheme: "4-3 Cover 3 Heavy", schemeKey: "43", colorClass: "bg-green-800" },
];
