import {
  COVERAGES, OFFENSES, META_ENTRIES, LURK_ALERTS, SITUATIONAL_PLAYS,
  type Coverage, type Counter, type OffenseFormation, type LurkAlert,
} from "./madden-data";

export type Situation = "normal" | "redzone" | "goalline" | "4thdown";
export type UserPosition = "MLB" | "SS" | "FS" | "CB" | "none";

export type SnapInput = {
  coverageId?: string;
  opponentFormationId?: string;
  userPosition?: UserPosition;
  situation?: Situation;
};

export type Scores = {
  coverageConfidence: number;
  counterConfidence: number;
  moneyPlayScore: number;
  readDifficulty: 1 | 2 | 3 | 4 | 5;
};

export type SnapFinding = {
  coverage?: Coverage;
  opponentFormation?: OffenseFormation;
  bestCounters: Counter[];
  lurk?: LurkAlert;
  scores: Scores;
  tags: string[];
  narrative: string;
};

function tierToScore(tier: "A+" | "A" | "B+"): number {
  return tier === "A+" ? 92 : tier === "A" ? 76 : 61;
}

export function analyzeSnap(input: SnapInput): SnapFinding {
  const coverage = input.coverageId ? COVERAGES.find(c => c.id === input.coverageId) : undefined;
  const opponentFormation = input.opponentFormationId ? OFFENSES.find(f => f.id === input.opponentFormationId) : undefined;

  let coverageConfidence = coverage ? (coverage.popular ? 78 : 62) : 0;
  if (input.opponentFormationId) coverageConfidence = Math.min(95, coverageConfidence + 8);
  if (input.userPosition && input.userPosition !== "none") coverageConfidence = Math.min(95, coverageConfidence + 5);

  const bestCounters = coverage?.counters ?? [];
  const topCounter = bestCounters[0];
  const counterConfidence = topCounter ? tierToScore(topCounter.tier) : 0;

  let moneyPlayScore = counterConfidence;
  if (coverage && opponentFormation) moneyPlayScore = Math.min(97, moneyPlayScore + 7);
  if (input.situation && input.situation !== "normal") moneyPlayScore = Math.min(97, moneyPlayScore + 4);

  const readDifficulty: 1 | 2 | 3 | 4 | 5 =
    !coverage ? 3 :
    coverage.category === "blitz" ? 2 :
    coverage.category === "man" ? 3 :
    coverage.category === "zone" ? 3 : 4;

  const lurk = LURK_ALERTS.find(l => {
    const covMatch = coverage && (
      l.coverage.toLowerCase().includes(coverage.name.toLowerCase().split(" ")[0]) ||
      l.id.includes(coverage.id.split("-").slice(0, 2).join("-"))
    );
    const posMatch = input.userPosition && input.userPosition !== "none" &&
      l.lurkPosition.toLowerCase().includes(input.userPosition.toLowerCase());
    return covMatch || posMatch;
  });

  const tags: string[] = [];
  if (coverage?.popular) tags.push("HIGH FREQUENCY");
  if (topCounter?.tier === "A+") tags.push("MONEY PLAY AVAILABLE");
  if (coverage?.category === "blitz") tags.push("PRESSURE PACKAGE");
  if (coverage?.category === "man") tags.push("MAN COVERAGE");
  if (coverage?.category === "zone") tags.push("ZONE COVERAGE");
  if (input.userPosition && input.userPosition !== "none") tags.push(`USER ${input.userPosition}`);
  if (lurk) tags.push("LURK ALERT");
  if (moneyPlayScore >= 90) tags.push("HIGH CONFIDENCE");

  const narrative = buildSnapNarrative({ coverage, opponentFormation, bestCounters, lurk, userPosition: input.userPosition, scores: { coverageConfidence, counterConfidence, moneyPlayScore, readDifficulty } });

  return { coverage, opponentFormation, bestCounters, lurk, scores: { coverageConfidence, counterConfidence, moneyPlayScore, readDifficulty }, tags, narrative };
}

