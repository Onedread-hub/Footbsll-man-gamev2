export type Position = 'GK' | 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT';

export type MatchDifficulty = 'Amateur' | 'Semi-Pro' | 'Professional' | 'World Class' | 'Legendary';

export interface DifficultyConfig {
  name: MatchDifficulty;
  multiplier: number;
  aiPaceModifier: number;
  aiTackleHardness: number;
  aiShotAccuracy: number;
  description: string;
  badgeColor: string;
}

export const DIFFICULTY_SETTINGS: Record<MatchDifficulty, DifficultyConfig> = {
  'Amateur': {
    name: 'Amateur',
    multiplier: 1.0,
    aiPaceModifier: 0.85,
    aiTackleHardness: 0.70,
    aiShotAccuracy: 0.75,
    description: 'Casual retro kickabout. Generous AI spacing & 1.0x token rewards.',
    badgeColor: '#66bb6a',
  },
  'Semi-Pro': {
    name: 'Semi-Pro',
    multiplier: 1.4,
    aiPaceModifier: 0.95,
    aiTackleHardness: 0.85,
    aiShotAccuracy: 0.90,
    description: 'Balanced competition with active marking & 1.4x token rewards.',
    badgeColor: '#29b6f6',
  },
  'Professional': {
    name: 'Professional',
    multiplier: 1.8,
    aiPaceModifier: 1.05,
    aiTackleHardness: 1.00,
    aiShotAccuracy: 1.05,
    description: 'Tough league standards, rapid counter attacks & 1.8x token rewards.',
    badgeColor: '#ffd54f',
  },
  'World Class': {
    name: 'World Class',
    multiplier: 2.5,
    aiPaceModifier: 1.15,
    aiTackleHardness: 1.20,
    aiShotAccuracy: 1.20,
    description: 'Ruthless pressing & clinical finishes. 2.5x token multiplier!',
    badgeColor: '#ff7043',
  },
  'Legendary': {
    name: 'Legendary',
    multiplier: 3.5,
    aiPaceModifier: 1.25,
    aiTackleHardness: 1.35,
    aiShotAccuracy: 1.35,
    description: 'Ultimate Sensible Soccer challenge. High-risk master AI & 3.5x tokens!',
    badgeColor: '#e91e63',
  },
};

export type FormationName = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2' | '3-4-3' | '4-2-4' | '4-5-1';

export type TacticName = 'Attacking' | 'Balanced' | 'Defensive' | 'Counter' | 'High Press' | 'SWOS Press' | 'SWOS Total' | 'Direct Play';

export interface FormationConfig {
  lines: number[]; // [GK=1, DEF, MID, ATT]
  description: string;
}

export const FORMATIONS: Record<FormationName, FormationConfig> = {
  '4-4-2':   { lines: [1, 4, 4, 2], description: 'Classic balanced 4-4-2 with dual strikers' },
  '4-3-3':   { lines: [1, 4, 3, 3], description: 'Attacking trident with wide wing play' },
  '3-5-2':   { lines: [1, 3, 5, 2], description: 'Midfield dominance with wingbacks' },
  '4-2-3-1': { lines: [1, 4, 2, 3, 1], description: 'Modern setup with double pivot & playmaker' },
  '5-3-2':   { lines: [1, 5, 3, 2], description: 'Solid defensive wall with counter capability' },
  '3-4-3':   { lines: [1, 3, 4, 3], description: 'Ultra offensive pressing system' },
  '4-2-4':   { lines: [1, 4, 2, 4], description: 'Sensible Soccer classic: twin midfield engines & 4 attackers' },
  '4-5-1':   { lines: [1, 4, 5, 1], description: 'Packed five-man midfield fortress with lone target forward' },
};

export const COUNTER_FORMATIONS: Record<FormationName, FormationName[]> = {
  '4-4-2': ['3-5-2', '4-3-3', '4-2-3-1'],
  '4-3-3': ['4-2-3-1', '5-3-2', '3-5-2'],
  '3-5-2': ['4-3-3', '3-4-3', '4-2-3-1'],
  '4-2-3-1': ['4-4-2', '3-5-2', '4-3-3'],
  '5-3-2': ['4-2-4', '4-3-3', '3-4-3'],
  '3-4-3': ['5-3-2', '4-4-2', '4-5-1'],
  '4-2-4': ['4-5-1', '3-5-2', '4-4-2'],
  '4-5-1': ['3-4-3', '4-2-4', '4-3-3'],
};

