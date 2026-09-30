import {
  Team,
  Player,
  Fixture,
  LeagueSeasonData,
  MatchScorer,
  TACTICS,
  FormationName,
  TacticName,
  LeagueId,
  adaptOppositionFormationIfIdentical,
} from '../types/football';

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function stringHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type PlayerTier =
  | 'ELITE'
  | 'MID'
  | 'UNDERDOG'
  | 'STAR'
  | 'LOWER_TOP'
  | 'LOWER_MID'
  | 'LOWER_UNDERDOG'
  | 'LOWER_STAR';

export function generatePositionStats(
  position: 'GK' | 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT',
  roleHint?: string,
  rng: () => number = Math.random,
  tier: PlayerTier = 'MID'
) {
  const rBetween = (min: number, max: number) => {
    return Math.max(15, Math.min(99, min + Math.floor(rng() * (max - min + 1))));
  };

  let passing = 65;
  let shooting = 50;
  let tackling = 65;
  let pace = 72;
  let stamina = 80;
  let strength = 75;
  let control = 70;
  let dribbling = 68;
  let secondaryPositions: string[] = [];
  let primaryRole = roleHint || (position as string);

  switch (position) {
    case 'GK':
      primaryRole = 'GK';
      if (tier === 'ELITE' || tier === 'STAR') {
        tackling = rBetween(86, 96);
        passing = rBetween(62, 78);
        shooting = rBetween(5, 18);
        pace = rBetween(62, 76);
        stamina = rBetween(84, 94);
        strength = rBetween(88, 97);
        control = rBetween(62, 75);
        dribbling = rBetween(38, 58);
      } else if (tier === 'MID') {
        tackling = rBetween(74, 84);
        passing = rBetween(48, 65);
        shooting = rBetween(5, 18);
        pace = rBetween(50, 64);
        stamina = rBetween(75, 86);
        strength = rBetween(76, 88);
        control = rBetween(48, 62);
        dribbling = rBetween(30, 48);
      } else if (tier === 'UNDERDOG') {
        tackling = rBetween(58, 68);
        passing = rBetween(36, 52);
        shooting = rBetween(5, 18);
        pace = rBetween(42, 55);
        stamina = rBetween(66, 78);
        strength = rBetween(65, 76);
        control = rBetween(36, 50);
        dribbling = rBetween(20, 38);
      } else if (tier === 'LOWER_TOP' || tier === 'LOWER_STAR') {
        tackling = rBetween(72, 82);
        passing = rBetween(46, 60);
        shooting = rBetween(5, 18);
        pace = rBetween(48, 60);
        stamina = rBetween(72, 84);
        strength = rBetween(74, 86);
        control = rBetween(46, 58);
        dribbling = rBetween(26, 42);
      } else if (tier === 'LOWER_MID') {
        tackling = rBetween(60, 70);
        passing = rBetween(36, 48);
        shooting = rBetween(5, 18);
        pace = rBetween(38, 50);
        stamina = rBetween(64, 76);
        strength = rBetween(66, 78);
        control = rBetween(36, 48);
        dribbling = rBetween(20, 34);
      } else {
        // LOWER_UNDERDOG
        tackling = rBetween(48, 58);
        passing = rBetween(26, 38);
        shooting = rBetween(5, 18);
        pace = rBetween(32, 44);
        stamina = rBetween(56, 68);
        strength = rBetween(58, 70);
        control = rBetween(26, 38);
        dribbling = rBetween(15, 28);
      }
      secondaryPositions = [];
      break;

    case 'LB':
    case 'RB':
      primaryRole = roleHint || position;
      if (tier === 'ELITE' || tier === 'STAR') {
        tackling = rBetween(84, 94);
        passing = rBetween(78, 90);
        shooting = rBetween(48, 70);
        pace = rBetween(86, 96);
        stamina = rBetween(88, 96);
        strength = rBetween(75, 88);
        control = rBetween(80, 92);
        dribbling = rBetween(82, 94);
      } else if (tier === 'MID') {
        tackling = rBetween(70, 82);
        passing = rBetween(66, 78);
        shooting = rBetween(35, 58);
        pace = rBetween(74, 84);
        stamina = rBetween(78, 88);
        strength = rBetween(66, 78);
        control = rBetween(68, 80);
        dribbling = rBetween(70, 82);
      } else if (tier === 'UNDERDOG') {
        tackling = rBetween(56, 66);
        passing = rBetween(52, 64);
        shooting = rBetween(25, 45);
        pace = rBetween(60, 72);
        stamina = rBetween(66, 78);
        strength = rBetween(58, 70);
        control = rBetween(54, 66);
        dribbling = rBetween(56, 68);
      } else if (tier === 'LOWER_TOP' || tier === 'LOWER_STAR') {
        tackling = rBetween(68, 78);
        passing = rBetween(60, 72);
        shooting = rBetween(30, 48);
        pace = rBetween(70, 80);
        stamina = rBetween(72, 82);
        strength = rBetween(60, 72);
        control = rBetween(62, 74);
        dribbling = rBetween(64, 76);
      } else if (tier === 'LOWER_MID') {
        tackling = rBetween(58, 68);
        passing = rBetween(50, 62);
        shooting = rBetween(22, 38);
        pace = rBetween(60, 72);
        stamina = rBetween(64, 76);
        strength = rBetween(52, 64);
        control = rBetween(52, 64);
        dribbling = rBetween(52, 64);
      } else {
        // LOWER_UNDERDOG
        tackling = rBetween(46, 56);
        passing = rBetween(40, 52);
        shooting = rBetween(18, 30);
        pace = rBetween(50, 62);
        stamina = rBetween(56, 68);
        strength = rBetween(44, 56);
        control = rBetween(42, 54);
        dribbling = rBetween(42, 54);
      }
      secondaryPositions = position === 'LB' ? ['LMF', 'DEF'] : ['RMF', 'DEF'];
      break;

    case 'DEF':
      primaryRole = roleHint || 'CB';
      if (tier === 'ELITE' || tier === 'STAR') {
        tackling = rBetween(86, 96);
        passing = rBetween(68, 84);
        shooting = rBetween(25, 52);
        pace = rBetween(76, 88);
        stamina = rBetween(84, 95);
        strength = rBetween(88, 98);
        control = rBetween(68, 82);
        dribbling = rBetween(56, 72);
      } else if (tier === 'MID') {
        tackling = rBetween(74, 84);
        passing = rBetween(54, 68);
        shooting = rBetween(20, 42);
        pace = rBetween(66, 76);
        stamina = rBetween(76, 88);
        strength = rBetween(76, 88);
        control = rBetween(56, 70);
        dribbling = rBetween(45, 62);
      } else if (tier === 'UNDERDOG') {
        tackling = rBetween(58, 68);
        passing = rBetween(42, 56);
        shooting = rBetween(15, 35);
        pace = rBetween(54, 65);
        stamina = rBetween(66, 78);
        strength = rBetween(66, 78);
        control = rBetween(44, 56);
        dribbling = rBetween(35, 50);
      } else if (tier === 'LOWER_TOP' || tier === 'LOWER_STAR') {
        tackling = rBetween(70, 80);
        passing = rBetween(48, 62);
        shooting = rBetween(15, 32);
        pace = rBetween(60, 70);
        stamina = rBetween(70, 82);
        strength = rBetween(70, 82);
        control = rBetween(48, 60);
        dribbling = rBetween(38, 52);
      } else if (tier === 'LOWER_MID') {
        tackling = rBetween(60, 70);
        passing = rBetween(40, 52);
        shooting = rBetween(12, 26);
        pace = rBetween(52, 62);
        stamina = rBetween(62, 74);
        strength = rBetween(62, 74);
        control = rBetween(38, 50);
        dribbling = rBetween(30, 42);
      } else {
        // LOWER_UNDERDOG
        tackling = rBetween(48, 58);
        passing = rBetween(30, 42);
        shooting = rBetween(10, 22);
        pace = rBetween(44, 54);
        stamina = rBetween(54, 66);
        strength = rBetween(52, 64);
        control = rBetween(30, 42);
        dribbling = rBetween(22, 34);
      }
      secondaryPositions = ['DMF'];
      break;

    case 'MID':
      primaryRole = roleHint || 'CMF';
      if (tier === 'ELITE' || tier === 'STAR') {
        passing = rBetween(86, 96);
        tackling = rBetween(75, 88);
        shooting = rBetween(74, 88);
        pace = rBetween(80, 92);
        stamina = rBetween(88, 98);
        strength = rBetween(75, 90);
        control = rBetween(85, 95);
        dribbling = rBetween(84, 95);
      } else if (tier === 'MID') {
        passing = rBetween(74, 84);
        tackling = rBetween(65, 76);
        shooting = rBetween(62, 74);
        pace = rBetween(70, 82);
        stamina = rBetween(80, 90);
        strength = rBetween(68, 82);
        control = rBetween(74, 85);
        dribbling = rBetween(72, 84);
      } else if (tier === 'UNDERDOG') {
        passing = rBetween(58, 68);
        tackling = rBetween(50, 64);
        shooting = rBetween(48, 62);
        pace = rBetween(56, 68);
        stamina = rBetween(68, 80);
        strength = rBetween(58, 72);
        control = rBetween(56, 68);
        dribbling = rBetween(56, 68);
      } else if (tier === 'LOWER_TOP' || tier === 'LOWER_STAR') {
        passing = rBetween(68, 80);
        tackling = rBetween(58, 70);
        shooting = rBetween(58, 70);
        pace = rBetween(64, 76);
        stamina = rBetween(74, 84);
        strength = rBetween(62, 74);
        control = rBetween(68, 78);
        dribbling = rBetween(66, 78);
      } else if (tier === 'LOWER_MID') {
        passing = rBetween(58, 68);
        tackling = rBetween(48, 60);
        shooting = rBetween(48, 60);
        pace = rBetween(56, 68);
        stamina = rBetween(64, 76);
        strength = rBetween(54, 66);
        control = rBetween(56, 66);
        dribbling = rBetween(54, 66);
      } else {
        // LOWER_UNDERDOG
        passing = rBetween(46, 56);
        tackling = rBetween(38, 48);
        shooting = rBetween(38, 50);
        pace = rBetween(46, 58);
        stamina = rBetween(56, 68);
        strength = rBetween(44, 56);
        control = rBetween(44, 54);
        dribbling = rBetween(42, 54);
      }
      secondaryPositions = primaryRole === 'CAM' || primaryRole === 'AMF' ? ['CMF', 'ATT'] : ['DMF', 'CMF'];
      break;

    case 'ATT':
      primaryRole = roleHint || 'ST';
      if (tier === 'ELITE' || tier === 'STAR') {
        shooting = rBetween(86, 96);
        pace = rBetween(86, 96);
        passing = rBetween(74, 88);
        control = rBetween(84, 95);
        dribbling = rBetween(86, 96);
        strength = rBetween(76, 92);
        stamina = rBetween(82, 94);
        tackling = rBetween(26, 48);
      } else if (tier === 'MID') {
        shooting = rBetween(75, 85);
        pace = rBetween(74, 86);
        passing = rBetween(62, 75);
        control = rBetween(74, 85);
        dribbling = rBetween(74, 86);
        strength = rBetween(68, 84);
        stamina = rBetween(74, 86);
        tackling = rBetween(22, 42);
      } else if (tier === 'UNDERDOG') {
        shooting = rBetween(58, 68);
        pace = rBetween(60, 72);
        passing = rBetween(48, 62);
        control = rBetween(58, 70);
        dribbling = rBetween(58, 70);
        strength = rBetween(58, 74);
        stamina = rBetween(66, 78);
        tackling = rBetween(18, 36);
      } else if (tier === 'LOWER_TOP' || tier === 'LOWER_STAR') {
        shooting = rBetween(70, 82);
        pace = rBetween(70, 82);
        passing = rBetween(56, 68);
        control = rBetween(68, 78);
        dribbling = rBetween(68, 80);
        strength = rBetween(60, 74);
        stamina = rBetween(70, 82);
        tackling = rBetween(18, 34);
      } else if (tier === 'LOWER_MID') {
        shooting = rBetween(60, 70);
        pace = rBetween(60, 72);
        passing = rBetween(46, 58);
        control = rBetween(56, 68);
        dribbling = rBetween(56, 68);
        strength = rBetween(52, 66);
        stamina = rBetween(62, 74);
        tackling = rBetween(15, 28);
      } else {
        // LOWER_UNDERDOG
        shooting = rBetween(48, 58);
        pace = rBetween(50, 62);
        passing = rBetween(36, 48);
        control = rBetween(44, 56);
        dribbling = rBetween(44, 56);
        strength = rBetween(44, 56);
        stamina = rBetween(54, 66);
        tackling = rBetween(12, 24);
      }
      secondaryPositions = primaryRole === 'LW' || primaryRole === 'RW' ? ['MID', 'ATT'] : ['ATT'];
      break;
  }

  let positioning = 70;
  if (position === 'GK') {
    positioning = Math.max(20, Math.min(99, Math.round(tackling * 0.70 + 20)));
  } else if (position === 'LB' || position === 'RB') {
    positioning = Math.max(20, Math.min(99, Math.round(tackling * 0.45 + pace * 0.35 + passing * 0.20)));
  } else if (position === 'DEF') {
    positioning = Math.max(20, Math.min(99, Math.round(tackling * 0.55 + strength * 0.25 + stamina * 0.20)));
  } else if (position === 'MID') {
    positioning = Math.max(20, Math.min(99, Math.round(passing * 0.45 + tackling * 0.30 + control * 0.25)));
  } else {
    positioning = Math.max(20, Math.min(99, Math.round(shooting * 0.45 + pace * 0.35 + dribbling * 0.20)));
  }

  const speed = pace;

  // Attack rating: Forwards highest (75-98), Midfielders (60-85), Defenders (25-60), Goalkeepers (10-30)
  const attack = Math.min(
    99,
    Math.max(
      10,
      position === 'ATT'
        ? Math.round(shooting * 0.52 + dribbling * 0.28 + speed * 0.20)
        : position === 'MID'
        ? Math.round(passing * 0.40 + shooting * 0.30 + dribbling * 0.30)
        : position === 'LB' || position === 'RB'
        ? Math.round(speed * 0.45 + passing * 0.35 + dribbling * 0.20)
        : position === 'DEF'
        ? Math.round(passing * 0.35 + speed * 0.35 + strength * 0.30)
        : Math.round(passing * 0.50 + speed * 0.30 + 10)
    )
  );

  // Defence rating: Defenders highest (75-98), Goalkeepers (75-95), Midfielders (50-80), Forwards (20-45)
  const defence = Math.min(
    99,
    Math.max(
      10,
      position === 'DEF'
        ? Math.round(tackling * 0.50 + strength * 0.28 + positioning * 0.22)
        : position === 'LB' || position === 'RB'
        ? Math.round(tackling * 0.50 + speed * 0.25 + positioning * 0.25)
        : position === 'GK'
        ? Math.round(tackling * 0.60 + positioning * 0.40)
        : position === 'MID'
        ? Math.round(tackling * 0.50 + stamina * 0.25 + positioning * 0.25)
        : Math.round(tackling * 0.55 + stamina * 0.35 + 10)
    )
  );

  // Goalie Skills: Awareness, Reach, Jumping, and Mentality (Attacking vs Defensive)
  let gkAwareness = 45;
  let gkReach = 45;
  let gkJumping = 50;
  let gkStyle: 'attacking' | 'defensive' = 'defensive';

  if (position === 'GK') {
    if (tier === 'ELITE' || tier === 'STAR') {
      gkAwareness = rBetween(86, 96);
      gkReach = rBetween(88, 97);
      gkJumping = rBetween(85, 95);
    } else if (tier === 'MID') {
      gkAwareness = rBetween(74, 86);
      gkReach = rBetween(76, 88);
      gkJumping = rBetween(74, 86);
    } else {
      gkAwareness = rBetween(58, 72);
      gkReach = rBetween(62, 75);
      gkJumping = rBetween(60, 74);
    }
    // Mix of modern sweeping keepers vs solid line stoppers across clubs
    gkStyle = rng() > 0.45 ? 'attacking' : 'defensive';
  }

  return {
    passing,
    shooting,
    tackling,
    pace,
    stamina,
    strength,
    control,
    dribbling,
    positioning,
    speed,
    attack,
    defence,
    gkAwareness,
    gkReach,
    gkJumping,
    gkStyle,
    secondaryPositions,
    primaryRole,
  };
}

