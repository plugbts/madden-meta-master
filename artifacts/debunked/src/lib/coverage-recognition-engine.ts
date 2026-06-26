// ─── Coverage Recognition Engine ─────────────────────────────────────────────
// Signal-based framework — no hardcoded if/else chains.
// Signals are observable facts. Weights drive probability scoring.
// Add new coverages by extending SIGNAL_REGISTRY and COVERAGE_BASELINES.

// ─── Coverage Families ────────────────────────────────────────────────────────

export type CoverageFamily =
  | "Cover2"
  | "Cover3"
  | "Cover4"
  | "Cover6"
  | "ManCoverage"
  | "ZeroBlitz";

export const COVERAGE_FAMILY_LABELS: Record<CoverageFamily, string> = {
  Cover2:      "Cover 2",
  Cover3:      "Cover 3",
  Cover4:      "Cover 4",
  Cover6:      "Cover 6",
  ManCoverage: "Man Coverage",
  ZeroBlitz:   "Zero Blitz",
};

export const COVERAGE_VARIANTS: Record<CoverageFamily, string[]> = {
  Cover2:      ["Cover 2 Zone", "Tampa 2", "Cover 2 Invert"],
  Cover3:      ["Cover 3 Sky", "Cover 3 Buzz", "Cover 3 Cloud", "Cover 3 Match"],
  Cover4:      ["Cover 4 Quarters", "Cover 4 Palms", "Cover 4 Quarters Buc"],
  Cover6:      ["Cover 6 Field", "Cover 6 Boundary"],
  ManCoverage: ["Cover 1 Man Free", "Cover 1 Robber", "Cover 2 Man Under"],
  ZeroBlitz:   ["Zero Blitz", "Zero Press", "Zero Creeper"],
};

// ─── Signal System ────────────────────────────────────────────────────────────

export type SignalId = string;

/** A single observable fact about the defense — visible before or after the snap. */
export type Signal = {
  id: SignalId;
  category: SignalCategory;
  name: string;
  description: string;
  /**
   * Weight contribution to each coverage family when this signal is PRESENT.
   * Positive: increases probability. Negative: decreases probability.
   * Omit a family to contribute 0 weight.
   */
  weights: Partial<Record<CoverageFamily, number>>;
};

export type SignalCategory =
  | "SafetyAlignment"
  | "CornerTechnique"
  | "LinebackerDepth"
  | "SlotDefender"
  | "DLineAlignment"
  | "PreSnapMotion"
  | "PostSnapRotation"
  | "BlitzIndicator";

// ─── Signal Registry ──────────────────────────────────────────────────────────
// This is the only place coverage logic lives.
// To add a new coverage type: add it to CoverageFamily, update COVERAGE_BASELINES,
// and add/update signal weights here.