export function adaptOppositionFormationIfIdentical(
  aiTeam: Team,
  opponentFormation: FormationName,
  switchChance: number = 0.75
): { switched: boolean; previousFormation: FormationName; newFormation: FormationName } | null {
  if (aiTeam.formation === opponentFormation) {
    if (Math.random() < switchChance) {
      const counters = COUNTER_FORMATIONS[opponentFormation] || ['4-3-3', '3-5-2'];
      const available = counters.filter((f) => f !== opponentFormation);
      const newFormation = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : '3-5-2';
      const prev = aiTeam.formation;
      aiTeam.formation = newFormation;
      return { switched: true, previousFormation: prev, newFormation };
    } else {
      return { switched: false, previousFormation: aiTeam.formation, newFormation: aiTeam.formation };
    }
  }
  return null;
}

export interface TacticConfig {
  atk: number;
  def: number;
  passModifier: number;
  paceModifier: number;
  description: string;
}

export const TACTICS: Record<TacticName, TacticConfig> = {
  'Attacking':   { atk: 1.25, def: 0.85, passModifier: 1.05, paceModifier: 1.10, description: 'Push forward aggressively for goals, risk counters.' },
  'Balanced':    { atk: 1.00, def: 1.00, passModifier: 1.00, paceModifier: 1.00, description: 'Disciplined approach balancing attack and defense.' },
  'Defensive':   { atk: 0.80, def: 1.25, passModifier: 0.95, paceModifier: 0.90, description: 'Park the bus, frustrate attackers, protect lead.' },
  'Counter':     { atk: 1.15, def: 1.10, passModifier: 0.90, paceModifier: 1.20, description: 'Absorb pressure and break rapidly with pace.' },
  'High Press':  { atk: 1.20, def: 1.15, passModifier: 1.10, paceModifier: 1.15, description: 'Suffocate opponent in their half, drains stamina.' },
  'SWOS Press':  { atk: 1.20, def: 1.30, passModifier: 1.15, paceModifier: 1.25, description: 'Sensible Soccer midfield hound: rapid interception vectors & crunch tackles.' },
  'SWOS Total':  { atk: 1.30, def: 1.20, passModifier: 1.20, paceModifier: 1.20, description: 'Sensible Soccer Total Grid: synchronized 7x5 zonal matrix & pincer traps.' },
  'Direct Play': { atk: 1.18, def: 0.95, passModifier: 0.88, paceModifier: 1.15, description: 'Route-one football: bypass midfield with long aerial balls directly into danger zones.' },
};

export interface PlayerData {
  id: string;
  name: string;
  position: Position;
  age: number;
  passing: number;
  shooting: number;
  tackling: number;
  pace: number;
  stamina: number;
  speed?: number; // Explicit sprint/running speed stat
  attack?: number; // Overall attacking rating for beating defenders
  defence?: number; // Overall defending rating for stopping forwards
  gkAwareness?: number; // Goalie awareness, rush timing & anticipation
  gkReach?: number; // Goalie wingspan, arm extension & corner coverage
  gkJumping?: number; // Goalie vertical leap, claiming aerial crosses & diving height
  gkStyle?: 'attacking' | 'defensive'; // Attacking sweeper-keeper vs Defensive line-stopper
  strength?: number;
  control?: number;
  weight?: number; // in kg (e.g. 68-88)
  dribbling?: number;
  positioning?: number;
  condition?: number;
  seasonGoals: number;
  yellowCards?: number;
  redCards?: number;
  number?: number;
  px?: number;
  py?: number;
  secondaryPositions?: string[];
  primaryRole?: string;
  trainingPointsInvested?: number;
  isStar?: boolean;
  suspendedMatches?: number;
  activeEncounter?: string;
  isYouth?: boolean;
  potential?: number; // 0 - 99 youth development potential
}