export interface PlayerBlueprint {
  name: string;
  pos: 'GK' | 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT';
  roleHint: string;
}

export const SURNAMES_POOL = [
  'Adams', 'Armstrong', 'Bailey', 'Barker', 'Barnes', 'Bell', 'Bennett', 'Black', 'Booth', 'Bradley',
  'Brooks', 'Butler', 'Calloway', 'Campbell', 'Carter', 'Chapman', 'Clark', 'Clayton', 'Cooper', 'Cox',
  'Crawford', 'Crosby', 'Dalton', 'Davies', 'Dixon', 'Donovan', 'Elliott', 'Evans', 'Fletcher', 'Flynn',
  'Ford', 'Foster', 'Gardner', 'Gibson', 'Glover', 'Gordon', 'Graham', 'Grant', 'Green', 'Griffin',
  'Hall', 'Hamilton', 'Harper', 'Harris', 'Harrison', 'Harvey', 'Hayes', 'Henderson', 'Higgins', 'Hill',
  'Hodgson', 'Holland', 'Holt', 'Hopkins', 'Hughes', 'Hunter', 'Jackson', 'Jenkins', 'Johnson', 'Jones',
  'Kelly', 'Kennedy', 'King', 'Knight', 'Lambert', 'Lane', 'Lawrence', 'Lawson', 'Leach', 'Lee',
  'Lewis', 'Little', 'Lloyd', 'Logan', 'Lucas', 'Lynch', 'MacDonald', 'Marshall', 'Mason', 'Matthews',
  'Maxwell', 'McCarthy', 'Miller', 'Mitchell', 'Morgan', 'Morris', 'Murphy', 'Murray', 'Myers', 'Nelson',
  'Newman', 'Nicholson', 'Norman', 'O’Connor', 'Oliver', 'Owen', 'Palmer', 'Parker', 'Patterson', 'Payne',
  'Pearce', 'Pearson', 'Perry', 'Phillips', 'Pollard', 'Poole', 'Powell', 'Prescott', 'Price', 'Pritchard',
  'Ramsey', 'Raynor', 'Reeves', 'Reynolds', 'Rhodes', 'Richards', 'Richardson', 'Riley', 'Roberts', 'Robertson',
  'Robinson', 'Robson', 'Rogers', 'Rose', 'Rowe', 'Russell', 'Rutherford', 'Sanders', 'Scott', 'Sharp',
  'Shaw', 'Shelton', 'Shepherd', 'Simmons', 'Simpson', 'Sinclair', 'Skinner', 'Slater', 'Small', 'Smith',
  'Spencer', 'Stafford', 'Stanley', 'Steele', 'Stephens', 'Stevenson', 'Stewart', 'Sullivan', 'Sutton', 'Talbot',
  'Tanner', 'Taylor', 'Thomas', 'Thompson', 'Thorne', 'Thorpe', 'Todd', 'Townsend', 'Tucker', 'Turner',
  'Underwood', 'Vance', 'Vaughan', 'Vernon', 'Wade', 'Walker', 'Wallace', 'Walsh', 'Walton', 'Ward',
  'Warner', 'Warren', 'Watkins', 'Watson', 'Watts', 'Webb', 'Webster', 'Wells', 'West', 'Wheeler',
  'White', 'Whitehead', 'Whittaker', 'Wilkinson', 'Williams', 'Williamson', 'Willis', 'Wilson', 'Winter', 'Wood',
  'Woodward', 'Wright', 'Wyatt', 'Yates', 'York', 'Young'
];

