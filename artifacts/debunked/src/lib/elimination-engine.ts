// ─── Elimination Engine ───────────────────────────────────────────────────────
// Deterministic play identification through successive elimination.
// The engine NEVER guesses. Same inputs → same outputs. Always.
//
// Pipeline:
//   Observed Facts
//     → Eliminate Impossible Plays
//     → Rank Remaining by Confidence
//     → Return with Full Evidence Trail

import {
  MADDEN_PLAY_DB,
  type MaddenPlay,
  type Shell,
  type AdjustmentTell,
  type UserPositionType,
} from "./madden-play-db";

// ─── Input Types ──────────────────────────────────────────────────────────────

// All terminology matches Madden's in-game menus — not generic football terms.

export type SafetyDepth    = "Default" | "Tight" | "Over Top";
export type SafetyWidth    = "Normal" | "Pinched" | "Spread";
export type CBAlignment    = "Press" | "Default" | "Back Off";
export type DLAlignment    = "Normal" | "Pinch" | "Spread" | "Shift Left" | "Shift Right";
export type LBAlignment    = "Normal" | "Pinch" | "Spread" | "Mugged";
export type CoverageShading = "None" | "Inside" | "Outside" | "Over Top" | "Underneath";
export type NumSafeties    = "Two High" | "Single High" | "Zero" | "Unknown";
export type BlitzRead      = "None" | "A-Gap Shade" | "Edge Walk-Up" | "DB Walked Down" | "Multiple Walk-Ups" | "Corner Walk-Down";

export type EliminationInputs = {
  // Playbook context
  opponentPlaybook:  string;       // "Bills", "All", etc.
  defFormation:      string;       // "Nickel DBL Mug", "4-3 Even", etc.
  offFormation:      string;       // What offense is in

  // Safety read (most critical — determines shell)
  numSafeties:       NumSafeties;
  safetyDepth:       SafetyDepth;
  safetyWidth:       SafetyWidth;

  // CB technique
  cbAlignment:       CBAlignment;
  coverageShading:   CoverageShading;

  // Linebacker read
  lbAlignment:       LBAlignment;

  // Defensive line
  dlAlignment:       DLAlignment;

  // Blitz read
  blitzRead:         BlitzRead;
  extraRushers:      boolean;

  // User position detected
  userPosition:      UserPositionType | "Unknown";

  // Additional tells checked
  observedTells:     AdjustmentTell[];

  // Situational
  down?:             number;
  distance?:         number;
};

export const DEFAULT_ELIMINATION_INPUTS: EliminationInputs = {
  opponentPlaybook: "All",
  defFormation:     "",
  offFormation:     "",
  numSafeties:      "Unknown",
  safetyDepth:      "Default",
  safetyWidth:      "Normal",
  cbAlignment:      "Default",
  coverageShading:  "None",
  lbAlignment:      "Normal",
  dlAlignment:      "Normal",
  blitzRead:        "None",
  extraRushers:     false,
  userPosition:     "Unknown",
  observedTells:    [],
};

// ─── Elimination Step ──────────────────────────────────────────────────────────

export type EliminationStep = {
  filterName:    string;           // What signal was applied
  filterValue:   string;           // What value was observed
  before:        number;           // Plays remaining before this filter
  after:         number;           // Plays remaining after this filter
  eliminated:    string[];         // Play names eliminated
  reason:        string;           // Why these plays were eliminated
};

// ─── Ranked Play Result ────────────────────────────────────────────────────────

export type RankedPlay = {
  play:           MaddenPlay;
  confidence:     number;          // 0-100
  supportingTells: AdjustmentTell[]; // tells that support this play
  contradictions:  string[];         // signals that partially contradict
};

// ─── Engine Output ────────────────────────────────────────────────────────────

export type EliminationResult = {
  inputs:          EliminationInputs;
  startingPool:    MaddenPlay[];    // All candidate plays before elimination
  eliminationChain: EliminationStep[];
  remaining:       RankedPlay[];    // Ranked survivors
  topPlay:         RankedPlay | null;
  alternatives:    RankedPlay[];    // #2, #3 plays
  shellConclusion: Shell | "Unknown";
  shellConfidence: number;
  blitzProbability: number;
  evidence:        string[];        // Final human-readable evidence list
  counters:        import("./madden-play-db").Counter[];
};