export class Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  passing: number;
  shooting: number;
  tackling: number;
  pace: number;
  stamina: number;
  speed: number;
  attack: number;
  defence: number;
  gkAwareness: number;
  gkReach: number;
  gkJumping: number;
  gkStyle: 'attacking' | 'defensive';
  strength: number;
  control: number;
  weight: number;
  dribbling: number;
  positioning: number;
  condition: number;
  seasonGoals: number;
  yellowCards: number;
  redCards: number;
  number: number;
  px: number;
  py: number;
  secondaryPositions: string[];
  primaryRole: string;
  trainingPointsInvested: number;
  isStar?: boolean;
  suspendedMatches: number;
  activeEncounter?: string;
  isYouth: boolean = false;
  potential: number = 0;

  constructor(
    name: string,
    position: Position,
    age: number,
    passing: number,
    shooting: number,
    tackling: number,
    pace: number,
    stamina: number,
    id?: string,
    strength?: number,
    control?: number,
    weight?: number,
    dribbling?: number,
    secondaryPositions?: string[],
    primaryRole?: string,
    trainingPointsInvested?: number,
    positioning?: number,
    suspendedMatches?: number,
    activeEncounter?: string,
    speed?: number,
    attack?: number,
    defence?: number,
    gkAwareness?: number,
    gkReach?: number,
    gkJumping?: number,
    gkStyle?: 'attacking' | 'defensive'
  ) {
    this.id = id || `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 7)}`;
    this.name = name;
    this.position = position;
    this.age = age;
    this.passing = passing;
    this.shooting = shooting;
    this.tackling = tackling;
    this.pace = pace;
    this.stamina = stamina;
    this.condition = 100;
    this.seasonGoals = 0;
    this.yellowCards = 0;
    this.redCards = 0;
    this.number = 0;
    this.px = 0.5;
    this.py = 0.5;
    this.secondaryPositions = secondaryPositions ?? (
      position === 'LB' ? ['LMF', 'DEF'] :
      position === 'RB' ? ['RMF', 'DEF'] :
      position === 'DEF' ? ['DMF'] :
      position === 'MID' ? ['CMF', 'DMF'] :
      position === 'ATT' ? ['MID'] :
      []
    );
    this.primaryRole = primaryRole ?? (position as string);
    this.trainingPointsInvested = trainingPointsInvested ?? 0;

    // Derived physical & skill attributes for realistic SWOS collision zones
    this.strength = strength ?? (
      position === 'DEF' ? Math.round(tackling * 0.65 + stamina * 0.35) :
      position === 'GK' ? Math.round(tackling * 0.75 + 18) :
      position === 'MID' ? Math.round(tackling * 0.45 + stamina * 0.35 + 18) :
      Math.round(shooting * 0.45 + pace * 0.35 + 18)
    );
    this.control = control ?? Math.round(passing * 0.50 + shooting * 0.25 + pace * 0.25);
    this.weight = weight ?? (
      position === 'GK' ? 84 :
      position === 'DEF' ? 82 :
      position === 'MID' ? 76 :
      74
    );
    this.dribbling = dribbling ?? Math.round(pace * 0.52 + passing * 0.38 + 10);
    this.positioning = positioning ?? (
      position === 'DEF' || position === 'LB' || position === 'RB' ? Math.round(tackling * 0.55 + stamina * 0.35 + 10) :
      position === 'MID' ? Math.round(passing * 0.45 + tackling * 0.35 + 18) :
      position === 'GK' ? Math.round(tackling * 0.70 + 20) :
      Math.round(shooting * 0.45 + pace * 0.35 + 18)
    );

    // Speed attribute for all players
    this.speed = speed ?? pace;

    // Overall Attack attribute: Forwards highest (75-98), Mids (60-85), Defs (25-60), GKs (10-30)
    this.attack = attack ?? (
      position === 'ATT' ? Math.min(99, Math.round(shooting * 0.52 + this.dribbling * 0.28 + this.speed * 0.20)) :
      position === 'MID' ? Math.min(99, Math.round(passing * 0.40 + shooting * 0.30 + this.dribbling * 0.30)) :
      position === 'LB' || position === 'RB' ? Math.min(99, Math.round(this.speed * 0.45 + passing * 0.35 + this.dribbling * 0.20)) :
      position === 'DEF' ? Math.min(99, Math.round(passing * 0.35 + this.speed * 0.35 + this.strength * 0.30)) :
      Math.min(99, Math.round(passing * 0.50 + this.speed * 0.30 + 10))
    );

    // Overall Defence attribute: Defenders highest (75-98), GKs (75-95), Mids (50-80), Forwards (20-45)
    this.defence = defence ?? (
      position === 'DEF' ? Math.min(99, Math.round(tackling * 0.50 + this.strength * 0.28 + this.positioning * 0.22)) :
      position === 'LB' || position === 'RB' ? Math.min(99, Math.round(tackling * 0.50 + this.speed * 0.25 + this.positioning * 0.25)) :
      position === 'GK' ? Math.min(99, Math.round(tackling * 0.60 + this.positioning * 0.40)) :
      position === 'MID' ? Math.min(99, Math.round(tackling * 0.50 + stamina * 0.25 + this.positioning * 0.25)) :
      Math.min(99, Math.round(tackling * 0.55 + stamina * 0.35 + 10))
    );

    // Goalie Skills (calculated intelligently for GKs, available on all players)
    this.gkAwareness = gkAwareness ?? (
      position === 'GK' ? Math.min(99, Math.round(this.positioning * 0.60 + tackling * 0.30 + passing * 0.10)) :
      Math.round(this.positioning * 0.50 + 20)
    );
    this.gkReach = gkReach ?? (
      position === 'GK' ? Math.min(99, Math.round(tackling * 0.50 + this.strength * 0.30 + 16)) :
      Math.round(this.strength * 0.50 + 20)
    );
    this.gkJumping = gkJumping ?? (
      position === 'GK' ? Math.min(99, Math.round(stamina * 0.40 + this.strength * 0.35 + this.speed * 0.25)) :
      Math.round(stamina * 0.50 + this.speed * 0.30 + 15)
    );
    this.gkStyle = gkStyle ?? (position === 'GK' ? 'attacking' : 'defensive');

    this.suspendedMatches = suspendedMatches ?? 0;
    this.activeEncounter = activeEncounter;
  }

  canPlayPosition(pos: string): boolean {
    if (this.position === pos) return true;
    if (this.secondaryPositions.includes(pos)) return true;
    // Position family matches
    if (pos === 'DEF' && (this.position === 'LB' || this.position === 'RB')) return true;
    if ((pos === 'LB' || pos === 'RB') && this.position === 'DEF') return true;
    if (pos === 'MID' && (this.secondaryPositions.includes('LMF') || this.secondaryPositions.includes('RMF') || this.secondaryPositions.includes('CMF') || this.secondaryPositions.includes('DMF') || this.secondaryPositions.includes('AMF'))) return true;
    return false;
  }

  trainAttribute(
    attr:
      | 'pace'
      | 'shooting'
      | 'passing'
      | 'tackling'
      | 'stamina'
      | 'dribbling'
      | 'strength'
      | 'control'
      | 'positioning'
      | 'speed'
      | 'attack'
      | 'defence'
      | 'gkAwareness'
      | 'gkReach'
      | 'gkJumping',
    amount: number = 2
  ): number {
    this[attr] = Math.min(99, Math.round(this[attr] + amount));
    this.trainingPointsInvested = (this.trainingPointsInvested || 0) + 1;
    // Recompute secondary derived attributes if affected
    if (attr === 'pace' || attr === 'speed' || attr === 'passing') {
      this.dribbling = Math.min(99, Math.round(this.dribbling + Math.round(amount * 0.5)));
      this.control = Math.min(99, Math.round(this.control + Math.round(amount * 0.5)));
    }
    if (attr === 'shooting' || attr === 'attack') {
      this.attack = Math.min(99, Math.round(this.attack + Math.round(amount * 0.5)));
    }
    if (attr === 'tackling' || attr === 'defence') {
      this.defence = Math.min(99, Math.round(this.defence + Math.round(amount * 0.5)));
    }
    if (attr === 'positioning' && this.position === 'GK') {
      this.gkAwareness = Math.min(99, Math.round(this.gkAwareness + Math.round(amount * 0.6)));
    }
    return this.rating();
  }

  rating(): number {
    switch (this.position) {
      case 'GK':
        return Math.floor(
          (this.tackling * 1.2 +
            this.gkAwareness * 1.2 +
            this.gkReach * 1.0 +
            this.gkJumping * 0.8 +
            this.defence * 0.8) /
            5
        );
      case 'LB':
      case 'RB':
        return Math.floor(
          (this.defence * 1.6 +
            this.tackling * 1.4 +
            this.speed * 1.4 +
            this.positioning * 1.0 +
            this.passing * 0.8 +
            this.attack * 0.8) /
            7
        );
      case 'DEF':
        return Math.floor(
          (this.defence * 2.0 +
            this.tackling * 1.8 +
            this.strength * 1.2 +
            this.positioning * 1.2 +
            this.speed * 0.8) /
            7
        );
      case 'MID':
        return Math.floor(
          (this.passing * 1.6 +
            this.attack * 1.2 +
            this.defence * 1.0 +
            this.control * 1.0 +
            this.dribbling * 1.0 +
            this.positioning * 0.8 +
            this.speed * 0.8) /
            7.4
        );
      case 'ATT':
        return Math.floor(
          (this.attack * 2.0 +
            this.shooting * 1.8 +
            this.dribbling * 1.2 +
            this.speed * 1.2 +
            this.positioning * 1.0) /
            7.2
        );
      default:
        return 50;
    }
  }

  shortName(): string {
    const sp = this.name.lastIndexOf(' ');
    return sp < 0 ? this.name : this.name.substring(sp + 1);
  }

  toJSON(): PlayerData {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      age: this.age,
      passing: this.passing,
      shooting: this.shooting,
      tackling: this.tackling,
      pace: this.pace,
      stamina: this.stamina,
      speed: this.speed,
      attack: this.attack,
      defence: this.defence,
      gkAwareness: this.gkAwareness,
      gkReach: this.gkReach,
      gkJumping: this.gkJumping,
      gkStyle: this.gkStyle,
      strength: this.strength,
      control: this.control,
      weight: this.weight,
      dribbling: this.dribbling,
      positioning: this.positioning,
      condition: this.condition,
      seasonGoals: this.seasonGoals,
      yellowCards: this.yellowCards,
      redCards: this.redCards,
      number: this.number,
      px: this.px,
      py: this.py,
      secondaryPositions: this.secondaryPositions,
      primaryRole: this.primaryRole,
      trainingPointsInvested: this.trainingPointsInvested,
      isStar: this.isStar,
      suspendedMatches: this.suspendedMatches,
      activeEncounter: this.activeEncounter,
      isYouth: this.isYouth,
      potential: this.potential,
    };
  }

  static fromJSON(data: PlayerData): Player {
    const p = new Player(
      data.name,
      data.position,
      data.age,
      data.passing,
      data.shooting,
      data.tackling,
      data.pace,
      data.stamina,
      data.id,
      data.strength,
      data.control,
      data.weight,
      data.dribbling,
      data.secondaryPositions,
      data.primaryRole,
      data.trainingPointsInvested,
      data.positioning,
      data.suspendedMatches,
      data.activeEncounter,
      data.speed,
      data.attack,
      data.defence,
      data.gkAwareness,
      data.gkReach,
      data.gkJumping,
      data.gkStyle
    );
    p.condition = data.condition ?? 100;
    p.seasonGoals = data.seasonGoals ?? 0;
    p.yellowCards = data.yellowCards ?? 0;
    p.redCards = data.redCards ?? 0;
    p.number = data.number ?? 0;
    p.px = data.px ?? 0.5;
    p.py = data.py ?? 0.5;
    p.isStar = data.isStar;
    p.isYouth = data.isYouth ?? false;
    p.potential = data.potential ?? 0;
    return p;
  }
}