// Tactical role blueprints for second-team reserve depth (at least 10 on smaller teams, 15-17 on first league teams)
export const SECOND_TEAM_ROLE_SLOTS: Array<{ pos: 'GK' | 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT'; roleHint: string }> = [
  { pos: 'GK',  roleHint: 'GK' },   // Slot 1: Backup Goalkeeper
  { pos: 'DEF', roleHint: 'CB' },   // Slot 2: Reserve Central Defender
  { pos: 'LB',  roleHint: 'LB' },   // Slot 3: Reserve Left Back
  { pos: 'RB',  roleHint: 'RB' },   // Slot 4: Reserve Right Back
  { pos: 'MID', roleHint: 'CM' },   // Slot 5: Reserve Central Midfielder
  { pos: 'MID', roleHint: 'CDM' },  // Slot 6: Reserve Defensive Midfielder
  { pos: 'MID', roleHint: 'CAM' },  // Slot 7: Reserve Attacking Midfielder
  { pos: 'ATT', roleHint: 'ST' },   // Slot 8: Reserve Striker
  { pos: 'ATT', roleHint: 'LW' },   // Slot 9: Reserve Left Winger
  { pos: 'ATT', roleHint: 'RW' },   // Slot 10: Reserve Right Winger (Guarantees at least 10 second team members on smaller teams! 11 + 10 = 21)
  { pos: 'DEF', roleHint: 'CB' },   // Slot 11: Total 22 players (Lower league MID)
  { pos: 'MID', roleHint: 'LM' },   // Slot 12: Total 23 players
  { pos: 'ATT', roleHint: 'CF' },   // Slot 13: Total 24 players (Lower league ELITE)
  { pos: 'DEF', roleHint: 'CB' },   // Slot 14: Total 25 players
  { pos: 'MID', roleHint: 'RM' },   // Slot 15: Total 26 players (At least 26 players in first league teams - UNDERDOG)
  { pos: 'GK',  roleHint: 'GK' },   // Slot 16: Total 27 players (First league MID)
  { pos: 'ATT', roleHint: 'ST' },   // Slot 17: Total 28 players (First league ELITE giants)
  { pos: 'MID', roleHint: 'CM' },   // Slot 18
  { pos: 'DEF', roleHint: 'RB' },   // Slot 19
  { pos: 'ATT', roleHint: 'LW' },   // Slot 20
];

// Youth Academy position templates (11-player full youth academy squad)
export const YOUTH_ROLE_SLOTS: Array<{ pos: 'GK' | 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT'; roleHint: string }> = [
  { pos: 'GK',  roleHint: 'GK' },
  { pos: 'DEF', roleHint: 'CB' },
  { pos: 'DEF', roleHint: 'CB' },
  { pos: 'LB',  roleHint: 'LB' },
  { pos: 'RB',  roleHint: 'RB' },
  { pos: 'MID', roleHint: 'CDM' },
  { pos: 'MID', roleHint: 'CM' },
  { pos: 'MID', roleHint: 'CAM' },
  { pos: 'ATT', roleHint: 'LW' },
  { pos: 'ATT', roleHint: 'RW' },
  { pos: 'ATT', roleHint: 'ST' },
];

/**
 * Returns required total squad size based on league and team tier status:
 * - First League (Big Time): At least 26 players across all teams! (Elite: 28, Mid: 27, Underdog: 26)
 * - Lower League (Up and Comers): Scales down as status drops (Elite: 24, Mid: 22, Underdog: 21)
 * - Smaller teams have at least 10 second team members (11 + 10 = 21).
 */
export function getTargetSquadSize(
  leagueId: LeagueId = 'big_time',
  tier: 'ELITE' | 'MID' | 'UNDERDOG' = 'MID'
): number {
  if (leagueId === 'big_time') {
    return tier === 'ELITE' ? 28 : tier === 'MID' ? 27 : 26;
  } else {
    return tier === 'ELITE' ? 24 : tier === 'MID' ? 22 : 21;
  }
}