export const SIGNAL_REGISTRY: Signal[] = [
  // Safety Alignment
  {
    id: "two_high_split",
    category: "SafetyAlignment",
    name: "Two High Safeties (Split)",
    description: "Both safeties aligned deep (15+ yds) and split to hash marks",
    weights: { Cover2: 30, Cover4: 28, Cover6: 15, ManCoverage: -20, ZeroBlitz: -30 },
  },
  {
    id: "single_high_centerfield",
    category: "SafetyAlignment",
    name: "Single High (Centerfield)",
    description: "One safety deep middle, other in or near box",
    weights: { Cover3: 35, ManCoverage: 25, Cover2: -20, Cover4: -15, ZeroBlitz: -10 },
  },
  {
    id: "safety_rotated_strong",
    category: "SafetyAlignment",
    name: "Safety Rotated Strong Pre-Snap",
    description: "Strong safety cheated toward strong side",
    weights: { Cover6: 30, Cover3: 10, Cover2: -10, Cover4: -5 },
  },
  {
    id: "safety_rotated_weak",
    category: "SafetyAlignment",
    name: "Safety Rotated Weak Pre-Snap",
    description: "Free safety rolled toward boundary pre-snap",
    weights: { Cover6: 20, Cover3: 15, ManCoverage: 5, Cover4: -10 },
  },
  {
    id: "both_safeties_in_box",
    category: "SafetyAlignment",
    name: "Both Safeties Near Box",
    description: "Both safeties 7 yards or less from LOS",
    weights: { ZeroBlitz: 40, ManCoverage: 15, Cover2: -30, Cover3: -20, Cover4: -30 },
  },
  {
    id: "safety_quarters_depth",
    category: "SafetyAlignment",
    name: "Safeties at Quarters Depth (10-12 yds)",
    description: "Both safeties mid-depth aligned over #2 receivers",
    weights: { Cover4: 35, Cover2: 10, Cover3: -10, ZeroBlitz: -25 },
  },

  // Corner Technique
  {
    id: "corner_press",
    category: "CornerTechnique",
    name: "Corners in Press Coverage",
    description: "Outside corners within 2 yards of WR at snap",
    weights: { ZeroBlitz: 25, ManCoverage: 20, Cover3: 5, Cover2: -10, Cover4: -5 },
  },
  {
    id: "corner_off_cushion",
    category: "CornerTechnique",
    name: "Corners in Off / Cushion",
    description: "Outside corners 7+ yards off WR, sitting in zone drops",
    weights: { Cover2: 20, Cover3: 20, Cover4: 15, ManCoverage: -15, ZeroBlitz: -25 },
  },
  {
    id: "corner_inside_shade",
    category: "CornerTechnique",
    name: "Corner Inside Shade on WR",
    description: "Corner shading inside shoulder of WR",
    weights: { ManCoverage: 20, Cover3: 5, Cover6: 5, Cover2: -5 },
  },
  {
    id: "corner_outside_shade",
    category: "CornerTechnique",
    name: "Corner Outside Shade on WR",
    description: "Corner shading outside shoulder, protecting deep outside",
    weights: { Cover2: 15, Cover3: 10, ManCoverage: 5, ZeroBlitz: -10 },
  },
  {
    id: "boundary_corner_press",
    category: "CornerTechnique",
    name: "Boundary Corner Press (Field Corner Off)",
    description: "Boundary CB pressed, field CB off — asymmetric coverage",
    weights: { Cover6: 35, ManCoverage: 10, Cover2: -10, Cover4: -10 },
  },

  // Linebacker Depth
  {
    id: "lb_mugged_agap",
    category: "LinebackerDepth",
    name: "LB Mugged / A-Gap Shade",
    description: "Inside LB walked up in A-gap between 0-3 yards from LOS",
    weights: { ZeroBlitz: 30, ManCoverage: 15, Cover3: -10, Cover4: -15, Cover2: -10 },
  },
  {
    id: "lb_normal_depth",
    category: "LinebackerDepth",
    name: "LBs at Normal Depth",
    description: "Inside LBs at standard 4-6 yard depth",
    weights: { Cover3: 10, Cover2: 10, Cover4: 10, ZeroBlitz: -15 },
  },
  {
    id: "lb_deep_hook_zone",
    category: "LinebackerDepth",
    name: "LB Dropping to Deep Hook/Curl Zone",
    description: "LB dropping 8+ yards, likely covering hook-to-curl",
    weights: { Cover2: 20, Cover3: 10, ZeroBlitz: -20, ManCoverage: -15 },
  },
  {
    id: "lb_wide_split",
    category: "LinebackerDepth",
    name: "LBs Wide Split",
    description: "Inside LBs spread wide before snap",
    weights: { Cover4: 15, Cover2: 10, ZeroBlitz: -10 },
  },

  // Slot Defender
  {
    id: "slot_corner_trail",
    category: "SlotDefender",
    name: "Nickel / Slot Corner Playing Trail",
    description: "Slot defender walking with #2 receiver in man trail technique",
    weights: { ManCoverage: 30, ZeroBlitz: 20, Cover2: -10, Cover3: -10 },
  },
  {
    id: "slot_mugged",
    category: "SlotDefender",
    name: "Nickel Mugged / Walked Up",
    description: "Slot defender walked up tight inside, blitz look",
    weights: { ZeroBlitz: 25, ManCoverage: 10, Cover3: -5, Cover4: -5 },
  },
  {
    id: "slot_zone_drop",
    category: "SlotDefender",
    name: "Slot Defender in Zone Drop",
    description: "Slot defender aligned in position consistent with zone landmarks",
    weights: { Cover2: 15, Cover3: 15, Cover4: 15, ManCoverage: -20 },
  },

  // DLine
  {
    id: "dl_wide_rush",
    category: "DLineAlignment",
    name: "D-Line Wide Pass Rush Alignment",
    description: "Defensive ends aligned wider than normal for speed rush",
    weights: { ZeroBlitz: 10, ManCoverage: 5, Cover2: 5 },
  },
  {
    id: "dl_over_shifted",
    category: "DLineAlignment",
    name: "D-Line Over (Shifted Strong)",
    description: "D-line shifted toward strong side",
    weights: { Cover3: 5, Cover6: 10, Cover4: 5 },
  },

  // Pre-Snap Motion Responses
  {
    id: "db_follows_motion",
    category: "PreSnapMotion",
    name: "DB Follows Motion (Man Indicator)",
    description: "A DB travels with the motioning receiver across formation",
    weights: { ManCoverage: 35, ZeroBlitz: 25, Cover2: -20, Cover3: -15, Cover4: -15 },
  },
  {
    id: "defense_shifts_to_motion",
    category: "PreSnapMotion",
    name: "Defense Rotates / Shifts to Motion (Zone Indicator)",
    description: "Coverage rotates as a unit to the motion, no individual follow",
    weights: { Cover3: 20, Cover2: 15, Cover4: 10, Cover6: 15, ManCoverage: -20 },
  },
  {
    id: "no_reaction_to_motion",
    category: "PreSnapMotion",
    name: "No Reaction to Motion",
    description: "Defense does not adjust to offensive motion",
    weights: { Cover4: 15, Cover3: 10, Cover2: 5 },
  },

  // Post-Snap Rotation Signals
  {
    id: "post_safety_rolls_down_strong",
    category: "PostSnapRotation",
    name: "Strong Safety Rotates Down Post-Snap",
    description: "Safety on strong side rolls down into flat or box after snap",
    weights: { Cover3: 30, ManCoverage: 10, Cover2: -10, Cover4: -15 },
  },
  {
    id: "post_safety_rotates_middle",
    category: "PostSnapRotation",
    name: "Free Safety Rotates to Middle Post-Snap",
    description: "FS shifts to centerfield coverage after snap despite pre-snap split look",
    weights: { Cover3: 35, Cover6: 10, Cover4: -10, Cover2: -15 },
  },
  {
    id: "post_both_safeties_stay_deep",
    category: "PostSnapRotation",
    name: "Both Safeties Stay Deep Post-Snap",
    description: "No rotation — both safeties maintain deep alignment through snap",
    weights: { Cover4: 30, Cover2: 20, Cover3: -20, ZeroBlitz: -30 },
  },
  {
    id: "post_corner_bails",
    category: "PostSnapRotation",
    name: "Corner Bails to Deep Zone Post-Snap",
    description: "Corner who was press pre-snap bails to deep third/quarter",
    weights: { Cover3: 20, Cover4: 15, ManCoverage: -25 },
  },
  {
    id: "post_safety_invert",
    category: "PostSnapRotation",
    name: "Safety Inverts (Rolls Into Underneath Coverage)",
    description: "Deep safety rotates down into flat or hook zone while corner stays deep",
    weights: { Cover2: 30, Cover6: 15, Cover3: -10, Cover4: -10 },
  },

  // Blitz Indicators
  {
    id: "extra_rusher_visible",
    category: "BlitzIndicator",
    name: "5+ Rushers Pre-Snap",
    description: "More than 4 defenders appear to be rushing",
    weights: { ZeroBlitz: 35, ManCoverage: 15, Cover2: -20, Cover3: -15, Cover4: -20 },
  },
  {
    id: "cb_blitz_walk_down",
    category: "BlitzIndicator",
    name: "Corner / DB Walked Down to LOS",
    description: "A DB not typically rushing walked to line of scrimmage",
    weights: { ZeroBlitz: 30, ManCoverage: 10, Cover2: -10, Cover3: -10 },
  },
  {
    id: "no_blitz_indicators",
    category: "BlitzIndicator",
    name: "No Blitz Indicators",
    description: "Defense showing standard look with no additional rushers",
    weights: { Cover4: 10, Cover3: 10, Cover2: 10, ZeroBlitz: -30, ManCoverage: -5 },
  },
];