export type LeagueId = 'big_time' | 'up_and_comers';

export interface LeagueInfo {
  id: LeagueId;
  name: string;
  shortName: string;
  totalTeams: number;
  totalRounds: number;
  tier: number;
  color: string;
  badge: string;
  description: string;
}

export const LEAGUES: Record<LeagueId, LeagueInfo> = {
  big_time: {
    id: 'big_time',
    name: 'Big Time League',
    shortName: 'Big Time',
    totalTeams: 14,
    totalRounds: 26,
    tier: 1,
    color: '#38bdf8',
    badge: '🏆 TIER 1',
    description: 'The premier championship featuring 14 elite clubs, heavyweights, and high-stakes football.',
  },
  up_and_comers: {
    id: 'up_and_comers',
    name: 'Up and Comers',
    shortName: 'Up & Comers',
    totalTeams: 12,
    totalRounds: 22,
    tier: 2,
    color: '#c084fc',
    badge: '⚡ TIER 2',
    description: 'The fierce second division featuring 12 hungry clubs fighting for glory and promotion.',
  },
};

export interface TeamData {
  id: string;
  name: string;
  shortName: string;
  color: string;
  squad: PlayerData[];
  youthSquad?: PlayerData[];
  formation: FormationName;
  tactic: TacticName;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  customSwosTactic?: any;
  tier?: 'ELITE' | 'MID' | 'UNDERDOG';
  leagueId?: LeagueId;
}