// ─── Shell Inference ──────────────────────────────────────────────────────────
// Map observed safety alignment to most likely shell.
// This is the first and most important elimination step.

function inferShell(inputs: EliminationInputs): { shell: Shell | "Unknown"; confidence: number } {
  const { numSafeties, safetyDepth, safetyWidth, blitzRead, extraRushers } = inputs;

  if (numSafeties === "Zero" || extraRushers && blitzRead !== "None" && numSafeties !== "Two High") {
    return { shell: "Cover 0 Shell", confidence: 85 };
  }

  if (numSafeties === "Single High") {
    if (safetyDepth === "Over Top") return { shell: "Cover 3 Shell", confidence: 85 };
    return { shell: "Cover 3 Shell", confidence: 75 };
  }

  if (numSafeties === "Two High") {
    if (safetyDepth === "Over Top" && safetyWidth === "Spread") return { shell: "Cover 4 Shell", confidence: 80 };
    if (safetyDepth === "Over Top") return { shell: "Cover 4 Shell", confidence: 72 };
    if (safetyWidth === "Spread") return { shell: "Cover 6 Shell", confidence: 65 };
    if (safetyWidth === "Normal" || safetyWidth === "Pinched") return { shell: "Cover 2 Shell", confidence: 78 };
  }

  return { shell: "Unknown", confidence: 0 };
}

// ─── Tell → Shell Compatibility ───────────────────────────────────────────────

function shellCompatible(play: MaddenPlay, shell: Shell | "Unknown"): boolean {
  if (shell === "Unknown") return true;
  // Cover 0 Shell is only compatible with Cover 0 Man plays
  if (shell === "Cover 0 Shell") return play.shell === "Cover 0 Shell";
  // Otherwise check for match
  return play.shell === shell || play.shell === "Disguised";
}

// ─── Blitz Probability ────────────────────────────────────────────────────────

function computeBlitzProb(inputs: EliminationInputs): number {
  let prob = 15; // base rate

  if (inputs.lbAlignment === "Mugged")                      prob += 30;
  if (inputs.blitzRead === "Multiple Walk-Ups")             prob += 25;
  if (inputs.blitzRead === "Edge Walk-Up")                  prob += 20;
  if (inputs.blitzRead === "A-Gap Shade")                   prob += 20;
  if (inputs.blitzRead === "DB Walked Down")                prob += 15;
  if (inputs.blitzRead === "Corner Walk-Down")              prob += 15;
  if (inputs.extraRushers)                                  prob += 25;
  if (inputs.numSafeties === "Zero")                        prob += 40;
  if (inputs.cbAlignment === "Press")                       prob += 10;
  if (inputs.safetyDepth === "Tight")                       prob += 10;
  if (inputs.safetyWidth === "Pinched")                     prob += 10;

  return Math.min(98, prob);
}

// ─── Confidence Scoring ────────────────────────────────────────────────────────
// Score each surviving play by how well the observed facts match its tells.

