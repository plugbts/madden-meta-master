// ─── Post-Snap Recognition & Read Engine ─────────────────────────────────────
// Resolves what coverage was ACTUALLY played after the snap.
// Compares to pre-snap prediction and identifies rotations, disguises, blitzes.
// Pure logic — no React, no side effects.

import type { CoverageFamily } from "./coverage-recognition-engine";
import {
  COVERAGE_FAMILY_LABELS,
  COVERAGE_VARIANTS,
  recognizeCoverage,
  type RecognitionInput,
} from "./coverage-recognition-engine";

// ─── Post-Snap Signal Types ───────────────────────────────────────────────────

export type PostSnapSignalId = string;

export type PostSnapSignal = {
  id: PostSnapSignalId;
  name: string;
  category: PostSnapSignalCategory;
  description: string;
};

export type PostSnapSignalCategory =
  | "SafetyRotation"
  | "CornerBehavior"
  | "LinebackerDrop"
  | "BlitzExecution"
  | "ZoneLandmarks"
  | "ManIndicator";

export const POST_SNAP_SIGNALS: PostSnapSignal[] = [
  // Safety Rotation
  { id: "ss_rolls_down_strong", category: "SafetyRotation", name: "Strong Safety Rolls Down (Strong)", description: "SS leaves deep alignment and rotates to flat or box on strong side" },
  { id: "ss_rolls_down_weak",   category: "SafetyRotation", name: "Strong Safety Rolls Down (Weak)",   description: "SS rotates away from initial alignment toward boundary" },
  { id: "fs_rotates_middle",    category: "SafetyRotation", name: "Free Safety Rotates to Middle",     description: "FS moves from split alignment to centerfield zone" },
  { id: "fs_stays_wide",        category: "SafetyRotation", name: "Free Safety Stays Wide/Deep",        description: "FS maintains initial depth and horizontal alignment post-snap" },
  { id: "both_stay_deep",       category: "SafetyRotation", name: "Both Safeties Stay Deep",            description: "No rotation — both safeties hold deep alignment through snap" },
  { id: "safety_inverts",       category: "SafetyRotation", name: "Safety Inverts (Rolls Underneath)",  description: "Safety drops into an underneath zone while corner stays deep" },

  // Corner Behavior
  { id: "corner_bails_deep",    category: "CornerBehavior", name: "Corner Bails to Deep Third/Quarter", description: "Corner who appeared to be pressing retreats to zone after snap" },
  { id: "corner_trails_wr",     category: "CornerBehavior", name: "Corner Plays Trail Man",             description: "Corner follows WR in trail technique — man coverage indicator" },
  { id: "corner_stays_flat",    category: "CornerBehavior", name: "Corner Drops to Flat Zone",          description: "Corner plays a flat zone rather than following WR downfield" },
  { id: "corner_zone_third",    category: "CornerBehavior", name: "Corner Plays Deep Third",            description: "Corner immediately sinks into deep third zone" },

  // Linebacker Drop
  { id: "lb_drops_hook_curl",   category: "LinebackerDrop", name: "LB Drops Hook-Curl Zone",            description: "Inside LB drops into hook to curl zone post-snap" },
  { id: "lb_drops_flat",        category: "LinebackerDrop", name: "LB Drops Flat Zone",                 description: "LB drops into the flat, squeezing out short routes" },
  { id: "lb_drops_seam",        category: "LinebackerDrop", name: "LB Drops Seam / Middle",             description: "LB drops deep into seam or middle zone (Tampa 2 indicator)" },
  { id: "lb_mans_rb",           category: "LinebackerDrop", name: "LB Mans Up on RB",                   description: "LB follows RB in man coverage, leaving passing lane" },
  { id: "lb_blitzes",           category: "LinebackerDrop", name: "LB Rushes Passer",                   description: "Inside or outside LB rushes passer after snap" },

  // Blitz Execution
  { id: "db_blitzes",           category: "BlitzExecution", name: "DB Blitzes (Confirmed Post-Snap)",   description: "DB who appeared to be covering rushes the passer" },
  { id: "delayed_blitz",        category: "BlitzExecution", name: "Delayed Blitz",                      description: "Rusher waited before blitzing — zone drop fake, then rush" },
  { id: "only_four_rush",       category: "BlitzExecution", name: "Only Four Rushers",                  description: "Despite blitz look pre-snap, only four defenders actually rush" },

  // Zone Landmarks
  { id: "soft_zone_cushion",    category: "ZoneLandmarks",  name: "Defenders Playing Soft Zone Cushion", description: "Defenders clearly playing off receivers, zone landmarks visible" },
  { id: "hard_flats_covered",   category: "ZoneLandmarks",  name: "Flat Zones Covered Hard",            description: "Flat zones occupied immediately — short routes contested" },
  { id: "seam_open",            category: "ZoneLandmarks",  name: "Seam Appears Open",                  description: "Vertical seam route between zones is unoccupied" },

  // Man Indicators
  { id: "tight_man_trail",      category: "ManIndicator",   name: "Tight Man Trail on All WRs",         description: "Every receiver has a defender following in man trail" },
  { id: "rb_uncovered",         category: "ManIndicator",   name: "RB Left Uncovered / No Defender",    description: "Running back releases with no defender — indicates zone or missed assignment" },
  { id: "picks_effective",      category: "ManIndicator",   name: "Pick Routes Creating Separation",    description: "Pick/rub routes are separating defenders — confirms man coverage" },
];

