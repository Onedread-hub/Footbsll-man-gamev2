import { FormationName, TacticName, FORMATIONS } from '../types/football';

export interface SWOSPosition {
  x: number; // 0 to 1 relative to pitch width
  y: number; // 0 to 1 relative to pitch height
}

export interface SWOSBallSpot {
  index: number; // 0..34
  col: number;   // 0..6 (0=Own Box, 3=Center, 6=Opp Box)
  row: number;   // 0..4 (0=Left Wing, 2=Center, 4=Right Wing)
  x: number;     // 0 to 1 (visual center of ball zone)
  y: number;     // 0 to 1 (visual center of ball zone)
  name: string;
}

export interface SWOSTacticData {
  id: string;
  name: string;
  formation: FormationName;
  tactic: TacticName;
  description: string;
  // 35 ball spots (0..34). Each spot has an array of 10 positions for outfield players (index 0..9)
  spots: Record<number, SWOSPosition[]>;
  slotNumber?: number; // 1..6
}

// 7 columns x 5 rows = 35 SWOS Ball Positions
export const SWOS_GRID_COLS = 7;
export const SWOS_GRID_ROWS = 5;
export const SWOS_TOTAL_SPOTS = 35;

export const SWOS_BALL_SPOTS: SWOSBallSpot[] = [];

const COL_NAMES = [
  'Own Box',
  'Own Deep Def',
  'Own Midfield',
  'Center Line',
  'Opp Midfield',
  'Opp Final Third',
  'Opp Box',
];

const ROW_NAMES = [
  'Left Wing',
  'Inside Left',
  'Center Channel',
  'Inside Right',
  'Right Wing',
];

for (let r = 0; r < SWOS_GRID_ROWS; r++) {
  for (let c = 0; c < SWOS_GRID_COLS; c++) {
    const idx = r * SWOS_GRID_COLS + c;
    SWOS_BALL_SPOTS.push({
      index: idx,
      col: c,
      row: r,
      x: (c + 0.5) / SWOS_GRID_COLS,
      y: (r + 0.5) / SWOS_GRID_ROWS,
      name: `${COL_NAMES[c]} - ${ROW_NAMES[r]}`,
    });
  }
}

/**
 * Returns role definitions for 10 outfield players for a given formation
 */