function scorePlay(play: MaddenPlay, inputs: EliminationInputs): { score: number; supporting: AdjustmentTell[]; contradictions: string[] } {
  let score = 50; // base score
  const supporting: AdjustmentTell[] = [];
  const contradictions: string[] = [];

  // Apply confidence modifiers from the play's database entry
  for (const tell of inputs.observedTells) {
    const mod = play.confidenceModifiers[tell];
    if (mod !== undefined) {
      score += mod;
      if (mod > 0) supporting.push(tell as AdjustmentTell);
    }
  }

  // Shell match bonus
  const { shell } = inferShell(inputs);
  if (shell !== "Unknown" && play.shell === shell) score += 15;

  // CB alignment match
  if (inputs.cbAlignment === "Press" && play.commonTells.includes("Corners Press")) {
    score += 12; supporting.push("Corners Press");
  }
  if (inputs.cbAlignment === "Back Off" && !play.commonTells.includes("Corners Press")) {
    score += 8;
  }

  // LB alignment match
  if (inputs.lbAlignment === "Mugged" && play.commonTells.includes("LBs Mugged")) {
    score += 15; if (!supporting.includes("LBs Mugged")) supporting.push("LBs Mugged");
  }
  if (inputs.lbAlignment === "Mugged" && !play.commonTells.includes("LBs Mugged")) {
    score -= 10; contradictions.push("LBs Mugged not expected for this play");
  }

  // Safety depth match
  if (inputs.safetyDepth === "Tight" && play.commonTells.includes("Safeties Tight")) {
    score += 12; supporting.push("Safeties Tight");
  }
  if (inputs.safetyWidth === "Pinched" && play.commonTells.includes("Safeties Pinched")) {
    score += 12; if (!supporting.includes("Safeties Pinched")) supporting.push("Safeties Pinched");
  }
  if (inputs.safetyWidth === "Spread" && play.commonTells.includes("Safeties Spread")) {
    score += 12;
  }

  // User position match
  if (inputs.userPosition !== "Unknown" && play.typicalUserPositions.includes(inputs.userPosition)) {
    score += 8;
  } else if (inputs.userPosition !== "Unknown" && !play.typicalUserPositions.includes(inputs.userPosition)) {
    score -= 5; contradictions.push(`User at ${inputs.userPosition} not typical for this play`);
  }

  // Blitz / extra rusher match
  if (inputs.extraRushers && play.blitzType !== "None") score += 10;
  if (inputs.extraRushers && play.blitzType === "None") {
    score -= 15; contradictions.push("Extra rushers visible but play is not a blitz");
  }
  if (!inputs.extraRushers && play.numRushers > 5) {
    score -= 12; contradictions.push("Not enough rushers visible for this blitz package");
  }

  // DL alignment match
  if (inputs.dlAlignment === "Pinch" && play.commonTells.includes("DL Pinched")) {
    score += 8; supporting.push("DL Pinched");
  }

  return { score: Math.max(0, Math.min(100, score)), supporting, contradictions };
}

// ─── Normalize Scores to Probabilities ────────────────────────────────────────

function normalizeToConfidence(ranked: Array<{ play: MaddenPlay; score: number; supporting: AdjustmentTell[]; contradictions: string[] }>): RankedPlay[] {
  if (ranked.length === 0) return [];
  const total = ranked.reduce((s, r) => s + Math.max(r.score, 1), 0);
  return ranked.map(r => ({
    play:            r.play,
    confidence:      Math.round((r.score / total) * 100),
    supportingTells: r.supporting,
    contradictions:  r.contradictions,
  })).sort((a, b) => b.confidence - a.confidence);
}

// ─── Main Elimination Engine ──────────────────────────────────────────────────