// Registry lookup map
const REGISTRY_MAP = new Map<SignalId, Signal>(
  SIGNAL_REGISTRY.map((s) => [s.id, s])
);

export function getSignal(id: SignalId): Signal | undefined {
  return REGISTRY_MAP.get(id);
}

export function getSignalsByCategory(category: SignalCategory): Signal[] {
  return SIGNAL_REGISTRY.filter((s) => s.category === category);
}

// ─── Coverage Baselines ───────────────────────────────────────────────────────
// Prior probability for each coverage family (must sum to 100).
// Represents league-wide usage rates as a neutral starting point.

export const COVERAGE_BASELINES: Record<CoverageFamily, number> = {
  Cover3:      28,
  Cover4:      22,
  ManCoverage: 20,
  Cover2:      15,
  Cover6:      10,
  ZeroBlitz:    5,
};

// ─── Input / Output Types ─────────────────────────────────────────────────────

export type RecognitionContext = {
  down?: 1 | 2 | 3 | 4;
  distance?: number;
  hashmark?: "Left" | "Middle" | "Right";
  gameScript?: "Normal" | "Must-pass" | "Run-heavy" | "Two-minute";
  fieldZone?: "Own territory" | "Midfield" | "Redzone" | "Goalline";
};

export type RecognitionInput = {
  signals: SignalId[];
  context?: RecognitionContext;
  observerConfidence?: number; // 0-100: how confident the user is in their observations
};