const POST_SNAP_SIGNAL_MAP = new Map<PostSnapSignalId, PostSnapSignal>(
  POST_SNAP_SIGNALS.map((s) => [s.id, s])
);

export function getPostSnapSignalsByCategory(
  category: PostSnapSignalCategory
): PostSnapSignal[] {
  return POST_SNAP_SIGNALS.filter((s) => s.category === category);
}

export const POST_SNAP_SIGNAL_CATEGORIES: PostSnapSignalCategory[] = [
  "SafetyRotation",
  "CornerBehavior",
  "LinebackerDrop",
  "BlitzExecution",
  "ZoneLandmarks",
  "ManIndicator",
];

export const POST_SNAP_SIGNAL_CATEGORY_LABELS: Record<PostSnapSignalCategory, string> = {
  SafetyRotation: "Safety Rotation",
  CornerBehavior: "Corner Behavior",
  LinebackerDrop: "Linebacker Drop",
  BlitzExecution: "Blitz Execution",
  ZoneLandmarks:  "Zone Landmarks",
  ManIndicator:   "Man Indicators",
};

// ─── Analysis Input / Output ──────────────────────────────────────────────────

export type RotationType =
  | "None"
  | "Strong rotation"
  | "Weak rotation"
  | "Cover rotation"
  | "Invert (safety under)";

export type PostSnapInput = {
  /** Pre-snap signals that were observed (from coverage-recognition-engine) */
  preSnapSignals: string[];
  /** Pre-snap coverage prediction */
  preSnapPrediction: CoverageFamily | null;
  /** Pre-snap confidence 0-100 */
  preSnapConfidence: number;
  /** What was observed after the snap */
  postSnapSignals: PostSnapSignalId[];
  /** Optional context carried over */
  context?: {
    down?: number;
    distance?: number;
    opponent?: string;
    gameId?: string;
  };
};

export type CoverageResolution = {
  family: CoverageFamily;
  label: string;
  confidence: number;
  variants: string[];
};

export type PostSnapAnalysis = {
  id: string;
  timestamp: number;
  input: PostSnapInput;
  rotation: RotationType;
  rotationDescription: string;
  actualCoverage: CoverageResolution;
  wasDisguised: boolean;
  disguiseDescription: string | null;
  blitzersCount: number;
  blitzConfirmed: boolean;
  insights: string[];
  readOpportunities: ReadOpportunity[];
  aiPayload: PostSnapAiPayload;
};

export type ReadOpportunity = {
  concept: string;
  window: string;
  reasoning: string;
};

export type PostSnapAiPayload = {
  schemaVersion: "post-snap/v1";
  timestamp: number;
  preSnapPrediction: { family: CoverageFamily | null; confidence: number };
  postSnapSignals: { id: PostSnapSignalId; category: PostSnapSignalCategory; name: string }[];
  resolvedCoverage: { family: CoverageFamily; label: string; confidence: number };
  rotation: RotationType;
  wasDisguised: boolean;
  blitzConfirmed: boolean;
  insights: string[];
};