export function runEliminationEngine(inputs: EliminationInputs): EliminationResult {
  const chain: EliminationStep[] = [];

  // ── Step 1: Build starting pool ──────────────────────────────────────────
  let pool: MaddenPlay[] = inputs.defFormation
    ? MADDEN_PLAY_DB.filter(p => p.formation === inputs.defFormation)
    : [...MADDEN_PLAY_DB];

  // Apply playbook filter if not "All"
  if (inputs.opponentPlaybook && inputs.opponentPlaybook !== "All") {
    const filtered = pool.filter(p => p.playbook.includes(inputs.opponentPlaybook));
    if (filtered.length > 0) pool = filtered; // only apply if we get results
  }

  const startingPool = [...pool];

  // ── Step 2: Shell elimination ─────────────────────────────────────────────
  const { shell, confidence: shellConf } = inferShell(inputs);
  let shellConfidence = shellConf;

  if (shell !== "Unknown") {
    const before = pool.length;
    const eliminated: string[] = [];
    const survived = pool.filter(p => {
      const compat = shellCompatible(p, shell);
      if (!compat) eliminated.push(p.playName);
      return compat;
    });

    if (survived.length > 0) {
      pool = survived;
      chain.push({
        filterName:  "Shell Recognition",
        filterValue: shell,
        before,
        after:       pool.length,
        eliminated,
        reason:      shellEliminationReason(shell),
      });
    }
  }

  // ── Step 3: LB alignment elimination ──────────────────────────────────────
  if (inputs.lbAlignment !== "Normal") {
    const before = pool.length;
    const eliminated: string[] = [];
    let survived = pool;

    if (inputs.lbAlignment === "Mugged") {
      // Mugged LBs strongly imply blitz or disguised blitz — remove pure soft zone plays
      survived = pool.filter(p => {
        const isSoftZone = p.blitzType === "None" && !p.commonTells.includes("LBs Mugged");
        if (isSoftZone && p.shell !== "Disguised") {
          eliminated.push(p.playName);
          return false;
        }
        return true;
      });
    }

    if (survived.length > 0 && survived.length < before) {
      pool = survived;
      chain.push({
        filterName:  "LB Alignment",
        filterValue: `LBs ${inputs.lbAlignment}`,
        before,
        after:       pool.length,
        eliminated,
        reason:      lbEliminationReason(inputs.lbAlignment),
      });
    }
  }

  // ── Step 4: Safety depth/width elimination ─────────────────────────────────
  const safetyTell = getSafetyTell(inputs);
  if (safetyTell) {
    const before = pool.length;
    const eliminated: string[] = [];
    const survived = pool.filter(p => {
      // If we see tight+pinched safeties, eliminate deep zone plays
      if (inputs.safetyDepth === "Tight" && inputs.safetyWidth === "Pinched") {
        if (p.shell === "Cover 4 Shell" && !p.commonTells.includes("Safeties Tight")) {
          eliminated.push(p.playName);
          return false;
        }
      }
      return true;
    });

    if (survived.length > 0 && survived.length < before) {
      pool = survived;
      chain.push({
        filterName:  "Safety Positioning",
        filterValue: safetyTell,
        before,
        after:       pool.length,
        eliminated,
        reason:      `${safetyTell} is inconsistent with the eliminated plays' typical safety positioning`,
      });
    }
  }

  // ── Step 5: CB alignment elimination ──────────────────────────────────────
  if (inputs.cbAlignment !== "Default") {
    const before = pool.length;
    const eliminated: string[] = [];
    const survived = pool.filter(p => {
      // Press corners strongly imply man or 0 — eliminate plays with "Back Off" tells
      if (inputs.cbAlignment === "Press") {
        if (p.coverage === "Cover 4 Quarters" && !p.commonTells.includes("Corners Press")) {
          eliminated.push(p.playName);
          return false;
        }
      }
      return true;
    });

    if (survived.length > 0 && survived.length < before) {
      pool = survived;
      chain.push({
        filterName:  "CB Alignment",
        filterValue: `CB ${inputs.cbAlignment}`,
        before,
        after:       pool.length,
        eliminated,
        reason:      cbEliminationReason(inputs.cbAlignment),
      });
    }
  }

  // ── Step 6: Blitz/rusher elimination ──────────────────────────────────────
  if (inputs.blitzRead !== "None" || inputs.extraRushers) {
    const before = pool.length;
    const eliminated: string[] = [];
    const survived = pool.filter(p => {
      // If we clearly see extra rushers, eliminate plays with only 4 rushers
      if (inputs.extraRushers && inputs.blitzRead !== "None" && p.numRushers <= 4 && p.blitzType === "None") {
        eliminated.push(p.playName);
        return false;
      }
      return true;
    });

    if (survived.length > 0 && survived.length < before) {
      pool = survived;
      chain.push({
        filterName:  "Blitz Indicators",
        filterValue: inputs.extraRushers ? "Extra rushers visible" : inputs.blitzRead,
        before,
        after:       pool.length,
        eliminated,
        reason:      "Blitz indicators rule out plays with only 4 rushers",
      });
    }
  }

  // ── Step 7: Score and rank remaining plays ─────────────────────────────────
  const scored = pool.map(p => ({
    ...scorePlay(p, inputs),
    play: p,
  }));

  const ranked = normalizeToConfidence(scored);

  // ── Step 8: Build final output ─────────────────────────────────────────────
  // ── Insufficient evidence guardrail ──────────────────────────────────────
  // The engine never forces a prediction when evidence is too thin.
  // Require: at least 2 active signals AND top play score >= 30
  // AND meaningful gap between #1 and #2 (or only one play remains).
  const MIN_SCORE     = 30;
  const MIN_GAP       = 10;
  const MIN_SIGNALS   = 2;

  const activeSignalCount =
    inputs.observedTells.length +
    (inputs.numSafeties !== "Unknown" ? 1 : 0) +
    (inputs.safetyDepth !== "Default" ? 1 : 0) +
    (inputs.safetyWidth !== "Normal" ? 1 : 0) +
    (inputs.cbAlignment !== "Default" ? 1 : 0) +
    (inputs.lbAlignment !== "Normal" ? 1 : 0) +
    (inputs.blitzRead !== "None" ? 1 : 0) +
    (inputs.extraRushers ? 1 : 0) +
    (inputs.userPosition !== "Unknown" ? 1 : 0);

  const hasEnoughEvidence =
    activeSignalCount >= MIN_SIGNALS &&
    (ranked[0]?.confidence ?? 0) >= MIN_SCORE &&
    (ranked.length === 1 || ((ranked[0]?.confidence ?? 0) - (ranked[1]?.confidence ?? 0)) >= MIN_GAP);

  const topPlay     = hasEnoughEvidence ? (ranked[0] ?? null) : null;
  const alternatives = hasEnoughEvidence ? ranked.slice(1, 4) : ranked.slice(0, 4);

  const blitzProbability = computeBlitzProb(inputs);

  // Build evidence list
  const evidence: string[] = [];
  if (shell !== "Unknown") evidence.push(`✓ ${shell} detected`);
  if (inputs.lbAlignment === "Mugged") evidence.push("✓ LBs Mugged");
  if (inputs.cbAlignment === "Press") evidence.push("✓ Corners Press");
  if (inputs.safetyDepth === "Tight") evidence.push("✓ Safeties Tight");
  if (inputs.safetyWidth === "Pinched") evidence.push("✓ Safeties Pinched");
  if (inputs.safetyWidth === "Spread") evidence.push("✓ Safeties Spread");
  if (inputs.extraRushers) evidence.push("✓ Extra Rushers Visible");
  if (inputs.userPosition !== "Unknown") evidence.push(`✓ ${inputs.userPosition} User`);
  if (inputs.blitzRead !== "None") evidence.push(`✓ ${inputs.blitzRead}`);
  for (const tell of inputs.observedTells) evidence.push(`✓ ${tell}`);

  return {
    inputs,
    startingPool,
    eliminationChain: chain,
    remaining:        ranked,
    topPlay,
    alternatives,
    shellConclusion:  shell,
    shellConfidence,
    blitzProbability,
    evidence,
    counters:         topPlay?.play.counters ?? [],
  };
}

