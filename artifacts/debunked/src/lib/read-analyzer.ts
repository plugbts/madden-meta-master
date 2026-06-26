// ─── Read Analyzer — "What Did I Miss?" ──────────────────────────────────────
// Structures a QB read analysis and grades decision-making.
// Foundation for future AI video/clip analysis integration.
// All types and logic are AI-pipeline ready.

// ─── Receiver Types ───────────────────────────────────────────────────────────

export type ReceiverName =
  | "X Receiver (Split End)"
  | "Z Receiver (Flanker)"
  | "Y Receiver (TE)"
  | "Slot Receiver"
  | "Running Back"
  | "H-Back"
  | "Fullback";

export type RouteType =
  | "Slant"
  | "Crossing / Drag"
  | "Dig (Square In)"
  | "Curl / Comeback"
  | "Post"
  | "Corner (Flag)"
  | "Go / Fly"
  | "Out"
  | "In"
  | "Hook"
  | "Seam"
  | "Wheel"
  | "Texas (Angle)"
  | "Stick"
  | "Fade"
  | "Checkdown / Flat"
  | "Screen"
  | "Other";

export type OpenWindow =
  | "Immediately at snap"
  | "0-2 seconds (quick game)"
  | "2-3 seconds (rhythm)"
  | "3+ seconds (concept develops)"
  | "Closed before ball arrived"
  | "Never open";

export type CoverageDifficulty = "Easy" | "Moderate" | "Hard" | "Contested";

export type ReceiverRead = {
  id: string;
  name: ReceiverName | string;
  route: RouteType | string;
  yards: number;
  /** Was this receiver open at any point in the read progression? */
  wasOpen: boolean;
  openWindow: OpenWindow;
  difficulty: CoverageDifficulty;
  /** Was this receiver targeted? */
  targeted: boolean;
  /** Depth of the route at the open window */
  depthAtWindow: "Short (0-5 yds)" | "Intermediate (6-14 yds)" | "Deep (15+ yds)";
  /** Optional note on why they were open or covered */
  coverageNote: string;
};

// ─── Play Input ───────────────────────────────────────────────────────────────

export type PlayResult =
  | "Completion"
  | "Incomplete"
  | "Interception"
  | "Sack"
  | "Scramble"
  | "Touchdown"
  | "Safety";

export type MistakeType =
  | "Stared down primary"
  | "Ignored hot route on blitz"
  | "Held ball too long"
  | "Missed open checkdown"
  | "Wrong read progression order"
  | "Missed backside read"
  | "Forced throw into coverage"
  | "No mistake — correct read"
  | "Other";

export type ReadAnalysisInput = {
  playResult: PlayResult;
  yardage: number | null;
  receivers: ReceiverRead[];
  preSnapCoverage: string | null;   // coverage identified pre-snap
  actualCoverage: string | null;    // coverage resolved post-snap
  blitzDetected: boolean;
  timeInPocket: "Quick (< 2s)" | "Normal (2-3s)" | "Extended (3+ s)" | "Sack";
  down: number | null;
  distance: number | null;
  /** User's own assessment of what happened */
  userNote: string;
};

// ─── Analysis Output ──────────────────────────────────────────────────────────

export type ReadGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";

export type GradeRationale = {
  positives: string[];
  negatives: string[];
};

export type ReadAnalysisResult = {
  id: string;
  timestamp: number;
  input: ReadAnalysisInput;
  openReceivers: ReceiverRead[];
  missedReceivers: ReceiverRead[];
  targetedReceiver: ReceiverRead | null;
  targetedWasOpen: boolean;
  bestOption: ReceiverRead | null;
  bestOptionDescription: string;
  grade: ReadGrade;
  gradeRationale: GradeRationale;
  primaryMistake: MistakeType;
  coachingPoints: string[];
  aiPayload: ReadAiPayload;
};