// ─── Signal → Coverage Resolution ────────────────────────────────────────────
// Maps post-snap signal combinations to coverage weights.
// No hardcoded if/else — each signal contributes a weight to each family.

const POST_SNAP_WEIGHTS: Record<PostSnapSignalId, Partial<Record<CoverageFamily, number>>> = {
  ss_rolls_down_strong: { Cover3: 35, Cover6: 20, Cover2: -10, Cover4: -15 },
  ss_rolls_down_weak:   { Cover3: 25, Cover6: 15, ManCoverage: 10, Cover4: -10 },
  fs_rotates_middle:    { Cover3: 40, ManCoverage: -5, Cover4: -15, Cover2: -10 },
  fs_stays_wide:        { Cover4: 30, Cover2: 25, Cover3: -25 },
  both_stay_deep:       { Cover4: 35, Cover2: 25, Cover3: -20, ZeroBlitz: -35 },
  safety_inverts:       { Cover2: 35, Cover6: 15, Cover3: -10, Cover4: -10 },

  corner_bails_deep:    { Cover3: 30, Cover4: 15, ManCoverage: -30 },
  corner_trails_wr:     { ManCoverage: 40, ZeroBlitz: 20, Cover3: -20, Cover2: -10 },
  corner_stays_flat:    { Cover2: 20, Cover3: 10, ManCoverage: -10 },
  corner_zone_third:    { Cover3: 30, Cover2: 10, ManCoverage: -20 },

  lb_drops_hook_curl:   { Cover3: 15, Cover2: 10, ZeroBlitz: -20, ManCoverage: -10 },
  lb_drops_flat:        { Cover2: 20, Cover3: 10, ZeroBlitz: -15 },
  lb_drops_seam:        { Cover2: 30, Cover3: 10, ZeroBlitz: -20 },
  lb_mans_rb:           { ManCoverage: 25, ZeroBlitz: 15, Cover2: -10, Cover3: -10 },
  lb_blitzes:           { ZeroBlitz: 20, ManCoverage: 10, Cover4: -10 },

  db_blitzes:           { ZeroBlitz: 40, ManCoverage: 20, Cover2: -15, Cover3: -15, Cover4: -20 },
  delayed_blitz:        { ZeroBlitz: 25, ManCoverage: 15 },
  only_four_rush:       { Cover3: 10, Cover2: 10, Cover4: 10, ZeroBlitz: -30 },

  soft_zone_cushion:    { Cover3: 15, Cover4: 15, Cover2: 10, ManCoverage: -20, ZeroBlitz: -25 },
  hard_flats_covered:   { Cover2: 20, Cover3: 10, Cover6: 15 },
  seam_open:            { Cover2: 15, Cover3: -10, Cover4: -5 },

  tight_man_trail:      { ManCoverage: 40, ZeroBlitz: 25, Cover3: -20, Cover4: -20 },
  rb_uncovered:         { Cover3: 10, Cover4: 10, Cover2: 5, ManCoverage: -15 },
  picks_effective:      { ManCoverage: 40, ZeroBlitz: 30, Cover3: -20, Cover4: -20 },
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export function analyzePostSnap(input: PostSnapInput): PostSnapAnalysis {
  const { preSnapSignals, preSnapPrediction, preSnapConfidence, postSnapSignals, context } = input;

  // Score coverage families from post-snap signals
  const scores: Record<CoverageFamily, number> = {
    Cover2: 15, Cover3: 20, Cover4: 15, Cover6: 10, ManCoverage: 15, ZeroBlitz: 5,
  };

  for (const sigId of postSnapSignals) {
    const weights = POST_SNAP_WEIGHTS[sigId];
    if (!weights) continue;
    for (const [fam, w] of Object.entries(weights) as [CoverageFamily, number][]) {
      scores[fam] = (scores[fam] ?? 0) + w;
    }
  }

  // Clamp
  for (const fam of Object.keys(scores) as CoverageFamily[]) {
    scores[fam] = Math.max(0, scores[fam]);
  }

  // Normalise
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const sorted = (Object.entries(scores) as [CoverageFamily, number][])
    .map(([fam, raw]) => ({ fam, prob: Math.round((raw / total) * 100) }))
    .sort((a, b) => b.prob - a.prob);

  const topFamily = sorted[0].fam;
  const topProb = sorted[0].prob;

  const actualCoverage: CoverageResolution = {
    family: topFamily,
    label: COVERAGE_FAMILY_LABELS[topFamily],
    confidence: topProb,
    variants: COVERAGE_VARIANTS[topFamily],
  };

  // Rotation detection
  const rotation = detectRotation(postSnapSignals);
  const rotationDescription = describeRotation(rotation, postSnapSignals);

  // Disguise detection
  const wasDisguised =
    preSnapPrediction !== null &&
    preSnapPrediction !== topFamily &&
    preSnapConfidence >= 60;

  const disguiseDescription = wasDisguised
    ? buildDisguiseDescription(preSnapPrediction!, topFamily, rotation)
    : null;

  // Blitz
  const blitzConfirmed =
    postSnapSignals.includes("db_blitzes") ||
    postSnapSignals.includes("lb_blitzes") ||
    postSnapSignals.includes("delayed_blitz");

  const blitzersCount = [
    postSnapSignals.includes("db_blitzes"),
    postSnapSignals.includes("lb_blitzes"),
    postSnapSignals.includes("delayed_blitz"),
  ].filter(Boolean).length + 4; // base 4 rushers

  // Insights
  const insights = buildInsights(input, actualCoverage, wasDisguised, rotation);

  // Read opportunities
  const readOpportunities = buildReadOpportunities(topFamily, postSnapSignals);

  const aiPayload: PostSnapAiPayload = {
    schemaVersion: "post-snap/v1",
    timestamp: Date.now(),
    preSnapPrediction: { family: preSnapPrediction, confidence: preSnapConfidence },
    postSnapSignals: postSnapSignals
      .map((id) => POST_SNAP_SIGNAL_MAP.get(id))
      .filter(Boolean)
      .map((s) => ({ id: s!.id, category: s!.category, name: s!.name })),
    resolvedCoverage: { family: topFamily, label: COVERAGE_FAMILY_LABELS[topFamily], confidence: topProb },
    rotation,
    wasDisguised,
    blitzConfirmed,
    insights,
  };

  return {
    id: `psa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    input,
    rotation,
    rotationDescription,
    actualCoverage,
    wasDisguised,
    disguiseDescription,
    blitzersCount: blitzConfirmed ? blitzersCount : 4,
    blitzConfirmed,
    insights,
    readOpportunities,
    aiPayload,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectRotation(signals: PostSnapSignalId[]): RotationType {
  if (signals.includes("safety_inverts")) return "Invert (safety under)";
  if (signals.includes("ss_rolls_down_strong") && signals.includes("fs_rotates_middle")) return "Cover rotation";
  if (signals.includes("ss_rolls_down_strong")) return "Strong rotation";
  if (signals.includes("ss_rolls_down_weak")) return "Weak rotation";
  return "None";
}

function describeRotation(rotation: RotationType, signals: PostSnapSignalId[]): string {
  switch (rotation) {
    case "Strong rotation":
      return "Strong safety rotated toward the strong side — consistent with Cover 3 Sky or Cover 6.";
    case "Weak rotation":
      return "Strong safety rotated weak — consistent with Cover 3 Cloud or Cover 6 Boundary.";
    case "Cover rotation":
      return "Both safeties rotated post-snap: SS down, FS to middle — classic Cover 3 Buzz rotation from a two-high shell.";
    case "Invert (safety under)":
      return "Safety inverted into underneath coverage while corner played deep — Cover 2 Invert indicator.";
    default:
      return signals.includes("both_stay_deep")
        ? "No rotation — both safeties maintained initial depth. Cover 4 or Cover 2 as shown."
        : "Rotation not clearly identified from observed signals.";
  }
}

function buildDisguiseDescription(
  predicted: CoverageFamily,
  actual: CoverageFamily,
  rotation: RotationType
): string {
  const predLabel = COVERAGE_FAMILY_LABELS[predicted];
  const actLabel = COVERAGE_FAMILY_LABELS[actual];
  const rotDesc = rotation !== "None" ? ` via ${rotation.toLowerCase()}` : "";
  return `Defense showed ${predLabel} pre-snap but played ${actLabel} post-snap${rotDesc}. Classic disguise — adjust read based on rotation cues after the snap.`;
}

function buildInsights(
  input: PostSnapInput,
  resolved: CoverageResolution,
  wasDisguised: boolean,
  rotation: RotationType
): string[] {
  const insights: string[] = [];

  if (wasDisguised) {
    insights.push(
      `Disguised coverage: pre-snap looked like ${COVERAGE_FAMILY_LABELS[input.preSnapPrediction!]}, actual ${resolved.label}.`
    );
  }

  if (rotation !== "None") {
    insights.push(`Post-snap rotation detected: ${rotation}. Use rotation as your primary coverage read key.`);
  }

  if (resolved.family === "Cover3" && input.postSnapSignals.includes("seam_open")) {
    insights.push("Cover 3 — seam route between hash and numbers is the primary attack window.");
  }
  if (resolved.family === "Cover4" && !input.postSnapSignals.includes("rb_uncovered")) {
    insights.push("Cover 4 Quarters — flood concepts and four-verticals stress both safety and corner zones.");
  }
  if (resolved.family === "ManCoverage") {
    insights.push("Man coverage confirmed — motion, picks, and rub routes create separation.");
  }
  if (resolved.family === "ZeroBlitz") {
    insights.push("Zero blitz — hot routes and quick release to your hot read. Max protect if no hot called.");
  }
  if (resolved.family === "Cover2") {
    insights.push("Cover 2 — seam routes between hash and safety, or attack the flat-to-corner combination.");
  }
  if (resolved.family === "Cover6") {
    insights.push("Cover 6 — asymmetric: boundary side plays like Cover 2, field side like Cover 4. Attack boundary flat or field seam.");
  }

  if (input.postSnapSignals.includes("rb_uncovered")) {
    insights.push("RB released uncovered — immediate checkdown or wheel route available.");
  }
  if (input.postSnapSignals.includes("lb_drops_seam")) {
    insights.push("Middle LB dropped into seam — hook-curl window temporarily open outside the hash.");
  }

  return insights;
}

function buildReadOpportunities(
  family: CoverageFamily,
  signals: PostSnapSignalId[]
): ReadOpportunity[] {
  const base: Record<CoverageFamily, ReadOpportunity[]> = {
    Cover2: [
      { concept: "Seam route", window: "Between hash and safety", reasoning: "Cover 2 safeties split — seam between them before they converge" },
      { concept: "Corner route (7 cut)", window: "Behind corner, in front of safety", reasoning: "Corner responsible for flat; corner route attacks void behind him" },
    ],
    Cover3: [
      { concept: "Comeback / out route", window: "Outside the numbers", reasoning: "Cover 3 corner responsible for deep third — flat outside his zone" },
      { concept: "Dig / square-in", window: "18-22 yards between hashes", reasoning: "Hook-curl LBs are underneath — seam between them and corner" },
    ],
    Cover4: [
      { concept: "Four verticals", window: "Seam between safety and corner", reasoning: "Cover 4 splits responsibility — vertical seam threatens both defenders" },
      { concept: "Flood concept", window: "Flat / hook / deep outside", reasoning: "Palms variant switches assignments on crossers — flood stresses this" },
    ],
    Cover6: [
      { concept: "Boundary flat route", window: "Short flat on boundary side", reasoning: "Cover 2 side — corner responsible for flat, safety for deep" },
      { concept: "Field seam / vertical", window: "Field side seam", reasoning: "Cover 4 side — vertical route between safety and corner" },
    ],
    ManCoverage: [
      { concept: "Pick / rub concept", window: "Any route combination", reasoning: "Man coverage — picks create immediate separation" },
      { concept: "Motion to create leverage", window: "Across formation", reasoning: "Motion reveals man, also creates new alignment advantage" },
    ],
    ZeroBlitz: [
      { concept: "Hot route", window: "Blitz side", reasoning: "Zero blitz — hot route to blitzing side is the designed answer" },
      { concept: "Slant / quick hitch", window: "Immediate release", reasoning: "Fast throw before pressure arrives; no safety over top" },
    ],
  };

  const opps = base[family] ?? [];

  if (signals.includes("rb_uncovered")) {
    opps.push({ concept: "RB checkdown", window: "Flat / swing", reasoning: "RB released with no defender — immediate safe outlet" });
  }

  return opps;
}
