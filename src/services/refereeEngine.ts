export interface FoulVerdict {
  isFoul: boolean;
  zone: 'front' | 'side' | 'behind';
  card: 'none' | 'yellow' | 'red';
  severity: 'soft' | 'hard';
  reason: string;   // for the banner/log
}

export function evaluateTackle(
  tackler: { tackling: number; strength: number; positioning: number; mass: number },
  victim:  { dribbling: number; strength: number; control: number; mass: number },
  zone: 'front' | 'side' | 'behind',
  wasLate: boolean,       // true if victim already passed the ball
  victimHasBall: boolean,
): FoulVerdict
/**
 * refereeEngine.ts
 *
 * Pure foul & card evaluator. Zero dependencies on the match engine so it
 * can be unit-tested in isolation and tuned without touching gameplay code.
 *
 * FIFA-authentic rules:
 *   - Tackle from BEHIND      → Red if dangerous, Yellow otherwise
 *   - Tackle from SIDE        → Yellow (late/reckless), None if clean & well-timed
 *   - Tackle from FRONT       → Clean if timed, Yellow if reckless/wild
 *
 * Called by the match engine whenever a tackle physically connects.
 */

export type ContactZone = 'front' | 'side' | 'behind';
export type CardType = 'none' | 'yellow' | 'red';
export type FoulSeverity = 'soft' | 'hard';

export interface TacklerSnapshot {
  tackling: number;     // 0–100
  strength: number;     // 0–100
  positioning: number;  // 0–100
  control: number;      // 0–100
  mass: number;         // kg
  speed: number;        // current |v| in px/frame (0–20ish)
  isSliding: boolean;   // slide tackle vs standing tackle
  priorYellow: number;  // 0 or 1 (2 yellows = red automatically)
}

export interface VictimSnapshot {
  dribbling: number;    // 0–100
  strength: number;     // 0–100
  control: number;      // 0–100
  mass: number;         // kg
  speed: number;        // current |v|
  hasBall: boolean;     // was the victim still in possession at impact?
  wasFacingAway: boolean; // true if victim was moving/facing away from tackler
}

export interface FoulVerdict {
  isFoul: boolean;
  zone: ContactZone;
  card: CardType;
  severity: FoulSeverity;
  reason: string;       // human-readable, used in banner + match log
}

// -----------------------------------------------------------------
// Tuning constants — adjust these to change how "strict" the ref is
// -----------------------------------------------------------------
const BASE_FOUL_CHANCE = {
  front: 0.28,   // Front challenges are usually clean; 28% foul
  side: 0.62,    // Side challenges are risky; 62% foul
  behind: 0.92,  // Behind is almost always a foul; 92% foul
} as const;

const BASE_RED_CHANCE_BEHIND = 0.35;   // 35% of behind-fouls are straight reds
const BASE_RED_CHANCE_WILD = 0.12;     // very late / very fast front/side tackles

