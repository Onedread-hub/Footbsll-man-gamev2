import { Player, Team } from '../types/football';
import { addTrainingTokens } from './trainingTokensEngine';

export interface EncounterEffect {
  statModified?: 'pace' | 'shooting' | 'passing' | 'tackling' | 'strength' | 'dribbling' | 'positioning' | 'control' | 'stamina';
  statChange?: number;
  tokenReward?: number;
  suspensionMatches?: number;
  conditionChange?: number;
}

export interface RandomEncounter {
  id: string;
  type: 'positive' | 'negative';
  category: 'drugs_bust' | 'car_crash' | 'doping_test' | 'newborn_baby' | 'sponsorship' | 'model_romance' | 'home_accident' | 'heroic_deed' | 'tactical_breakthrough' | 'casino_brawl';
  newspaperName: string;
  badgeLabel: string;
  headline: string;
  subheadline: string;
  storyText: string;
  quote: string;
  targetPlayer: {
    id: string;
    name: string;
    position: string;
    number: number;
    rating: number;
  };
  clubName: string;
  effects: EncounterEffect;
  dateString: string;
}

const ENCOUNTER_STORAGE_KEY = 'ascii_football_active_encounters_2026';

export function loadStoredEncounters(): RandomEncounter[] {
  try {
    const raw = localStorage.getItem(ENCOUNTER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading encounters', err);
  }
  return [];
}

export function saveStoredEncounters(encounters: RandomEncounter[]): void {
  try {
    localStorage.setItem(ENCOUNTER_STORAGE_KEY, JSON.stringify(encounters.slice(-20)));
  } catch (err) {
    console.error('Failed saving encounters', err);
  }
}

/**
 * Generate a random positive or negative event for the user's club
 */
export function rollRandomEncounter(team: Team, forceType?: 'positive' | 'negative'): RandomEncounter | null {
  if (!team || team.squad.length === 0) return null;

  // Pick an outfield or star player
  const eligiblePlayers = team.squad.filter((p) => p.position !== 'GK');
  const candidatePool = eligiblePlayers.length > 0 ? eligiblePlayers : team.squad;
  const target = candidatePool[Math.floor(Math.random() * candidatePool.length)];

  const isPositive = forceType ? forceType === 'positive' : Math.random() < 0.50;
  const now = new Date();
  const dateString = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (!isPositive) {
    // NEGATIVE ENCOUNTERS
    const negScenarios = [
      {
        category: 'drugs_bust' as const,
        newspaperName: 'THE SUNDAY TABLOID',
        badgeLabel: '🚨 POLICE DAWN RAID & PRISON SENTENCE',
        headline: `${target.name.toUpperCase()} JAILED FOR 4 MONTHS AFTER DRAMATIC DAWN DRUGS BUST!`,
        subheadline: `Scotland Yard raid nets major illicit haul at luxury penthouse; judge hands down immediate 4-month prison sentence (16 match ban).`,
        storyText: `Sensational front-page shock as ${team.name}'s first-team star ${target.name} (${target.position}, squad #${target.number}) was convicted at Crown Court following an undercover dawn raid. The judge sentenced the footballer to four months in prison, triggering an emergency 16-match FA suspension and substantial financial club fine.`,
        quote: `"This custodial sentence sends an unmistakable warning: professional athletes are not above the law," declared the sentencing magistrate.`,
        effects: {
          suspensionMatches: 16, // 4 months custodial sentence (~16 matchdays)
          conditionChange: -40,
          tokenReward: -35,
        },
      },
      {
        category: 'car_crash' as const,
        newspaperName: 'THE DAILY CHRONICLE',
        badgeLabel: '🏎️ 3AM SUPERCAR SMASH',
        headline: `${target.name.toUpperCase()} WRITES OFF SUPERCAR & INJURES SELF IN MOTORWAY CRASH!`,
        subheadline: `High-performance supercar totaled on slip-road; player suffers acute whiplash, fractured collarbone & bruised ribs.`,
        storyText: `Emergency services were called to the M6 slip-road at 3:15am after ${team.name} star ${target.name} lost control of his 600-horsepower sports vehicle in torrential rain. Club doctors confirmed significant rib trauma and severe whiplash, sidelining him for 3 weeks and dealing a serious blow to his explosive sprint pace.`,
        quote: `"The vehicle was wrapped around the crash barrier like an accordion. We are blessed he walked away with his life," reported the attending paramedic.`,
        effects: {
          suspensionMatches: 3,
          statModified: 'pace' as const,
          statChange: -4,
          conditionChange: -35,
        },
      },
      {
        category: 'doping_test' as const,
        newspaperName: 'FOOTBALL INSIDER WEEKLY',
        badgeLabel: '🧪 FA DOPING BAN SHOCK',
        headline: `FA DOPING PROTOCOL: ${target.name.toUpperCase()} FAILS SURPRISE DRUG TEST!`,
        subheadline: `Prohibited stimulant metabolites detected in post-match screening; FA disciplinary panel slaps player with 4-match ban.`,
        storyText: `A bombshell statement from the Football Association confirmed that ${target.name} failed an unannounced routine post-match doping test. A prohibited metabolic compound was detected in his 'A' sample, resulting in an immediate 4-match suspension while the club appeals contaminated nutritional supplements.`,
        quote: `"Our client has never knowingly ingested any performance-enhancing compound. We are having every supplement batch laboratory tested," stated the player's QC.`,
        effects: {
          suspensionMatches: 4,
          conditionChange: -25,
        },
      },
      {
        category: 'home_accident' as const,
        newspaperName: 'THE METROPOLITAN GAZETTE',
        badgeLabel: '🛋️ DOMESTIC DIY MISHAP',
        headline: `FREAK DOMESTIC ACCIDENT: ${target.name.toUpperCase()} STRAINS LUMBAR MUSCLES!`,
        subheadline: `Key player attempts solo furniture removal down stairs; ruled out for next fixture with acute back spasms.`,
        storyText: `In an agonizing mishap at home, ${target.name} slipped while attempting to maneuver an antique Chesterfield sofa, suffering severe lumbar spasms. He will miss the next competitive fixture to undergo intensive ice compression and physiotherapy.`,
        quote: `"Next time I will pay the delivery men their twenty quid," groaned the sheepish footballer from the treatment table.`,
        effects: {
          suspensionMatches: 1,
          statModified: 'strength' as const,
          statChange: -2,
          conditionChange: -20,
        },
      },
      {
        category: 'casino_brawl' as const,
        newspaperName: 'THE RED TOP EXPOSÉ',
        badgeLabel: '🎰 4AM VIP NIGHTCLUB BUST-UP',
        headline: `FISTS FLY AT DAWN AS ${target.name.toUpperCase()} CAUGHT IN VIP CASINO BRAWL!`,
        subheadline: `High-stakes poker confrontation turns physical; club slaps player with disciplinary fine and 2-match internal ban.`,
        storyText: `CCTV footage captured ${target.name} in a furious altercation with high-stakes casino patrons in Mayfair in the early hours. Managerial chiefs acted decisively, levying an emergency two-week wage fine and ruling the player out for 2 matches.`,
        quote: `"A professional footballer should be sleeping, not trading punches at 4am before a derby," fumed the club chairman.`,
        effects: {
          suspensionMatches: 2,
          tokenReward: -30,
          conditionChange: -20,
        },
      },
    ];

    const pick = negScenarios[Math.floor(Math.random() * negScenarios.length)];
    const enc: RandomEncounter = {
      id: `enc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'negative',
      category: pick.category,
      newspaperName: pick.newspaperName,
      badgeLabel: pick.badgeLabel,
      headline: pick.headline,
      subheadline: pick.subheadline,
      storyText: pick.storyText,
      quote: pick.quote,
      targetPlayer: {
        id: target.id,
        name: target.name,
        position: target.position,
        number: target.number,
        rating: target.rating(),
      },
      clubName: team.name,
      effects: pick.effects,
      dateString,
    };

    applyEncounterEffects(target, enc.effects);
    return enc;
  } else {
    // POSITIVE ENCOUNTERS
    const posScenarios = [
      {
        category: 'newborn_baby' as const,
        newspaperName: 'THE SPORTING SENTINEL',
        badgeLabel: '👶 PATERNITY GLORY',
        headline: `BABY BOY BLESSED! ${target.name.toUpperCase()} WELCOMES NEW ARRIVAL!`,
        subheadline: `Proud father vows to dedicate next screamers to newborn; squad spirit & physical power surges!`,
        storyText: `Joyous scenes at the maternity ward as ${target.name} and his partner celebrated the safe birth of baby Arthur (8lbs 2oz). Teammates rallied with flowers, and the beaming father arrived at training overflowing with newfound vigor, boosting his physical strength and stamina reserves!`,
        quote: `"Holding my child in my arms gave me superhuman strength. I feel like I could run through brick walls for this club now!" beamed ${target.name}.`,
        effects: {
          statModified: 'strength' as const,
          statChange: 4,
          conditionChange: 20,
        },
      },
      {
        category: 'sponsorship' as const,
        newspaperName: 'GLOBAL SOCCER BUSINESS',
        badgeLabel: '💰 MEGA COMMERCIAL DEAL',
        headline: `GLOBAL BOOT DEAL: SPORTING BEHEMOTH SIGNS ${target.name.toUpperCase()}!`,
        subheadline: `Lucrative footwear contract injects financial windfall into club academy; custom bespoke cleats gifted.`,
        storyText: `Sportswear giant Nike-Continental announced a flagship footwear endorsement contract for ${team.name}'s standout ${target.name}. The multi-year partnership includes a direct token development grant for the club's player training facilities, plus bespoke boots that enhance ball control.`,
        quote: `"The boy has immaculate technique. We are designing a customized soleplate engineered purely for his turns," confirmed the brand's executive.`,
        effects: {
          tokenReward: 50,
          statModified: 'control' as const,
          statChange: 3,
        },
      },
      {
        category: 'model_romance' as const,
        newspaperName: 'CELEBRITY & SPORT TODAY',
        badgeLabel: '💃 GLAMOUR COUPLE OF THE YEAR',
        headline: `PAGE 3 GLAMOUR: ${target.name.toUpperCase()} DATING RUNWAY SUPERMODEL!`,
        subheadline: `Pictured together at film gala; striker on cloud nine with confidence soaring to stratospheric heights!`,
        storyText: `Paparazzi flashes lit up the red carpet as ${target.name} escorted international supermodel Valentina Rossi to a charity gala. Insiders say the romance has elevated the forward's swagger to unprecedented levels, translating into electric flair and fearless shooting on the training pitch.`,
        quote: `"When you feel this good off the pitch, putting the ball in the top corner on Saturday feels effortless," smiled the player.`,
        effects: {
          statModified: 'shooting' as const,
          statChange: 3,
          conditionChange: 15,
        },
      },
      {
        category: 'tactical_breakthrough' as const,
        newspaperName: 'THE COACHING REVIEW',
        badgeLabel: '🧭 TACTICAL MASTERCLASS',
        headline: `LEGEND MENTORSHIP: 1980s ICON VISITS TO DRILL ${target.name.toUpperCase()}!`,
        subheadline: `Secret afternoon masterclass in spatial awareness yields quantum leap in tactical positioning & vision.`,
        storyText: `Sensible Soccer hall-of-famer visited the club ground for an intensive private session with ${target.name}, breaking down body shape, touchline marking, and anticipating opposition runner channels. The player displayed immaculate defensive/offensive positioning in subsequent practice games.`,
        quote: `"Football is played in the mind before the boots. He learned five years of spatial awareness in two hours today," noted the legend.`,
        effects: {
          statModified: 'positioning' as const,
          statChange: 4,
        },
      },
      {
        category: 'heroic_deed' as const,
        newspaperName: 'THE EVENING HERALD',
        badgeLabel: '🐕 LOCAL HERO HONOUR',
        headline: `HEROIC RESCUE: ${target.name.toUpperCase()} DIVES INTO RIVER TO SAVE STRANDED PUP!`,
        subheadline: `Brave footballer acclaimed by city mayor; local businesses shower team with community training grants.`,
        storyText: `Walking home after training, ${target.name} leaped into the chilly river to pull a distressed golden retriever puppy to safety. The heartwarming rescue captured national affection, earning him a community bravery medal and a generous commercial sponsorship donation for the squad's academy!`,
        quote: `"I didn't think twice about my phone in my pocket—I just saw the little dog struggling and went in," recalled the humble hero.`,
        effects: {
          tokenReward: 35,
          statModified: 'dribbling' as const,
          statChange: 2,
        },
      },
    ];

    const pick = posScenarios[Math.floor(Math.random() * posScenarios.length)];
    const enc: RandomEncounter = {
      id: `enc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'positive',
      category: pick.category,
      newspaperName: pick.newspaperName,
      badgeLabel: pick.badgeLabel,
      headline: pick.headline,
      subheadline: pick.subheadline,
      storyText: pick.storyText,
      quote: pick.quote,
      targetPlayer: {
        id: target.id,
        name: target.name,
        position: target.position,
        number: target.number,
        rating: target.rating(),
      },
      clubName: team.name,
      effects: pick.effects,
      dateString,
    };

    applyEncounterEffects(target, enc.effects);
    return enc;
  }
}

/**
 * Mutate player state based on encounter consequences
 */
export function applyEncounterEffects(player: Player, effects: EncounterEffect) {
  if (effects.suspensionMatches && effects.suspensionMatches > 0) {
    player.suspendedMatches = (player.suspendedMatches || 0) + effects.suspensionMatches;
  }

  if (effects.statModified && effects.statChange) {
    const current = (player[effects.statModified] as number) || 60;
    const updated = Math.max(15, Math.min(99, current + effects.statChange));
    (player[effects.statModified] as number) = updated;
  }

  if (effects.conditionChange) {
    player.condition = Math.max(25, Math.min(100, (player.condition || 100) + effects.conditionChange));
  }

  if (effects.tokenReward && effects.tokenReward !== 0) {
    addTrainingTokens(effects.tokenReward);
  }
}

/**
 * Decrement any active suspensions across squad after matchday completes
 */
export function processSquadSuspensionsAfterMatch(squad: Player[]): string[] {
  const expiredSuspensionNotices: string[] = [];
  for (const p of squad) {
    if (p.suspendedMatches && p.suspendedMatches > 0) {
      p.suspendedMatches--;
      if (p.suspendedMatches === 0) {
        p.activeEncounter = undefined;
        expiredSuspensionNotices.push(`${p.name} has served his suspension and is now available for selection!`);
      }
    }
  }
  return expiredSuspensionNotices;
}