// ─── Reason Builders ──────────────────────────────────────────────────────────

function shellEliminationReason(shell: Shell): string {
  switch (shell) {
    case "Cover 0 Shell": return "Zero safeties deep eliminates all zone and man-with-safety plays";
    case "Cover 2 Shell": return "Two high split safeties eliminate single-high and zero-coverage plays";
    case "Cover 3 Shell": return "Single high safety eliminates two-high shell and zero blitz plays";
    case "Cover 4 Shell": return "Two high at quarters depth eliminate Cover 2 and single-high plays";
    case "Cover 6 Shell": return "Asymmetric safety alignment eliminates symmetric shell plays";
    default:              return "Shell recognition eliminated incompatible coverages";
  }
}

function lbEliminationReason(alignment: LBAlignment): string {
  switch (alignment) {
    case "Mugged": return "LBs walked up tight to LOS eliminate soft zone and deep coverage plays";
    case "Spread": return "LBs spread wide eliminate inside blitz and A-gap pressure plays";
    case "Pinch":  return "LBs pinched inside eliminate outside blitz and edge pressure plays";
    default:       return "LB alignment inconsistent with eliminated plays";
  }
}

function cbEliminationReason(alignment: CBAlignment): string {
  switch (alignment) {
    case "Press":    return "Press alignment inconsistent with soft zone quarters coverage plays";
    case "Back Off": return "Off-coverage eliminates man-coverage and press-heavy blitz plays";
    default:         return "CB alignment inconsistent with eliminated plays";
  }
}

function getSafetyTell(inputs: EliminationInputs): string | null {
  const parts: string[] = [];
  if (inputs.safetyDepth === "Tight")    parts.push("Safety Tight");
  if (inputs.safetyDepth === "Over Top") parts.push("Safety Over Top");
  if (inputs.safetyWidth === "Pinched")  parts.push("Safety Pinched");
  if (inputs.safetyWidth === "Spread")   parts.push("Safety Spread");
  return parts.length > 0 ? parts.join(" + ") : null;
}