// -----------------------------------------------------------------
// MAIN ENTRY POINT
// -----------------------------------------------------------------
export function evaluateTackle(
  tackler: TacklerSnapshot,
  victim: VictimSnapshot,
  zone: ContactZone,
  options: {
    wasLate?: boolean;        // victim had already released the ball
    fromBehindAggression?: number; // 0–1, higher = worse (computed by engine)
  } = {}
): FoulVerdict {
  const wasLate = !!options.wasLate;
  const fromBehindAggression = clamp01(options.fromBehindAggression ?? 0.5);

  // =============================================================
  // 1. FOUL PROBABILITY
  // =============================================================
  let foulChance = BASE_FOUL_CHANCE[zone];

  // Tackler skill reduces foul chance (good defenders commit fewer fouls)
  const tacklerSkill = tackler.tackling * 0.6 + tackler.control * 0.25 + tackler.positioning * 0.15;
  foulChance -= (tacklerSkill - 70) * 0.004; // +10 skill → -4% fouls

  // Victim agility can "ride" challenges (high dribbling → fewer fouls awarded)
  const victimAgility = victim.dribbling * 0.55 + victim.control * 0.25 + victim.strength * 0.20;
  foulChance -= (victimAgility - 70) * 0.003;

  // Mass mismatch: lighter victim getting hit hard = more likely to look like a foul
  const massDelta = tackler.mass - victim.mass; // positive = tackler heavier
  foulChance += massDelta * 0.006;

  // Sliding tackles are riskier than standing
  if (tackler.isSliding) foulChance += 0.08;

  // Late challenge (victim already passed) is a foul almost always
  if (wasLate) foulChance += 0.22;

  // Wild high-speed challenge
  if (tackler.speed > 6.5) foulChance += 0.06;

  foulChance = clamp01(foulChance);

  const foulRoll = Math.random();
  const isFoul = foulRoll < foulChance;

  // =============================================================
  // 2. SEVERITY (soft vs hard)
  // =============================================================
  // A "hard" foul has multiple red-flag conditions at once:
  //   - from behind
  //   - high speed
  //   - low tackler control
  //   - victim was moving away
  let severityScore = 0;
  if (zone === 'behind') severityScore += 3;
  if (zone === 'side') severityScore += 1;
  if (tackler.speed > 5.5) severityScore += 1;
  if (tackler.control < 55) severityScore += 1;
  if (victim.wasFacingAway) severityScore += 1;
  if (wasLate) severityScore += 1;
  if (fromBehindAggression > 0.7) severityScore += 1;

  const isHardFoul = severityScore >= 4;

  // =============================================================
  // 3. CARD DECISION
  // =============================================================
  let card: CardType = 'none';
  let reason = '';

  if (!isFoul) {
    reason = zone === 'front' ? 'Clean challenge' : 'Ball won';
    return {
      isFoul: false,
      zone,
      card: 'none',
      severity: 'soft',
      reason,
    };
  }

  // --- Foul is confirmed. Determine card: ---

  if (zone === 'behind') {
    // From behind: FIFA says red for dangerous, yellow for careless
    const redChance = BASE_RED_CHANCE_BEHIND + fromBehindAggression * 0.35;
    const isRed = isHardFoul || Math.random() < clamp01(redChance);

    if (isRed) {
      card = 'red';
      reason = isHardFoul
        ? 'Dangerous tackle from behind'
        : 'Tackle from behind';
    } else {
      card = 'yellow';
      reason = 'Late challenge from behind';
    }
  } else if (zone === 'side') {
    // From the side: usually yellow if late/reckless, none if just mistimed
    const isRed = isHardFoul && Math.random() < BASE_RED_CHANCE_WILD;

    if (isRed) {
      card = 'red';
      reason = 'Reckless side challenge';
    } else if (wasLate || tackler.speed > 5.0 || severityScore >= 2) {
      card = 'yellow';
      reason = wasLate ? 'Late side challenge' : 'Reckless side challenge';
    } else {
      card = 'yellow'; // side fouls without red flags still warrant yellow
      reason = 'Side challenge';
    }
  } else {
    // zone === 'front'
    // Front challenges are usually clean. If it's a foul, it's likely a mistimed
    // challenge, but not usually a card unless very severe.
    if (isHardFoul && Math.random() < BASE_RED_CHANCE_WILD) {
      card = 'red';
      reason = 'Dangerous front challenge';
    } else if (wasLate && tackler.speed > 5.5) {
      card = 'yellow';
      reason = 'Late front challenge';
    } else {
      card = 'none'; // Free kick only
      reason = 'Foul play';
    }
  }

  // =============================================================
  // 4. SECOND YELLOW → RED
  // =============================================================
  if (card === 'yellow' && tackler.priorYellow >= 1) {
    card = 'red';
    reason = 'Second bookable offence';
  }

  return {
    isFoul: true,
    zone,
    card,
    severity: isHardFoul ? 'hard' : 'soft',
    reason,
  };
}

// -----------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------
function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * Formats a card verdict into a banner string.
 * Example outputs:
 *   "🟨 YELLOW CARD: Smith — Late challenge from behind"
 *   "🟥 RED CARD: Jones — Dangerous tackle from behind"
 *   "Foul by Smith (from behind) — free kick"
 */
export function describeFoul(
  tacklerName: string,
  verdict: FoulVerdict
): string {
  const zoneLabel =
    verdict.zone === 'behind' ? 'from behind'
    : verdict.zone === 'side' ? 'from the side'
    : 'from the front';

  if (!verdict.isFoul) {
    return `${tacklerName} wins the ball cleanly (${zoneLabel})`;
  }

  if (verdict.card === 'red') {
    return `🟥 RED CARD: ${tacklerName} — ${verdict.reason}`;
  }
  if (verdict.card === 'yellow') {
    return `🟨 YELLOW CARD: ${tacklerName} — ${verdict.reason}`;
  }
  return `Foul by ${tacklerName} (${zoneLabel}) — free kick`;
}