export type CoverageScore = {
  family: CoverageFamily;
  label: string;
  probability: number;       // 0-100, normalised
  rawScore: number;          // unnormalised
  variants: string[];        // likely sub-variants given signals
  supportingSignals: { id: SignalId; name: string; contribution: number }[];
  contradictingSignals: { id: SignalId; name: string; penalty: number }[];
};

// Confidence thresholds for gated output
export const RECOGNITION_MIN_CONFIDENCE = 30;  // below this → "Unknown"
export const RECOGNITION_AMBIGUITY_GAP  = 12;  // gap < this between #1/#2 → "Multiple Possibilities"

export type CoverageConclusion = CoverageFamily | "Unknown" | "Multiple Possibilities";

export type RecognitionResult = {
  id: string;
  timestamp: number;
  input: RecognitionInput;
  scores: CoverageScore[];               // sorted by probability desc
  topCoverage: CoverageFamily;
  topProbability: number;
  isAmbiguous: boolean;                  // true if top two are within RECOGNITION_AMBIGUITY_GAP
  isLowConfidence: boolean;              // true if topProbability < RECOGNITION_MIN_CONFIDENCE
  coverageConclusion: CoverageConclusion; // gated output — "Unknown" / "Multiple Possibilities" / specific family
  evidenceTrace: string[];               // human-readable list of signals that drove the top prediction
  aiPayload: CoverageAiPayload;          // structured for downstream AI processing
};

/** Structured payload ready for AI consumption — no presentation concerns. */
export type CoverageAiPayload = {
  schemaVersion: "coverage-recognition/v1";
  timestamp: number;
  observedSignals: { id: SignalId; category: SignalCategory; name: string }[];
  context: RecognitionContext;
  coverageDistribution: { family: CoverageFamily; probability: number; variants: string[] }[];
  topCoverage: { family: CoverageFamily; label: string; probability: number };
  coverageConclusion: CoverageConclusion;
  isAmbiguous: boolean;
  isLowConfidence: boolean;
  evidenceSummary: string[];
};

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Core recognition function. Pure — no side effects.
 * Takes signals, scores each coverage family, and returns a ranked result.
 */