function buildSnapNarrative(opts: {
  coverage?: Coverage;
  opponentFormation?: OffenseFormation;
  bestCounters: Counter[];
  lurk?: LurkAlert;
  userPosition?: UserPosition;
  scores: Scores;
}): string {
  const parts: string[] = [];

  const COVERAGE_PROSE: Record<string, string> = {
    "cover-0": "Your opponent has zero coverage help over the top. Every defender is in man-to-man and they've sent everyone to rush the passer.",
    "cover-1": "Single high safety with man coverage underneath. There's a robber lurking in the middle ready to read your eyes.",
    "cover-2": "Two-high safeties splitting the deep field. The middle seam and the curl-flat windows are your attack points.",
    "cover-3": "Three deep defenders with a flat buzz. You need to flood zones or work between the deep thirds.",
    "cover-4": "Your opponent is in Quarters coverage — four defenders in the deep zones. They're daring you to run or throw short.",
    "tampa-2": "Tampa 2. The MLB will sprint to the deep middle at the snap. Avoid seams; attack the boundary sidelines.",
    "cover-2-man": "Cover 2 Man Press. Individual battles outside with safety bracket help over the top.",
    "cover-6": "Cover 6 — half Cover 2 on one side, half Cover 4 on the other. Attack the boundary where the CB has to cover the flat.",
    "cover-1-robber": "Cover 1 Robber. One safety roaming center field, a lurker reading your eyes in the middle. Throw to the sideline.",
    "cover-3-match": "Cover 3 Match — they're pattern matching your routes. Motion to stress the coverage before the snap.",
  };

  const USER_PROSE: Record<string, string> = {
    "MLB": "With the user on the MLB, your crossers and middle routes are compromised — he's reading your eyes. Look him off and attack the perimeter first.",
    "SS": "The user strong safety is active near the box. Flood the flat away from his side; he can't cover the TE seam and the flat simultaneously.",
    "CB": "User corner in man coverage. Your WR is in a 1-on-1 battle against a human. Motion creates leverage; back shoulder fades are always available.",
    "FS": "The user free safety is patrolling the deep middle. Attack the boundary seams — he can only be in one place at a time.",
  };

  if (opts.coverage) {
    parts.push(COVERAGE_PROSE[opts.coverage.id] ?? `Opponent is running ${opts.coverage.name}. ${opts.coverage.shell}.`);
  }

  if (opts.userPosition && opts.userPosition !== "none" && USER_PROSE[opts.userPosition]) {
    parts.push(USER_PROSE[opts.userPosition]);
  }

  if (opts.bestCounters[0]) {
    const c = opts.bestCounters[0];
    parts.push(`Your highest-confidence counter is ${c.formation} — ${c.play}. ${c.read}.`);
    if (c.expected) parts.push(`Expected outcome: ${c.expected}.`);
  }

  if (opts.lurk) {
    parts.push(`Lurk warning: ${opts.lurk.beatIt}`);
  }

  if (!opts.coverage && !opts.bestCounters.length) {
    parts.push("Log a coverage and formation to receive a full analysis with counter recommendations and confidence scores.");
  }

  return parts.join(" ");
}

export type ScoutSnap = {
  coverageId: string;
  opponentFormationId?: string;
  situation?: Situation;
};

export type ScoutReport = {
  opponentName: string;
  totalSnaps: number;
  mostUsedCoverage?: Coverage;
  coverageFrequency: Array<{ coverage: Coverage; count: number; pct: number }>;
  blitzRate: number;
  pressureRate: number;
  topWeakness: string;
  topCounters: Counter[];
  narrative: string;
};

export function buildScoutReport(opponentName: string, snaps: ScoutSnap[]): ScoutReport {
  if (snaps.length === 0) {
    return {
      opponentName, totalSnaps: 0, coverageFrequency: [], blitzRate: 0, pressureRate: 0,
      topWeakness: "Log snaps to generate a scouting report.", topCounters: [], narrative: "No snaps logged yet.",
    };
  }

  const freq: Record<string, number> = {};
  snaps.forEach(s => { freq[s.coverageId] = (freq[s.coverageId] || 0) + 1; });

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ coverage: COVERAGES.find(c => c.id === id)!, count, pct: Math.round((count / snaps.length) * 100) }))
    .filter(x => x.coverage);

  const mostUsedCoverage = sorted[0]?.coverage;
  const blitzSnaps = snaps.filter(s => COVERAGES.find(c => c.id === s.coverageId)?.category === "blitz").length;
  const blitzRate = Math.round((blitzSnaps / snaps.length) * 100);
  const pressureRate = Math.round(blitzRate * 0.85);
  const topCounters = mostUsedCoverage?.counters ?? [];
  const topWeakness = mostUsedCoverage?.weakness ?? "Pattern not yet established.";

  const narrative = buildScoutNarrative(opponentName, mostUsedCoverage, blitzRate, sorted, topCounters, snaps.length);

  return { opponentName, totalSnaps: snaps.length, mostUsedCoverage, coverageFrequency: sorted, blitzRate, pressureRate, topWeakness, topCounters, narrative };
}