export function getOutfieldRoles(formation: FormationName): Array<{
  index: number;
  role: string;
  label: string;
  position: 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT';
  baseX: number;
  baseY: number;
}> {
  switch (formation) {
    case '4-4-2':
      return [
        { index: 0, role: 'LB',  label: 'LB (2)',  position: 'LB',  baseX: 0.24, baseY: 0.15 },
        { index: 1, role: 'LCB', label: 'LCB (3)', position: 'DEF', baseX: 0.16, baseY: 0.38 },
        { index: 2, role: 'RCB', label: 'RCB (4)', position: 'DEF', baseX: 0.16, baseY: 0.62 },
        { index: 3, role: 'RB',  label: 'RB (5)',  position: 'RB',  baseX: 0.24, baseY: 0.85 },
        { index: 4, role: 'LM',  label: 'LM (6)',  position: 'MID', baseX: 0.48, baseY: 0.14 },
        { index: 5, role: 'LCM', label: 'LCM (7)', position: 'MID', baseX: 0.46, baseY: 0.38 },
        { index: 6, role: 'RCM', label: 'RCM (8)', position: 'MID', baseX: 0.46, baseY: 0.62 },
        { index: 7, role: 'RM',  label: 'RM (9)',  position: 'MID', baseX: 0.48, baseY: 0.86 },
        { index: 8, role: 'LST', label: 'LST (10)', position: 'ATT', baseX: 0.78, baseY: 0.38 },
        { index: 9, role: 'RST', label: 'RST (11)', position: 'ATT', baseX: 0.78, baseY: 0.62 },
      ];

    case '4-2-4':
      return [
        { index: 0, role: 'LB',  label: 'LB (2)',  position: 'LB',  baseX: 0.24, baseY: 0.15 },
        { index: 1, role: 'LCB', label: 'LCB (3)', position: 'DEF', baseX: 0.16, baseY: 0.38 },
        { index: 2, role: 'RCB', label: 'RCB (4)', position: 'DEF', baseX: 0.16, baseY: 0.62 },
        { index: 3, role: 'RB',  label: 'RB (5)',  position: 'RB',  baseX: 0.24, baseY: 0.85 },
        { index: 4, role: 'LCM', label: 'LCM (6)', position: 'MID', baseX: 0.45, baseY: 0.36 },
        { index: 5, role: 'RCM', label: 'RCM (7)', position: 'MID', baseX: 0.45, baseY: 0.64 },
        { index: 6, role: 'LW',  label: 'LW (8)',  position: 'ATT', baseX: 0.76, baseY: 0.12 },
        { index: 7, role: 'LST', label: 'LST (9)', position: 'ATT', baseX: 0.80, baseY: 0.38 },
        { index: 8, role: 'RST', label: 'RST (10)', position: 'ATT', baseX: 0.80, baseY: 0.62 },
        { index: 9, role: 'RW',  label: 'RW (11)', position: 'ATT', baseX: 0.76, baseY: 0.88 },
      ];

    case '3-5-2':
      return [
        { index: 0, role: 'LCB', label: 'LCB (2)', position: 'DEF', baseX: 0.17, baseY: 0.26 },
        { index: 1, role: 'CB',  label: 'CB (3)',  position: 'DEF', baseX: 0.15, baseY: 0.50 },
        { index: 2, role: 'RCB', label: 'RCB (4)', position: 'DEF', baseX: 0.17, baseY: 0.74 },
        { index: 3, role: 'LWB', label: 'LWB (5)', position: 'LB',  baseX: 0.42, baseY: 0.12 },
        { index: 4, role: 'LDM', label: 'LDM (6)', position: 'MID', baseX: 0.40, baseY: 0.36 },
        { index: 5, role: 'CAM', label: 'CAM (7)', position: 'MID', baseX: 0.55, baseY: 0.50 },
        { index: 6, role: 'RDM', label: 'RDM (8)', position: 'MID', baseX: 0.40, baseY: 0.64 },
        { index: 7, role: 'RWB', label: 'RWB (9)', position: 'RB',  baseX: 0.42, baseY: 0.88 },
        { index: 8, role: 'LST', label: 'LST (10)', position: 'ATT', baseX: 0.78, baseY: 0.38 },
        { index: 9, role: 'RST', label: 'RST (11)', position: 'ATT', baseX: 0.78, baseY: 0.62 },
      ];

    case '4-3-3':
      return [
        { index: 0, role: 'LB',  label: 'LB (2)',  position: 'LB',  baseX: 0.24, baseY: 0.14 },
        { index: 1, role: 'LCB', label: 'LCB (3)', position: 'DEF', baseX: 0.16, baseY: 0.38 },
        { index: 2, role: 'RCB', label: 'RCB (4)', position: 'DEF', baseX: 0.16, baseY: 0.62 },
        { index: 3, role: 'RB',  label: 'RB (5)',  position: 'RB',  baseX: 0.24, baseY: 0.86 },
        { index: 4, role: 'LCM', label: 'LCM (6)', position: 'MID', baseX: 0.46, baseY: 0.28 },
        { index: 5, role: 'CM',  label: 'CM (7)',  position: 'MID', baseX: 0.44, baseY: 0.50 },
        { index: 6, role: 'RCM', label: 'RCM (8)', position: 'MID', baseX: 0.46, baseY: 0.72 },
        { index: 7, role: 'LW',  label: 'LW (9)',  position: 'ATT', baseX: 0.76, baseY: 0.14 },
        { index: 8, role: 'ST',  label: 'ST (10)', position: 'ATT', baseX: 0.80, baseY: 0.50 },
        { index: 9, role: 'RW',  label: 'RW (11)', position: 'ATT', baseX: 0.76, baseY: 0.86 },
      ];

    case '5-3-2':
      return [
        { index: 0, role: 'LWB', label: 'LWB (2)', position: 'LB',  baseX: 0.25, baseY: 0.12 },
        { index: 1, role: 'LCB', label: 'LCB (3)', position: 'DEF', baseX: 0.16, baseY: 0.30 },
        { index: 2, role: 'SW',  label: 'SW (4)',  position: 'DEF', baseX: 0.14, baseY: 0.50 },
        { index: 3, role: 'RCB', label: 'RCB (5)', position: 'DEF', baseX: 0.16, baseY: 0.70 },
        { index: 4, role: 'RWB', label: 'RWB (6)', position: 'RB',  baseX: 0.25, baseY: 0.88 },
        { index: 5, role: 'LCM', label: 'LCM (7)', position: 'MID', baseX: 0.46, baseY: 0.32 },
        { index: 6, role: 'CM',  label: 'CM (8)',  position: 'MID', baseX: 0.44, baseY: 0.50 },
        { index: 7, role: 'RCM', label: 'RCM (9)', position: 'MID', baseX: 0.46, baseY: 0.68 },
        { index: 8, role: 'LST', label: 'LST (10)', position: 'ATT', baseX: 0.78, baseY: 0.38 },
        { index: 9, role: 'RST', label: 'RST (11)', position: 'ATT', baseX: 0.78, baseY: 0.62 },
      ];

    case '4-2-3-1':
      return [
        { index: 0, role: 'LB',  label: 'LB (2)',  position: 'LB',  baseX: 0.24, baseY: 0.14 },
        { index: 1, role: 'LCB', label: 'LCB (3)', position: 'DEF', baseX: 0.16, baseY: 0.38 },
        { index: 2, role: 'RCB', label: 'RCB (4)', position: 'DEF', baseX: 0.16, baseY: 0.62 },
        { index: 3, role: 'RB',  label: 'RB (5)',  position: 'RB',  baseX: 0.24, baseY: 0.86 },
        { index: 4, role: 'LDM', label: 'LDM (6)', position: 'MID', baseX: 0.38, baseY: 0.36 },
        { index: 5, role: 'RDM', label: 'RDM (7)', position: 'MID', baseX: 0.38, baseY: 0.64 },
        { index: 6, role: 'LAM', label: 'LAM (8)', position: 'MID', baseX: 0.58, baseY: 0.20 },
        { index: 7, role: 'CAM', label: 'CAM (9)', position: 'MID', baseX: 0.60, baseY: 0.50 },
        { index: 8, role: 'RAM', label: 'RAM (10)', position: 'MID', baseX: 0.58, baseY: 0.80 },
        { index: 9, role: 'ST',  label: 'ST (11)',  position: 'ATT', baseX: 0.80, baseY: 0.50 },
      ];

    case '4-5-1':
      return [
        { index: 0, role: 'LB',  label: 'LB (2)',  position: 'LB',  baseX: 0.24, baseY: 0.14 },
        { index: 1, role: 'LCB', label: 'LCB (3)', position: 'DEF', baseX: 0.16, baseY: 0.38 },
        { index: 2, role: 'RCB', label: 'RCB (4)', position: 'DEF', baseX: 0.16, baseY: 0.62 },
        { index: 3, role: 'RB',  label: 'RB (5)',  position: 'RB',  baseX: 0.24, baseY: 0.86 },
        { index: 4, role: 'LM',  label: 'LM (6)',  position: 'MID', baseX: 0.46, baseY: 0.14 },
        { index: 5, role: 'LDM', label: 'LDM (7)', position: 'MID', baseX: 0.40, baseY: 0.36 },
        { index: 6, role: 'CM',  label: 'CM (8)',  position: 'MID', baseX: 0.46, baseY: 0.50 },
        { index: 7, role: 'RDM', label: 'RDM (9)', position: 'MID', baseX: 0.40, baseY: 0.64 },
        { index: 8, role: 'RM',  label: 'RM (10)', position: 'MID', baseX: 0.46, baseY: 0.86 },
        { index: 9, role: 'ST',  label: 'ST (11)', position: 'ATT', baseX: 0.78, baseY: 0.50 },
      ];

    case '3-4-3':
    default:
      return [
        { index: 0, role: 'LCB', label: 'LCB (2)', position: 'DEF', baseX: 0.17, baseY: 0.26 },
        { index: 1, role: 'CB',  label: 'CB (3)',  position: 'DEF', baseX: 0.15, baseY: 0.50 },
        { index: 2, role: 'RCB', label: 'RCB (4)', position: 'DEF', baseX: 0.17, baseY: 0.74 },
        { index: 3, role: 'LM',  label: 'LM (5)',  position: 'MID', baseX: 0.48, baseY: 0.14 },
        { index: 4, role: 'LCM', label: 'LCM (6)', position: 'MID', baseX: 0.45, baseY: 0.38 },
        { index: 5, role: 'RCM', label: 'RCM (7)', position: 'MID', baseX: 0.45, baseY: 0.62 },
        { index: 6, role: 'RM',  label: 'RM (8)',  position: 'MID', baseX: 0.48, baseY: 0.86 },
        { index: 7, role: 'LW',  label: 'LW (9)',  position: 'ATT', baseX: 0.76, baseY: 0.14 },
        { index: 8, role: 'ST',  label: 'ST (10)', position: 'ATT', baseX: 0.80, baseY: 0.50 },
        { index: 9, role: 'RW',  label: 'RW (11)', position: 'ATT', baseX: 0.76, baseY: 0.86 },
      ];
  }
}