export function generateYouthSquad(team: Team, rng: () => number = Math.random): Player[] {
  const existingNames = new Set(team.squad.map((p) => p.name));
  const youthPlayers: Player[] = [];
  const isBigTime = team.leagueId === 'big_time';

  YOUTH_ROLE_SLOTS.forEach((slot, idx) => {
    // Pick unique youth surname
    let youthName = SURNAMES_POOL[Math.floor(rng() * SURNAMES_POOL.length)];
    let attempts = 0;
    while ((existingNames.has(youthName) || youthPlayers.some((p) => p.name === youthName)) && attempts < 30) {
      youthName = SURNAMES_POOL[Math.floor(rng() * SURNAMES_POOL.length)];
      attempts++;
    }

    // Youth age: 15 to 18 years old
    const youthAge = 15 + Math.floor(rng() * 4);

    // Development Potential:
    // First League academy prospects: 74 - 95 potential!
    // Lower League academy prospects: 60 - 86 potential!
    const basePot = isBigTime
      ? (team.tier === 'ELITE' ? 78 + Math.floor(rng() * 17) : 74 + Math.floor(rng() * 16))
      : (team.tier === 'ELITE' ? 68 + Math.floor(rng() * 16) : 60 + Math.floor(rng() * 18));
    const potential = Math.min(96, Math.max(55, basePot));
    const isWonderkid = potential >= 88;

    // Current youth rating stats: scaled down youth tier
    const youthTier: PlayerTier = isBigTime ? 'LOWER_TOP' : 'LOWER_UNDERDOG';
    const s = generatePositionStats(slot.pos, slot.roleHint, rng, youthTier);

    // Scale attributes appropriately for young teenagers developing
    const scaleFactor = 0.82 + (potential / 100) * 0.15;
    const player = new Player(
      youthName,
      slot.pos,
      youthAge,
      Math.max(25, Math.round(s.passing * scaleFactor)),
      Math.max(20, Math.round(s.shooting * scaleFactor)),
      Math.max(25, Math.round(s.tackling * scaleFactor)),
      Math.max(35, Math.round(s.pace * (scaleFactor + 0.05))), // Young legs have raw pace
      Math.max(35, Math.round(s.stamina * scaleFactor)),
      `${team.id}_youth_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      Math.max(30, Math.round(s.strength * (scaleFactor - 0.05))), // Less developed physical strength
      Math.max(25, Math.round(s.control * scaleFactor)),
      70,
      Math.max(30, Math.round(s.dribbling * scaleFactor)),
      s.secondaryPositions,
      s.primaryRole,
      0,
      Math.max(25, Math.round(s.positioning * scaleFactor)),
      0,
      undefined,
      Math.max(35, Math.round(s.speed * (scaleFactor + 0.05))),
      Math.max(25, Math.round(s.attack * scaleFactor)),
      Math.max(25, Math.round(s.defence * scaleFactor)),
      s.gkAwareness,
      s.gkReach,
      s.gkJumping,
      s.gkStyle
    );

    player.isYouth = true;
    player.potential = potential;
    player.isStar = isWonderkid;
    player.number = 30 + idx;
    youthPlayers.push(player);
  });

  return youthPlayers;
}

export function regenerateAllYouthTeams(teams: Team[]): void {
  for (const t of teams) {
    t.youthSquad = generateYouthSquad(t, Math.random);
  }
}

export function advanceToNextSeason(teams: Team[]): { teams: Team[]; fixtures: Fixture[] } {
  for (const t of teams) {
    // Reset league match results
    t.played = 0;
    t.won = 0;
    t.drawn = 0;
    t.lost = 0;
    t.gf = 0;
    t.ga = 0;

    // Reset player season counters and increment ages
    for (const p of t.squad) {
      p.seasonGoals = 0;
      p.yellowCards = 0;
      p.redCards = 0;
      p.suspendedMatches = 0;
      p.age += 1;
      p.condition = 100;
    }

    // Randomly generate fresh Youth Team intake for each club in the new season
    t.youthSquad = generateYouthSquad(t, Math.random);

    // Guarantee full squad depth and reserve integrity for every club
    ensureTeamSquadIntegrity(t);
  }

  const fixtures = generateFixtures(teams);
  return { teams, fixtures };
}

/**
 * Ensures team squad depth meets strict league requirements:
 * - At least 26 players in first league teams (28 Elite giants, 27 Mid contenders, 26 Underdogs)
 * - Scaled down in lower league (24 Elite, 22 Mid, 21 Underdogs)
 * - At least 10 second team members on smaller teams (11 starters + 10 reserves = 21)
 * - Youth academy squad generated if empty or missing.
 */
export function ensureTeamSquadIntegrity(team: Team): void {
  const targetTotalSquad = getTargetSquadSize(team.leagueId, team.tier);
  const existingNames = new Set(team.squad.map((p) => p.name));

  if (team.squad.length < targetTotalSquad) {
    const needed = targetTotalSquad - team.squad.length;
    const rng = seededRandom(stringHash(team.name + '_reserves_' + team.squad.length));
    const rInt = (n: number) => Math.floor(rng() * n);

    for (let i = 0; i < needed; i++) {
      const slotIndex = (team.squad.length - 11 + i) % SECOND_TEAM_ROLE_SLOTS.length;
      const slot = SECOND_TEAM_ROLE_SLOTS[Math.max(0, slotIndex)];

      let sName = SURNAMES_POOL[Math.floor(rng() * SURNAMES_POOL.length)];
      let attempts = 0;
      while (existingNames.has(sName) && attempts < 30) {
        sName = SURNAMES_POOL[Math.floor(rng() * SURNAMES_POOL.length)];
        attempts++;
      }
      existingNames.add(sName);

      let reserveTier: PlayerTier = 'MID';
      if (team.leagueId === 'big_time') {
        reserveTier = team.tier === 'ELITE' ? 'MID' : 'UNDERDOG';
      } else {
        reserveTier = team.tier === 'ELITE' ? 'LOWER_MID' : 'LOWER_UNDERDOG';
      }

      const s = generatePositionStats(slot.pos, slot.roleHint, rng, reserveTier);
      const age = 19 + rInt(14);
      const reservePlayer = new Player(
        sName,
        slot.pos,
        age,
        s.passing,
        s.shooting,
        s.tackling,
        s.pace,
        s.stamina,
        undefined,
        s.strength,
        s.control,
        undefined,
        s.dribbling,
        s.secondaryPositions,
        s.primaryRole,
        0,
        s.positioning,
        0,
        undefined,
        s.speed,
        s.attack,
        s.defence,
        s.gkAwareness,
        s.gkReach,
        s.gkJumping,
        s.gkStyle
      );
      team.addPlayer(reservePlayer);
    }
    team.sortedSquad();
  }

  // Ensure youth squad exists and is populated
  if (!team.youthSquad || team.youthSquad.length === 0) {
    team.youthSquad = generateYouthSquad(team, Math.random);
  }

  // GUARANTEE: Each first team needs at least a striker in the squad and starting XI
  const hasStriker = team.squad.some((p) => p.position === 'ATT');
  if (!hasStriker) {
    const rng = seededRandom(stringHash(team.name + '_guaranteed_striker'));
    let sName = SURNAMES_POOL[Math.floor(rng() * SURNAMES_POOL.length)];
    let attempts = 0;
    while (existingNames.has(sName) && attempts < 30) {
      sName = SURNAMES_POOL[Math.floor(rng() * SURNAMES_POOL.length)];
      attempts++;
    }
    existingNames.add(sName);

    let reserveTier: PlayerTier = 'MID';
    if (team.leagueId === 'big_time') {
      reserveTier = team.tier === 'ELITE' ? 'MID' : 'UNDERDOG';
    } else {
      reserveTier = team.tier === 'ELITE' ? 'LOWER_MID' : 'LOWER_UNDERDOG';
    }
    const s = generatePositionStats('ATT', 'ST', rng, reserveTier);
    const striker = new Player(
      sName,
      'ATT',
      23,
      s.passing,
      s.shooting,
      s.tackling,
      s.pace,
      s.stamina,
      undefined,
      s.strength,
      s.control,
      undefined,
      s.dribbling,
      s.secondaryPositions,
      'ST',
      0,
      s.positioning,
      0,
      undefined,
      s.speed,
      s.attack,
      s.defence,
      s.gkAwareness,
      s.gkReach,
      s.gkJumping,
      s.gkStyle
    );
    team.addPlayer(striker);
    team.sortedSquad();
  }
}

function buildTieredTeam(
  full: string,
  shortN: string,
  color: string,
  formation: FormationName,
  tactic: TacticName,
  tier: 'ELITE' | 'MID' | 'UNDERDOG',
  starPlayerNames: string[],
  players: PlayerBlueprint[],
  leagueId: LeagueId = 'big_time'
): Team {
  const t = new Team(full, shortN, color, undefined, leagueId);
  t.formation = formation;
  t.tactic = tactic;
  t.tier = tier;
  const rng = seededRandom(stringHash(full + leagueId));
  const rInt = (n: number) => Math.floor(rng() * n);

  const existingNames = new Set<string>();

  // 1. FIRST TEAM (Starting XI from blueprints)
  players.forEach((p) => {
    existingNames.add(p.name);
    const isStar = starPlayerNames.includes(p.name);
    let effectiveTier: PlayerTier = tier;
    if (leagueId === 'up_and_comers') {
      if (isStar) effectiveTier = 'LOWER_STAR';
      else if (tier === 'ELITE') effectiveTier = 'LOWER_TOP';
      else if (tier === 'MID') effectiveTier = 'LOWER_MID';
      else effectiveTier = 'LOWER_UNDERDOG';
    } else {
      if (isStar) effectiveTier = 'STAR';
    }

    const s = generatePositionStats(p.pos, p.roleHint, rng, effectiveTier);
    const age = 20 + rInt(13);
    const player = new Player(
      p.name,
      p.pos,
      age,
      s.passing,
      s.shooting,
      s.tackling,
      s.pace,
      s.stamina,
      undefined,
      s.strength,
      s.control,
      undefined,
      s.dribbling,
      s.secondaryPositions,
      s.primaryRole,
      0,
      s.positioning,
      0,
      undefined,
      s.speed,
      s.attack,
      s.defence,
      s.gkAwareness,
      s.gkReach,
      s.gkJumping,
      s.gkStyle
    );
    player.isStar = isStar;
    t.addPlayer(player);
  });

  // 2. SECOND TEAM (RESERVES) - SQUAD SIZE SCALING:
  // "at least 26 player in the first leauge teams scaling down as teams drop in status so lower leauge team have a few less players than the bigger temas"
  // "making sure we have a at least 10 second team memebers on the smaller teams"
  const targetTotalSquad = getTargetSquadSize(leagueId, tier);
  const secondTeamSlotsNeeded = targetTotalSquad - players.length;

  for (let i = 0; i < secondTeamSlotsNeeded; i++) {
    const slot = SECOND_TEAM_ROLE_SLOTS[i % SECOND_TEAM_ROLE_SLOTS.length];

    // Pick unique surname
    let sName = SURNAMES_POOL[Math.floor(rng() * SURNAMES_POOL.length)];
    let attempts = 0;
    while (existingNames.has(sName) && attempts < 30) {
      sName = SURNAMES_POOL[Math.floor(rng() * SURNAMES_POOL.length)];
      attempts++;
    }
    existingNames.add(sName);

    // Second-team tier stats (slightly scaled depth rating)
    let reserveTier: PlayerTier = 'MID';
    if (leagueId === 'big_time') {
      reserveTier = tier === 'ELITE' ? 'MID' : 'UNDERDOG';
    } else {
      reserveTier = tier === 'ELITE' ? 'LOWER_MID' : 'LOWER_UNDERDOG';
    }

    const s = generatePositionStats(slot.pos, slot.roleHint, rng, reserveTier);
    const age = 19 + rInt(14);
    const reservePlayer = new Player(
      sName,
      slot.pos,
      age,
      s.passing,
      s.shooting,
      s.tackling,
      s.pace,
      s.stamina,
      undefined,
      s.strength,
      s.control,
      undefined,
      s.dribbling,
      s.secondaryPositions,
      s.primaryRole,
      0,
      s.positioning,
      0,
      undefined,
      s.speed,
      s.attack,
      s.defence,
      s.gkAwareness,
      s.gkReach,
      s.gkJumping,
      s.gkStyle
    );
    t.addPlayer(reservePlayer);
  }

  // 3. YOUTH TEAM (Randomly generated youth academy prospects, ages 15-18)
  t.youthSquad = generateYouthSquad(t, rng);

  t.sortedSquad();
  return t;
}

export function buildDefaultTeams(): Team[] {
  return [
    // =============================================================
    // LEAGUE 1: BIG TIME LEAGUE (14 TEAMS)
    // =============================================================

    // --- TIER 1: 4 HEAVYWEIGHT GIANTS (~85-88 Rating) ---
    // 1. Northwood United
    buildTieredTeam(
      'Northwood United',
      'Northwood',
      '#ef5350',
      '4-3-3',
      'Attacking',
      'ELITE',
      [],
      [
        { name: 'Harper', pos: 'GK',  roleHint: 'GK' },
        { name: 'Cole',   pos: 'LB',  roleHint: 'LB' },
        { name: 'Bishop', pos: 'DEF', roleHint: 'LCB' },
        { name: 'Vance',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Doyle',  pos: 'RB',  roleHint: 'RB' },
        { name: 'Reid',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Marsh',  pos: 'MID', roleHint: 'CDM' },
        { name: 'Quinn',  pos: 'MID', roleHint: 'RCM' },
        { name: 'Ellis',  pos: 'ATT', roleHint: 'LW' },
        { name: 'Hart',   pos: 'ATT', roleHint: 'ST' },
        { name: 'Frost',  pos: 'ATT', roleHint: 'RW' },
      ],
      'big_time'
    ),

    // 2. Kingsbridge Ath.
    buildTieredTeam(
      'Kingsbridge Ath.',
      'Kingsbridge',
      '#ffd54f',
      '4-2-4',
      'SWOS Total',
      'ELITE',
      [],
      [
        { name: 'Fox',   pos: 'GK',  roleHint: 'GK' },
        { name: 'Gray',  pos: 'LB',  roleHint: 'LB' },
        { name: 'Hale',  pos: 'DEF', roleHint: 'LCB' },
        { name: 'Kent',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Lowe',  pos: 'RB',  roleHint: 'RB' },
        { name: 'Noble', pos: 'MID', roleHint: 'LCM' },
        { name: 'Pace',  pos: 'MID', roleHint: 'RCM' },
        { name: 'Ross',  pos: 'ATT', roleHint: 'LW' },
        { name: 'Tate',  pos: 'ATT', roleHint: 'LST' },
        { name: 'Ward',  pos: 'ATT', roleHint: 'RST' },
        { name: 'Young', pos: 'ATT', roleHint: 'RW' },
      ],
      'big_time'
    ),

    // 3. Westport City
    buildTieredTeam(
      'Westport City',
      'Westport',
      '#26c6da',
      '3-5-2',
      'SWOS Press',
      'ELITE',
      [],
      [
        { name: 'Lang',    pos: 'GK',  roleHint: 'GK' },
        { name: 'Moore',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Neal',    pos: 'DEF', roleHint: 'CB' },
        { name: 'Osborne', pos: 'DEF', roleHint: 'RCB' },
        { name: 'Pratt',   pos: 'MID', roleHint: 'LWB' },
        { name: 'Quill',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Reyes',   pos: 'MID', roleHint: 'CAM' },
        { name: 'Sharp',   pos: 'MID', roleHint: 'RCM' },
        { name: 'Trent',   pos: 'MID', roleHint: 'RWB' },
        { name: 'Upton',   pos: 'ATT', roleHint: 'LST' },
        { name: 'Vale',    pos: 'ATT', roleHint: 'RST' },
      ],
      'big_time'
    ),

    // 4. Riverside FC
    buildTieredTeam(
      'Riverside FC',
      'Riverside',
      '#42a5f5',
      '4-2-3-1',
      'High Press',
      'ELITE',
      [],
      [
        { name: 'Nash',   pos: 'GK',  roleHint: 'GK' },
        { name: 'Croft',  pos: 'LB',  roleHint: 'LB' },
        { name: 'Banks',  pos: 'DEF', roleHint: 'LCB' },
        { name: 'Rowe',   pos: 'DEF', roleHint: 'RCB' },
        { name: 'Pike',   pos: 'RB',  roleHint: 'RB' },
        { name: 'Dean',   pos: 'MID', roleHint: 'LDM' },
        { name: 'Lyon',   pos: 'MID', roleHint: 'RDM' },
        { name: 'Webb',   pos: 'MID', roleHint: 'LAM' },
        { name: 'Kane',   pos: 'MID', roleHint: 'CAM' },
        { name: 'Stone',  pos: 'MID', roleHint: 'RAM' },
        { name: 'Vaughn', pos: 'ATT', roleHint: 'ST' },
      ],
      'big_time'
    ),

    // --- TIER 2: 5 MID-LEVEL CONTENDERS (~73-77 Rating) ---
    // 5. Eastgate Rovers
    buildTieredTeam(
      'Eastgate Rovers',
      'Eastgate',
      '#66bb6a',
      '4-4-2',
      'Balanced',
      'MID',
      [],
      [
        { name: 'Abbot', pos: 'GK',  roleHint: 'GK' },
        { name: 'Blake', pos: 'LB',  roleHint: 'LB' },
        { name: 'Chase', pos: 'DEF', roleHint: 'LCB' },
        { name: 'Dunn',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Eaton', pos: 'RB',  roleHint: 'RB' },
        { name: 'Field', pos: 'MID', roleHint: 'LM' },
        { name: 'Grove', pos: 'MID', roleHint: 'LCM' },
        { name: 'Hume',  pos: 'MID', roleHint: 'RCM' },
        { name: 'Irwin', pos: 'MID', roleHint: 'RM' },
        { name: 'Jones', pos: 'ATT', roleHint: 'LST' },
        { name: 'Knox',  pos: 'ATT', roleHint: 'RST' },
      ],
      'big_time'
    ),

    // 6. Stonebridge Park
    buildTieredTeam(
      'Stonebridge Park',
      'Stonebridge',
      '#ff7043',
      '3-4-3',
      'Direct Play',
      'MID',
      [],
      [
        { name: 'Thorne',  pos: 'GK',  roleHint: 'GK' },
        { name: 'Ulric',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Voss',    pos: 'DEF', roleHint: 'CB' },
        { name: 'Wren',    pos: 'DEF', roleHint: 'RCB' },
        { name: 'Yale',    pos: 'MID', roleHint: 'LM' },
        { name: 'Ziegler', pos: 'MID', roleHint: 'LCM' },
        { name: 'Ash',     pos: 'MID', roleHint: 'RCM' },
        { name: 'Brunt',   pos: 'MID', roleHint: 'RM' },
        { name: 'Cade',    pos: 'ATT', roleHint: 'LW' },
        { name: 'Dane',    pos: 'ATT', roleHint: 'ST' },
        { name: 'Eames',   pos: 'ATT', roleHint: 'RW' },
      ],
      'big_time'
    ),

    // 7. Highbury Olympic
    buildTieredTeam(
      'Highbury Olympic',
      'Highbury',
      '#ec4899',
      '4-3-3',
      'High Press',
      'MID',
      [],
      [
        { name: 'Farrell', pos: 'GK',  roleHint: 'GK' },
        { name: 'Glover',  pos: 'LB',  roleHint: 'LB' },
        { name: 'Hardy',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Ingalls', pos: 'DEF', roleHint: 'RCB' },
        { name: 'Judd',    pos: 'RB',  roleHint: 'RB' },
        { name: 'Keats',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Lennon',  pos: 'MID', roleHint: 'CDM' },
        { name: 'Maddox',  pos: 'MID', roleHint: 'RCM' },
        { name: 'Norris',  pos: 'ATT', roleHint: 'LW' },
        { name: 'Oakes',   pos: 'ATT', roleHint: 'ST' },
        { name: 'Paley',   pos: 'ATT', roleHint: 'RW' },
      ],
      'big_time'
    ),

    // 8. Southbank Town
    buildTieredTeam(
      'Southbank Town',
      'Southbank',
      '#14b8a6',
      '3-5-2',
      'Counter',
      'MID',
      [],
      [
        { name: 'Quigley', pos: 'GK',  roleHint: 'GK' },
        { name: 'Radcliffe', pos: 'DEF', roleHint: 'LCB' },
        { name: 'Sutton',  pos: 'DEF', roleHint: 'CB' },
        { name: 'Talbot',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Underwood', pos: 'MID', roleHint: 'LWB' },
        { name: 'Vance',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Whitaker', pos: 'MID', roleHint: 'CAM' },
        { name: 'Yardley', pos: 'MID', roleHint: 'RCM' },
        { name: 'Zeller',  pos: 'MID', roleHint: 'RWB' },
        { name: 'Armitage', pos: 'ATT', roleHint: 'LST' },
        { name: 'Blythe',  pos: 'ATT', roleHint: 'RST' },
      ],
      'big_time'
    ),

    // 9. Crown Heights
    buildTieredTeam(
      'Crown Heights',
      'Crown Hts',
      '#f97316',
      '4-2-3-1',
      'Attacking',
      'MID',
      [],
      [
        { name: 'Conway',  pos: 'GK',  roleHint: 'GK' },
        { name: 'Dalton',  pos: 'LB',  roleHint: 'LB' },
        { name: 'Ellison', pos: 'DEF', roleHint: 'LCB' },
        { name: 'Foley',   pos: 'DEF', roleHint: 'RCB' },
        { name: 'Granger', pos: 'RB',  roleHint: 'RB' },
        { name: 'Hollis',  pos: 'MID', roleHint: 'LDM' },
        { name: 'Innes',   pos: 'MID', roleHint: 'RDM' },
        { name: 'Jarrett', pos: 'MID', roleHint: 'LAM' },
        { name: 'Kearney', pos: 'MID', roleHint: 'CAM' },
        { name: 'Lawson',  pos: 'MID', roleHint: 'RAM' },
        { name: 'Macintyre', pos: 'ATT', roleHint: 'ST' },
      ],
      'big_time'
    ),

    // --- TIER 3: 5 UNDERDOGS WITH 1-2 KEY STARS (~62-66 Rating) ---
    // 10. Ashford Town
    buildTieredTeam(
      'Ashford Town',
      'Ashford',
      '#ab47bc',
      '5-3-2',
      'Counter',
      'UNDERDOG',
      ['Wells', 'Drake'],
      [
        { name: 'Wells',  pos: 'GK',  roleHint: 'GK' },
        { name: 'Xavier', pos: 'LB',  roleHint: 'LWB' },
        { name: 'York',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Zane',   pos: 'DEF', roleHint: 'CB' },
        { name: 'Adler',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Boone',  pos: 'RB',  roleHint: 'RWB' },
        { name: 'Cruz',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Ember',  pos: 'MID', roleHint: 'CM' },
        { name: 'Fenn',   pos: 'MID', roleHint: 'RCM' },
        { name: 'Drake',  pos: 'ATT', roleHint: 'LST' },
        { name: 'Grant',  pos: 'ATT', roleHint: 'RST' },
      ],
      'big_time'
    ),

    // 11. Harbourview FC
    buildTieredTeam(
      'Harbourview FC',
      'Harbourview',
      '#94a3b8',
      '4-5-1',
      'Defensive',
      'UNDERDOG',
      ['Jarvis', 'Keene'],
      [
        { name: 'Holt',   pos: 'GK',  roleHint: 'GK' },
        { name: 'Ingram', pos: 'LB',  roleHint: 'LB' },
        { name: 'Keene',  pos: 'DEF', roleHint: 'LCB' },
        { name: 'Lloyd',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Mercer', pos: 'RB',  roleHint: 'RB' },
        { name: 'Nixon',  pos: 'MID', roleHint: 'LM' },
        { name: 'Paine',  pos: 'MID', roleHint: 'LDM' },
        { name: 'Jarvis', pos: 'MID', roleHint: 'CAM' },
        { name: 'Orton',  pos: 'MID', roleHint: 'RDM' },
        { name: 'Riggs',  pos: 'MID', roleHint: 'RM' },
        { name: 'Sloane', pos: 'ATT', roleHint: 'ST' },
      ],
      'big_time'
    ),

    // 12. Redcliffe Albion
    buildTieredTeam(
      'Redcliffe Albion',
      'Redcliffe',
      '#e11d48',
      '4-4-2',
      'Direct Play',
      'UNDERDOG',
      ['Mercer', 'Vance'],
      [
        { name: 'Archer',  pos: 'GK',  roleHint: 'GK' },
        { name: 'Beckett', pos: 'LB',  roleHint: 'LB' },
        { name: 'Vance',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Callow',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Duffy',   pos: 'RB',  roleHint: 'RB' },
        { name: 'Eller',   pos: 'MID', roleHint: 'LM' },
        { name: 'Flynn',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Gorman',  pos: 'MID', roleHint: 'RCM' },
        { name: 'Hobbs',   pos: 'MID', roleHint: 'RM' },
        { name: 'Mercer',  pos: 'ATT', roleHint: 'LST' },
        { name: 'Kearns',  pos: 'ATT', roleHint: 'RST' },
      ],
      'big_time'
    ),

    // 13. Greystone Athletic
    buildTieredTeam(
      'Greystone Athletic',
      'Greystone',
      '#64748b',
      '5-3-2',
      'SWOS Press',
      'UNDERDOG',
      ['Finch', 'Holt'],
      [
        { name: 'Holt',    pos: 'GK',  roleHint: 'GK' },
        { name: 'Irving',  pos: 'LB',  roleHint: 'LWB' },
        { name: 'Jagger',  pos: 'DEF', roleHint: 'LCB' },
        { name: 'Keegan',  pos: 'DEF', roleHint: 'CB' },
        { name: 'Loomis',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Miller',  pos: 'RB',  roleHint: 'RWB' },
        { name: 'Finch',   pos: 'MID', roleHint: 'CAM' },
        { name: 'Nevin',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Ogilvy',  pos: 'MID', roleHint: 'RCM' },
        { name: 'Penfold', pos: 'ATT', roleHint: 'LST' },
        { name: 'Quick',   pos: 'ATT', roleHint: 'RST' },
      ],
      'big_time'
    ),

    // 14. Blackwood Forest
    buildTieredTeam(
      'Blackwood Forest',
      'Blackwood',
      '#059669',
      '4-5-1',
      'Counter',
      'UNDERDOG',
      ['Thorne', 'Gallagher'],
      [
        { name: 'Riddle',    pos: 'GK',  roleHint: 'GK' },
        { name: 'Sinclair',  pos: 'LB',  roleHint: 'LB' },
        { name: 'Gallagher', pos: 'DEF', roleHint: 'LCB' },
        { name: 'Tillman',   pos: 'DEF', roleHint: 'RCB' },
        { name: 'Underhill', pos: 'RB',  roleHint: 'RB' },
        { name: 'Vickery',   pos: 'MID', roleHint: 'LM' },
        { name: 'Walsh',     pos: 'MID', roleHint: 'LDM' },
        { name: 'Yates',     pos: 'MID', roleHint: 'CAM' },
        { name: 'Zimmer',    pos: 'MID', roleHint: 'RDM' },
        { name: 'Thorne',    pos: 'ATT', roleHint: 'RW' },
        { name: 'Acton',     pos: 'ATT', roleHint: 'ST' },
      ],
      'big_time'
    ),

    // =============================================================
    // LEAGUE 2: UP AND COMERS (12 TEAMS - SCALED DOWN STATS)
    // =============================================================

    // --- PROMOTION CONTENDERS (~68-72 Rating) ---
    // 15. Oakwood Athletic
    buildTieredTeam(
      'Oakwood Athletic',
      'Oakwood',
      '#34d399',
      '4-4-2',
      'Balanced',
      'ELITE',
      [],
      [
        { name: 'Briggs',   pos: 'GK',  roleHint: 'GK' },
        { name: 'Calver',   pos: 'LB',  roleHint: 'LB' },
        { name: 'Dallon',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Ellery',   pos: 'DEF', roleHint: 'RCB' },
        { name: 'Fallow',   pos: 'RB',  roleHint: 'RB' },
        { name: 'Garrett',  pos: 'MID', roleHint: 'LM' },
        { name: 'Hawkins',  pos: 'MID', roleHint: 'LCM' },
        { name: 'Ivory',    pos: 'MID', roleHint: 'RCM' },
        { name: 'Jarvis',   pos: 'MID', roleHint: 'RM' },
        { name: 'Kelso',    pos: 'ATT', roleHint: 'LST' },
        { name: 'Locke',    pos: 'ATT', roleHint: 'RST' },
      ],
      'up_and_comers'
    ),

    // 16. Portside Rangers
    buildTieredTeam(
      'Portside Rangers',
      'Portside',
      '#38bdf8',
      '4-3-3',
      'Attacking',
      'ELITE',
      [],
      [
        { name: 'Macon',    pos: 'GK',  roleHint: 'GK' },
        { name: 'Nevin',    pos: 'LB',  roleHint: 'LB' },
        { name: 'Otis',     pos: 'DEF', roleHint: 'LCB' },
        { name: 'Penn',     pos: 'DEF', roleHint: 'RCB' },
        { name: 'Quinton',  pos: 'RB',  roleHint: 'RB' },
        { name: 'Ramsay',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Salinger', pos: 'MID', roleHint: 'CDM' },
        { name: 'Telford',  pos: 'MID', roleHint: 'RCM' },
        { name: 'Ulmer',    pos: 'ATT', roleHint: 'LW' },
        { name: 'Vail',     pos: 'ATT', roleHint: 'ST' },
        { name: 'Wylie',    pos: 'ATT', roleHint: 'RW' },
      ],
      'up_and_comers'
    ),

    // 17. Millwall Cross
    buildTieredTeam(
      'Millwall Cross',
      'Millwall Cr',
      '#fbbf24',
      '3-5-2',
      'SWOS Press',
      'ELITE',
      [],
      [
        { name: 'Yarbro',   pos: 'GK',  roleHint: 'GK' },
        { name: 'Alcott',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Bradford', pos: 'DEF', roleHint: 'CB' },
        { name: 'Collier',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Donovan',  pos: 'MID', roleHint: 'LWB' },
        { name: 'Elston',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Fowler',   pos: 'MID', roleHint: 'CAM' },
        { name: 'Gilroy',   pos: 'MID', roleHint: 'RCM' },
        { name: 'Hanley',   pos: 'MID', roleHint: 'RWB' },
        { name: 'Ingram',   pos: 'ATT', roleHint: 'LST' },
        { name: 'Jepson',   pos: 'ATT', roleHint: 'RST' },
      ],
      'up_and_comers'
    ),

    // 18. Ironforge City
    buildTieredTeam(
      'Ironforge City',
      'Ironforge',
      '#f87171',
      '4-2-3-1',
      'High Press',
      'ELITE',
      [],
      [
        { name: 'Kemp',     pos: 'GK',  roleHint: 'GK' },
        { name: 'Lomax',    pos: 'LB',  roleHint: 'LB' },
        { name: 'Merrick',  pos: 'DEF', roleHint: 'LCB' },
        { name: 'Naylor',   pos: 'DEF', roleHint: 'RCB' },
        { name: 'Oswin',    pos: 'RB',  roleHint: 'RB' },
        { name: 'Pryor',    pos: 'MID', roleHint: 'LDM' },
        { name: 'Quigley',  pos: 'MID', roleHint: 'RDM' },
        { name: 'Rawlings', pos: 'MID', roleHint: 'LAM' },
        { name: 'Standish', pos: 'MID', roleHint: 'CAM' },
        { name: 'Tolliver', pos: 'MID', roleHint: 'RAM' },
        { name: 'Upson',    pos: 'ATT', roleHint: 'ST' },
      ],
      'up_and_comers'
    ),

    // --- MID-LEVEL UP & COMERS (~57-63 Rating) ---
    // 19. Valley United
    buildTieredTeam(
      'Valley United',
      'Valley Utd',
      '#a78bfa',
      '4-4-2',
      'Direct Play',
      'MID',
      [],
      [
        { name: 'Vick',     pos: 'GK',  roleHint: 'GK' },
        { name: 'Weller',   pos: 'LB',  roleHint: 'LB' },
        { name: 'Yeoman',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Almond',   pos: 'DEF', roleHint: 'RCB' },
        { name: 'Barton',   pos: 'RB',  roleHint: 'RB' },
        { name: 'Crisp',    pos: 'MID', roleHint: 'LM' },
        { name: 'Doran',    pos: 'MID', roleHint: 'LCM' },
        { name: 'Emery',    pos: 'MID', roleHint: 'RCM' },
        { name: 'Forde',    pos: 'MID', roleHint: 'RM' },
        { name: 'Gell',     pos: 'ATT', roleHint: 'LST' },
        { name: 'Haddon',   pos: 'ATT', roleHint: 'RST' },
      ],
      'up_and_comers'
    ),

    // 20. Brookline FC
    buildTieredTeam(
      'Brookline FC',
      'Brookline',
      '#4ade80',
      '5-3-2',
      'Counter',
      'MID',
      [],
      [
        { name: 'Ingalls',  pos: 'GK',  roleHint: 'GK' },
        { name: 'Jevons',   pos: 'LB',  roleHint: 'LWB' },
        { name: 'Knott',    pos: 'DEF', roleHint: 'LCB' },
        { name: 'Larkin',   pos: 'DEF', roleHint: 'CB' },
        { name: 'Mayhew',   pos: 'DEF', roleHint: 'RCB' },
        { name: 'Newcomb',  pos: 'RB',  roleHint: 'RWB' },
        { name: 'Ormond',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Parrish',  pos: 'MID', roleHint: 'CM' },
        { name: 'Quince',   pos: 'MID', roleHint: 'RCM' },
        { name: 'Rolfe',    pos: 'ATT', roleHint: 'LST' },
        { name: 'Spence',   pos: 'ATT', roleHint: 'RST' },
      ],
      'up_and_comers'
    ),

    // 21. Hilltop Wanderers
    buildTieredTeam(
      'Hilltop Wanderers',
      'Hilltop',
      '#fb923c',
      '3-4-3',
      'SWOS Total',
      'MID',
      [],
      [
        { name: 'Tann',     pos: 'GK',  roleHint: 'GK' },
        { name: 'Updike',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Vowles',   pos: 'DEF', roleHint: 'CB' },
        { name: 'Wager',    pos: 'DEF', roleHint: 'RCB' },
        { name: 'Akers',    pos: 'MID', roleHint: 'LM' },
        { name: 'Binks',    pos: 'MID', roleHint: 'LCM' },
        { name: 'Codd',     pos: 'MID', roleHint: 'RCM' },
        { name: 'Duggan',   pos: 'MID', roleHint: 'RM' },
        { name: 'Eldon',    pos: 'ATT', roleHint: 'LW' },
        { name: 'Frick',    pos: 'ATT', roleHint: 'ST' },
        { name: 'Grist',    pos: 'ATT', roleHint: 'RW' },
      ],
      'up_and_comers'
    ),

    // 22. Docklands Celtic
    buildTieredTeam(
      'Docklands Celtic',
      'Docklands',
      '#2dd4bf',
      '4-5-1',
      'Defensive',
      'MID',
      [],
      [
        { name: 'Horne',    pos: 'GK',  roleHint: 'GK' },
        { name: 'Iles',     pos: 'LB',  roleHint: 'LB' },
        { name: 'Jebb',     pos: 'DEF', roleHint: 'LCB' },
        { name: 'Keats',    pos: 'DEF', roleHint: 'RCB' },
        { name: 'Lunt',     pos: 'RB',  roleHint: 'RB' },
        { name: 'Malloy',   pos: 'MID', roleHint: 'LM' },
        { name: 'Nagle',    pos: 'MID', roleHint: 'LDM' },
        { name: 'Oakes',    pos: 'MID', roleHint: 'CAM' },
        { name: 'Platt',    pos: 'MID', roleHint: 'RDM' },
        { name: 'Quance',   pos: 'MID', roleHint: 'RM' },
        { name: 'Rudd',     pos: 'ATT', roleHint: 'ST' },
      ],
      'up_and_comers'
    ),

    // --- SMALLER UNDERDOGS WITH STANDOUT STARS (~48-54 Rating, Stars ~72-76) ---
    // 23. Meadow Vale
    buildTieredTeam(
      'Meadow Vale',
      'Meadow Vale',
      '#c084fc',
      '5-3-2',
      'Counter',
      'UNDERDOG',
      ['Baxter', 'ONeill'],
      [
        { name: 'ONeill',   pos: 'GK',  roleHint: 'GK' },
        { name: 'Smyth',    pos: 'LB',  roleHint: 'LWB' },
        { name: 'Tighe',    pos: 'DEF', roleHint: 'LCB' },
        { name: 'Unwin',    pos: 'DEF', roleHint: 'CB' },
        { name: 'Vickers',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Whelan',   pos: 'RB',  roleHint: 'RWB' },
        { name: 'Yates',    pos: 'MID', roleHint: 'LCM' },
        { name: 'Acton',    pos: 'MID', roleHint: 'CM' },
        { name: 'Boyle',    pos: 'MID', roleHint: 'RCM' },
        { name: 'Baxter',   pos: 'ATT', roleHint: 'LST' },
        { name: 'Cavan',    pos: 'ATT', roleHint: 'RST' },
      ],
      'up_and_comers'
    ),

    // 24. Sunbury Rovers
    buildTieredTeam(
      'Sunbury Rovers',
      'Sunbury',
      '#93c5fd',
      '4-5-1',
      'Defensive',
      'UNDERDOG',
      ['Fletcher', 'Sterling'],
      [
        { name: 'Deane',    pos: 'GK',  roleHint: 'GK' },
        { name: 'Egan',     pos: 'LB',  roleHint: 'LB' },
        { name: 'Sterling', pos: 'DEF', roleHint: 'LCB' },
        { name: 'Gough',    pos: 'DEF', roleHint: 'RCB' },
        { name: 'Harte',    pos: 'RB',  roleHint: 'RB' },
        { name: 'Ivory',    pos: 'MID', roleHint: 'LM' },
        { name: 'Joyner',   pos: 'MID', roleHint: 'LDM' },
        { name: 'Fletcher', pos: 'MID', roleHint: 'CAM' },
        { name: 'Keogh',    pos: 'MID', roleHint: 'RDM' },
        { name: 'Larkin',   pos: 'MID', roleHint: 'RM' },
        { name: 'Maguire',  pos: 'ATT', roleHint: 'ST' },
      ],
      'up_and_comers'
    ),

    // 25. Heathfield Town
    buildTieredTeam(
      'Heathfield Town',
      'Heathfield',
      '#fdba74',
      '4-4-2',
      'Balanced',
      'UNDERDOG',
      ['Novak', 'Calder'],
      [
        { name: 'Nolan',    pos: 'GK',  roleHint: 'GK' },
        { name: 'Orr',      pos: 'LB',  roleHint: 'LB' },
        { name: 'Calder',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Phelan',   pos: 'DEF', roleHint: 'RCB' },
        { name: 'Quinn',    pos: 'RB',  roleHint: 'RB' },
        { name: 'Rooney',   pos: 'MID', roleHint: 'LM' },
        { name: 'Scally',   pos: 'MID', roleHint: 'LCM' },
        { name: 'Tobin',    pos: 'MID', roleHint: 'RCM' },
        { name: 'Urquhart', pos: 'MID', roleHint: 'RM' },
        { name: 'Novak',    pos: 'ATT', roleHint: 'LST' },
        { name: 'Walsh',    pos: 'ATT', roleHint: 'RST' },
      ],
      'up_and_comers'
    ),

    // 26. Bayview Park
    buildTieredTeam(
      'Bayview Park',
      'Bayview',
      '#86efac',
      '3-5-2',
      'Direct Play',
      'UNDERDOG',
      ['Lindqvist', 'Morales'],
      [
        { name: 'Young',     pos: 'GK',  roleHint: 'GK' },
        { name: 'Morales',   pos: 'DEF', roleHint: 'LCB' },
        { name: 'Barrett',   pos: 'DEF', roleHint: 'CB' },
        { name: 'Connolly',  pos: 'DEF', roleHint: 'RCB' },
        { name: 'Duffy',     pos: 'MID', roleHint: 'LWB' },
        { name: 'Ennis',     pos: 'MID', roleHint: 'LCM' },
        { name: 'Foley',     pos: 'MID', roleHint: 'CAM' },
        { name: 'Gaffney',   pos: 'MID', roleHint: 'RCM' },
        { name: 'Lindqvist', pos: 'MID', roleHint: 'RWB' },
        { name: 'Hanlon',    pos: 'ATT', roleHint: 'LST' },
        { name: 'Irwin',     pos: 'ATT', roleHint: 'RST' },
      ],
      'up_and_comers'
    ),
  ];
}

/**
 * Generate a Berger round-robin schedule for a single league
 */
function generateSingleLeagueFixtures(teams: Team[], prefix: string, leagueId: LeagueId): Fixture[] {
  const n = teams.length;
  if (n < 2) return [];
  const teamIds = teams.map((t) => t.id);
  const rounds: Fixture[] = [];

  const numRoundsFirstHalf = n - 1;
  const temp = [...teamIds];

  for (let round = 1; round <= numRoundsFirstHalf; round++) {
    for (let i = 0; i < n / 2; i++) {
      const home = temp[i];
      const away = temp[n - 1 - i];
      const [h, a] = (round + i) % 2 === 0 ? [home, away] : [away, home];
      rounds.push({
        id: `${prefix}_r${round}_${h}_vs_${a}`,
        round,
        homeTeamId: h,
        awayTeamId: a,
        played: false,
        homeScore: 0,
        awayScore: 0,
        scorers: [],
        leagueId,
      });
    }
    const last = temp.pop()!;
    temp.splice(1, 0, last);
  }

  // Second half: reverse fixtures
  const firstHalfMatches = [...rounds];
  for (const m of firstHalfMatches) {
    rounds.push({
      id: `${prefix}_r${m.round + numRoundsFirstHalf}_${m.awayTeamId}_vs_${m.homeTeamId}`,
      round: m.round + numRoundsFirstHalf,
      homeTeamId: m.awayTeamId,
      awayTeamId: m.homeTeamId,
      played: false,
      homeScore: 0,
      awayScore: 0,
      scorers: [],
      leagueId,
    });
  }

  return rounds;
}

/**
 * Generate full championship schedules for both Big Time League and Up and Comers
 */
export function generateFixtures(teams: Team[]): Fixture[] {
  const bigTimeTeams = teams.filter((t) => (t.leagueId || 'big_time') === 'big_time');
  const upAndComersTeams = teams.filter((t) => t.leagueId === 'up_and_comers');

  const btFixtures = generateSingleLeagueFixtures(bigTimeTeams, 'bt', 'big_time');
  const uacFixtures = generateSingleLeagueFixtures(upAndComersTeams, 'uac', 'up_and_comers');

  return [...btFixtures, ...uacFixtures];
}

/**
 * Simulate an AI vs AI match realistically
 */
export function simulateMatch(home: Team, away: Team, switchChance: number = 0.75): { homeScore: number; awayScore: number; scorers: MatchScorer[] } {
  // If formations are identical, away team AI has a configured chance to adapt to a counter formation!
  adaptOppositionFormationIfIdentical(away, home.formation, switchChance);

  const homeTactic = TACTICS[home.tactic] || TACTICS['Balanced'];
  const awayTactic = TACTICS[away.tactic] || TACTICS['Balanced'];

  // Home advantage (+8%)
  const homeAtk = home.attackRating() * homeTactic.atk * 1.08;
  const homeDef = home.defenseRating() * homeTactic.def * 1.08;

  const awayAtk = away.attackRating() * awayTactic.atk;
  const awayDef = away.defenseRating() * awayTactic.def;

  // Expected goals (Poisson distribution approximation)
  const homeLambda = Math.max(0.2, (homeAtk / (awayDef + 15)) * 1.45);
  const awayLambda = Math.max(0.2, (awayAtk / (homeDef + 15)) * 1.25);

  function sampleGoals(lambda: number): number {
    let l = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > l);
    return Math.min(7, k - 1);
  }

  const homeScore = sampleGoals(homeLambda);
  const awayScore = sampleGoals(awayLambda);
  const scorers: MatchScorer[] = [];

  function pickScorer(team: Team, isHome: boolean, goalIndex: number) {
    const atts = team.byPosition('ATT');
    const mids = team.byPosition('MID');
    const defs = team.byPosition('DEF');

    // 65% chance forward, 30% midfielder, 5% defender
    const r = Math.random();
    let scorer: Player;
    if (r < 0.65 && atts.length > 0) {
      scorer = atts[Math.floor(Math.random() * atts.length)];
    } else if (r < 0.95 && mids.length > 0) {
      scorer = mids[Math.floor(Math.random() * mids.length)];
    } else if (defs.length > 0) {
      scorer = defs[Math.floor(Math.random() * defs.length)];
    } else {
      scorer = team.squad[0];
    }

    scorer.seasonGoals++;
    const minute = Math.min(90, Math.max(2, Math.floor(10 + Math.random() * 78)));
    scorers.push({
      playerShortName: scorer.shortName(),
      teamShortName: team.shortName,
      minute,
      isHome,
    });
  }

  for (let i = 0; i < homeScore; i++) {
    pickScorer(home, true, i);
  }
  for (let i = 0; i < awayScore; i++) {
    pickScorer(away, false, i);
  }

  // Sort scorers by minute
  scorers.sort((a, b) => a.minute - b.minute);

  // Apply to league table
  home.played++;
  away.played++;
  home.gf += homeScore;
  home.ga += awayScore;
  away.gf += awayScore;
  away.ga += homeScore;

  if (homeScore > awayScore) {
    home.won++;
    away.lost++;
  } else if (awayScore > homeScore) {
    away.won++;
    home.lost++;
  } else {
    home.drawn++;
    away.drawn++;
  }

  return { homeScore, awayScore, scorers };
}

const STORAGE_KEY = 'ascii_football_mgr_2026_v5';

export function saveSeasonState(data: LeagueSeasonData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save season to localStorage', err);
  }
}

export function loadSeasonState(): LeagueSeasonData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.teams && Array.isArray(parsed.teams)) {
      if (parsed.teams.length < 26) {
        // Upgrade needed to 26-team 2-league structure
        return null;
      }
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load season state', err);
    return null;
  }
}

export function clearSeasonState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function initNewSeason(): { teams: Team[]; fixtures: Fixture[] } {
  const teams = buildDefaultTeams();
  const fixtures = generateFixtures(teams);
  return { teams, fixtures };
}
