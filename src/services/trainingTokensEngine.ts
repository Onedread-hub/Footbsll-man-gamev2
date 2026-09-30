import { Player, MatchDifficulty, DIFFICULTY_SETTINGS } from '../types/football';

const TOKENS_STORAGE_KEY = 'ascii_football_training_tokens_2026';

export interface TokenRewardBreakdown {
  totalTokens: number;
  baseTokens: number;
  goalBonus: number;
  cleanSheetBonus: number;
  underdogBonus: number;
  difficultyMultiplier: number;
  difficultyName: MatchDifficulty;
}

export interface TrainingProgram {
  id: string;
  name: string;
  attribute: 'pace' | 'shooting' | 'passing' | 'tackling' | 'stamina' | 'dribbling' | 'strength' | 'positioning' | 'control';
  boostAmount: number;
  tokenCost: number;
  icon: string;
  description: string;
}

export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: 'pace',
    name: 'Sprint & Acceleration Drills',
    attribute: 'pace',
    boostAmount: 2,
    tokenCost: 25,
    icon: '⚡',
    description: 'High-intensity shuttle runs to boost maximum sprint speed and burst off the mark.',
  },
  {
    id: 'shooting',
    name: 'Finishing & Volley Practice',
    attribute: 'shooting',
    boostAmount: 2,
    tokenCost: 25,
    icon: '🎯',
    description: 'Precision target shooting and top-corner curlers to increase clinical shot power.',
  },
  {
    id: 'passing',
    name: 'Vision & Distribution Camp',
    attribute: 'passing',
    boostAmount: 2,
    tokenCost: 25,
    icon: '👟',
    description: 'Rondo drills and pinpoint long-range delivery for threading through balls.',
  },
  {
    id: 'dribbling',
    name: 'Close Control & Skill Moves',
    attribute: 'dribbling',
    boostAmount: 2,
    tokenCost: 25,
    icon: '⚽',
    description: 'Slalom agility & ball retention. High dribbling prevents dispossessions on the run.',
  },
  {
    id: 'tackling',
    name: 'Defensive Duels & Interceptions',
    attribute: 'tackling',
    boostAmount: 2,
    tokenCost: 25,
    icon: '🛡️',
    description: 'Slide-tackle timing and physical dispossessing (also boosts GK handling & reflexes).',
  },
  {
    id: 'strength',
    name: 'Physical Power & Core Conditioning',
    attribute: 'strength',
    boostAmount: 2,
    tokenCost: 25,
    icon: '💪',
    description: 'Upper body shielding power. Low strength defenders cannot dispossess high dribblers.',
  },
  {
    id: 'positioning',
    name: 'Tactical Positioning & Space Awareness',
    attribute: 'positioning',
    boostAmount: 2,
    tokenCost: 25,
    icon: '🧭',
    description: 'Teaches fullbacks to mark wingers tight, midfielders to mark opposing mids, & forwards to stay onside.',
  },
  {
    id: 'control',
    name: 'First Touch & Ball Control',
    attribute: 'control',
    boostAmount: 2,
    tokenCost: 25,
    icon: '✨',
    description: 'Velvet first touch trapping and instant ball cushioning under high pressure.',
  },
  {
    id: 'stamina',
    name: 'Aerobic Stamina & Conditioning',
    attribute: 'stamina',
    boostAmount: 3,
    tokenCost: 20,
    icon: '💨',
    description: 'Distance endurance conditioning to maintain top match pace into the 90th minute.',
  },
];

export function getTrainingTokens(): number {
  try {
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (raw !== null) {
      const val = parseInt(raw, 10);
      if (!isNaN(val)) return Math.max(0, val);
    }
  } catch (err) {
    console.error('Failed reading tokens', err);
  }
  return 75; // Starting balance for the manager
}

export function saveTrainingTokens(count: number): void {
  try {
    localStorage.setItem(TOKENS_STORAGE_KEY, Math.max(0, Math.floor(count)).toString());
  } catch (err) {
    console.error('Failed saving tokens', err);
  }
}

export function addTrainingTokens(amount: number): number {
  const current = getTrainingTokens();
  const next = current + amount;
  saveTrainingTokens(next);
  return next;
}

export function spendTrainingTokens(cost: number): boolean {
  const current = getTrainingTokens();
  if (current < cost) return false;
  saveTrainingTokens(current - cost);
  return true;
}

export function calculateMatchReward(
  result: 'win' | 'draw' | 'loss',
  userGoals: number,
  oppGoals: number,
  difficulty: MatchDifficulty = 'Professional',
  userRating: number = 75,
  oppRating: number = 75
): TokenRewardBreakdown {
  const config = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Professional'];
  
  let baseTokens = 12;
  if (result === 'win') baseTokens = 60;
  else if (result === 'draw') baseTokens = 25;

  const goalBonus = Math.min(30, userGoals * 8);
  const cleanSheetBonus = oppGoals === 0 ? 20 : 0;
  const underdogDiff = Math.max(0, oppRating - userRating);
  const underdogBonus = Math.min(25, underdogDiff * 2);

  const rawSum = baseTokens + goalBonus + cleanSheetBonus + underdogBonus;
  const totalTokens = Math.round(rawSum * config.multiplier);

  return {
    totalTokens,
    baseTokens,
    goalBonus,
    cleanSheetBonus,
    underdogBonus,
    difficultyMultiplier: config.multiplier,
    difficultyName: config.name,
  };
}

export function trainPlayerAttribute(
  player: Player,
  program: TrainingProgram
): { success: boolean; newRating: number; currentTokens: number } {
  const currentTokens = getTrainingTokens();
  if (currentTokens < program.tokenCost) {
    return { success: false, newRating: player.rating(), currentTokens };
  }

  // Deduct tokens
  spendTrainingTokens(program.tokenCost);

  // Apply stat boost (capped at 99)
  player.trainAttribute(program.attribute, program.boostAmount);

  return {
    success: true,
    newRating: player.rating(),
    currentTokens: getTrainingTokens(),
  };
}
