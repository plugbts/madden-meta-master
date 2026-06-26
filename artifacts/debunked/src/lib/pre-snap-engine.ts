// ─── Pre-Snap Recognition Engine ─────────────────────────────────────────────
// Evidence-first architecture: observable signals → feature detection → inference.
// Every prediction is traceable to the evidence that produced it.
// Low-confidence outputs return "Unknown" or "Multiple Possibilities" — never invented.

// ─── Confidence Thresholds ────────────────────────────────────────────────────

const COVERAGE_MIN_CONFIDENCE   = 35;  // Below this → output "Unknown"
const COVERAGE_AMBIGUITY_GAP    = 12;  // Gap < this between #1/#2 → "Multiple Possibilities"
const USER_MIN_CONFIDENCE       = 55;  // Below this → user position stays "Unknown"

// ─── Input Types ──────────────────────────────────────────────────────────────

export type SafetyDepth    = "Deep (15+ yds)" | "Mid (8-12 yds)" | "Shallow (5-7 yds)" | "In the box";
export type SafetySpacing  = "Split wide" | "Centerfield" | "Rotated strong" | "Rotated weak";
export type CBLeverage     = "Press (0-2 yds)" | "Off-man (3-5 yds)" | "Cushion (7+ yds)" | "Inside shade" | "Outside shade";
export type NickelAlignment= "Normal" | "Mugged / walked up" | "Walked out wide" | "Blitz look";
export type SlotDefender   = "Playing zone" | "Playing man" | "Walked up tight";
export type LBDepth        = "Deep (8+ yds)" | "Normal (4-7 yds)" | "Mugged (0-3 yds)" | "A-gap shade";
export type LBSpacing      = "Wide" | "Normal" | "Pinched";
export type DLAlignment    = "Normal" | "Over (shifted strong)" | "Under (shifted weak)" | "Wide (pass rush)";
export type UserPosition   = "FS" | "SS" | "LB" | "CB" | "None visible";
export type DefAdjustment  = "None" | "Pinch" | "Spread" | "Press all" | "Cushion all" | "Shade inside" | "Shade outside" | "Over top";
export type BlitzLook      = "None" | "A-gap shade" | "Edge walk-up" | "DB walked down" | "Multiple walk-ups";

// ─── User Observable Evidence ─────────────────────────────────────────────────
// The user-controlled defender must be detected from observable signals.
// The engine must NOT infer or guess the position — only classify when evidence is sufficient.

export type UserObservableEvidence =
  | "user_icon_visible"    // Yellow crown/indicator icon seen above a specific defender
  | "manual_presnap_move"  // Defender repositioned manually before the snap
  | "manual_strafing"      // Defender strafing/moving laterally pre-snap by user
  | "manual_rush_path"     // Post-snap rush path that is unnatural / clearly user-directed
  | "continuous_input"     // Erratic movement pattern consistent with live user control
  | "none";                // No observable evidence — do not assign a position

export type UserDetectionConfidence = "High" | "Medium" | "Low";

export type UserDetectionResult = {
  position:            UserPosition | "Unknown";
  location:            string | null;
  confidenceScore:     number;                   // 0-100
  confidence:          UserDetectionConfidence;
  evidenceUsed:        string[];
  insufficientEvidence: boolean;
};

// ─── Pre-Snap Inputs ──────────────────────────────────────────────────────────

export type PreSnapInputs = {
  safetyDepth:            SafetyDepth;
  safetySpacing:          SafetySpacing;
  cbLeverage:             CBLeverage;
  nickelAlignment:        NickelAlignment;
  slotDefender:           SlotDefender;
  lbDepth:                LBDepth;
  lbSpacing:              LBSpacing;
  dlAlignment:            DLAlignment;
  userPosition:           UserPosition;                   // legacy field — kept for backward compat
  userEvidence?:          UserObservableEvidence[];        // what you directly observed
  userSuspectedPosition?: UserPosition | "Unknown";        // position (only valid with evidence)
  adjustment:             DefAdjustment;
  blitzLook:              BlitzLook;
  situationDown?:         number;
  situationYards?:        number;
};

export const DEFAULT_INPUTS: PreSnapInputs = {
  safetyDepth:    "Deep (15+ yds)",
  safetySpacing:  "Split wide",
  cbLeverage:     "Off-man (3-5 yds)",
  nickelAlignment:"Normal",
  slotDefender:   "Playing zone",
  lbDepth:        "Normal (4-7 yds)",
  lbSpacing:      "Normal",
  dlAlignment:    "Normal",
  userPosition:   "None visible",
  userEvidence:   ["none"],
  adjustment:     "None",
  blitzLook:      "None",
};

// ─── Output Types ─────────────────────────────────────────────────────────────

export type Coverage =
  | "Cover 0" | "Cover 1" | "Cover 1 Robber" | "Cover 2 Zone" | "Cover 2 Tampa"
  | "Cover 2 Invert" | "Cover 3 Sky" | "Cover 3 Buzz" | "Cover 3 Cloud" | "Cover 3 Match"
  | "Cover 4 Quarters" | "Cover 4 Palms" | "Cover 6" | "Man Free" | "Zero Blitz" | "Cover 2 Man Under";

export type Shell = "Single High" | "Two High" | "Quarters Shell" | "Cover 0 Shell" | "Press Shell" | "Off Coverage Shell";

export type CoverageConfidence = { coverage: Coverage; confidence: number };