/**
 * Generates full authentic SWOS 35-ball-position tactical coordinates
 */
export function generateSWOSTactic(formation: FormationName, tactic: TacticName): SWOSTacticData {
  const roles = getOutfieldRoles(formation);
  const spots: Record<number, SWOSPosition[]> = {};

  for (let s = 0; s < SWOS_TOTAL_SPOTS; s++) {
    const spot = SWOS_BALL_SPOTS[s];
    const playerPositions: SWOSPosition[] = [];

    // Col 0..6 represents ball depth (0=own box, 6=opp box)
    const normCol = spot.col / 6; // 0 to 1
    // Row 0..4 represents ball flank (0=top flank, 4=bottom flank)
    const normRow = (spot.row - 2) / 2; // -1 to +1

    for (let pIdx = 0; pIdx < roles.length; pIdx++) {
      const r = roles[pIdx];

      // Longitudinal team push-up calculation
      let pushUp = 0;
      if (r.position === 'DEF') {
        // Central defenders hold depth behind fullbacks: from 0.15 to 0.31
        pushUp = normCol * 0.16;
      } else if (r.position === 'LB' || r.position === 'RB') {
        // Fullbacks push up along flanks ahead of center backs
        pushUp = normCol * 0.26;
      } else if (r.position === 'MID') {
        // Midfield shifts between 0.32 and 0.68
        pushUp = normCol * 0.26;
      } else if (r.position === 'ATT') {
        // Strikers drop back to 0.50 to defend, push up to 0.86 to score
        pushUp = normCol * 0.28;
      }

      // Lateral shift towards ball flank (SWOS zonal compression)
      let flankShift = normRow * 0.10;
      if ((r.position === 'DEF' || r.position === 'LB' || r.position === 'RB') && Math.abs(r.baseY - 0.5) > 0.25) {
        // Fullback on opposite flank tucks inside
        if ((normRow < 0 && r.baseY > 0.5) || (normRow > 0 && r.baseY < 0.5)) {
          flankShift *= 1.35;
        }
      }

      // Tactical mentality modifiers
      let mentX = 0;
      if (tactic === 'Attacking' || tactic === 'SWOS Total') mentX = 0.05;
      else if (tactic === 'Defensive') mentX = -0.05;
      else if (tactic === 'SWOS Press') mentX = 0.02;

      let targetX = r.baseX + pushUp + mentX;
      let targetY = r.baseY + flankShift;

      // Special 4-3-3 / wing dropping behavior in defense
      if (formation === '4-3-3' && normCol < 0.4) {
        if (r.role === 'LW') {
          targetX = 0.38 + normCol * 0.15;
          targetY = 0.22;
        } else if (r.role === 'RW') {
          targetX = 0.38 + normCol * 0.15;
          targetY = 0.78;
        }
      }

      // Clamp inside pitch bounds
      targetX = Math.max(0.06, Math.min(0.94, Math.round(targetX * 100) / 100));
      targetY = Math.max(0.06, Math.min(0.94, Math.round(targetY * 100) / 100));

      playerPositions.push({ x: targetX, y: targetY });
    }

    spots[s] = playerPositions;
  }

  return {
    id: `swos_${formation}_${tactic.toLowerCase().replace(/\s+/g, '_')}`,
    name: `SWOS ${formation} (${tactic})`,
    formation,
    tactic,
    description: `Sensible World of Soccer 35-position matrix for ${formation} ${tactic}`,
    spots,
  };
}