export function recognizeCoverage(input: RecognitionInput): RecognitionResult {
  const { signals, context = {}, observerConfidence = 80 } = input;

  // Confidence multiplier scales signal impact (uncertain observer = diluted signal)
  const confidenceMultiplier = observerConfidence / 100;

  // Start from baselines
  const rawScores: Record<CoverageFamily, number> = { ...COVERAGE_BASELINES };

  const supportMap: Record<CoverageFamily, CoverageScore["supportingSignals"]> = {
    Cover2: [], Cover3: [], Cover4: [], Cover6: [], ManCoverage: [], ZeroBlitz: [],
  };
  const contradictMap: Record<CoverageFamily, CoverageScore["contradictingSignals"]> = {
    Cover2: [], Cover3: [], Cover4: [], Cover6: [], ManCoverage: [], ZeroBlitz: [],
  };

  // Apply signal weights
  for (const signalId of signals) {
    const signal = REGISTRY_MAP.get(signalId);
    if (!signal) continue;

    for (const [family, weight] of Object.entries(signal.weights) as [CoverageFamily, number][]) {
      const scaled = weight * confidenceMultiplier;
      rawScores[family] = (rawScores[family] ?? 0) + scaled;

      if (scaled > 0) {
        supportMap[family].push({ id: signal.id, name: signal.name, contribution: Math.round(scaled) });
      } else if (scaled < 0) {
        contradictMap[family].push({ id: signal.id, name: signal.name, penalty: Math.round(Math.abs(scaled)) });
      }
    }
  }

  // Contextual adjustments (situation-based, not coverage-assumption-based)
  applyContextAdjustments(rawScores, context);

  // Clamp all scores to >= 0
  for (const family of Object.keys(rawScores) as CoverageFamily[]) {
    rawScores[family] = Math.max(0, rawScores[family]);
  }

  // Normalize to probabilities (0-100)
  const totalScore = Object.values(rawScores).reduce((a, b) => a + b, 0) || 1;
  const normalized: Record<CoverageFamily, number> = {} as Record<CoverageFamily, number>;
  for (const [family, score] of Object.entries(rawScores) as [CoverageFamily, number][]) {
    normalized[family] = Math.round((score / totalScore) * 100);
  }

  // Build sorted score array
  const scores: CoverageScore[] = (Object.entries(normalized) as [CoverageFamily, number][])
    .sort(([, a], [, b]) => b - a)
    .map(([family, probability]) => ({
      family,
      label: COVERAGE_FAMILY_LABELS[family],
      probability,
      rawScore: Math.round(rawScores[family]),
      variants: deriveVariants(family, signals),
      supportingSignals: supportMap[family],
      contradictingSignals: contradictMap[family],
    }));

  const topCoverage    = scores[0].family;
  const topProbability = scores[0].probability;
  const isAmbiguous    = scores.length >= 2 && (topProbability - scores[1].probability) <= RECOGNITION_AMBIGUITY_GAP;
  const isLowConfidence = topProbability < RECOGNITION_MIN_CONFIDENCE;

  // ── Gated conclusion ──────────────────────────────────────────────────────
  let coverageConclusion: CoverageConclusion;
  if (isLowConfidence) {
    coverageConclusion = "Unknown";
  } else if (isAmbiguous) {
    coverageConclusion = "Multiple Possibilities";
  } else {
    coverageConclusion = topCoverage;
  }

  // ── Evidence trace ────────────────────────────────────────────────────────
  const evidenceTrace = buildEvidenceTrace(signals, scores[0]);

  const observedSignals = signals
    .map((id) => REGISTRY_MAP.get(id))
    .filter(Boolean)
    .map((s) => ({ id: s!.id, category: s!.category, name: s!.name }));

  const aiPayload: CoverageAiPayload = {
    schemaVersion:       "coverage-recognition/v1",
    timestamp:           Date.now(),
    observedSignals,
    context,
    coverageDistribution: scores.map(({ family, probability, variants }) => ({ family, probability, variants })),
    topCoverage:          { family: topCoverage, label: COVERAGE_FAMILY_LABELS[topCoverage], probability: topProbability },
    coverageConclusion,
    isAmbiguous,
    isLowConfidence,
    evidenceSummary:      buildEvidenceSummary(signals, scores),
  };

  return {
    id:               `crec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp:        Date.now(),
    input,
    scores,
    topCoverage,
    topProbability,
    isAmbiguous,
    isLowConfidence,
    coverageConclusion,
    evidenceTrace,
    aiPayload,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyContextAdjustments(
  scores: Record<CoverageFamily, number>,
  ctx: RecognitionContext
): void {
  // 3rd & long — more man, zero blitz; less cover 4
  if (ctx.down === 3 && ctx.distance !== undefined && ctx.distance >= 8) {
    scores.ManCoverage += 8;
    scores.ZeroBlitz += 6;
    scores.Cover4 -= 5;
  }
  // Goalline — more zero blitz, more man; less cover 4
  if (ctx.fieldZone === "Goalline") {
    scores.ZeroBlitz += 12;
    scores.ManCoverage += 10;
    scores.Cover4 -= 10;
    scores.Cover2 -= 5;
  }
  // Redzone — more man, more cover 2
  if (ctx.fieldZone === "Redzone") {
    scores.ManCoverage += 5;
    scores.Cover2 += 5;
    scores.Cover4 -= 5;
  }
  // Must-pass — more blitz
  if (ctx.gameScript === "Must-pass") {
    scores.ZeroBlitz += 8;
    scores.ManCoverage += 5;
  }
  // Two-minute — more cover 2 (prevent deep), more zero blitz
  if (ctx.gameScript === "Two-minute") {
    scores.Cover2 += 8;
    scores.ZeroBlitz += 6;
    scores.Cover4 -= 5;
  }
  // 1st down — more base coverages
  if (ctx.down === 1) {
    scores.Cover3 += 5;
    scores.Cover4 += 3;
    scores.ZeroBlitz -= 5;
  }
}

function deriveVariants(family: CoverageFamily, signals: SignalId[]): string[] {
  const allVariants = COVERAGE_VARIANTS[family];
  const signalSet = new Set(signals);

  if (family === "Cover3") {
    const variants: string[] = [];
    if (signalSet.has("safety_rotated_strong")) variants.push("Cover 3 Sky");
    if (signalSet.has("safety_rotated_weak")) variants.push("Cover 3 Cloud");
    if (signalSet.has("post_safety_rotates_middle")) variants.push("Cover 3 Buzz");
    return variants.length > 0 ? variants : allVariants.slice(0, 2);
  }
  if (family === "Cover4") {
    if (signalSet.has("db_follows_motion")) return ["Cover 4 Palms"];
    return ["Cover 4 Quarters", "Cover 4 Palms"];
  }
  if (family === "Cover6") {
    if (signalSet.has("boundary_corner_press")) return ["Cover 6 Boundary"];
    if (signalSet.has("safety_rotated_strong")) return ["Cover 6 Field"];
    return allVariants;
  }
  if (family === "ManCoverage") {
    if (signalSet.has("both_safeties_in_box")) return ["Cover 2 Man Under"];
    if (signalSet.has("single_high_centerfield")) return ["Cover 1 Man Free", "Cover 1 Robber"];
    return allVariants;
  }
  return allVariants;
}

function buildEvidenceTrace(signals: SignalId[], top: CoverageScore): string[] {
  const trace: string[] = [];
  if (top.supportingSignals.length === 0) {
    trace.push("No direct supporting signals recorded — prediction driven by baseline priors only.");
    return trace;
  }
  for (const sig of top.supportingSignals.slice(0, 4)) {
    const signal = REGISTRY_MAP.get(sig.id);
    if (signal) {
      trace.push(`${signal.name}: ${signal.description} → +${sig.contribution} pts toward ${top.label}`);
    }
  }
  if (top.contradictingSignals.length > 0) {
    const top3 = top.contradictingSignals.slice(0, 2);
    for (const sig of top3) {
      const signal = REGISTRY_MAP.get(sig.id);
      if (signal) {
        trace.push(`⚠ ${signal.name}: contradicts ${top.label} (−${sig.penalty} pts)`);
      }
    }
  }
  return trace;
}

function buildEvidenceSummary(signals: SignalId[], scores: CoverageScore[]): string[] {
  const summary: string[] = [];
  const top = scores[0];
  if (top.supportingSignals.length > 0) {
    summary.push(
      `${top.label} supported by: ${top.supportingSignals.slice(0, 3).map((s) => s.name).join(", ")}.`
    );
  }
  if (scores.length >= 2 && scores[1].probability >= 20) {
    summary.push(`${scores[1].label} also possible (${scores[1].probability}%) — check rotation post-snap.`);
  }
  const blitzSignal = signals.find((s) => s === "extra_rusher_visible" || s === "cb_blitz_walk_down");
  if (blitzSignal) {
    summary.push("Blitz indicators present — consider hot routes and quick release.");
  }
  const motionSignal = signals.find((s) => s === "db_follows_motion");
  if (motionSignal) {
    summary.push("DB followed motion — strong man coverage indicator.");
  }
  return summary;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** All distinct signal categories present in the registry. */
export const SIGNAL_CATEGORIES: SignalCategory[] = [
  "SafetyAlignment",
  "CornerTechnique",
  "LinebackerDepth",
  "SlotDefender",
  "DLineAlignment",
  "PreSnapMotion",
  "PostSnapRotation",
  "BlitzIndicator",
];

export const SIGNAL_CATEGORY_LABELS: Record<SignalCategory, string> = {
  SafetyAlignment:    "Safety Alignment",
  CornerTechnique:    "Corner Technique",
  LinebackerDepth:    "Linebacker Depth",
  SlotDefender:       "Slot Defender",
  DLineAlignment:     "D-Line Alignment",
  PreSnapMotion:      "Pre-Snap Motion Response",
  PostSnapRotation:   "Post-Snap Rotation",
  BlitzIndicator:     "Blitz Indicators",
};