// Gated conclusion — only emits a specific coverage when evidence is sufficient
export type CoverageConclusion = Coverage | "Unknown" | "Multiple Possibilities";

export type DisguiseFlag = {
  shellShown:     Shell;
  likelyCoverage: Coverage;
  probability:    number;
  indicator:      string;
};

export type AttackRecommendation = {
  concept:    string;
  confidence: number;
  formation:  string;
  reasoning:  string;
  routes:     string[];
  motions:    string[];
};

export type PreSnapAnalysis = {
  shell:              Shell;
  shellConfidence:    number;
  topCoverage:        Coverage;          // best-guess coverage (backward compat)
  topConfidence:      number;            // normalized % for top coverage
  coverageConclusion: CoverageConclusion; // gated output: Unknown / Multiple Possibilities / specific coverage
  isLowConfidence:    boolean;           // true when top < COVERAGE_MIN_CONFIDENCE
  isAmbiguous:        boolean;           // true when top two are within COVERAGE_AMBIGUITY_GAP
  coverageBreakdown:  CoverageConfidence[];
  evidenceTrail:      string[];          // per-signal human-readable evidence chain
  disguises:          DisguiseFlag[];
  adjustmentImpact:   string;
  blitzProbability:   number;
  recommendations:    AttackRecommendation[];
  reasoning:          string[];
  userDetection:      UserDetectionResult;
};

// ─── User Controlled Defender Detection ───────────────────────────────────────
// Must not infer or guess — only classify when observable evidence is sufficient.
// Returns "Unknown" with Low confidence if evidence is insufficient.

export function detectUserControlledDefender(params: {
  evidenceObserved?: UserObservableEvidence[];
  suspectedPosition?: UserPosition | "Unknown";
  legacyPosition?: UserPosition;
}): UserDetectionResult {
  const { evidenceObserved = [], suspectedPosition, legacyPosition } = params;

  const evidenceFiltered = evidenceObserved.filter((e): e is Exclude<UserObservableEvidence, "none"> => e !== "none");

  // No direct evidence provided — check legacy fallback
  if (evidenceFiltered.length === 0) {
    if (legacyPosition && legacyPosition !== "None visible") {
      return {
        position:            legacyPosition,
        location:            USER_LOCATION_MAP[legacyPosition] ?? null,
        confidenceScore:     40,
        confidence:          "Low",
        evidenceUsed:        ["Position reported without direct observable evidence (legacy log)"],
        insufficientEvidence: true,
      };
    }
    return {
      position:            "Unknown",
      location:            null,
      confidenceScore:     0,
      confidence:          "Low",
      evidenceUsed:        [],
      insufficientEvidence: true,
    };
  }

  const evidenceUsed: string[] = [];
  let score = 0;

  if (evidenceFiltered.includes("user_icon_visible")) {
    score += 55;
    evidenceUsed.push("User indicator icon (crown/badge) observed above defender");
  }
  if (evidenceFiltered.includes("manual_presnap_move")) {
    score += 25;
    evidenceUsed.push("Defender repositioned manually before the snap");
  }
  if (evidenceFiltered.includes("manual_strafing")) {
    score += 20;
    evidenceUsed.push("Manual lateral strafing motion observed pre-snap");
  }
  if (evidenceFiltered.includes("manual_rush_path")) {
    score += 20;
    evidenceUsed.push("Unnatural post-snap rush path consistent with user input");
  }
  if (evidenceFiltered.includes("continuous_input")) {
    score += 15;
    evidenceUsed.push("Continuous manual input movement pattern detected");
  }

  score = Math.min(score, 97);

  // Need icon OR at least two behavioral signals to confirm a position
  const hasIcon         = evidenceFiltered.includes("user_icon_visible");
  const behavioralCount = evidenceFiltered.filter(e => e !== "user_icon_visible").length;
  const positionConfirmed = hasIcon || behavioralCount >= 2;

  if (!positionConfirmed || !suspectedPosition || suspectedPosition === "Unknown") {
    return {
      position:            "Unknown",
      location:            null,
      confidenceScore:     score,
      confidence:          score >= 50 ? "Medium" : "Low",
      evidenceUsed,
      insufficientEvidence: true,
    };
  }

  return {
    position:            suspectedPosition,
    location:            USER_LOCATION_MAP[suspectedPosition] ?? null,
    confidenceScore:     score,
    confidence:          score >= 70 ? "High" : score >= USER_MIN_CONFIDENCE ? "Medium" : "Low",
    evidenceUsed,
    insufficientEvidence: score < USER_MIN_CONFIDENCE,
  };
}

const USER_LOCATION_MAP: Partial<Record<UserPosition | "Unknown", string>> = {
  FS:  "Deep centerfield / boundary",
  SS:  "Strong side, near box",
  LB:  "Middle of field, linebacker depth",
  CB:  "Outside, aligned on receiver",
};

// ─── Shell Detection ──────────────────────────────────────────────────────────