/**
 * Green Tick vs Red Cross evaluator for a player's position at a ball spot
 * In SWOS, players in their designated zone/depth receive a green tick;
 * players excessively stranded, out-of-line, or inverse-positioned receive a red cross.
 */
export function evaluatePlayerTick(
  pos: SWOSPosition,
  playerIdx: number,
  spotIndex: number,
  formation: FormationName
): boolean {
  const roles = getOutfieldRoles(formation);
  const role = roles[playerIdx];
  if (!role) return true;

  const spot = SWOS_BALL_SPOTS[spotIndex];
  const ballColNorm = spot.col / 6;

  // 1. Defenders shouldn't be ahead of attacking third (unless extreme)
  if (role.position === 'DEF') {
    if (pos.x > 0.65) return false; // Red cross
    // When ball is in own box, defenders must be inside own half
    if (spot.col <= 1 && pos.x > 0.40) return false;
  }

  // 2. Attackers shouldn't be behind own penalty box
  if (role.position === 'ATT') {
    if (pos.x < 0.28) return false;
    // When ball in opp box, attackers should be in attacking half
    if (spot.col >= 5 && pos.x < 0.60) return false;
  }

  // 3. Flank symmetry check
  if (role.baseY < 0.3 && pos.y > 0.75) return false; // Left back drifted all the way to right wing
  if (role.baseY > 0.7 && pos.y < 0.25) return false; // Right back drifted to left wing

  // 4. Excessive distance from reasonable anchor
  const distFromBase = Math.hypot(pos.x - role.baseX, pos.y - role.baseY);
  if (distFromBase > 0.52) return false;

  return true;
}