export type ReadAiPayload = {
  schemaVersion: "read-analysis/v1";
  timestamp: number;
  playResult: PlayResult;
  yardage: number | null;
  preSnapCoverage: string | null;
  actualCoverage: string | null;
  blitzDetected: boolean;
  timeInPocket: ReadAnalysisInput["timeInPocket"];
  down: number | null;
  distance: number | null;
  receivers: {
    name: string;
    route: string;
    yards: number;
    wasOpen: boolean;
    openWindow: OpenWindow;
    difficulty: CoverageDifficulty;
    targeted: boolean;
  }[];
  grade: ReadGrade;
  primaryMistake: MistakeType;
  openReceiverCount: number;
  missedReceiverCount: number;
  targetedWasOpen: boolean;
  coachingPoints: string[];
};

// ─── Grade Scoring ────────────────────────────────────────────────────────────

const GRADE_SCALE: { threshold: number; grade: ReadGrade }[] = [
  { threshold: 95, grade: "A+" },
  { threshold: 88, grade: "A"  },
  { threshold: 82, grade: "A-" },
  { threshold: 76, grade: "B+" },
  { threshold: 70, grade: "B"  },
  { threshold: 64, grade: "B-" },
  { threshold: 58, grade: "C+" },
  { threshold: 52, grade: "C"  },
  { threshold: 46, grade: "C-" },
  { threshold: 35, grade: "D"  },
  { threshold: 0,  grade: "F"  },
];