function detectShell(i: PreSnapInputs): { shell: Shell; confidence: number } {
  const deepSplit  = i.safetyDepth === "Deep (15+ yds)" && i.safetySpacing === "Split wide";
  const deepCenter = i.safetyDepth === "Deep (15+ yds)" && i.safetySpacing === "Centerfield";
  const shallow    = i.safetyDepth === "Shallow (5-7 yds)" || i.safetyDepth === "In the box";
  const press      = i.cbLeverage  === "Press (0-2 yds)";
  const cushion    = i.cbLeverage  === "Cushion (7+ yds)";

  if (i.blitzLook !== "None" && shallow)                          return { shell: "Cover 0 Shell",        confidence: 88 };
  if (press && shallow)                                           return { shell: "Cover 0 Shell",        confidence: 82 };
  if (deepSplit && cushion)                                       return { shell: "Quarters Shell",       confidence: 85 };
  if (deepSplit)                                                  return { shell: "Two High",             confidence: 90 };
  if (deepCenter)                                                 return { shell: "Single High",          confidence: 88 };
  if (press)                                                      return { shell: "Press Shell",          confidence: 85 };
  if (cushion)                                                    return { shell: "Off Coverage Shell",   confidence: 80 };
  return                                                                 { shell: "Single High",          confidence: 65 };
}

// ─── Coverage Confidence Scoring ──────────────────────────────────────────────
// Observable signals → numeric evidence points → normalized probabilities.
// User position is NOT used as a direct score booster — only detected position with sufficient evidence.

type CoverageScore = Partial<Record<Coverage, number>>;

function computeScores(i: PreSnapInputs): CoverageScore {
  const scores: CoverageScore = {};
  const add = (c: Coverage, pts: number) => { scores[c] = (scores[c] ?? 0) + pts; };

  // ── Safety depth signals ──────────────────────────────────────────────────
  if (i.safetyDepth === "Deep (15+ yds)") {
    add("Cover 2 Zone", 20); add("Cover 4 Quarters", 18); add("Cover 4 Palms", 15); add("Cover 2 Tampa", 12);
    if (i.safetySpacing === "Centerfield") { add("Cover 3 Sky", 22); add("Cover 3 Buzz", 18); add("Cover 1 Robber", 14); }
    if (i.safetySpacing === "Split wide")  { add("Cover 2 Zone", 20); add("Cover 4 Quarters", 22); add("Cover 6", 10); }
  }
  if (i.safetyDepth === "Mid (8-12 yds)") {
    add("Cover 3 Sky", 18); add("Cover 3 Cloud", 15); add("Cover 3 Buzz", 12); add("Cover 1", 14);
    if (i.safetySpacing === "Rotated strong") { add("Cover 3 Cloud", 20); add("Cover 6", 12); }
    if (i.safetySpacing === "Rotated weak")   { add("Cover 3 Sky", 18); }
  }
  if (i.safetyDepth === "Shallow (5-7 yds)") {
    add("Cover 1", 18); add("Cover 0", 14); add("Cover 2 Man Under", 16); add("Zero Blitz", 10);
  }
  if (i.safetyDepth === "In the box") {
    add("Cover 0", 24); add("Zero Blitz", 22); add("Cover 2 Man Under", 12);
  }

  // ── CB leverage signals ───────────────────────────────────────────────────
  if (i.cbLeverage === "Press (0-2 yds)")    { add("Cover 0", 18); add("Cover 1", 16); add("Cover 2 Man Under", 14); add("Zero Blitz", 12); }
  if (i.cbLeverage === "Off-man (3-5 yds)")  { add("Cover 1 Robber", 14); add("Man Free", 12); add("Cover 3 Sky", 8); add("Cover 3 Match", 10); }
  if (i.cbLeverage === "Cushion (7+ yds)")   { add("Cover 2 Zone", 16); add("Cover 4 Quarters", 18); add("Cover 3 Sky", 10); add("Cover 3 Cloud", 8); }
  if (i.cbLeverage === "Inside shade")       { add("Cover 1", 16); add("Cover 3 Match", 12); add("Cover 1 Robber", 8); }
  if (i.cbLeverage === "Outside shade")      { add("Cover 2 Zone", 14); add("Cover 2 Tampa", 12); add("Cover 3 Sky", 10); }

  // ── Nickel signals ────────────────────────────────────────────────────────
  if (i.nickelAlignment === "Mugged / walked up") { add("Zero Blitz", 16); add("Cover 0", 12); add("Cover 2 Man Under", 10); }
  if (i.nickelAlignment === "Blitz look")         { add("Zero Blitz", 20); add("Cover 0", 16); add("Cover 1", 8); }
  if (i.nickelAlignment === "Walked out wide")    { add("Cover 4 Palms", 16); add("Cover 2 Zone", 10); }

  // ── Slot defender signals ─────────────────────────────────────────────────
  if (i.slotDefender === "Walked up tight") { add("Cover 0", 14); add("Zero Blitz", 12); add("Cover 1", 10); }
  if (i.slotDefender === "Playing man")     { add("Cover 1", 14); add("Cover 2 Man Under", 12); add("Man Free", 10); }
  if (i.slotDefender === "Playing zone")    { add("Cover 3 Buzz", 16); add("Cover 4 Palms", 12); add("Cover 2 Zone", 10); }

  // ── LB signals ───────────────────────────────────────────────────────────
  if (i.lbDepth === "Deep (8+ yds)")       { add("Cover 3 Buzz", 18); add("Cover 4 Quarters", 10); }
  if (i.lbDepth === "Normal (4-7 yds)")    { add("Cover 3 Sky", 12); add("Cover 2 Zone", 10); add("Cover 1 Robber", 8); }
  if (i.lbDepth === "Mugged (0-3 yds)")    { add("Cover 0", 12); add("Zero Blitz", 14); add("Cover 2 Man Under", 8); }
  if (i.lbDepth === "A-gap shade")         { add("Zero Blitz", 20); add("Cover 0", 14); }
  if (i.lbSpacing === "Pinched")           { add("Zero Blitz", 12); add("Cover 0", 8); }
  if (i.lbSpacing === "Wide")              { add("Cover 4 Quarters", 10); add("Cover 2 Zone", 8); }

  // ── DL signals ───────────────────────────────────────────────────────────
  if (i.dlAlignment === "Wide (pass rush)")      { add("Cover 0", 10); add("Zero Blitz", 10); }
  if (i.dlAlignment === "Over (shifted strong)") { add("Cover 3 Cloud", 10); add("Cover 6", 8); }

  // ── User position signal (only when evidence confirmed) ───────────────────
  // We do NOT score based on userPosition alone — only if evidence was logged externally
  // via detectUserControlledDefender. This prevents guessing the user.

  // ── Blitz look ────────────────────────────────────────────────────────────
  if (i.blitzLook === "A-gap shade")      { add("Zero Blitz", 18); add("Cover 0", 14); }
  if (i.blitzLook === "Edge walk-up")     { add("Cover 0", 12); add("Zero Blitz", 10); add("Cover 1", 8); }
  if (i.blitzLook === "DB walked down")   { add("Zero Blitz", 16); add("Cover 0", 12); }
  if (i.blitzLook === "Multiple walk-ups"){ add("Zero Blitz", 22); add("Cover 0", 16); }

  // ── Situational boosters ──────────────────────────────────────────────────
  if (i.situationDown === 3 && (i.situationYards ?? 10) >= 7) {
    add("Cover 3 Sky", 10); add("Cover 4 Quarters", 8); add("Zero Blitz", 8);
  }
  if (i.situationDown === 1) {
    add("Cover 3 Sky", 8); add("Cover 2 Zone", 6);
  }

  return scores;
}