export class Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  squad: Player[];
  youthSquad: Player[];
  formation: FormationName;
  tactic: TacticName;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  customSwosTactic?: any;
  tier?: 'ELITE' | 'MID' | 'UNDERDOG';
  leagueId: LeagueId;

  constructor(name: string, shortName: string, color: string, id?: string, leagueId: LeagueId = 'big_time') {
    this.id = id || name.toLowerCase().replace(/\s+/g, '_');
    this.name = name;
    this.shortName = shortName;
    this.color = color || '#ffffff';
    this.squad = [];
    this.youthSquad = [];
    this.formation = '4-4-2';
    this.tactic = 'Balanced';
    this.played = 0;
    this.won = 0;
    this.drawn = 0;
    this.lost = 0;
    this.gf = 0;
    this.ga = 0;
    this.tier = 'MID';
    this.leagueId = leagueId;
  }

  addPlayer(p: Player) {
    this.squad.push(p);
  }

  addYouthPlayer(p: Player) {
    p.isYouth = true;
    this.youthSquad.push(p);
  }

  firstTeam(): Player[] {
    if (this.squad.length === 0) return [];
    if (this.squad.length <= 11) return [...this.squad];

    // Position groups sorted by individual rating descending
    const gks = this.squad.filter((p) => p.position === 'GK').sort((a, b) => b.rating() - a.rating());
    const lbs = this.squad.filter((p) => p.position === 'LB').sort((a, b) => b.rating() - a.rating());
    const defs = this.squad.filter((p) => p.position === 'DEF').sort((a, b) => b.rating() - a.rating());
    const rbs = this.squad.filter((p) => p.position === 'RB').sort((a, b) => b.rating() - a.rating());
    const mids = this.squad.filter((p) => p.position === 'MID').sort((a, b) => b.rating() - a.rating());
    const atts = this.squad.filter((p) => p.position === 'ATT').sort((a, b) => b.rating() - a.rating());

    const selected: Player[] = [];
    const selectedIds = new Set<string>();

    const pick = (p?: Player): boolean => {
      if (p && !selectedIds.has(p.id)) {
        selected.push(p);
        selectedIds.add(p.id);
        return true;
      }
      return false;
    };

    // 1. Starting Goalkeeper
    if (gks.length > 0) pick(gks[0]);

    // Position quota per formation
    let neededDef = 4;
    let neededMid = 4;
    let neededAtt = 2;

    switch (this.formation) {
      case '4-3-3':
        neededDef = 4; neededMid = 3; neededAtt = 3; break;
      case '3-5-2':
        neededDef = 3; neededMid = 5; neededAtt = 2; break;
      case '4-2-3-1':
        neededDef = 4; neededMid = 5; neededAtt = 1; break;
      case '5-3-2':
        neededDef = 5; neededMid = 3; neededAtt = 2; break;
      case '3-4-3':
        neededDef = 3; neededMid = 4; neededAtt = 3; break;
      case '4-5-1':
        neededDef = 4; neededMid = 5; neededAtt = 1; break;
      case '4-2-4':
        neededDef = 4; neededMid = 2; neededAtt = 4; break;
      case '4-4-2':
      default:
        neededDef = 4; neededMid = 4; neededAtt = 2; break;
    }

    // MANDATORY: Each first team needs at least a striker in the first team
    // Sort strikers prioritizing central strikers (role 'ST' or 'CF') then rating
    const sortedStrikers = [...atts].sort((a, b) => {
      const aIsST = a.primaryRole === 'ST' || a.primaryRole === 'CF';
      const bIsST = b.primaryRole === 'ST' || b.primaryRole === 'CF';
      if (aIsST && !bIsST) return -1;
      if (!aIsST && bIsST) return 1;
      return b.rating() - a.rating();
    });

    // 2. Select starting Defenders
    if (neededDef === 3) {
      let dCount = 0;
      for (const d of defs) {
        if (dCount < 3 && pick(d)) dCount++;
      }
      for (const d of [...lbs, ...rbs]) {
        if (dCount < 3 && pick(d)) dCount++;
      }
    } else if (neededDef === 5) {
      pick(lbs[0]);
      let cbCount = 0;
      for (const d of defs) {
        if (cbCount < 3 && pick(d)) cbCount++;
      }
      pick(rbs[0]);
      for (const d of [...defs, ...lbs, ...rbs]) {
        if (selected.filter((x) => x.position === 'DEF' || x.position === 'LB' || x.position === 'RB').length < 5 && pick(d)) {}
      }
    } else {
      pick(lbs[0]);
      let cbCount = 0;
      for (const d of defs) {
        if (cbCount < 2 && pick(d)) cbCount++;
      }
      pick(rbs[0]);
      for (const d of [...defs, ...lbs, ...rbs]) {
        if (selected.filter((x) => x.position === 'DEF' || x.position === 'LB' || x.position === 'RB').length < neededDef && pick(d)) {}
      }
    }

    // 3. Select starting Midfielders
    let mCount = 0;
    for (const m of mids) {
      if (mCount < neededMid && pick(m)) mCount++;
    }

    // 4. Select starting Attackers (Strikers) - GUARANTEES AT LEAST 1 STRIKER!
    let aCount = 0;
    for (const a of sortedStrikers) {
      if (aCount < neededAtt && pick(a)) aCount++;
    }

    // GUARANTEE: If no striker selected yet, pick at least one striker now
    if (!selected.some((p) => p.position === 'ATT') && sortedStrikers.length > 0) {
      pick(sortedStrikers[0]);
    }

    // 5. Fill remaining spots up to 11 with highest-rated outfielders
    const remainingOutfield = this.squad
      .filter((p) => !selectedIds.has(p.id) && p.position !== 'GK')
      .sort((a, b) => b.rating() - a.rating());

    for (const p of remainingOutfield) {
      if (selected.length < 11) pick(p);
    }

    // Absolute fallback
    for (const p of this.squad) {
      if (selected.length < 11) pick(p);
    }

    // Safety check: ensure at least one striker is in the first team
    if (!selected.some((p) => p.position === 'ATT') && sortedStrikers.length > 0) {
      const nonGk = selected.filter((p) => p.position !== 'GK').sort((a, b) => a.rating() - b.rating());
      if (nonGk.length > 0) {
        const toRemove = nonGk[0];
        const idx = selected.findIndex((p) => p.id === toRemove.id);
        if (idx !== -1) {
          selected[idx] = sortedStrikers[0];
        }
      }
    }

    return selected.slice(0, 11);
  }

  secondTeam(): Player[] {
    const firstTeamIds = new Set(this.firstTeam().map((p) => p.id));
    return this.squad.filter((p) => !firstTeamIds.has(p.id));
  }

  promoteYouthPlayer(youthPlayerId: string): Player | null {
    const idx = this.youthSquad.findIndex((p) => p.id === youthPlayerId);
    if (idx === -1) return null;
    const promoted = this.youthSquad.splice(idx, 1)[0];
    promoted.isYouth = false;
    this.squad.push(promoted);
    this.sortedSquad();
    return promoted;
  }

  points(): number {
    return this.won * 3 + this.drawn;
  }

  goalDiff(): number {
    return this.gf - this.ga;
  }

  starPlayers(): Player[] {
    return this.squad.filter((p) => p.isStar || (this.leagueId === 'up_and_comers' ? p.rating() >= 70 : p.rating() >= 82));
  }

  byPosition(pos: Position): Player[] {
    if (pos === 'DEF') {
      return this.squad.filter((p) => p.position === 'DEF' || p.position === 'LB' || p.position === 'RB');
    }
    return this.squad.filter((p) => p.position === pos);
  }

  teamRating(): number {
    if (this.squad.length === 0) return 0;
    const sum = this.squad.reduce((acc, p) => acc + p.rating(), 0);
    return Math.floor(sum / this.squad.length);
  }

  attackRating(): number {
    const atts = this.byPosition('ATT');
    const mids = this.byPosition('MID');
    const group = [...atts, ...mids];
    if (group.length === 0) return this.teamRating();
    return Math.floor(group.reduce((acc, p) => acc + p.rating(), 0) / group.length);
  }

  defenseRating(): number {
    const defs = this.squad.filter((p) => p.position === 'DEF' || p.position === 'LB' || p.position === 'RB');
    const gks = this.byPosition('GK');
    const group = [...defs, ...gks];
    if (group.length === 0) return this.teamRating();
    return Math.floor(group.reduce((acc, p) => acc + p.rating(), 0) / group.length);
  }

  sortedSquad(): Player[] {
    const first = this.firstTeam();
    const second = this.secondTeam();
    const out = [...first, ...second];
    out.forEach((p, i) => (p.number = i + 1));
    return out;
  }

  sortedYouthSquad(): Player[] {
    const gks = this.youthSquad.filter((p) => p.position === 'GK');
    const lbs = this.youthSquad.filter((p) => p.position === 'LB');
    const defs = this.youthSquad.filter((p) => p.position === 'DEF');
    const rbs = this.youthSquad.filter((p) => p.position === 'RB');
    const mids = this.youthSquad.filter((p) => p.position === 'MID');
    const atts = this.youthSquad.filter((p) => p.position === 'ATT');
    const out = [...gks, ...lbs, ...defs, ...rbs, ...mids, ...atts];
    out.forEach((p, i) => (p.number = 30 + i));
    return out;
  }

  toJSON(): TeamData {
    return {
      id: this.id,
      name: this.name,
      shortName: this.shortName,
      color: this.color,
      squad: this.squad.map((p) => p.toJSON()),
      youthSquad: (this.youthSquad || []).map((p) => p.toJSON()),
      formation: this.formation,
      tactic: this.tactic,
      played: this.played,
      won: this.won,
      drawn: this.drawn,
      lost: this.lost,
      gf: this.gf,
      ga: this.ga,
      tier: this.tier,
      leagueId: this.leagueId,
    };
  }

  static fromJSON(data: TeamData): Team {
    const t = new Team(data.name, data.shortName, data.color, data.id, data.leagueId || 'big_time');
    t.formation = data.formation || '4-4-2';
    t.tactic = data.tactic || 'Balanced';
    t.played = data.played || 0;
    t.won = data.won || 0;
    t.drawn = data.drawn || 0;
    t.lost = data.lost || 0;
    t.gf = data.gf || 0;
    t.ga = data.ga || 0;
    t.squad = (data.squad || []).map((p) => Player.fromJSON(p));
    t.youthSquad = (data.youthSquad || []).map((p) => Player.fromJSON(p));
    t.tier = data.tier || (t.teamRating() >= 82 ? 'ELITE' : t.teamRating() >= 70 ? 'MID' : 'UNDERDOG');
    return t;
  }
}

export interface MatchScorer {
  playerShortName: string;
  minute: number;
  teamShortName: string;
  isHome: boolean;
}

export interface MatchStats {
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePassesCompleted: number;
  awayPassesCompleted: number;
  homeTacklesWon: number;
  awayTacklesWon: number;
  homePossessionTicks: number;
  awayPossessionTicks: number;
  homeFouls: number;
  awayFouls: number;
  homeOffsides?: number;
  awayOffsides?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeThrowIns?: number;
  awayThrowIns?: number;
}

export interface Fixture {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  homeScore: number;
  awayScore: number;
  scorers: MatchScorer[];
  leagueId?: LeagueId;
}

export interface LeagueSeasonData {
  year: number;
  name: string;
  teams: TeamData[];
  currentRound: number;
  totalRounds: number;
  fixtures: Fixture[];
  userTeamId: string | null;
  trainingTokens?: number;
  difficulty?: MatchDifficulty;
  selectedLeagueId?: LeagueId;
}