function scoreToGrade(score: number): ReadGrade {
  for (const { threshold, grade } of GRADE_SCALE) {
    if (score >= threshold) return grade;
  }
  return "F";
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function analyzeRead(input: ReadAnalysisInput): ReadAnalysisResult {
  const { receivers, playResult, blitzDetected, timeInPocket } = input;

  const openReceivers = receivers.filter((r) => r.wasOpen);
  const missedReceivers = openReceivers.filter((r) => !r.targeted);
  const targetedReceiver = receivers.find((r) => r.targeted) ?? null;
  const targetedWasOpen = targetedReceiver?.wasOpen ?? false;

  // Best option: easiest open receiver (prefer highest yards if similar difficulty)
  const bestOption = pickBestOption(openReceivers);
  const bestOptionDescription = bestOption
    ? `${bestOption.name} — ${bestOption.route} (${bestOption.yards} yds, ${bestOption.openWindow})`
    : "No clearly open receiver identified";

  // Grade
  const score = computeScore(input, openReceivers, targetedReceiver, targetedWasOpen);
  const grade = scoreToGrade(score);

  // Mistake detection
  const primaryMistake = detectMistake(input, openReceivers, targetedReceiver, targetedWasOpen);

  // Coaching points
  const coachingPoints = buildCoachingPoints(input, openReceivers, missedReceivers, primaryMistake);

  // Grade rationale
  const gradeRationale = buildGradeRationale(input, openReceivers, targetedReceiver, targetedWasOpen, primaryMistake);

  const aiPayload: ReadAiPayload = {
    schemaVersion: "read-analysis/v1",
    timestamp: Date.now(),
    playResult,
    yardage: input.yardage,
    preSnapCoverage: input.preSnapCoverage,
    actualCoverage: input.actualCoverage,
    blitzDetected,
    timeInPocket,
    down: input.down,
    distance: input.distance,
    receivers: receivers.map((r) => ({
      name: r.name,
      route: r.route,
      yards: r.yards,
      wasOpen: r.wasOpen,
      openWindow: r.openWindow,
      difficulty: r.difficulty,
      targeted: r.targeted,
    })),
    grade,
    primaryMistake,
    openReceiverCount: openReceivers.length,
    missedReceiverCount: missedReceivers.length,
    targetedWasOpen,
    coachingPoints,
  };

  return {
    id: `ra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    input,
    openReceivers,
    missedReceivers,
    targetedReceiver,
    targetedWasOpen,
    bestOption,
    bestOptionDescription,
    grade,
    gradeRationale,
    primaryMistake,
    coachingPoints,
    aiPayload,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function computeScore(
  input: ReadAnalysisInput,
  openReceivers: ReceiverRead[],
  targeted: ReceiverRead | null,
  targetedOpen: boolean
): number {
  let score = 70; // base

  // Targeted the open receiver correctly
  if (targetedOpen) {
    score += 15;
    // Bonus for targeting the best option
    const best = pickBestOption(openReceivers);
    if (best && targeted && best.id === targeted.id) score += 5;
  } else {
    // Missed the open receiver
    score -= 20;
    if (openReceivers.length >= 2) score -= 5; // multiple open receivers missed
  }

  // Interception is always a significant deduction
  if (input.playResult === "Interception") score -= 30;

  // Sack
  if (input.playResult === "Sack") score -= 15;

  // Blitz — did they respond correctly?
  if (input.blitzDetected) {
    if (input.timeInPocket === "Quick (< 2s)" || input.timeInPocket === "Normal (2-3s)") {
      score += 5; // quick enough
    } else if (input.timeInPocket === "Sack") {
      score -= 15;
    } else {
      score -= 5;
    }
    // Did they hit the hot route?
    const hotOpen = openReceivers.find((r) => r.openWindow === "0-2 seconds (quick game)");
    if (hotOpen && targeted?.id === hotOpen.id) score += 5;
    if (hotOpen && targeted?.id !== hotOpen.id) score -= 10; // ignored hot on blitz
  }

  // Yardage above expectation
  const yl = input.yardage ?? 0;
  if (input.playResult === "Completion" || input.playResult === "Touchdown") {
    if (yl >= 20) score += 5;
    if (input.playResult === "Touchdown") score += 10;
  }

  // No open receivers — harder situation
  if (openReceivers.length === 0 && input.playResult === "Incomplete") score += 10;

  return Math.max(0, Math.min(100, score));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickBestOption(openReceivers: ReceiverRead[]): ReceiverRead | null {
  if (openReceivers.length === 0) return null;
  const difficultyOrder: CoverageDifficulty[] = ["Easy", "Moderate", "Hard", "Contested"];
  return [...openReceivers].sort((a, b) => {
    const da = difficultyOrder.indexOf(a.difficulty);
    const db = difficultyOrder.indexOf(b.difficulty);
    if (da !== db) return da - db;
    return b.yards - a.yards; // prefer more yards when same difficulty
  })[0];
}

function detectMistake(
  input: ReadAnalysisInput,
  openReceivers: ReceiverRead[],
  targeted: ReceiverRead | null,
  targetedOpen: boolean
): MistakeType {
  if (input.playResult === "Interception") return "Forced throw into coverage";
  if (input.playResult === "Sack" && input.blitzDetected) return "Ignored hot route on blitz";
  if (input.playResult === "Sack") return "Held ball too long";
  if (!targetedOpen && openReceivers.length === 0) return "No mistake — correct read";
  if (!targetedOpen && openReceivers.length > 0) {
    // Try to identify what they missed
    const checkdown = openReceivers.find((r) =>
      r.route === "Checkdown / Flat" || r.name === "Running Back"
    );
    if (checkdown && targeted) return "Missed open checkdown";
    const backside = openReceivers.find((r) =>
      r.openWindow === "3+ seconds (concept develops)"
    );
    if (backside) return "Missed backside read";
    return "Stared down primary";
  }
  if (targetedOpen) return "No mistake — correct read";
  return "Other";
}

function buildCoachingPoints(
  input: ReadAnalysisInput,
  open: ReceiverRead[],
  missed: ReceiverRead[],
  mistake: MistakeType
): string[] {
  const points: string[] = [];

  if (mistake === "Stared down primary") {
    points.push("Your eyes telegraphed the throw — defenders key on QB eye direction. Run a full scan before committing.");
  }
  if (mistake === "Ignored hot route on blitz") {
    points.push("Blitz was detected. The hot route must be your first look — no exceptions under pressure.");
  }
  if (mistake === "Held ball too long") {
    points.push("Your reset or check-down options need to be built into your pre-snap plan. Identify your safe outlet before the snap.");
  }
  if (mistake === "Missed open checkdown") {
    points.push("The running back was open underneath. Don't leave easy yards on the field — the check-down is not a failure.");
  }
  if (mistake === "Missed backside read") {
    points.push("Coverage rolled away from the backside, opening your backside read. Train yourself to reset eyes to the backside post-snap.");
  }
  if (mistake === "Forced throw into coverage") {
    points.push("Never force the ball into a covered receiver. The incompletion is always better than the interception.");
  }

  if (missed.length > 0) {
    const desc = missed.map((r) => `${r.name} (${r.route}, ${r.yards} yds)`).join(", ");
    points.push(`Open receivers not targeted: ${desc}.`);
  }

  if (input.blitzDetected && input.timeInPocket === "Sack") {
    points.push("Identify the blitz pre-snap and set a hot route. A quick outlet releases before pressure arrives.");
  }

  if (open.length === 0 && input.playResult === "Incomplete") {
    points.push("Coverage was effective — nothing was clearly open. Consider a different concept or route combination against this look.");
  }

  return points;
}

function buildGradeRationale(
  input: ReadAnalysisInput,
  open: ReceiverRead[],
  targeted: ReceiverRead | null,
  targetedOpen: boolean,
  mistake: MistakeType
): GradeRationale {
  const positives: string[] = [];
  const negatives: string[] = [];

  if (targetedOpen) positives.push("Targeted an open receiver");
  if (input.playResult === "Touchdown") positives.push("Touchdown — maximum result on the play");
  if (input.playResult === "Completion" && (input.yardage ?? 0) >= 15) positives.push("Gained significant yardage");
  if (input.blitzDetected && input.timeInPocket !== "Sack") positives.push("Handled blitz pressure with quick release");
  if (open.length === 0 && input.playResult === "Incomplete") positives.push("Coverage was clean — no easy reads available");

  if (!targetedOpen && open.length > 0) negatives.push("Missed open receivers");
  if (input.playResult === "Interception") negatives.push("Interception — ball thrown into coverage");
  if (input.playResult === "Sack") negatives.push("Took a sack");
  if (mistake !== "No mistake — correct read" && mistake !== "Other") negatives.push(mistake);
  if (input.blitzDetected && input.timeInPocket === "Extended (3+ s)") negatives.push("Held ball too long vs. blitz");

  return { positives, negatives };
}

// ─── Helpers for UI ───────────────────────────────────────────────────────────

export function gradeColor(grade: ReadGrade): string {
  const pos = ["A+", "A", "A-"];
  const bpos = ["B+", "B"];
  const bneg = ["B-", "C+"];
  const neg = ["C", "C-", "D"];
  if (pos.includes(grade)) return "#22c55e";
  if (bpos.includes(grade)) return "#84cc16";
  if (bneg.includes(grade)) return "#eab308";
  if (neg.includes(grade)) return "#f97316";
  return "#ef4444";
}

export function mistakeLabel(type: MistakeType): string {
  return type;
}

export const RECEIVER_NAMES: ReceiverName[] = [
  "X Receiver (Split End)",
  "Z Receiver (Flanker)",
  "Y Receiver (TE)",
  "Slot Receiver",
  "Running Back",
  "H-Back",
  "Fullback",
];

export const ROUTE_TYPES: RouteType[] = [
  "Slant", "Crossing / Drag", "Dig (Square In)", "Curl / Comeback", "Post",
  "Corner (Flag)", "Go / Fly", "Out", "In", "Hook", "Seam", "Wheel",
  "Texas (Angle)", "Stick", "Fade", "Checkdown / Flat", "Screen", "Other",
];

export const OPEN_WINDOWS: OpenWindow[] = [
  "Immediately at snap", "0-2 seconds (quick game)", "2-3 seconds (rhythm)",
  "3+ seconds (concept develops)", "Closed before ball arrived", "Never open",
];

export const DIFFICULTIES: CoverageDifficulty[] = ["Easy", "Moderate", "Hard", "Contested"];