function buildScoutNarrative(
  name: string,
  topCoverage: Coverage | undefined,
  blitzRate: number,
  freq: Array<{ coverage: Coverage; pct: number }>,
  counters: Counter[],
  total: number,
): string {
  const parts: string[] = [];

  if (topCoverage) {
    parts.push(`${name} relies primarily on ${topCoverage.name} (${freq[0]?.pct ?? 0}% of observed snaps). ${topCoverage.shell}.`);
    parts.push(`Their primary weakness: ${topCoverage.weakness}`);
  }

  if (blitzRate > 55) {
    parts.push(`This opponent is extremely aggressive — blitzing on ${blitzRate}% of snaps. Quick game, hot routes, and RB outlet routes should be your answer on every obvious passing down.`);
  } else if (blitzRate > 30) {
    parts.push(`Blitz rate is elevated at ${blitzRate}%. Watch for situational pressure on obvious passing downs and have a quick outlet ready.`);
  } else {
    parts.push(`${name} plays conservatively at a ${blitzRate}% blitz rate. They want you to beat them with the quick game. Take your short wins and avoid unnecessary shots deep.`);
  }

  if (counters[0]) {
    parts.push(`Best counter across ${total} snaps: ${counters[0].formation} — ${counters[0].play}. ${counters[0].read}.`);
  }

  return parts.join(" ");
}

export type CoachInput = {
  coverageId: string;
  myFormationId?: string;
  situation?: Situation;
  downDistance?: string;
};

export type CoachAdvice = {
  topPlay: Counter | null;
  allCounters: Counter[];
  scores: Scores;
  tags: string[];
  narrative: string;
  presnap: string[];
};

export function getCoachAdvice(input: CoachInput): CoachAdvice {
  const finding = analyzeSnap({
    coverageId: input.coverageId,
    opponentFormationId: input.myFormationId,
    situation: input.situation,
  });

  const situationalPlays = input.situation && input.situation !== "normal"
    ? SITUATIONAL_PLAYS.filter(p => p.zone === input.situation)
    : [];

  const presnap: string[] = [];
  const cov = finding.coverage;
  if (cov) {
    presnap.push(`Read the shell: ${cov.shell}`);
    cov.tells.forEach(t => presnap.push(`Tell: ${t}`));
  }
  if (situationalPlays.length > 0) {
    presnap.push(`Situational note: ${(situationalPlays[0] as Record<string, unknown>)?.["whyItWorks"] ?? ""}`);
  }

  const narrative = buildCoachNarrative(finding, input.situation, input.downDistance);

  return {
    topPlay: finding.bestCounters[0] ?? null,
    allCounters: finding.bestCounters,
    scores: finding.scores,
    tags: finding.tags,
    narrative,
    presnap,
  };
}

function buildCoachNarrative(finding: SnapFinding, situation?: Situation, downDistance?: string): string {
  const parts: string[] = [];
  const dd = downDistance ? ` on ${downDistance}` : "";

  if (finding.coverage) {
    parts.push(`You're facing ${finding.coverage.name}${dd}. The engine has ${finding.scores.coverageConfidence}% confidence in this read.`);
  }

  if (finding.bestCounters[0]) {
    const c = finding.bestCounters[0];
    parts.push(
      `At ${finding.scores.moneyPlayScore} money play score, your best call is ${c.formation} — ${c.play}. ` +
      `This is a ${c.tier}-rated counter. ${c.read}.`
    );
    if (c.motion) parts.push(`Motion: ${c.motion}.`);
  }

  if (finding.lurk) {
    parts.push(`Lurk warning active. ${finding.lurk.avoidThrow} — ${finding.lurk.beatIt}`);
  }

  return parts.join(" ");
}