/**
 * Evaluates the full tactic across all 35 spots and 10 players (350 total checks)
 */
export function evaluateSWOSTactic(tactic: SWOSTacticData): {
  playerTicks: number[];      // [10] number of green ticks out of 35 for each player
  playerTotalSpots: number;   // 35
  totalGreenTicks: number;    // out of 350
  maxTicks: number;           // 350
  ratingPercent: number;      // 0 to 100%
  verdict: string;
} {
  const playerTicks: number[] = new Array(10).fill(0);
  let totalGreen = 0;

  for (let s = 0; s < SWOS_TOTAL_SPOTS; s++) {
    const spotPositions = tactic.spots[s] || [];
    for (let p = 0; p < 10; p++) {
      const pos = spotPositions[p];
      if (pos && evaluatePlayerTick(pos, p, s, tactic.formation)) {
        playerTicks[p]++;
        totalGreen++;
      }
    }
  }

  const ratingPercent = Math.round((totalGreen / (10 * SWOS_TOTAL_SPOTS)) * 100);
  let verdict = 'Poorly Balanced';
  if (ratingPercent >= 90) verdict = 'Master Tactician (SWOS Legend)';
  else if (ratingPercent >= 80) verdict = 'Highly Balanced';
  else if (ratingPercent >= 70) verdict = 'Solid Shape';
  else if (ratingPercent >= 55) verdict = 'Volatile / Experimental';

  return {
    playerTicks,
    playerTotalSpots: SWOS_TOTAL_SPOTS,
    totalGreenTicks: totalGreen,
    maxTicks: 10 * SWOS_TOTAL_SPOTS,
    ratingPercent,
    verdict,
  };
}

/**
 * SWOS Tools: FLIP ON/OFF (Horizontal mirroring between top and bottom flanks)
 */
export function flipTacticHorizontally(tactic: SWOSTacticData): SWOSTacticData {
  const newSpots: Record<number, SWOSPosition[]> = {};

  for (let r = 0; r < SWOS_GRID_ROWS; r++) {
    const mirroredRow = (SWOS_GRID_ROWS - 1) - r;
    for (let c = 0; c < SWOS_GRID_COLS; c++) {
      const origSpotIdx = r * SWOS_GRID_COLS + c;
      const targetSpotIdx = mirroredRow * SWOS_GRID_COLS + c;

      const origPositions = tactic.spots[origSpotIdx] || [];
      newSpots[targetSpotIdx] = origPositions.map((pos) => ({
        x: pos.x,
        y: Math.round((1 - pos.y) * 100) / 100, // Invert Y
      }));
    }
  }

  return {
    ...tactic,
    spots: newSpots,
  };
}

/**
 * SWOS Tools: COPY ball spot positions to another spot
 */
export function copyBallSpot(tactic: SWOSTacticData, fromSpot: number, toSpot: number): SWOSTacticData {
  const newSpots = { ...tactic.spots };
  if (newSpots[fromSpot]) {
    newSpots[toSpot] = newSpots[fromSpot].map((p) => ({ ...p }));
  }
  return {
    ...tactic,
    spots: newSpots,
  };
}

/**
 * LocalStorage persistence for SWOS Custom Tactics (Slots 1..6)
 */
const SWOS_STORAGE_KEY = 'swos_custom_tactics_v1';

export function loadSavedCustomTactics(): Record<number, SWOSTacticData> {
  try {
    const raw = localStorage.getItem(SWOS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load SWOS custom tactics', e);
    return {};
  }
}

export function saveCustomTacticSlot(slot: number, tactic: SWOSTacticData): void {
  try {
    const all = loadSavedCustomTactics();
    all[slot] = {
      ...tactic,
      slotNumber: slot,
      name: tactic.name || `CUSTOM ${slot}`,
    };
    localStorage.setItem(SWOS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save SWOS custom tactic', e);
  }
}