function normalizeToCoverageBreakdown(scores: CoverageScore): CoverageConfidence[] {
  const entries = Object.entries(scores) as [Coverage, number][];
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return [];
  return entries
    .map(([coverage, pts]) => ({ coverage, confidence: Math.round((pts / total) * 100) }))
    .filter((c) => c.confidence >= 3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

// ─── Evidence Trail Builder ───────────────────────────────────────────────────
// Produces a human-readable chain: observable input → what it implies → why.

function buildEvidenceTrail(i: PreSnapInputs, shell: Shell): string[] {
  const trail: string[] = [];

  // Shell
  trail.push(`Safety depth (${i.safetyDepth}) + spacing (${i.safetySpacing}) → shell classified as "${shell}"`);

  // Safety depth implications
  if (i.safetyDepth === "Deep (15+ yds)" && i.safetySpacing === "Split wide") {
    trail.push("Two high split safeties → Cover 2 / Cover 4 family evidence; single-high coverages penalized");
  } else if (i.safetyDepth === "Deep (15+ yds)" && i.safetySpacing === "Centerfield") {
    trail.push("Single high centerfield → Cover 3 / Man Free evidence; Cover 2/4 penalized");
  } else if (i.safetyDepth === "Mid (8-12 yds)") {
    trail.push("Mid-depth safety → Cover 3 variant or rolled coverage; ambiguous — watch post-snap rotation");
  } else if (i.safetyDepth === "In the box") {
    trail.push("Both safeties near box → strong Cover 0 / Zero Blitz evidence; zone coverages penalized heavily");
  } else if (i.safetyDepth === "Shallow (5-7 yds)") {
    trail.push("Shallow safety depth → man / blitz indicators present; zone coverage less likely");
  }

  // CB leverage
  if (i.cbLeverage === "Press (0-2 yds)") {
    trail.push("CB press (0-2 yds) → man coverage indicators increase: Cover 0/1, Zero Blitz, Cover 2 Man Under");
  } else if (i.cbLeverage === "Cushion (7+ yds)") {
    trail.push("CB soft cushion (7+ yds) → zone coverage indicators increase: Cover 2/4 family");
  } else if (i.cbLeverage === "Inside shade") {
    trail.push("CB inside shade → consistent with Cover 1/Robber man trail technique");
  } else if (i.cbLeverage === "Outside shade") {
    trail.push("CB outside shade → Cover 2 or zone protecting deep sideline");
  } else {
    trail.push("CB off-man (3-5 yds) → ambiguous; consistent with Cover 1 Robber, Man Free, Cover 3 Match");
  }

  // LB
  if (i.lbDepth === "A-gap shade") {
    trail.push("LB A-gap shade → strongest blitz indicator in the model; Zero Blitz / Cover 0 heavily boosted");
  } else if (i.lbDepth === "Mugged (0-3 yds)") {
    trail.push("LB mugged (0-3 yds) → blitz evidence; man coverage elevated; zone penalized");
  } else if (i.lbDepth === "Deep (8+ yds)") {
    trail.push("LB dropping to hook/curl depth → Cover 3 Buzz or underneath zone evidence");
  }
  if (i.lbSpacing === "Pinched") {
    trail.push("LB spacing pinched → interior run gap tightened; Zero Blitz indicator");
  }

  // Nickel
  if (i.nickelAlignment === "Blitz look") {
    trail.push("Nickel in blitz look → DB blitz evidence; Zero Blitz / Cover 0 elevated");
  } else if (i.nickelAlignment === "Mugged / walked up") {
    trail.push("Nickel mugged/walked up → pressure indicator; man coverage elevated");
  } else if (i.nickelAlignment === "Walked out wide") {
    trail.push("Nickel walked wide → slot zone drop pattern; Cover 4 Palms / Cover 2 Zone evidence");
  }

  // Slot
  if (i.slotDefender === "Playing man") {
    trail.push("Slot defender in man trail → man coverage family elevated: Cover 1, Cover 2 Man Under");
  } else if (i.slotDefender === "Walked up tight") {
    trail.push("Slot defender walked tight → press / blitz indicator; Cover 0 / Zero Blitz elevated");
  }

  // Blitz look
  if (i.blitzLook !== "None") {
    trail.push(`Blitz look (${i.blitzLook}) → pressure evidence added to all blitz/man coverages`);
  }

  // Situation
  if (i.situationDown === 3 && (i.situationYards ?? 10) >= 7) {
    trail.push("3rd and long → situational adjustment: Cover 3/4 and Zero Blitz elevated");
  }

  return trail;
}

// ─── Disguise Detection ───────────────────────────────────────────────────────

function detectDisguises(shell: Shell, inputs: PreSnapInputs): DisguiseFlag[] {
  const flags: DisguiseFlag[] = [];

  if (shell === "Two High") {
    flags.push({ shellShown: "Two High", likelyCoverage: "Cover 3 Sky",    probability: 38, indicator: "Late safety rotation — one safety often drops to hook zone post-snap" });
    flags.push({ shellShown: "Two High", likelyCoverage: "Cover 3 Match",  probability: 22, indicator: "CBs in off-man = match coverage disguised as Cover 2 shell" });
    if (inputs.blitzLook !== "None") flags.push({ shellShown: "Two High", likelyCoverage: "Zero Blitz", probability: 45, indicator: "Walk-up blitzers with two high = pressure coming, not zone" });
  }
  if (shell === "Single High") {
    flags.push({ shellShown: "Single High", likelyCoverage: "Cover 2 Invert", probability: 28, indicator: "FS drops to deep half post-snap — safety rotation often fools QB" });
    if (inputs.lbDepth === "Deep (8+ yds)") flags.push({ shellShown: "Single High", likelyCoverage: "Cover 3 Buzz", probability: 35, indicator: "Deep LB in single-high = hook-curl coverage, not classic Cover 3" });
  }
  if (shell === "Quarters Shell") {
    flags.push({ shellShown: "Quarters Shell", likelyCoverage: "Cover 3 Buzz",  probability: 32, indicator: "Quarters shell with buzzing OLB = Cover 3 underneath disguised as quarters" });
    flags.push({ shellShown: "Quarters Shell", likelyCoverage: "Cover 4 Palms", probability: 30, indicator: "Palms means CBs will bail to cover seam routes post-snap" });
  }
  if (shell === "Cover 0 Shell") {
    flags.push({ shellShown: "Cover 0 Shell", likelyCoverage: "Cover 2 Man Under", probability: 40, indicator: "Box safety may peel into coverage rather than rushing — read the snap count" });
  }
  if (shell === "Press Shell") {
    flags.push({ shellShown: "Press Shell", likelyCoverage: "Cover 3 Match", probability: 35, indicator: "Trail technique off the press is Cover 3 match — CBs aren't in pure man" });
    flags.push({ shellShown: "Press Shell", likelyCoverage: "Cover 1",       probability: 40, indicator: "Press with single high almost always resolves to Cover 1" });
  }

  return flags.sort((a, b) => b.probability - a.probability).slice(0, 3);
}

// ─── Blitz Probability ────────────────────────────────────────────────────────

function computeBlitzProb(i: PreSnapInputs): number {
  let prob = 5;
  if (i.blitzLook === "A-gap shade")       prob += 40;
  if (i.blitzLook === "Edge walk-up")      prob += 25;
  if (i.blitzLook === "DB walked down")    prob += 35;
  if (i.blitzLook === "Multiple walk-ups") prob += 55;
  if (i.nickelAlignment === "Blitz look")          prob += 25;
  if (i.nickelAlignment === "Mugged / walked up")  prob += 15;
  if (i.lbDepth === "Mugged (0-3 yds)")    prob += 20;
  if (i.lbDepth === "A-gap shade")         prob += 30;
  if (i.safetyDepth === "In the box")      prob += 20;
  if (i.lbSpacing === "Pinched")           prob += 10;
  if (i.slotDefender === "Walked up tight") prob += 15;
  return Math.min(prob, 99);
}

// ─── Adjustment Impact ────────────────────────────────────────────────────────

function describeAdjustmentImpact(adj: DefAdjustment): string {
  const map: Record<DefAdjustment, string> = {
    "None":        "No adjustments detected — base alignment.",
    "Pinch":       "DL pinched inside — run gaps tightened, A/B-gap stuffed. Attack edges or go pass.",
    "Spread":      "DL spread wide — designed to contain outside run. Inside runs may open.",
    "Press all":   "Press across the board — quick game and rub routes attack this hard.",
    "Cushion all": "Soft cushion — slants, drags, and quick outs will gain easy yards underneath.",
    "Shade inside":"CBs inside shade — attack the outside fade and comeback routes.",
    "Shade outside":"CBs outside shade — attack the slant and post inside.",
    "Over top":    "Over-top coverage — short routes underneath will be open. Check-down available.",
  };
  return map[adj];
}

// ─── Reasoning Builder ────────────────────────────────────────────────────────

function buildReasoning(i: PreSnapInputs, shell: Shell, top: Coverage, userDetection: UserDetectionResult): string[] {
  const lines: string[] = [];
  lines.push(`Shell read: ${shell} — based on safety depth (${i.safetyDepth}) and spacing (${i.safetySpacing}).`);
  if (i.cbLeverage === "Press (0-2 yds)")  lines.push("CB press technique increases probability of man coverage or Cover 0.");
  if (i.cbLeverage === "Cushion (7+ yds)") lines.push("CB cushion suggests zone — most likely Cover 2 or Cover 4 variant.");
  if (i.lbDepth === "Deep (8+ yds)")       lines.push("Deep LB suggests hook-buzz coverage (Cover 3 Buzz) or Quarters underneath.");
  if (i.lbDepth === "A-gap shade" || i.lbDepth === "Mugged (0-3 yds)") lines.push("Mugged LB — high blitz probability. Prepare a hot route pre-snap.");
  if (i.nickelAlignment === "Blitz look")  lines.push("Nickel walked down — DB blitz likely. Screen or quick game will punish.");
  if (i.blitzLook !== "None")              lines.push(`Blitz indicator: ${i.blitzLook} — have a hot route ready before every snap.`);

  if (!userDetection.insufficientEvidence && userDetection.position !== "Unknown") {
    lines.push(
      `User-controlled defender confirmed as ${userDetection.position} (${userDetection.confidence} confidence, ${userDetection.confidenceScore}%). ` +
      `Evidence: ${userDetection.evidenceUsed[0] ?? "direct observation"}. ` +
      `Design routes that displace them from your primary read.`
    );
  } else {
    lines.push(
      "User-controlled defender: Unknown — insufficient observable evidence to confirm a position. " +
      "Cannot adjust routes without confirmation. Report direct evidence to unlock user-displacement recommendations."
    );
  }

  lines.push(`Top prediction: ${top}. Attack with the recommended concepts below.`);
  return lines;
}

// ─── Attack Recommendations ───────────────────────────────────────────────────

const ATTACK_MAP: Record<Coverage, AttackRecommendation[]> = {
  "Cover 0": [
    { concept: "Hot Routes / Quick Slants", confidence: 96, formation: "Gun Spread / 5-Wide", reasoning: "Zero coverage = no safety help. Every WR is 1-on-1. Release before the rush arrives.", routes: ["Slant", "Fade", "Drag"], motions: ["Motion to create rub", "Jet sweep fake"] },
    { concept: "Fade to Best Matchup", confidence: 91, formation: "Gun Bunch / Trips TE", reasoning: "Press-man, no help over top. Fade away from corner's leverage and win at the top.", routes: ["Fade", "Back-shoulder fade", "Go route"], motions: ["Bunch alignment", "Stack formation"] },
    { concept: "Drag / Mesh Cross", confidence: 88, formation: "Gun Empty", reasoning: "Two crossers create natural rubs. CB follows his man and gets picked naturally.", routes: ["Drag", "Mesh cross", "Shallow cross"], motions: ["Crossing motion", "Rub setup"] },
  ],
  "Cover 1": [
    { concept: "Sail / Flood", confidence: 90, formation: "Gun Bunch / Pistol Bunch", reasoning: "Single coverage all over — flood one side to stress the FS. Flat often unguarded.", routes: ["Corner route", "Flat", "Curl"], motions: ["RB motion to flat", "Trips motion"] },
    { concept: "High-Low (Post + Wheel)", confidence: 87, formation: "Singleback Ace / Gun Trips", reasoning: "Post pulls FS deep, wheel from backfield comes open underneath. 1v1 everywhere.", routes: ["Post", "Wheel", "Seam"], motions: ["RB out of backfield", "Back motion"] },
    { concept: "Rub / Bunch Concepts", confidence: 84, formation: "Gun Bunch / Gun Trips TE", reasoning: "Man coverage is vulnerable to rub routes. Stack WRs for natural picks pre-snap.", routes: ["Rub route", "Mesh", "Pick play"], motions: ["Stack alignment", "Bunch condensed"] },
  ],
  "Cover 1 Robber": [
    { concept: "Flood (Flat + Corner)", confidence: 90, formation: "Gun Bunch", reasoning: "Robber clogs the middle — attack the flat with a corner route over top.", routes: ["Flat", "Corner", "Sail"], motions: ["RB motion to flat", "Trips flip"] },
    { concept: "Back Shoulder Fade", confidence: 85, formation: "Gun Spread", reasoning: "CB is in man with no over-top help. Trust your WR on a back shoulder fade.", routes: ["Back-shoulder fade", "Fade", "Out"], motions: ["WR alignment outside"] },
    { concept: "Mesh / Rub Underneath", confidence: 82, formation: "Gun Empty", reasoning: "Robber sits the middle — mesh crosses can navigate around him with rubs.", routes: ["Mesh", "Drag", "Shallow cross"], motions: ["Stack alignment"] },
  ],
  "Cover 2 Zone": [
    { concept: "Smash / Corner-Hitch", confidence: 94, formation: "Gun Trips TE / Singleback Ace", reasoning: "Cover 2 corners squat on short routes. Corner route goes over their head into the deep half.", routes: ["Corner route", "Hitch", "Out"], motions: ["Trips alignment", "Motion to stress corner"] },
    { concept: "Flood (3-Level)", confidence: 91, formation: "Gun Bunch / Pistol Bunch", reasoning: "Three levels stress Cover 2. Deep, intermediate, flat creates impossible reads for curl-flat.", routes: ["Deep sail", "Curl", "Flat"], motions: ["RB motion to flat", "Bunch condensed"] },
    { concept: "Seam Routes", confidence: 88, formation: "Singleback Ace / I-Form Pro", reasoning: "Seams split Cover 2 safeties. Attack between safeties or at the corner-safety seam.", routes: ["Seam", "Post", "Skinny post"], motions: ["TE motion inside"] },
  ],
  "Cover 2 Tampa": [
    { concept: "Deep Corner / Outside Sail", confidence: 92, formation: "Gun Spread / Gun Empty", reasoning: "Tampa carries flat receiver, leaving corner route open between safety and OLB.", routes: ["Corner", "Sail", "Wheel"], motions: ["RB motion", "Trips side"] },
    { concept: "Deep Post (Split Safeties)", confidence: 88, formation: "Gun Spread", reasoning: "OLBs drop into flats in Tampa — the deep post splits both safeties.", routes: ["Post", "Dig", "Deep cross"], motions: ["Double post motion"] },
  ],
  "Cover 2 Invert": [
    { concept: "Vertical Seams", confidence: 90, formation: "Gun Spread / 4-Wide", reasoning: "FS drops to cover 2 zone — seams between CBs and FS are open vertically.", routes: ["Seam", "Post", "Go route"], motions: ["TE seam inside"] },
    { concept: "Quick Out / Hitch", confidence: 82, formation: "Gun Empty", reasoning: "Inverted safeties don't have short zone coverage immediately. Quick outs get easy yards.", routes: ["Out", "Hitch", "Curl"], motions: ["Bunch flip"] },
  ],
  "Cover 3 Sky": [
    { concept: "In / Dig Routes", confidence: 91, formation: "Gun Spread / Empty", reasoning: "Cover 3 has a hole at 15-18 yards in the middle. Dig and in routes hit this void.", routes: ["Dig", "In route", "Post-corner"], motions: ["Shift to empty", "Jet motion"] },
    { concept: "Stick / Curl-Flat", confidence: 87, formation: "Gun Trips TE", reasoning: "Curl-flat puts the hook defender in a bind. Curl holds him, flat gets the checkdown.", routes: ["Curl", "Flat", "Stick"], motions: ["RB to flat"] },
    { concept: "Wheel from Backfield", confidence: 84, formation: "Singleback Ace", reasoning: "Wheel stretches the hook-curl defender vertically. He can't cover the flat AND the wheel.", routes: ["Wheel", "Flat", "Swing"], motions: ["RB out of backfield"] },
  ],
  "Cover 3 Buzz": [
    { concept: "Deep Over / Crossers", confidence: 90, formation: "Gun Empty / Gun Spread", reasoning: "OLB buzzing underneath leaves middle of field open. Deep over routes cross into vacated space.", routes: ["Deep over", "Crosser", "Deep cross"], motions: ["Trips motion", "Bunch flip"] },
    { concept: "Levels / High-Low", confidence: 86, formation: "Gun Bunch", reasoning: "Buzz coverage = two LBs holding short-mid zones. Levels puts a WR above and below each.", routes: ["Level route", "Dig", "Flat"], motions: ["Stack motion"] },
  ],
  "Cover 3 Cloud": [
    { concept: "Smash vs Corner CB", confidence: 89, formation: "Gun Trips", reasoning: "Cloud CB squats in flat zone — corner route goes over his head into the boundary safety.", routes: ["Corner", "Hitch", "Fade"], motions: ["Boundary trips"] },
    { concept: "Seam + Post", confidence: 85, formation: "Gun 4-Wide", reasoning: "Cloud side has only one deep defender. Seam + post stresses the single boundary safety.", routes: ["Seam", "Post", "Go"], motions: ["4-wide spread"] },
  ],
  "Cover 3 Match": [
    { concept: "Rub / Pick Concepts", confidence: 91, formation: "Gun Bunch / Trips", reasoning: "Match coverage follows receiver into zones — rub routes cause CBs to switch and lose leverage.", routes: ["Rub", "Shallow cross", "Mesh"], motions: ["Condensed bunch", "Stack motion"] },
    { concept: "Over Routes (15-18 yds)", confidence: 86, formation: "Gun Empty", reasoning: "Match principles mean CBs pass off — over routes at the right depth catch the handoff seam.", routes: ["Over route", "Dig", "Cross"], motions: ["Double motion"] },
  ],
  "Cover 4 Quarters": [
    { concept: "Snag / Triangle Concept", confidence: 93, formation: "Gun Trips / Bunch", reasoning: "Cover 4 is a flat/curl coverage — the corner route (flat-corner triangle) hits the void.", routes: ["Corner", "Flat", "Slant"], motions: ["Trips condensed", "Motion to stress flat"] },
    { concept: "Seam (Attack Hook Zones)", confidence: 88, formation: "Singleback Ace / 2TE", reasoning: "Four-deep coverage keeps safeties deep. Seams between hook zones go wide open.", routes: ["Seam", "Dig", "In"], motions: ["TE seam motion"] },
    { concept: "Run the Ball", confidence: 82, formation: "I-Form / Power / Singleback", reasoning: "Cover 4 commits 4 to coverage. Only 7 in the box — base runs have clean blocking angles.", routes: ["N/A — run play"], motions: ["RB shift", "FB lead"] },
  ],
  "Cover 4 Palms": [
    { concept: "Seam + Flat (Palms Stress)", confidence: 90, formation: "Gun Spread / Empty", reasoning: "Palms has CBs covering seam routes — run two seams to force CBs deep and throw to flat.", routes: ["Seam", "Flat", "Wheel"], motions: ["RB motion to flat"] },
    { concept: "Deep Out / Comeback", confidence: 86, formation: "Gun Spread", reasoning: "Palms CBs bail deep on seam — 15-yard out or comeback sits in front of their cushion.", routes: ["Out route", "Comeback", "Curl"], motions: ["Split out wide"] },
  ],
  "Cover 6": [
    { concept: "Attack Cover 2 Side (Corner)", confidence: 91, formation: "Gun Trips to Cover 2 side", reasoning: "Cover 6 = Cover 4 + Cover 2. Attack the Cover 2 side with smash/corner routes.", routes: ["Corner", "Hitch", "Sail"], motions: ["Trips to Cover 2 side"] },
    { concept: "Seam to Cover 4 Side", confidence: 86, formation: "Spread to Cover 4 side", reasoning: "Cover 4 side has deep safeties — seam routes between them and hook zones work.", routes: ["Seam", "Post", "Go"], motions: ["Spread motion to Cover 4 side"] },
  ],
  "Man Free": [
    { concept: "Mesh / Rub (Man Destroyer)", confidence: 93, formation: "Gun Bunch", reasoning: "Man Free has a single safety in the middle. Rub routes create picks — natural man beaters.", routes: ["Mesh", "Rub", "Cross"], motions: ["Bunch condensed", "Stack"] },
    { concept: "Fade Away from Safety", confidence: 88, formation: "Gun Spread", reasoning: "Free safety covers deep middle. Attack the boundary side with a fade away from help.", routes: ["Fade", "Back-shoulder", "Out"], motions: ["Push receiver outside"] },
  ],
  "Zero Blitz": [
    { concept: "Immediate Hot Route (Slant/Fade)", confidence: 97, formation: "Gun Empty / Spread", reasoning: "Zero blitz is the fastest pressure — throw HOT immediately. Slant and fade beat it clean.", routes: ["Slant", "Fade", "Quick out"], motions: ["Drag hot route", "Slant hot route"] },
    { concept: "Screen / Bubble", confidence: 89, formation: "Gun Spread", reasoning: "All rushers means blockers in the flat. Screen or bubble WR turns blitz into a footrace.", routes: ["Screen", "Bubble", "Army screen"], motions: ["WR screen alignment"] },
  ],
  "Cover 2 Man Under": [
    { concept: "Fade / Streak (Over Top)", confidence: 91, formation: "Gun Spread / Empty", reasoning: "Man coverage underneath with 2-deep zone — streak routes can beat the man before safety helps.", routes: ["Fade", "Streak", "Go"], motions: ["Stack WRs outside"] },
    { concept: "Underneath Crosses (Sit in Zone Gap)", confidence: 86, formation: "Gun Bunch", reasoning: "Dig routes sit between the man coverage and deep zone. Man defenders can't trail across.", routes: ["Dig", "Deep cross", "In route"], motions: ["Rub motion"] },
  ],
};

// ─── Main Analysis Function ───────────────────────────────────────────────────

export function analyzePreSnap(inputs: PreSnapInputs, historicalBoost?: Partial<Record<Coverage, number>>): PreSnapAnalysis {
  const { shell, confidence: shellConfidence } = detectShell(inputs);
  const scores = computeScores(inputs);

  if (historicalBoost) {
    for (const [cov, boost] of Object.entries(historicalBoost) as [Coverage, number][]) {
      scores[cov] = (scores[cov] ?? 0) + boost;
    }
  }

  const breakdown = normalizeToCoverageBreakdown(scores);
  const top    = breakdown[0] ?? { coverage: "Cover 3 Sky" as Coverage, confidence: 30 };
  const second = breakdown[1];

  // ── Confidence gating ────────────────────────────────────────────────────
  const isLowConfidence = top.confidence < COVERAGE_MIN_CONFIDENCE;
  const isAmbiguous     = !!second && (top.confidence - second.confidence) < COVERAGE_AMBIGUITY_GAP;

  let coverageConclusion: CoverageConclusion;
  if (isLowConfidence) {
    coverageConclusion = "Unknown";
  } else if (isAmbiguous) {
    coverageConclusion = "Multiple Possibilities";
  } else {
    coverageConclusion = top.coverage;
  }

  // ── User detection ───────────────────────────────────────────────────────
  const userDetection = detectUserControlledDefender({
    evidenceObserved:   inputs.userEvidence,
    suspectedPosition:  inputs.userSuspectedPosition,
    legacyPosition:     inputs.userPosition,
  });

  // ── Evidence trail ───────────────────────────────────────────────────────
  const evidenceTrail = buildEvidenceTrail(inputs, shell);

  const disguises        = detectDisguises(shell, inputs);
  const blitzProbability = computeBlitzProb(inputs);
  const adjustmentImpact = describeAdjustmentImpact(inputs.adjustment);
  const recommendations  = ATTACK_MAP[top.coverage] ?? ATTACK_MAP["Cover 3 Sky"];
  const reasoning        = buildReasoning(inputs, shell, top.coverage, userDetection);

  return {
    shell,
    shellConfidence,
    topCoverage:        top.coverage,
    topConfidence:      top.confidence,
    coverageConclusion,
    isLowConfidence,
    isAmbiguous,
    coverageBreakdown:  breakdown,
    evidenceTrail,
    disguises,
    adjustmentImpact,
    blitzProbability,
    recommendations,
    reasoning,
    userDetection,
  };
}
