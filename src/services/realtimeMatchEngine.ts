import { Team, Player, MatchScorer, MatchStats, FORMATIONS, FormationName, adaptOppositionFormationIfIdentical } from '../types/football';
import { generateSWOSTactic, SWOSTacticData } from './swosTacticsEngine';
import { sound } from './audio';
import { InputState } from './inputEngine';
import { evaluateTackle, describeFoul, FoulVerdict, TacklerSnapshot, VictimSnapshot } from './refereeEngine';

// Expanded grand pitch dimensions (1800x1080) for authentic tactical spacing, wing play & true offside lines
export const PITCH_W = 1800;
export const PITCH_H = 1080;
export const GOAL_Y_TOP = 465;
export const GOAL_Y_BOTTOM = 615;
export const GOAL_DEPTH = 36;
export const CROSSBAR_HEIGHT = 65;

export interface RealtimePlayer {
  id: string;
  name: string;
  shortName: string;
  number: number;
  position: 'GK' | 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT';
  role: string;
  baseRoleX: number;
  baseRoleY: number;
  isHome: boolean;
  baseTeam: Team;
  playerData: Player;

  // Real-time spatial state
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  targetX: number;
  targetY: number;

  // Attributes scaled for real-time
  speed: number;
  baseSpeed: number;
  stamina: number;
  strength: number;
  control: number;
  weight: number;
  dribbling: number;
  positioning: number;
  attack: number;
  defence: number;
  gkAwareness: number;
  gkReach: number;
  gkJumping: number;
  gkStyle: 'attacking' | 'defensive';
  isRushing: boolean;
  gkRushTargetX: number;
  gkRushTargetY: number;
  gkStrandedTimer: number;

  // Animation & State
  isUser: boolean;
  isKicking: number;
  isSliding: number;
  isStunned: number;
  isDiving: number;
  gkHoldTimer: number;
  wasCarrier: boolean;
  isDashing: number;

  // Commanded press & defensive states
  isCommandPressed: boolean;
  jockeyTimer: number;

  // Charging shot/pass
  chargePower: number;
  chargingType: 'shoot' | 'lob' | 'pass' | 'precision' | 'through' | null;

  // Physics — player mass for collision separation
  mass: number;
  coneAngle: number;
  coneRange: number;

  // Card state (foul system)
  yellowCards: number;
  redCards: number;
  isSentOff: boolean;
}

export interface RealtimeBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  curve: number;
  isKnuckle: boolean;
  carrier: RealtimePlayer | null;
  lastCarrier: RealtimePlayer | null;
  pickupCooldownCarrier: RealtimePlayer | null;
  pickupCooldownTimer: number;
  landingX: number;
  landingY: number;
  shotType: 'regular' | 'finesse' | 'knuckle' | 'chip' | 'lob' | 'through' | 'precision' | null;
  lastTouchTeam: 'home' | 'away' | null;
  lastTouchPlayer: RealtimePlayer | null;
  deflectedBehindByDefense?: boolean;
  saveAttemptedGkId?: string | null;
}

export interface ActivePassOffside {
  passerId: string;
  isHomeAttacking: boolean;
  offsidePlayerIds: Set<string>;
  offsideLineX: number;
  ballOriginX: number;
  ballOriginY: number;
}

export class RealtimeMatch {
  public home: Team;
  public away: Team;
  public userIsHome: boolean;
  public userTeam: Team;
  public isFriendly: boolean = false;

  public homeScore: number = 0;
  public awayScore: number = 0;
  public lastGoalTeam: 'home' | 'away' | null = null;
  public matchSeconds: number = 0;
  public isHalfTime: boolean = false;
  public isFullTime: boolean = false;
  public scorers: MatchScorer[] = [];
  public matchLog: string[] = [];

  public gameSpeed: number = 0.82;

  // Entities
  public ball: RealtimeBall;
  public players: RealtimePlayer[] = [];
  public activeUserPlayer: RealtimePlayer | null = null;
  public commandPressPlayerId: string | null = null;

  // Foul & Card System
  public homeYellowCards: number = 0;
  public awayYellowCards: number = 0;
  public homeRedCards: number = 0;
  public awayRedCards: number = 0;
  public lastFoulDescription: string = '';

  // Match flow
  public state: 'play' | 'goal' | 'kickoff' | 'corner' | 'throwin' | 'goalkick' | 'freekick' | 'foulpause' = 'kickoff';
  public stateTimer: number = 0;
   public pendingFoulTimer: number = 0;
  public pendingFoulX: number = PITCH_W / 2;
  public pendingFoulY: number = PITCH_H / 2;
  public pendingFoulVictimIsHome: boolean = true;
  public pendingFoulVictimId: string | null = null;
  public pendingFoulTacklerId: string | null = null;
  public goalScorer: string | null = null;
  public bannerText: string = 'KICK OFF!';
  public bannerTimer: number = 100;
  public cornerSideIsTop: boolean = false;
  public throwInIsTop: boolean = false;

  // Offside Rule System
  public activePassOffside: ActivePassOffside | null = null;
  public offsideVisualTimer: number = 0;
  public offsideVisualX: number = 0;
  public homeAttackingOffsideLineX: number = PITCH_W * 0.72;
  public awayAttackingOffsideLineX: number = PITCH_W * 0.28;
  public currentOffsideLineX: number = PITCH_W / 2;

  // Statistics
  public stats: MatchStats = {
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homePassesCompleted: 0,
    awayPassesCompleted: 0,
    homeTacklesWon: 0,
    awayTacklesWon: 0,
    homePossessionTicks: 0,
    awayPossessionTicks: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeOffsides: 0,
    awayOffsides: 0,
    homeCorners: 0,
    awayCorners: 0,
    homeThrowIns: 0,
    awayThrowIns: 0,
  };

  constructor(
    home: Team,
    away: Team,
    userIsHome: boolean = true,
    isFriendly: boolean = false,
    aiAdaptChance: number = 0.75
  ) {
    this.home = home;
    this.away = away;
    this.userIsHome = userIsHome;
    this.userTeam = userIsHome ? home : away;
    this.isFriendly = isFriendly;

    this.ball = {
      x: PITCH_W / 2,
      y: PITCH_H / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      curve: 0,
      isKnuckle: false,
      carrier: null,
      lastCarrier: null,
      pickupCooldownCarrier: null,
      pickupCooldownTimer: 0,
      landingX: PITCH_W / 2,
      landingY: PITCH_H / 2,
      shotType: null,
      lastTouchTeam: 'home',
      lastTouchPlayer: null,
      saveAttemptedGkId: null,
    };

    const aiTeam = userIsHome ? this.away : this.home;
    const opponentFormation = this.userTeam.formation;
    const adaptResult = adaptOppositionFormationIfIdentical(aiTeam, opponentFormation, aiAdaptChance);
    if (adaptResult && adaptResult.switched) {
      this.bannerText = `AI TACTICAL COUNTER: ${aiTeam.shortName} SWITCHED TO ${adaptResult.newFormation}!`;
      this.bannerTimer = 180;
    }

    this.initPlayers();
    this.setupKickoff(true);
    if (adaptResult) {
      if (adaptResult.switched) {
        this.addLog(`[AI TACTICS (${Math.round(aiAdaptChance * 100)}% TRIGGER)] ${aiTeam.shortName} countered matching ${adaptResult.previousFormation} by switching to ${adaptResult.newFormation}!`);
      } else {
        this.addLog(`[AI TACTICS] ${aiTeam.shortName} kept matching ${adaptResult.previousFormation} (${Math.round((1 - aiAdaptChance) * 100)}% roll).`);
      }
    } else {
      this.addLog(`Match prepared. Awaiting kick-off command.`);
    }
  }

  private addLog(msg: string) {
    const min = Math.min(90, Math.floor(this.matchSeconds / 60));
    this.matchLog.unshift(`[${min}'] ${msg}`);
    if (this.matchLog.length > 25) this.matchLog.pop();
  }

  // ================= DETECTION CONE HELPERS =================
  private normalizeAngle(a: number): number {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  private isInCone(observer: RealtimePlayer, target: { x: number; y: number }): boolean {
    const dx = target.x - observer.x;
    const dy = target.y - observer.y;
    const dist = Math.hypot(dx, dy);
    if (dist > observer.coneRange + 8) return false;
    if (dist < 0.01) return true;
    const toTargetAngle = Math.atan2(dy, dx);
    const angleDiff = Math.abs(this.normalizeAngle(toTargetAngle - observer.facing));
    return angleDiff <= observer.coneAngle;
  }

  private classifyContactZone(
    tackler: RealtimePlayer,
    victim: { x: number; y: number }
  ): { zone: 'front' | 'side' | 'behind'; angle: number } {
    const dx = victim.x - tackler.x;
    const dy = victim.y - tackler.y;
    const angleToVictim = Math.atan2(dy, dx);
    const rel = Math.abs(this.normalizeAngle(angleToVictim - tackler.facing));
    if (rel <= Math.PI / 3) {
      return { zone: 'front', angle: angleToVictim };
    } else if (rel <= (2 * Math.PI) / 3) {
      return { zone: 'side', angle: angleToVictim };
    } else {
      return { zone: 'behind', angle: angleToVictim };
    }
  }

  // ================= TACTICAL ROLE ASSIGNMENT =================
  private getFormationRoleSlots(formation: FormationName): Array<{
    role: string;
    position: 'GK' | 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT';
    baseRoleX: number;
    baseRoleY: number;
  }> {
    switch (formation) {
      case '4-3-3':
        return [
          { role: 'GK',  position: 'GK',  baseRoleX: 0.03, baseRoleY: 0.50 },
          { role: 'LB',  position: 'LB',  baseRoleX: 0.24, baseRoleY: 0.12 },
          { role: 'LCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.38 },
          { role: 'RCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.62 },
          { role: 'RB',  position: 'RB',  baseRoleX: 0.24, baseRoleY: 0.88 },
          { role: 'LCM', position: 'MID', baseRoleX: 0.44, baseRoleY: 0.26 },
          { role: 'CDM', position: 'MID', baseRoleX: 0.38, baseRoleY: 0.50 },
          { role: 'RCM', position: 'MID', baseRoleX: 0.44, baseRoleY: 0.74 },
          { role: 'LW',  position: 'ATT', baseRoleX: 0.76, baseRoleY: 0.12 },
          { role: 'ST',  position: 'ATT', baseRoleX: 0.82, baseRoleY: 0.50 },
          { role: 'RW',  position: 'ATT', baseRoleX: 0.76, baseRoleY: 0.88 },
        ];
      case '4-4-2':
        return [
          { role: 'GK',  position: 'GK',  baseRoleX: 0.03, baseRoleY: 0.50 },
          { role: 'LB',  position: 'LB',  baseRoleX: 0.24, baseRoleY: 0.12 },
          { role: 'LCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.38 },
          { role: 'RCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.62 },
          { role: 'RB',  position: 'RB',  baseRoleX: 0.24, baseRoleY: 0.88 },
          { role: 'LM',  position: 'MID', baseRoleX: 0.46, baseRoleY: 0.14 },
          { role: 'LCM', position: 'MID', baseRoleX: 0.44, baseRoleY: 0.38 },
          { role: 'RCM', position: 'MID', baseRoleX: 0.44, baseRoleY: 0.62 },
          { role: 'RM',  position: 'MID', baseRoleX: 0.46, baseRoleY: 0.86 },
          { role: 'LST', position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.38 },
          { role: 'RST', position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.62 },
        ];
      case '3-5-2':
        return [
          { role: 'GK',  position: 'GK',  baseRoleX: 0.03, baseRoleY: 0.50 },
          { role: 'LCB', position: 'DEF', baseRoleX: 0.17, baseRoleY: 0.28 },
          { role: 'CB',  position: 'DEF', baseRoleX: 0.15, baseRoleY: 0.50 },
          { role: 'RCB', position: 'DEF', baseRoleX: 0.17, baseRoleY: 0.72 },
          { role: 'LWB', position: 'MID', baseRoleX: 0.40, baseRoleY: 0.10 },
          { role: 'LCM', position: 'MID', baseRoleX: 0.46, baseRoleY: 0.32 },
          { role: 'CM',  position: 'MID', baseRoleX: 0.43, baseRoleY: 0.50 },
          { role: 'RCM', position: 'MID', baseRoleX: 0.46, baseRoleY: 0.68 },
          { role: 'RWB', position: 'MID', baseRoleX: 0.40, baseRoleY: 0.90 },
          { role: 'LST', position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.38 },
          { role: 'RST', position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.62 },
        ];
      case '4-2-3-1':
        return [
          { role: 'GK',  position: 'GK',  baseRoleX: 0.03, baseRoleY: 0.50 },
          { role: 'LB',  position: 'LB',  baseRoleX: 0.24, baseRoleY: 0.12 },
          { role: 'LCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.38 },
          { role: 'RCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.62 },
          { role: 'RB',  position: 'RB',  baseRoleX: 0.24, baseRoleY: 0.88 },
          { role: 'LDM', position: 'MID', baseRoleX: 0.38, baseRoleY: 0.36 },
          { role: 'RDM', position: 'MID', baseRoleX: 0.38, baseRoleY: 0.64 },
          { role: 'LAM', position: 'MID', baseRoleX: 0.64, baseRoleY: 0.18 },
          { role: 'CAM', position: 'MID', baseRoleX: 0.66, baseRoleY: 0.50 },
          { role: 'RAM', position: 'MID', baseRoleX: 0.64, baseRoleY: 0.82 },
          { role: 'ST',  position: 'ATT', baseRoleX: 0.82, baseRoleY: 0.50 },
        ];
      case '5-3-2':
        return [
          { role: 'GK',  position: 'GK',  baseRoleX: 0.03, baseRoleY: 0.50 },
          { role: 'LWB', position: 'LB',  baseRoleX: 0.25, baseRoleY: 0.10 },
          { role: 'LCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.30 },
          { role: 'CB',  position: 'DEF', baseRoleX: 0.14, baseRoleY: 0.50 },
          { role: 'RCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.70 },
          { role: 'RWB', position: 'RB',  baseRoleX: 0.25, baseRoleY: 0.90 },
          { role: 'LCM', position: 'MID', baseRoleX: 0.46, baseRoleY: 0.30 },
          { role: 'CM',  position: 'MID', baseRoleX: 0.44, baseRoleY: 0.50 },
          { role: 'RCM', position: 'MID', baseRoleX: 0.46, baseRoleY: 0.70 },
          { role: 'LST', position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.38 },
          { role: 'RST', position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.62 },
        ];
      case '3-4-3':
        return [
          { role: 'GK',  position: 'GK',  baseRoleX: 0.03, baseRoleY: 0.50 },
          { role: 'LCB', position: 'DEF', baseRoleX: 0.17, baseRoleY: 0.28 },
          { role: 'CB',  position: 'DEF', baseRoleX: 0.15, baseRoleY: 0.50 },
          { role: 'RCB', position: 'DEF', baseRoleX: 0.17, baseRoleY: 0.72 },
          { role: 'LM',  position: 'MID', baseRoleX: 0.48, baseRoleY: 0.12 },
          { role: 'LCM', position: 'MID', baseRoleX: 0.46, baseRoleY: 0.38 },
          { role: 'RCM', position: 'MID', baseRoleX: 0.46, baseRoleY: 0.62 },
          { role: 'RM',  position: 'MID', baseRoleX: 0.48, baseRoleY: 0.88 },
          { role: 'LW',  position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.14 },
          { role: 'ST',  position: 'ATT', baseRoleX: 0.82, baseRoleY: 0.50 },
          { role: 'RW',  position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.86 },
        ];
      case '4-5-1':
        return [
          { role: 'GK',  position: 'GK',  baseRoleX: 0.03, baseRoleY: 0.50 },
          { role: 'LB',  position: 'LB',  baseRoleX: 0.24, baseRoleY: 0.12 },
          { role: 'LCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.38 },
          { role: 'RCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.62 },
          { role: 'RB',  position: 'RB',  baseRoleX: 0.24, baseRoleY: 0.88 },
          { role: 'LM',  position: 'MID', baseRoleX: 0.46, baseRoleY: 0.12 },
          { role: 'LDM', position: 'MID', baseRoleX: 0.38, baseRoleY: 0.34 },
          { role: 'CM',  position: 'MID', baseRoleX: 0.46, baseRoleY: 0.50 },
          { role: 'RDM', position: 'MID', baseRoleX: 0.38, baseRoleY: 0.66 },
          { role: 'RM',  position: 'MID', baseRoleX: 0.46, baseRoleY: 0.88 },
          { role: 'ST',  position: 'ATT', baseRoleX: 0.80, baseRoleY: 0.50 },
        ];
      case '4-2-4':
      default:
        return [
          { role: 'GK',  position: 'GK',  baseRoleX: 0.03, baseRoleY: 0.50 },
          { role: 'LB',  position: 'LB',  baseRoleX: 0.24, baseRoleY: 0.12 },
          { role: 'LCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.38 },
          { role: 'RCB', position: 'DEF', baseRoleX: 0.16, baseRoleY: 0.62 },
          { role: 'RB',  position: 'RB',  baseRoleX: 0.24, baseRoleY: 0.88 },
          { role: 'LCM', position: 'MID', baseRoleX: 0.45, baseRoleY: 0.36 },
          { role: 'RCM', position: 'MID', baseRoleX: 0.45, baseRoleY: 0.64 },
          { role: 'LW',  position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.12 },
          { role: 'LST', position: 'ATT', baseRoleX: 0.82, baseRoleY: 0.38 },
          { role: 'RST', position: 'ATT', baseRoleX: 0.82, baseRoleY: 0.62 },
          { role: 'RW',  position: 'ATT', baseRoleX: 0.78, baseRoleY: 0.88 },
        ];
    }
  }

  private isDefender(p: RealtimePlayer): boolean {
    return p.position === 'DEF' || p.position === 'LB' || p.position === 'RB';
  }

  private initPlayers() {
    this.players = [];

    const spawnTeam = (team: Team, isHome: boolean) => {
      const firstXI = team.firstTeam();
      const slots = this.getFormationRoleSlots(team.formation);
      const assignedIds = new Set<string>();

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];

        let p = firstXI.find((x) => !assignedIds.has(x.id) && x.position === slot.position);

        if (!p && (slot.position === 'DEF' || slot.position === 'LB' || slot.position === 'RB')) {
          p = firstXI.find((x) => !assignedIds.has(x.id) && (x.position === 'DEF' || x.position === 'LB' || x.position === 'RB'));
        }

        if (!p && slot.position === 'ATT') {
          p = firstXI.find((x) => !assignedIds.has(x.id) && x.position === 'ATT');
        }

        if (!p) {
          p = firstXI.find((x) => !assignedIds.has(x.id));
        }

        if (!p) {
          p = team.squad.find((x) => !assignedIds.has(x.id)) || firstXI[i % Math.max(1, firstXI.length)];
        }

        if (p) {
          assignedIds.add(p.id);
          this.players.push(this.createPlayer(p, team, isHome, slot, i + 1));
        }
      }
    };

    spawnTeam(this.home, true);
    spawnTeam(this.away, false);

    this.switchActiveUserToNearest();
  }

  private createPlayer(
    p: Player,
    team: Team,
    isHome: boolean,
    slot: { role: string; position: 'GK' | 'LB' | 'RB' | 'DEF' | 'MID' | 'ATT'; baseRoleX: number; baseRoleY: number },
    num: number
  ): RealtimePlayer {
    const baseSpeed = 3.3 + (p.pace / 100) * 1.9;
    const initialX = isHome ? PITCH_W * slot.baseRoleX : PITCH_W * (1 - slot.baseRoleX);
    const initialY = PITCH_H * slot.baseRoleY;

    const derivedWeight = p.weight ?? (slot.position === 'DEF' ? 82 : slot.position === 'GK' ? 85 : 75);
    const isDefRole = slot.position === 'DEF' || slot.position === 'LB' || slot.position === 'RB' || slot.position === 'GK';

    return {
      id: `${team.id}_${p.id}_${num}`,
      name: p.name,
      shortName: p.shortName(),
      number: num,
      position: slot.position,
      role: slot.role,
      baseRoleX: slot.baseRoleX,
      baseRoleY: slot.baseRoleY,
      isHome,
      baseTeam: team,
      playerData: p,
      x: initialX,
      y: initialY,
      vx: 0,
      vy: 0,
      facing: isHome ? 0 : Math.PI,
      targetX: initialX,
      targetY: initialY,
      speed: baseSpeed * this.gameSpeed,
      baseSpeed: baseSpeed,
      stamina: 100,
      strength: p.strength ?? (slot.position === 'DEF' ? 80 : slot.position === 'GK' ? 84 : 72),
      control: p.control ?? 74,
      weight: derivedWeight,
      dribbling: p.dribbling ?? 74,
      positioning: p.positioning ?? (slot.position === 'DEF' || slot.position === 'LB' || slot.position === 'RB' ? 78 : slot.position === 'MID' ? 75 : 70),
      attack: p.attack ?? (slot.position === 'ATT' ? 84 : slot.position === 'MID' ? 75 : slot.position === 'DEF' ? 42 : 22),
      defence: p.defence ?? (slot.position === 'DEF' ? 84 : slot.position === 'GK' ? 86 : slot.position === 'MID' ? 68 : 34),
      gkAwareness: p.gkAwareness ?? (slot.position === 'GK' ? 82 : 45),
      gkReach: p.gkReach ?? (slot.position === 'GK' ? 84 : 45),
      gkJumping: p.gkJumping ?? (slot.position === 'GK' ? 80 : 50),
      gkStyle: p.gkStyle ?? (slot.position === 'GK' ? 'attacking' : 'defensive'),
      isRushing: false,
      gkRushTargetX: 0,
      gkRushTargetY: 0,
      gkStrandedTimer: 0,
      isUser: false,
      isKicking: 0,
      isSliding: 0,
      isStunned: 0,
      isDiving: 0,
      gkHoldTimer: 0,
      wasCarrier: false,
      isDashing: 0,
      isCommandPressed: false,
      jockeyTimer: 0,
      chargePower: 0,
      chargingType: null,
      mass: derivedWeight,
      coneAngle: isDefRole ? 0.42 : 0.55,
      coneRange: isDefRole ? 46 : 40,
      yellowCards: 0,
      redCards: 0,
      isSentOff: false,
    };
  }

  public setupKickoff(homeKicking: boolean) {
    this.ball.x = PITCH_W / 2;
    this.ball.y = PITCH_H / 2;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    this.ball.isKnuckle = false;
    this.ball.carrier = null;
    this.ball.lastCarrier = null;
    this.ball.pickupCooldownCarrier = null;
    this.ball.pickupCooldownTimer = 0;
    this.ball.shotType = null;
    this.ball.saveAttemptedGkId = null;
    this.commandPressPlayerId = null;
    this.ball.deflectedBehindByDefense = false;

    for (const p of this.players) {
      p.vx = 0;
      p.vy = 0;
      p.isSliding = 0;
      p.isKicking = 0;
      p.isStunned = 0;
      p.isDashing = 0;
      p.gkHoldTimer = 0;
      p.isRushing = false;
      p.gkStrandedTimer = 0;
      p.isCommandPressed = false;

      // Sent-off players stay off the pitch
      if (p.isSentOff) continue;

      const isHome = p.isHome;
      if (p.position === 'GK') {
        const gkStanceX = p.gkStyle === 'attacking' ? (isHome ? 75 : PITCH_W - 75) : (isHome ? 45 : PITCH_W - 45);
        p.x = gkStanceX;
        p.y = PITCH_H / 2;
        p.facing = isHome ? 0 : Math.PI;
      } else {
        const xRatio = Math.min(0.48, p.baseRoleX);
        p.x = isHome ? PITCH_W * xRatio : PITCH_W * (1 - xRatio);
        p.y = PITCH_H * p.baseRoleY;
        p.facing = isHome ? 0 : Math.PI;
      }
    }

    const kickers = this.players.filter((p) => p.isHome === homeKicking && p.position === 'ATT' && !p.isSentOff);
    const taker = kickers[0] || this.players.find((p) => p.isHome === homeKicking && p.position !== 'GK' && !p.isSentOff)!;
    if (taker) {
      taker.x = PITCH_W / 2 + (homeKicking ? -14 : 14);
      taker.y = PITCH_H / 2;
      taker.facing = homeKicking ? 0 : Math.PI;
      this.ball.x = PITCH_W / 2;
      this.ball.y = PITCH_H / 2;
      this.ball.carrier = taker;
      this.ball.lastCarrier = taker;
      this.ball.lastTouchTeam = homeKicking ? 'home' : 'away';
      this.ball.lastTouchPlayer = taker;
    }

    this.state = 'kickoff';
    const restartTeam = homeKicking ? this.home : this.away;
    const isUserKicking = homeKicking === this.userIsHome;
    this.bannerText = isUserKicking
      ? '⚽ KICK-OFF: Enter any command (Pass / Shoot / Move) to start!'
      : `⚽ KICK-OFF: ${restartTeam.shortName.toUpperCase()} - Enter any command to start!`;
    this.bannerTimer = 999999;
    this.switchActiveUserToNearest();
  }

  public handleKickoff(inp: InputState) {
    const isUserKicking = this.ball.carrier?.isHome === this.userIsHome;
    const taker = this.ball.carrier;

    const hasDirectionInput = inp.moveMag > 0.20;
    const hasActionButton =
      inp.passPressed ||
      inp.shootPressed ||
      inp.lobPressed ||
      inp.throughPressed ||
      inp.dashPressed ||
      inp.switchPressed ||
      inp.pass ||
      inp.shoot ||
      inp.lob ||
      inp.through;

    const commandEntered = hasDirectionInput || hasActionButton;

    if (!commandEntered) {
      if (taker) {
        taker.vx = 0;
        taker.vy = 0;
        this.ball.x = PITCH_W / 2;
        this.ball.y = PITCH_H / 2;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.vz = 0;
      }
      return;
    }

    sound.whistle();
    this.state = 'play';
    this.bannerText = '⚽ MATCH UNDERWAY!';
    this.bannerTimer = 65;

    if (isUserKicking && taker) {
      if (inp.shootPressed || inp.shoot) {
        const shootAngle = hasDirectionInput ? inp.moveAngle : taker.facing;
        this.executeRegularShot(taker, shootAngle, 75);
      } else if (inp.lobPressed || inp.lob) {
        const lobAngle = hasDirectionInput ? inp.moveAngle : taker.facing;
        this.executeLongBall(taker, lobAngle, 65);
      } else if (inp.throughPressed || inp.through) {
        const throughAngle = hasDirectionInput ? inp.moveAngle : taker.facing;
        this.executeThroughBall(taker, throughAngle);
      } else if (inp.passPressed || inp.pass) {
        const passAngle = hasDirectionInput ? inp.moveAngle : taker.facing;
        this.executeGroundPass(taker, passAngle, false);
      } else if (hasDirectionInput) {
        taker.facing = inp.moveAngle;
        taker.vx = Math.cos(inp.moveAngle) * taker.speed;
        taker.vy = Math.sin(inp.moveAngle) * taker.speed;
      }
       } else if (taker && !isUserKicking) {
      const backwardAngle = taker.isHome ? Math.PI * 0.85 : Math.PI * 0.15;
      if (Math.random() < 0.6) {
        this.executeGroundPass(taker, backwardAngle, true);
      } else {
        const forwardAngle = taker.isHome ? 0 : Math.PI;
        taker.facing = forwardAngle;
        taker.vx = Math.cos(forwardAngle) * taker.speed * 0.85;
        taker.vy = Math.sin(forwardAngle) * taker.speed * 0.85;
      }
    }
  }

  public switchActiveUserToNearest() {
    let nearest: RealtimePlayer | null = null;
    let minDist = Infinity;

    for (const p of this.players) {
      if (p.isHome === this.userIsHome && p.position !== 'GK' && !p.isSentOff) {
        p.isUser = false;
        const dx = p.x - this.ball.x;
        const dy = p.y - this.ball.y;
        const d = dx * dx + dy * dy;
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
    }

    if (nearest) {
      nearest.isUser = true;
      this.activeUserPlayer = nearest;
    }
  }

  // ================= MAIN UPDATE LOOP =================
  public update(inputState: InputState) {
    if (this.isFullTime || this.isHalfTime) return;

    for (const p of this.players) {
      p.speed = p.baseSpeed * this.gameSpeed;
    }

    if (this.state === 'kickoff') {
      this.handleKickoff(inputState);
      return;
    }
    if (this.state === 'corner') {
      this.handleCornerKick(inputState);
      return;
    }
    if (this.state === 'throwin') {
      this.handleThrowIn(inputState);
      return;
    }
    if (this.state === 'goalkick') {
      this.handleGoalKick(inputState);
      return;
    }
    if (this.state === 'freekick') {
      this.handleFreeKick(inputState);
      return;
    }

    if (this.offsideVisualTimer > 0) this.offsideVisualTimer--;

    if (this.state === 'goal') {
      if (this.stateTimer > 0) {
        this.stateTimer--;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.vz = 0;
        for (const p of this.players) {
          p.vx *= 0.85;
          p.vy *= 0.85;
        }
        return;
      } else {
        const concedingTeamHome = this.lastGoalTeam === 'away';
        this.setupKickoff(concedingTeamHome);
        return;
      }
    }

    this.matchSeconds += 0.25 * this.gameSpeed;

    if (this.matchSeconds >= 2700 && !this.isHalfTime && this.matchSeconds < 2730) {
      this.isHalfTime = true;
      sound.whistle();
      this.bannerText = 'HALF TIME!';
      this.bannerTimer = 200;
      this.addLog(`Half-time whistle. Score: ${this.home.shortName} ${this.homeScore} - ${this.awayScore} ${this.away.shortName}`);
      return;
    }

    if (this.matchSeconds >= 5400 && !this.isFullTime) {
      this.isFullTime = true;
      sound.whistle(true);
      this.bannerText = 'FULL TIME!';
      this.bannerTimer = 300;
      this.addLog(`Full-time whistle! Final score: ${this.home.shortName} ${this.homeScore} - ${this.awayScore} ${this.away.shortName}`);
      return;
    }

    if (this.bannerTimer > 0) this.bannerTimer--;

    if (this.ball.carrier) {
      if (this.ball.carrier.isHome) this.stats.homePossessionTicks++;
      else this.stats.awayPossessionTicks++;
    }

    this.homeAttackingOffsideLineX = this.getDefensiveOffsideLineX(true);
    this.awayAttackingOffsideLineX = this.getDefensiveOffsideLineX(false);
    this.currentOffsideLineX = this.ball.carrier?.isHome ? this.homeAttackingOffsideLineX : this.awayAttackingOffsideLineX;

    this.handleUserInput(inputState);
    this.handleCommandedPress(inputState);
    this.handleTacticalAI();
    this.updateBallPhysics();
    this.updatePlayerPhysics();
    this.handlePlayerCollisionsAndDuels();
    this.checkGoalAndPitchBounds();
  }

  // ================= USER INPUTS & CONTROLS =================
  private handleUserInput(inp: InputState) {
    const user = this.activeUserPlayer;
    if (!user || user.isSentOff) return;

    if (user.isStunned > 0) {
      user.isStunned--;
      user.vx *= 0.65;
      user.vy *= 0.65;
      return;
    }

    if (inp.switchPressed && this.ball.carrier !== user) {
      this.switchActiveUserToNearest();
    }

    const hasBall = this.ball.carrier === user;

    if (user.wasCarrier && !hasBall && user.isKicking === 0) {
      user.vx *= 0.35;
      user.vy *= 0.35;
    }
    user.wasCarrier = hasBall;

    const hasMoveInput = inp.moveMag > 0.08;

    if (inp.dashPressed && hasMoveInput && user.stamina > 6) {
      user.isDashing = 18;
      user.stamina = Math.max(0, user.stamina - 3.5);
      if (hasBall) {
        this.releaseBallFromKicker(user);
        this.ball.vx = Math.cos(user.facing) * (user.speed * 1.55);
        this.ball.vy = Math.sin(user.facing) * (user.speed * 1.55);
        this.ball.pickupCooldownTimer = 10;
        this.bannerText = '⚡ KNOCK-ON DASH!';
      } else {
        this.bannerText = '⚡ EXPLOSIVE DASH!';
      }
      this.bannerTimer = 35;
      sound.kick(0.35);
    }

    if (hasMoveInput) {
      let sprintSpeed = 1.0;
      if (user.isDashing > 0) {
        sprintSpeed = 1.65;
      } else if ((inp.sprint || inp.dash) && user.stamina > 10) {
        sprintSpeed = 1.40;
        user.stamina = Math.max(0, user.stamina - 0.12);
      }

      const spd = user.speed * sprintSpeed * (hasBall ? 0.93 : 1.0);
      user.vx = inp.moveX * spd;
      user.vy = inp.moveY * spd;
      user.facing = inp.moveAngle;
    } else {
      user.vx *= 0.65;
      user.vy *= 0.65;
    }

    if (!inp.sprint && !inp.dash && user.isDashing === 0 && user.stamina < 100) {
      user.stamina += 0.06;
    }

    if (hasBall) {
      // 1. Ground Pass
      if (inp.pass) {
        user.chargingType = 'pass';
        user.chargePower = Math.min(100, user.chargePower + 3.2);
      } else if (user.chargingType === 'pass') {
        const pwr = Math.max(15, user.chargePower);
        this.executeGroundPass(user, inp.moveAngle, inp.moveMag > 0.1, pwr);
        user.chargingType = null;
        user.chargePower = 0;
      }

      // 2. Through Ball
      if (inp.through) {
        user.chargingType = 'through';
        user.chargePower = Math.min(100, user.chargePower + 2.8);
      } else if (user.chargingType === 'through') {
        const pwr = Math.max(15, user.chargePower);
        if (inp.chipMod) {
          this.executeChipThroughBall(user, inp.moveAngle);
        } else {
          this.executeThroughBall(user, inp.moveAngle, pwr);
        }
        user.chargingType = null;
        user.chargePower = 0;
      }

      // 3. Lofted Pass
      if (inp.lob) {
        user.chargingType = 'lob';
        user.chargePower = Math.min(100, user.chargePower + 2.2);
      } else if (user.chargingType === 'lob') {
        const pwr = Math.max(15, user.chargePower);
        this.executeLongBall(user, inp.moveAngle, pwr);
        user.chargingType = null;
        user.chargePower = 0;
      }

      // 4. Shoot / Precision Shoot
      if (inp.shoot) {
        const isPrecision = inp.dash || inp.sprint;
        if (isPrecision || user.chargingType === 'precision') {
          user.chargingType = 'precision';
          user.chargePower = Math.min(100, user.chargePower + 1.15);
        } else {
          user.chargingType = 'shoot';
          user.chargePower = Math.min(100, user.chargePower + 2.4);
        }
      } else if (user.chargingType === 'precision') {
        const pwr = Math.max(15, user.chargePower);
        this.executePrecisionShot(user, inp.moveAngle, pwr);
        user.chargingType = null;
        user.chargePower = 0;
      } else if (user.chargingType === 'shoot') {
        const pwr = Math.max(15, user.chargePower);
        if (inp.chipMod) {
          this.executeChipShot(user, inp.moveAngle, pwr);
        } else if (inp.finesseMod) {
          this.executeFinesseShot(user, inp.moveAngle, pwr);
        } else if (inp.knuckleMod) {
          this.executeKnuckleShot(user, inp.moveAngle, pwr);
        } else {
          this.executeRegularShot(user, inp.moveAngle, pwr);
        }
        user.chargingType = null;
        user.chargePower = 0;
      }
    } else {
      user.chargingType = null;
      user.chargePower = 0;

      const teamHasBall = this.ball.carrier && this.ball.carrier.isHome === this.userIsHome;

      if (!teamHasBall) {
        // Pressure & close down
        if (inp.pass || inp.passPressed) {
          const toBallAngle = Math.atan2(this.ball.y - user.y, this.ball.x - user.x);
          const pressSpeed = user.speed * 1.32;
          user.vx = Math.cos(toBallAngle) * pressSpeed;
          user.vy = Math.sin(toBallAngle) * pressSpeed;
          user.facing = toBallAngle;
          user.jockeyTimer = 10;

          const distToBall = Math.hypot(this.ball.x - user.x, this.ball.y - user.y);
          if (distToBall < 42 || inp.passPressed) {
            this.executeStandingTackle(user);
          }
        }

        // Slide tackle
        if (inp.shootPressed && user.isSliding === 0) {
          this.executeSlideTackle(user, user.facing);
        }

        // Defensive clearance
        if (inp.lobPressed) {
          const distToBall = Math.hypot(this.ball.x - user.x, this.ball.y - user.y);
          if (distToBall < 48) {
            this.executeLongBall(user, user.facing, 85);
            this.bannerText = '💥 DEFENSIVE CLEARANCE!';
            this.bannerTimer = 45;
          }
        }

        // GK rush
        if (inp.through) {
          this.handleGoalkeeperRush();
        }
      } else {
        if (inp.passPressed) {
          const carrier = this.ball.carrier;
          if (carrier && carrier !== user) {
            const angleToUser = Math.atan2(user.y - carrier.y, user.x - carrier.x);
            this.executeGroundPass(carrier, angleToUser, true, 35);
          }
        }
      }
    }
  }

  // ================= COMMANDED 2ND MAN PRESS =================
  private handleCommandedPress(inp: InputState) {
    const userHasBall = this.ball.carrier && this.ball.carrier.isHome === this.userIsHome;

    if (!userHasBall && inp.pressCommand) {
      let nearestTeammate: RealtimePlayer | null = null;
      let minDist = Infinity;

      for (const p of this.players) {
        if (p.isHome === this.userIsHome && !p.isUser && p.position !== 'GK' && p.isStunned === 0 && !p.isSentOff) {
          const d = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
          if (d < minDist) {
            minDist = d;
            nearestTeammate = p;
          }
        }
      }

      for (const p of this.players) p.isCommandPressed = false;

      if (nearestTeammate) {
        nearestTeammate.isCommandPressed = true;
        this.commandPressPlayerId = nearestTeammate.id;

        const angle = Math.atan2(this.ball.y - nearestTeammate.y, this.ball.x - nearestTeammate.x);
        const pressSpeed = nearestTeammate.speed * 1.15;
        nearestTeammate.vx = Math.cos(angle) * pressSpeed;
        nearestTeammate.vy = Math.sin(angle) * pressSpeed;
        nearestTeammate.facing = angle;

        if (minDist < 30 && this.ball.carrier && this.ball.carrier.position !== 'GK') {
          if (Math.random() < 0.12) {
            this.executeStandingTackle(nearestTeammate);
          }
        }
      }
    } else {
      this.commandPressPlayerId = null;
      for (const p of this.players) p.isCommandPressed = false;
    }
  }

  // ================= PASSING & SHOOTING MECHANICS =================
  private releaseBallFromKicker(kicker: RealtimePlayer) {
    this.ball.carrier = null;
    this.ball.lastCarrier = kicker;
    this.ball.pickupCooldownCarrier = kicker;
    this.ball.pickupCooldownTimer = 20;
    this.ball.lastTouchTeam = kicker.isHome ? 'home' : 'away';
    this.ball.lastTouchPlayer = kicker;
    this.ball.deflectedBehindByDefense = false;
    this.ball.saveAttemptedGkId = null;

    if (this.state === 'play') {
      this.evaluateOffsideOnPass(kicker);
    } else {
      this.activePassOffside = null;
    }
  }

  // ================= OFFSIDE EVALUATION & RULE ENFORCEMENT =================
  public getDefensiveOffsideLineX(isHomeAttacking: boolean): number {
    const opponentTeam = this.players.filter((p) => p.isHome !== isHomeAttacking && !p.isSentOff);
    if (opponentTeam.length < 2) {
      return isHomeAttacking ? PITCH_W - 60 : 60;
    }

    if (isHomeAttacking) {
      const sortedOpponents = [...opponentTeam].sort((a, b) => b.x - a.x);
      const secondLastOpponentX = sortedOpponents[1].x;
      const rawLine = Math.max(secondLastOpponentX, this.ball.x);
      return Math.max(PITCH_W / 2, rawLine);
    } else {
      const sortedOpponents = [...opponentTeam].sort((a, b) => a.x - b.x);
      const secondLastOpponentX = sortedOpponents[1].x;
      const rawLine = Math.min(secondLastOpponentX, this.ball.x);
      return Math.min(PITCH_W / 2, rawLine);
    }
  }

  private evaluateOffsideOnPass(kicker: RealtimePlayer) {
    const isHomeAttacking = kicker.isHome;
    const offsideLineX = this.getDefensiveOffsideLineX(isHomeAttacking);
    this.currentOffsideLineX = offsideLineX;

    const offsidePlayerIds = new Set<string>();
    const teammates = this.players.filter(
      (p) => p.isHome === isHomeAttacking && p !== kicker && p.position !== 'GK' && !p.isSentOff
    );

    for (const t of teammates) {
      if (isHomeAttacking) {
        if (t.x > offsideLineX + 3.0 && t.x > kicker.x + 3.0) {
          offsidePlayerIds.add(t.id);
        }
      } else {
        if (t.x < offsideLineX - 3.0 && t.x < kicker.x - 3.0) {
          offsidePlayerIds.add(t.id);
        }
      }
    }

    if (offsidePlayerIds.size > 0) {
      this.activePassOffside = {
        passerId: kicker.id,
        isHomeAttacking,
        offsidePlayerIds,
        offsideLineX,
        ballOriginX: kicker.x,
        ballOriginY: kicker.y,
      };
    } else {
      this.activePassOffside = null;
    }
  }

  public triggerOffside(offender: RealtimePlayer) {
    sound.whistle();
    const isHomeOffender = offender.isHome;
    this.bannerText = `🚩 OFFSIDE! ${offender.shortName.toUpperCase()}`;
    this.bannerTimer = 110;
    this.addLog(`🚩 Offside flagged against ${offender.shortName}! Indirect free kick awarded.`);

    if (isHomeOffender) {
      this.stats.homeOffsides = (this.stats.homeOffsides || 0) + 1;
    } else {
      this.stats.awayOffsides = (this.stats.awayOffsides || 0) + 1;
    }

    this.offsideVisualTimer = 130;
    this.offsideVisualX = this.activePassOffside?.offsideLineX ?? offender.x;
    this.activePassOffside = null;

    this.setupFreeKick(offender.x, offender.y, !isHomeOffender);
  }

  public setupFreeKick(x: number, y: number, isDefendingHome: boolean) {
    this.state = 'freekick';
    this.stateTimer = 0;

    const fkX = Math.max(40, Math.min(PITCH_W - 40, x));
    const fkY = Math.max(40, Math.min(PITCH_H - 40, y));

    this.ball.x = fkX;
    this.ball.y = fkY;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.shotType = null;

    const defenders = this.players
      .filter((p) => p.isHome === isDefendingHome && p.position !== 'GK' && !p.isSentOff)
      .sort((a, b) => Math.hypot(a.x - fkX, a.y - fkY) - Math.hypot(b.x - fkX, b.y - fkY));

    const taker = defenders[0] || this.players.find((p) => p.isHome === isDefendingHome && !p.isSentOff);
    if (!taker) return;

    taker.x = fkX + (isDefendingHome ? -18 : 18);
    taker.y = fkY;
    taker.vx = 0;
    taker.vy = 0;
    taker.facing = isDefendingHome ? 0 : Math.PI;

    this.ball.carrier = taker;
    this.ball.lastCarrier = taker;
    this.ball.lastTouchTeam = isDefendingHome ? 'home' : 'away';
    this.ball.lastTouchPlayer = taker;

    if (isDefendingHome === this.userIsHome) {
      this.activeUserPlayer = taker;
      for (const p of this.players) p.isUser = p === taker;
    }

    for (const opp of this.players) {
      if (opp.isHome !== isDefendingHome && !opp.isSentOff) {
        opp.vx = 0;
        opp.vy = 0;
        const d = Math.hypot(opp.x - fkX, opp.y - fkY);
        if (d < 160) {
          const ang = Math.atan2(opp.y - fkY, opp.x - fkX);
          opp.x = fkX + Math.cos(ang) * 175;
          opp.y = fkY + Math.sin(ang) * 175;
          opp.x = Math.max(25, Math.min(PITCH_W - 25, opp.x));
          opp.y = Math.max(25, Math.min(PITCH_H - 25, opp.y));
        }
      }
    }
  }

  private handleFreeKick(inp: InputState) {
    const taker = this.ball.carrier;
    if (!taker) return;

    if (taker.isUser) {
      if (inp.moveMag > 0.1) {
        taker.facing = inp.moveAngle;
      }

      this.bannerText = '🚩 FREE KICK: [✕] Ground Pass | [◯] Lofted Pass | [▢] Shoot';
      this.bannerTimer = 10;

      if (inp.passPressed) {
        this.executeGroundPass(taker, taker.facing, true);
        this.state = 'play';
        this.addLog(`Free kick played by ${taker.shortName}.`);
        return;
      }

      if (inp.lob || inp.shootPressed || inp.throughPressed) {
        this.executeLongBall(taker, taker.facing, 65);
        this.state = 'play';
        this.addLog(`Free kick sent long by ${taker.shortName}.`);
        return;
      }
    } else {
      this.stateTimer++;
      if (this.stateTimer > 35) {
        this.stateTimer = 0;
        this.executeGroundPass(taker, taker.facing, false);
        this.state = 'play';
        this.addLog(`Free kick taken by ${taker.shortName}.`);
        return;
      }
    }
  }

  // ================= PASSING MECHANICS =================
  private executeGroundPass(kicker: RealtimePlayer, stickAngle: number, hasStick: boolean, powerPct: number = 35) {
    const angle = hasStick ? stickAngle : kicker.facing;
    const passStat = kicker.playerData?.passing ?? 60;
    const mates = this.players.filter((p) => p.isHome === kicker.isHome && p !== kicker && p.position !== 'GK' && !p.isSentOff);

    let bestMate: RealtimePlayer | null = null;
    let bestScore = -Infinity;

    const visionTolerance = 0.55 + (passStat / 100) * 0.40;
    const preferredDist = 120 + (powerPct / 100) * 500;

    for (const m of mates) {
      const dx = m.x - kicker.x;
      const dy = m.y - kicker.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 35 || dist > (320 + (powerPct / 100) * 450 + passStat * 2.2)) continue;

      const toMateAngle = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angle - toMateAngle);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      angleDiff = Math.abs(angleDiff);

      if (angleDiff < visionTolerance) {
        const distPenalty = Math.abs(dist - preferredDist) * 0.7;
        const score = 1200 - distPenalty - angleDiff * 600;
        if (score > bestScore) {
          bestScore = score;
          bestMate = m;
        }
      }
    }

    sound.kick(0.55 + (powerPct / 100) * 0.35);
    kicker.isKicking = 8;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = null;
    this.ball.z = 0;
    this.ball.vz = 0;

    let targetAngle = angle;
    let speed = (9.5 + (powerPct / 100) * 11.0) * (0.85 + (passStat / 100) * 0.25);

    if (bestMate) {
      targetAngle = Math.atan2(bestMate.y - kicker.y, bestMate.x - kicker.x);
      const drift = ((100 - passStat) / 100) * (Math.random() - 0.5) * 0.22;
      targetAngle += drift;
      const dist = Math.hypot(bestMate.x - kicker.x, bestMate.y - kicker.y);
      const neededSpeed = Math.min(21.0, Math.max(10.5, (dist / 22) * (0.85 + (passStat / 100) * 0.35)));
      speed = Math.max(speed, neededSpeed * (0.75 + (powerPct / 100) * 0.40));
      this.ball.curve = passStat > 72 ? (Math.random() - 0.5) * 0.25 * (passStat / 100) : 0;
    } else {
      const drift = ((100 - passStat) / 100) * (Math.random() - 0.5) * 0.35;
      targetAngle += drift;
      this.ball.curve = 0;
    }

    this.ball.vx = Math.cos(targetAngle) * speed;
    this.ball.vy = Math.sin(targetAngle) * speed;

    if (powerPct > 70) {
      this.bannerText = '⚡ DRIVEN GROUND PASS!';
      this.bannerTimer = 40;
    }

    if (kicker.isHome) this.stats.homePassesCompleted++;
    else this.stats.awayPassesCompleted++;
  }

  private executeThroughBall(kicker: RealtimePlayer, stickAngle: number, powerPct: number = 40) {
    const angle = kicker.facing;
    const passStat = kicker.playerData?.passing ?? 60;
    const errorPct = Math.max(0.04, (100 - passStat) / 100);

    sound.kick(0.65 + (powerPct / 100) * 0.3);
    kicker.isKicking = 10;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = 'through';
    this.ball.z = 0;
    this.ball.vz = 0;

    const drift = (Math.random() - 0.5) * 0.28 * errorPct;
    const basePower = (9.0 + (powerPct / 100) * 11.0) * (0.85 + (passStat / 100) * 0.25);
    const power = basePower * (1 + (Math.random() - 0.5) * 0.18 * errorPct);

    this.ball.curve = passStat > 75 ? (Math.random() - 0.5) * 0.25 * (passStat / 100) : 0;
    this.ball.vx = Math.cos(angle + drift) * power;
    this.ball.vy = Math.sin(angle + drift) * power;

    this.bannerText = powerPct > 70 ? '⚡ DRIFTING THROUGH BALL' : '📐 WEIGHTED THROUGH BALL';
    this.bannerTimer = 55;
  }

  private executeChipThroughBall(kicker: RealtimePlayer, stickAngle: number) {
    const angle = kicker.facing;
    const passStat = kicker.playerData?.passing ?? 60;
    const errorPct = Math.max(0.05, (100 - passStat) / 100);

    sound.kick(0.8);
    kicker.isKicking = 12;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = 'chip';

    const drift = (Math.random() - 0.5) * 0.26 * errorPct;
    const power = (9.5 + (passStat / 100) * 3.0) * (1 + (Math.random() - 0.5) * 0.15 * errorPct);
    this.ball.vx = Math.cos(angle + drift) * power;
    this.ball.vy = Math.sin(angle + drift) * power;
    this.ball.vz = 5.2;

    this.bannerText = '🎈 CHIP THROUGH BALL';
    this.bannerTimer = 65;
  }

  private executeLongBall(kicker: RealtimePlayer, stickAngle: number, powerPct: number) {
    const angle = kicker.facing;
    const passStat = kicker.playerData?.passing ?? 60;
    const errorPct = Math.max(0.06, (100 - passStat) / 100);

    sound.kick(0.65 + (powerPct / 100) * 0.35);
    kicker.isKicking = 12;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = 'lob';

    const drift = (Math.random() - 0.5) * 0.26 * errorPct;
    const powerMult = 1 + (Math.random() - 0.5) * 0.18 * errorPct;
    const vzMult = 1 + (Math.random() - 0.5) * 0.16 * errorPct;

    const basePower = (6.0 + (powerPct / 100) * 11.5) * (0.85 + (passStat / 100) * 0.25);
    const power = basePower * powerMult;

    const baseVz = 1.4 + (powerPct / 100) * 3.4;
    this.ball.vz = Math.max(1.2, baseVz * vzMult);

    this.ball.vx = Math.cos(angle + drift) * power;
    this.ball.vy = Math.sin(angle + drift) * power;

    if (powerPct < 35) {
      this.bannerText = '⚡ WHIPPED LOW CROSS';
    } else if (powerPct > 75) {
      this.bannerText = '✈️ FLOATING DEEP CROSS';
    } else {
      this.bannerText = '🎯 CURLED CROSS INTO BOX';
    }
    this.bannerTimer = 60;
  }

  private executeFinesseShot(kicker: RealtimePlayer, stickAngle: number, powerPct: number) {
    const shootStat = kicker.playerData?.shooting ?? 60;
    const goalX = kicker.isHome ? PITCH_W : 0;
    const cornerY = kicker.y < PITCH_H / 2 ? GOAL_Y_BOTTOM - 20 : GOAL_Y_TOP + 20;
    const targetY = shootStat > 68 ? cornerY : PITCH_H / 2 + (Math.random() - 0.5) * 60;
    const directAngle = Math.atan2(targetY - kicker.y, goalX - kicker.x);

    sound.kick(0.85);
    kicker.isKicking = 14;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = 'finesse';

    const curveSign = (kicker.y < PITCH_H / 2 ? 0.36 : -0.36) * (0.6 + (shootStat / 100) * 0.65);
    this.ball.curve = curveSign * (kicker.isHome ? 1 : -1);

    const speed = (12.5 + (powerPct / 100) * 10.0) * (0.80 + (shootStat / 100) * 0.36);
    this.ball.vx = Math.cos(directAngle + curveSign * 0.15) * speed;
    this.ball.vy = Math.sin(directAngle + curveSign * 0.15) * speed;
    this.ball.vz = 3.6 + (powerPct / 100) * 3.2;

    if (kicker.isHome) this.stats.homeShots++;
    else this.stats.awayShots++;

    this.bannerText = shootStat > 75 ? '🎯 MASTER FINESSE CURL' : '🎯 FINESSE CURL SHOT';
    this.bannerTimer = 75;
  }

  private executePrecisionShot(kicker: RealtimePlayer, stickAngle: number, powerPct: number) {
    const shootStat = kicker.playerData?.shooting ?? 60;
    const goalX = kicker.isHome ? PITCH_W : 0;

    const topCorner = kicker.y < PITCH_H / 2;
    const targetCornerY = topCorner ? GOAL_Y_BOTTOM - 16 : GOAL_Y_TOP + 16;
    const spray = ((100 - shootStat) / 100) * (Math.random() - 0.5) * 12;
    const targetY = targetCornerY + spray;
    const directAngle = Math.atan2(targetY - kicker.y, goalX - kicker.x);

    sound.powerShot();
    kicker.isKicking = 16;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = 'precision';

    const curveSign = (topCorner ? 0.32 : -0.32) * (0.7 + (shootStat / 100) * 0.55);
    this.ball.curve = curveSign * (kicker.isHome ? 1 : -1);

    const speed = (13.5 + (powerPct / 100) * 9.5) * (0.85 + (shootStat / 100) * 0.35);
    this.ball.vx = Math.cos(directAngle + curveSign * 0.12) * speed;
    this.ball.vy = Math.sin(directAngle + curveSign * 0.12) * speed;
    this.ball.vz = 2.4 + (powerPct / 100) * 2.2;

    if (kicker.isHome) this.stats.homeShots++;
    else this.stats.awayShots++;

    this.bannerText = shootStat > 74 ? '🎯 CLINICAL PRECISION FINISH (R2+▢)!' : '🎯 PRECISION SHOT (R2+▢)';
    this.bannerTimer = 80;
  }

  private handleGoalkeeperRush() {
    const gk = this.players.find((p) => p.isHome === this.userIsHome && p.position === 'GK' && !p.isSentOff);
    if (gk && this.ball.carrier !== gk) {
      const angleToBall = Math.atan2(this.ball.y - gk.y, this.ball.x - gk.x);
      const rushSpeed = gk.speed * 1.45;
      gk.vx = Math.cos
	        gk.vx = Math.cos(angleToBall) * rushSpeed;
      gk.vy = Math.sin(angleToBall) * rushSpeed;
      gk.facing = angleToBall;
      this.bannerText = '🧤 GOALKEEPER RUSH (△)!';
      this.bannerTimer = 25;
    }
  }

  private executeKnuckleShot(kicker: RealtimePlayer, stickAngle: number, powerPct: number) {
    const shootStat = kicker.playerData?.shooting ?? 60;
    const goalX = kicker.isHome ? PITCH_W : 0;
    const goalY = PITCH_H / 2 + (Math.random() - 0.5) * 80;
    const angle = Math.atan2(goalY - kicker.y, goalX - kicker.x);

    sound.powerShot();
    kicker.isKicking = 16;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = 'knuckle';
    this.ball.isKnuckle = true;

    const speed = (16.0 + (powerPct / 100) * 11.0) * (0.8 + (shootStat / 100) * 0.35);
    this.ball.vx = Math.cos(angle) * speed;
    this.ball.vy = Math.sin(angle) * speed;
    this.ball.vz = 2.8 + (powerPct / 100) * 2.2;

    if (kicker.isHome) this.stats.homeShots++;
    else this.stats.awayShots++;

    this.bannerText = '⚡ KNUCKLEBALL STRIKE';
    this.bannerTimer = 85;
  }

  private executeChipShot(kicker: RealtimePlayer, stickAngle: number, powerPct: number) {
    const shootStat = kicker.playerData?.shooting ?? 60;
    const goalX = kicker.isHome ? PITCH_W : 0;
    const goalY = PITCH_H / 2;
    const angle = Math.atan2(goalY - kicker.y, goalX - kicker.x);

    sound.kick(0.65);
    kicker.isKicking = 12;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = 'chip';

    const speed = (7.5 + (powerPct / 100) * 7.5) * (0.85 + (shootStat / 100) * 0.25);
    this.ball.vx = Math.cos(angle) * speed;
    this.ball.vy = Math.sin(angle) * speed;
    this.ball.vz = 7.2 + (powerPct / 100) * 4.0;

    if (kicker.isHome) this.stats.homeShots++;
    else this.stats.awayShots++;

    this.bannerText = '🎈 CHIP SHOT';
    this.bannerTimer = 70;
  }

  private executeRegularShot(kicker: RealtimePlayer, stickAngle: number, powerPct: number) {
    const shootStat = kicker.playerData?.shooting ?? 60;
    const goalX = kicker.isHome ? PITCH_W : 0;

    let targetY: number;
    if (shootStat > 72) {
      const topCorner = kicker.y < PITCH_H / 2;
      targetY = topCorner ? GOAL_Y_TOP + 18 : GOAL_Y_BOTTOM - 18;
      targetY += (Math.random() - 0.5) * 18;
    } else {
      const spray = ((100 - shootStat) / 100) * (Math.random() - 0.5) * 135;
      targetY = PITCH_H / 2 + spray;
    }

    const angle = Math.atan2(targetY - kicker.y, goalX - kicker.x);

    sound.kick(0.9);
    kicker.isKicking = 12;
    this.releaseBallFromKicker(kicker);
    this.ball.shotType = 'regular';

    const speed = (14.0 + (powerPct / 100) * 11.5) * (0.80 + (shootStat / 100) * 0.38);
    this.ball.vx = Math.cos(angle) * speed;
    this.ball.vy = Math.sin(angle) * speed;
    this.ball.vz = 2.6 + (powerPct / 100) * 3.5;

    if (kicker.isHome) this.stats.homeShots++;
    else this.stats.awayShots++;

    this.bannerText = shootStat > 78 ? '💥 ROCKET STRIKE!' : '💥 POWER STRIKE';
    this.bannerTimer = 60;
  }

  // ================= STANDING TACKLE (Referee-Evaluated) =================
  private executeStandingTackle(defender: RealtimePlayer) {
    defender.isKicking = 8;
    sound.tackle();

    const opp = this.ball.carrier;
    if (!opp || opp.isHome === defender.isHome || opp.position === 'GK') return;
    if (defender.isSentOff || opp.isSentOff) return;

    const dist = Math.hypot(defender.x - opp.x, defender.y - opp.y);
    const defStr = defender.strength || 70;
    const defCtrl = defender.control || 70;
    const oppWeight = opp.weight || 75;
    const oppDrib = opp.dribbling || 70;

    const reach = Math.max(
      26,
      Math.min(
        48,
        36 + ((defStr * 0.6 + defCtrl * 0.4) / 100) * 16 -
          ((oppWeight * 0.5 + oppDrib * 0.5) / 100) * 10
      )
    );

    if (dist >= reach) return;

    const { zone } = this.classifyContactZone(defender, opp);

    const tacklerSnap: TacklerSnapshot = {
      tackling: defender.playerData?.tackling ?? 60,
      strength: defender.strength,
      positioning: defender.positioning,
      control: defender.control,
      mass: defender.mass,
      speed: Math.hypot(defender.vx, defender.vy),
      isSliding: false,
      priorYellow: defender.yellowCards,
    };

    const wasFacingAway = Math.abs(
      this.normalizeAngle(opp.facing - Math.atan2(defender.y - opp.y, defender.x - opp.x))
    ) > Math.PI / 2;

    const victimSnap: VictimSnapshot = {
      dribbling: opp.dribbling,
      strength: opp.strength,
      control: opp.control,
      mass: opp.mass,
      speed: Math.hypot(opp.vx, opp.vy),
      hasBall: true,
      wasFacingAway,
    };
    this.bannerText = `🎯 SLIDE: ${zone} (speed ${Math.hypot(defender.vx, defender.vy).toFixed(1)}, oppDrib ${oppDrib})`;
    this.bannerTimer = 60;
    const verdict = evaluateTackle(tacklerSnap, victimSnap, zone, {
      wasLate: false,
      fromBehindAggression: zone === 'behind' ? 0.7 : 0.3,
    });

    if (verdict.isFoul) {
      this.applyFoul(defender, opp, verdict);
      return;
    }

    const defPower = defStr * 0.44 + (defender.playerData?.tackling ?? 60) * 0.44 + defCtrl * 0.12;
    const oppResistance = oppDrib * 0.44 + opp.strength * 0.38 + opp.control * 0.18;
    const diff = defPower - oppResistance;
    const winProb = Math.max(0.12, Math.min(0.92, 0.5 + diff * 0.01));

    if (Math.random() < winProb) {
      this.releaseBallFromKicker(opp);
      this.ball.carrier = defender;
      this.ball.lastCarrier = defender;
      this.ball.lastTouchTeam = defender.isHome ? 'home' : 'away';
      this.ball.lastTouchPlayer = defender;

      const baseAng = Math.atan2(opp.y - defender.y, opp.x - defender.x);
      const randomDev = (Math.random() - 0.5) * 1.6;
      const knockAng = baseAng + randomDev;
      const knockSpd = 5.2 + (defStr / 100) * 2.8;

      opp.vx = Math.cos(knockAng) * knockSpd;
      opp.vy = Math.sin(knockAng) * knockSpd;
      opp.isStunned = 24 + Math.floor(Math.random() * 12);

      if (defender.isHome === this.userIsHome) {
        this.activeUserPlayer = defender;
        for (const p of this.players) p.isUser = p === defender;
      }

      this.bannerText = defStr > 75 ? '🛡️ PHYSICAL CRUNCH! TACKLE WON!' : '🛡️ TACKLE WON!';
      this.bannerTimer = 55;

      if (defender.isHome) this.stats.homeTacklesWon++;
      else this.stats.awayTacklesWon++;
    } else {
      defender.isStunned = 10;
      defender.vx *= 0.35;
      defender.vy *= 0.35;
      this.bannerText = `💨 CHALLENGE SHIELDED! (DRI ${oppDrib})`;
      this.bannerTimer = 40;
    }
  }

  // ================= SLIDE TACKLE (Referee-Evaluated) =================
  private executeSlideTackle(defender: RealtimePlayer, angle: number) {
    if (defender.isSentOff) return;
    if (defender.isSliding > 0) return;

    const defStr = defender.strength || 70;
    const defCtrl = defender.control || 70;

    defender.isSliding = 22;
    defender.facing = angle;

    const slideSpeed = 3.8;
    defender.vx = Math.cos(angle) * slideSpeed;
    defender.vy = Math.sin(angle) * slideSpeed;
    sound.slideTackle();

    const opp = this.ball.carrier;
    if (!opp || opp.isHome === defender.isHome || opp.position === 'GK') return;
    if (opp.isSentOff) return;

    const dist = Math.hypot(defender.x - opp.x, defender.y - opp.y);
    const oppWeight = opp.weight || 75;
    const oppDrib = opp.dribbling || 70;

    const reach = Math.max(
      32,
      Math.min(
        54,
        42 + ((defStr * 0.6 + defCtrl * 0.4) / 100) * 16 -
          ((oppWeight * 0.5 + oppDrib * 0.5) / 100) * 10
      )
    );

    if (dist >= reach) return;

    const { zone } = this.classifyContactZone(defender, opp);

    const victimMovingAway = Math.abs(
      this.normalizeAngle(opp.facing - Math.atan2(defender.y - opp.y, defender.x - opp.x))
    ) > Math.PI / 2;

    const ballWasReleased = !this.ball.carrier;

    const tacklerSnap: TacklerSnapshot = {
      tackling: defender.playerData?.tackling ?? 60,
      strength: defender.strength,
      positioning: defender.positioning,
      control: defender.control,
      mass: defender.mass,
      speed: Math.hypot(defender.vx, defender.vy),
      isSliding: true,
      priorYellow: defender.yellowCards,
    };

    const victimSnap: VictimSnapshot = {
      dribbling: opp.dribbling,
      strength: opp.strength,
      control: opp.control,
      mass: opp.mass,
      speed: Math.hypot(opp.vx, opp.vy),
      hasBall: !ballWasReleased,
      wasFacingAway: victimMovingAway,
    };

    const slideSpeedNow = Math.hypot(defender.vx, defender.vy);
    const behindAggression = zone === 'behind'
      ? Math.min(1, 0.5 + slideSpeedNow * 0.08)
      : 0.3;

    const verdict = evaluateTackle(tacklerSnap, victimSnap, zone, {
      wasLate: ballWasReleased,
      fromBehindAggression: behindAggression,
    });

    if (verdict.isFoul) {
      this.applyFoul(defender, opp, verdict);
      return;
    }

    this.releaseBallFromKicker(opp);
    this.ball.carrier = defender;
    this.ball.lastCarrier = defender;
    this.ball.lastTouchTeam = defender.isHome ? 'home' : 'away';
    this.ball.lastTouchPlayer = defender;
    this.ball.vx = defender.vx * 0.8;
    this.ball.vy = defender.vy * 0.8;

    const baseAng = Math.atan2(opp.y - defender.y, opp.x - defender.x);
    const randomDev = (Math.random() - 0.5) * 1.8;
    const knockAng = baseAng + randomDev;
    const knockSpeed = 6.0 + Math.random() * 2.5;

    opp.vx = Math.cos(knockAng) * knockSpeed;
    opp.vy = Math.sin(knockAng) * knockSpeed;
    opp.isStunned = 32 + Math.floor(Math.random() * 10);

    if (defender.isHome === this.userIsHome) {
      this.activeUserPlayer = defender;
      for (const p of this.players) p.isUser = p === defender;
    }

    const defTac = defender.playerData?.tackling ?? 60;
    this.bannerText = defTac > 75 ? '⚡ SWOS CRUNCHING CLEAN SLIDE!' : '⚡ CLEAN SLIDE TACKLE!';
    this.bannerTimer = 60;

    if (defender.isHome) this.stats.homeTacklesWon++;
    else this.stats.awayTacklesWon++;
  }

  // ================= FOUL APPLICATION (Referee Verdict) =================
  private applyFoul(
    tackler: RealtimePlayer,
    victim: RealtimePlayer,
    verdict: FoulVerdict
  ) {
    sound.whistle();

    const baseAng = Math.atan2(victim.y - tackler.y, victim.x - tackler.x);
    const knockAng = baseAng + (Math.random() - 0.5) * 1.5;
    victim.vx = Math.cos(knockAng) * 4.5;
    victim.vy = Math.sin(knockAng) * 4.5;
    victim.isStunned = verdict.severity === 'hard' ? 46 : 32;

    tackler.isStunned = verdict.severity === 'hard' ? 30 : 20;
    tackler.vx *= 0.4;
    tackler.vy *= 0.4;

    if (tackler.isHome) this.stats.homeFouls++;
    else this.stats.awayFouls++;

    const bannerMsg = describeFoul(tackler.shortName, verdict);
    this.bannerText = bannerMsg;
    this.bannerTimer = verdict.card === 'red' ? 160 : verdict.card === 'yellow' ? 130 : 80;
    this.addLog(bannerMsg);

    if (verdict.card === 'yellow') {
      tackler.yellowCards++;
      if (tackler.isHome) this.homeYellowCards++;
      else this.awayYellowCards++;

      if (tackler.playerData) {
        tackler.playerData.yellowCards = (tackler.playerData.yellowCards || 0) + 1;
      }
      this.lastFoulDescription = bannerMsg;
    } else if (verdict.card === 'red') {
      tackler.redCards = 1;
      tackler.isSentOff = true;
      if (tackler.isHome) this.homeRedCards++;
      else this.awayRedCards++;

      if (tackler.playerData) {
        tackler.playerData.redCards = (tackler.playerData.redCards || 0) + 1;
      }

      this.removeSentOffPlayer(tackler);
      sound.whistle(true);
      this.lastFoulDescription = bannerMsg;
    }

    const victimTeamIsHome = victim.isHome;
    this.setupFreeKick(victim.x, victim.y, victimTeamIsHome);
  }

  // ================= SEND-OFF (Red Card) =================
  private removeSentOffPlayer(player: RealtimePlayer) {
    player.isStunned = 999999;
    player.vx = 0;
    player.vy = 0;
    player.isSliding = 0;
    player.isDashing = 0;
    player.chargingType = null;
    player.chargePower = 0;

    if (this.ball.carrier === player) {
      this.releaseBallFromKicker(player);
    }

    if (this.activeUserPlayer === player) {
      this.switchActiveUserToNearest();
    }

    if (this.commandPressPlayerId === player.id) {
      this.commandPressPlayerId = null;
    }

    this.addLog(`🟥 ${player.shortName} is sent off! ${player.baseTeam.shortName} down to 10 men.`);
  }

  // ================= TACTICAL FORMATION SYNCHRONIZATION =================
  private handleTacticalAI() {
    for (const p of this.players) {
      if (p === this.activeUserPlayer) continue;
      if (p.isCommandPressed) continue;
      if (p.isSentOff) continue;

      if (p.position === 'GK') {
        this.updateGoalkeeperAI(p);
      } else {
        this.updateOutfieldTacticalAI(p);
      }
    }
  }

  private updateGoalkeeperAI(gk: RealtimePlayer) {
    if (this.state === 'goal') return;

    const isHome = gk.isHome;
    const baseGoalX = isHome ? 42 : PITCH_W - 42;
    const isAttackingStyle = gk.gkStyle === 'attacking';

    if (this.ball.carrier === gk) {
      gk.vx = 0;
      gk.vy = 0;
      gk.isRushing = false;
      gk.gkStrandedTimer = 0;

      if (gk.gkHoldTimer > 0) {
        gk.gkHoldTimer--;

        for (const opp of this.players) {
          if (opp.isHome !== isHome && !opp.isSentOff) {
            const distToGk = Math.hypot(opp.x - gk.x, opp.y - gk.y);
            if (distToGk < 150) {
              const repelAngle = Math.atan2(opp.y - gk.y, opp.x - gk.x);
              opp.vx = Math.cos(repelAngle) * 3.8;
              opp.vy = Math.sin(repelAngle) * 3.8;
            }
          }
        }
        return;
      }

      this.executeGoalkeeperKickOut(gk);
      return;
    }

    if (gk.gkStrandedTimer > 0) {
      gk.gkStrandedTimer--;
      const recoverySpd = gk.speed * 0.70;
      const recAngle = Math.atan2(PITCH_H / 2 - gk.y, baseGoalX - gk.x);
      gk.vx = Math.cos(recAngle) * recoverySpd;
      gk.vy = Math.sin(recAngle) * recoverySpd;
      gk.facing = isHome ? 0 : Math.PI;
      return;
    }

    let desiredGoalX = baseGoalX;
    if (isAttackingStyle) {
      const ballProgress = isHome ? this.ball.x / PITCH_W : (PITCH_W - this.ball.x) / PITCH_W;
      const forwardPush = 48 + ballProgress * 70;
      desiredGoalX = isHome ? baseGoalX + forwardPush : baseGoalX - forwardPush;
    } else {
      desiredGoalX = baseGoalX;
    }

    const targetY = Math.max(GOAL_Y_TOP + 12, Math.min(GOAL_Y_BOTTOM - 12, this.ball.y));
    const dy = targetY - gk.y;
    const isShotTowardsGk = isHome ? this.ball.vx < -0.4 : this.ball.vx > 0.4;
    const distToBall = Math.hypot(this.ball.x - gk.x, this.ball.y - gk.y);

    if (isShotTowardsGk && distToBall < 200 && !this.ball.carrier) {
      const toBallAngle = Math.atan2(this.ball.y - gk.y, this.ball.x - gk.x);
      const stepForwardX = isHome ? Math.min(gk.x + 22, desiredGoalX + 32) : Math.max(gk.x - 22, desiredGoalX - 32);
      gk.vx = (stepForwardX - gk.x) * 0.40 + (this.ball.x - gk.x) * 0.12;
      gk.vy = Math.sign(dy) * Math.min(Math.abs(dy) * 0.32, gk.speed * 1.35);
      gk.facing = toBallAngle;
    } else {
      gk.vy = Math.sign(dy) * Math.min(Math.abs(dy) * 0.18, gk.speed * 1.05);
      gk.vx = (desiredGoalX - gk.x) * 0.18;
      gk.facing = isHome ? 0 : Math.PI;
    }

    if (
      isAttackingStyle &&
      !this.ball.carrier &&
      this.ball.pickupCooldownCarrier !== gk &&
      this.state === 'play'
    ) {
      const inDefensiveThird = isHome ? this.ball.x < 420 : this.ball.x > PITCH_W - 420;
      const movingTowardsMyGoal = isHome ? this.ball.vx < 0.6 : this.ball.vx > -0.6;

      if (inDefensiveThird && movingTowardsMyGoal) {
        const myDefenders = this.players.filter((p) => p.isHome === isHome && p.position !== 'GK' && !p.isSentOff);
        const oppAttackers = this.players.filter((p) => p.isHome !== isHome && p.position !== 'GK' && !p.isSentOff);

        let minDefDist = Infinity;
        for (const def of myDefenders) {
          const d = Math.hypot(this.ball.landingX - def.x, this.ball.landingY - def.y);
          if (d < minDefDist) minDefDist = d;
        }

        let closestAtt: RealtimePlayer | null = null;
        let minAttDist = Infinity;
        for (const att of oppAttackers) {
          const d = Math.hypot(this.ball.landingX - att.x, this.ball.landingY - att.y);
          if (d < minAttDist) {
            minAttDist = d;
            closestAtt = att;
          }
        }

        const distGkToBall = Math.hypot(this.ball.landingX - gk.x, this.ball.landingY - gk.y);

        const defendersCaughtBehind = minAttDist < minDefDist - 30 || (closestAtt && (isHome ? closestAtt.x < myDefenders[0]?.x : closestAtt.x > myDefenders[0]?.x));

        if (defendersCaughtBehind && distGkToBall < 300 && closestAtt) {
          const awrChance = (gk.gkAwareness || 80) * 0.95;
          if (Math.random() * 100 < awrChance) {
            gk.isRushing = true;

            const rushAngle = Math.atan2(this.ball.landingY - gk.y, this.ball.landingX - gk.x);
            const rushSpeed = gk.speed * 1.35;
            gk.vx = Math.cos(rushAngle) * rushSpeed;
            gk.vy = Math.sin(rushAngle) * rushSpeed;
            gk.facing = rushAngle;

            const timeGk = distGkToBall / rushSpeed;
            const timeAtt = minAttDist / (closestAtt.speed * 1.20);

            const immediateDist = Math.hypot(this.ball.x - gk.x, this.ball.y - gk.y);
            if (immediateDist < 36 && this.ball.z < 28) {
              if (timeGk <= timeAtt + 2.5) {
                sound.save();
                this.ball.carrier = gk;
                this.ball.lastCarrier = gk;
                this.ball.lastTouchTeam = isHome ? 'home' : 'away';
                this.ball.lastTouchPlayer = gk;
                this.ball.deflectedBehindByDefense = false;
                this.ball.vx = 0;
                this.ball.vy = 0;
                this.ball.vz = 0;
                this.ball.z = 0;
                gk.isRushing = false;
                gk.gkHoldTimer = 110;
                this.bannerText = `🧤 SWEEPER CUT-OUT! (${gk.shortName.toUpperCase()} SPD ${Math.round(gk.speed * 10)} / AWR ${gk.gkAwareness})`;
                this.bannerTimer = 65;
                this.addLog(`🧤 Sweeper-Keeper ${gk.shortName} rushes off his line and cleanly cuts out the attacking ball!`);
                return;
              } else {
                gk.isRushing = false;
                gk.gkStrandedTimer = 75;
                this.bannerText = `🚨 GOALIE STRANDED! OPEN GOAL FOR ${closestAtt.shortName.toUpperCase()}!`;
                this.bannerTimer = 75;
                this.addLog(`🚨 ${gk.shortName} rushed out too late and is stranded! Open goal for ${closestAtt.shortName}!`);
                return;
              }
            }
            return;
          }
        }
      }
    }

    if (!this.ball.carrier && this.ball.pickupCooldownCarrier !== gk) {
      const distToBall = Math.hypot(this.ball.x - gk.x, this.ball.y - gk.y);
      const isShotTowardsGk = isHome ? this.ball.vx < -0.4 : this.ball.vx > 0.4;
      const attemptReach = 36 + ((gk.gkReach || 80) / 100) * 24 + (gk.speed / 100) * 10;

      if (distToBall < attemptReach && this.ball.z < CROSSBAR_HEIGHT + 12 && (isShotTowardsGk || distToBall < 34)) {
        if (this.ball.saveAttemptedGkId === gk.id) {
          return;
        }
        this.ball.saveAttemptedGkId = gk.id;

        const toBallAngle = Math.atan2(this.ball.y - gk.y, this.ball.x - gk.x);

        const reachScore = gk.gkReach || 80;
        const awrScore = gk.gkAwareness || 80;
        const jmpScore = gk.gkJumping || 80;
        const defScore = gk.defence || 80;
        const gkOverallSaveSkill = reachScore * 0.30 + awrScore * 0.30 + jmpScore * 0.20 + defScore * 0.20;

        const shotSpeed = Math.hypot(this.ball.vx, this.ball.vy);
        const shooterShooting = this.ball.lastTouchPlayer?.playerData?.shooting ?? 72;
        const shooterAttack = this.ball.lastTouchPlayer?.attack ?? 74;
        let shotThreat = shotSpeed * 5.2 + shooterShooting * 0.38 + shooterAttack * 0.24;

        const goalLineX = isHome ? 24 : PITCH_W - 24;
        const distToGoal = Math.hypot(goalLineX - this.ball.x, PITCH_H / 2 - this.ball.y);
        if (distToGoal < 240) {
          shotThreat += (240 - distToGoal) * 0.10;
        }

        const cornerOffset = Math.abs(this.ball.y - PITCH_H / 2);
        const cornerDifficulty = (cornerOffset / 55) * 32;

        let heightDifficulty = 0;
        if (this.ball.z > 20) {
          heightDifficulty = Math.max(0, (this.ball.z - 20) * 0.7 - (jmpScore - 65) * 0.3);
        }

        let pointBlankPenalty = 0;
        if (distToBall < 32 && shotSpeed > 7.5) {
          pointBlankPenalty = 18;
        }

        let stanceModifier = gk.gkStyle === 'defensive' ? 6 : -6;

        if (gk.gkStrandedTimer > 0) {
          stanceModifier -= 50;
        }

        if (this.ball.shotType === 'precision') {
          stanceModifier -= 22;
        }
        if (this.ball.shotType === 'chip' && (isAttackingStyle || gk.gkStrandedTimer > 0)) {
          stanceModifier -= 30;
        }

        const rawSaveChance =
          36 +
          (gkOverallSaveSkill - 78) * 0.42 -
          (shotThreat - 85) * 0.48 -
          cornerDifficulty -
          heightDifficulty -
          pointBlankPenalty +
          stanceModifier;

        const saveChance = Math.max(10, Math.min(64, Math.round(rawSaveChance)));
        const failChance = 100 - saveChance;
        const roll = Math.random() * 100;

        const diveDist = Math.min(distToBall * 0.75, 26);
        gk.x += Math.cos(toBallAngle) * diveDist;
        gk.y += Math.sin(toBallAngle) * diveDist;
        gk.facing = toBallAngle;

        if (roll >= saveChance) {
          const isSpill = defScore < 72 && Math.random() < 0.35;

          if (isSpill) {
            sound.save();
            gk.isDiving = 22;
            this.ball.vx = (Math.random() - 0.5) * 4.5;
            this.ball.vy = (Math.random() - 0.5) * 4.5;
            this.ball.vz = 2.2;
            this.ball.lastTouchTeam = isHome ? 'home' : 'away';
            this.ball.lastTouchPlayer = gk;
            this.ball.pickupCooldownCarrier = gk;
            this.ball.pickupCooldownTimer = 35;
            this.ball.shotType = null;

            this.bannerText = `⚠️ SPILLED SAVE! (${gk.shortName.toUpperCase()} FUMBLES - DEF ${defScore})`;
            this.bannerTimer = 65;
            this.addLog(`⚠️ ${gk.shortName} fumbles the save (${failChance}% goal chance)! Ball loose in danger zone!`);

            if (isHome) this.stats.awayShotsOnTarget++;
            else this.stats.homeShotsOnTarget++;
            return;
          } else {
            gk.isDiving = 26;
            gk.gkStrandedTimer = 65;
            gk.vx = (isHome ? -1 : 1) * 2.2;
            gk.vy = (this.ball.y > gk.y ? -1 : 1) * 2.8;

            this.ball.pickupCooldownCarrier = gk;
            this.ball.pickupCooldownTimer = 90;

            this.bannerText = `❌ GOAL! GK BEATEN (${failChance}% GOAL CHANCE · SHOT ${Math.round(shotThreat)})`;
            this.bannerTimer = 70;
            this.addLog(`⚽ ${gk.shortName} is beaten (${failChance}% goal chance)! Ball flies past into the net!`);

            if (isHome) this.stats.awayShotsOnTarget++;
            else this.stats.homeShotsOnTarget++;
            return;
          }
        }

        sound.save();

        const nearPostOrHigh = cornerOffset > 38 || this.ball.z > 24;

        if ((shotSpeed > 9.5 || nearPostOrHigh) && Math.random() < 0.32) {
          gk.isDiving = 26;
          this.ball.lastTouchTeam = isHome ? 'home' : 'away';
          this.ball.lastTouchPlayer = gk;
          this.ball.pickupCooldownCarrier = gk;
          this.ball.pickupCooldownTimer = 40;
          this.ball.deflectedBehindByDefense = true;

          const tipWideDir = this.ball.y < PITCH_H / 2 ? -1 : 1;
          this.ball.vx = isHome ? -6.0 - Math.random() * 2 : 6.0 + Math.random() * 2;
          this.ball.vy = tipWideDir * (5.0 + Math.random() * 2.0);
          this.ball.vz = Math.max(2.5, this.ball.vz * 0.6);

          const defendingTeamName = isHome ? this.home.shortName : this.away.shortName;
          const attackingTeamName = isHome ? this.away.shortName : this.home.shortName;
          this.bannerText = `🧤 FINGERTIP SAVE TIPPED WIDE! (${gk.shortName.toUpperCase()} RCH ${reachScore})`;
          this.bannerTimer = 65;
          this.addLog(`🧤 ${gk.shortName} (${defendingTeamName}) makes a fingertip save and tips it behind for a ${attackingTeamName} corner!`);

          if (isHome) this.stats.awayShotsOnTarget++;
          else this.stats.homeShotsOnTarget++;
          return;
        }

        gk.isDiving = 22;
        gk.x = this.ball.x - Math.cos(toBallAngle) * 6;
        gk.y = this.ball.y - Math.sin(toBallAngle) * 6;
        gk.facing = toBallAngle;

        this.ball.carrier = gk;
        this.ball.lastCarrier = gk;
        this.ball.lastTouchTeam = isHome ? 'home' : 'away';
        this.ball.lastTouchPlayer = gk;
        this.ball.deflectedBehindByDefense = false;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.vz = 0;
        this.ball.z = 0;
        gk.isRushing = false;
        gk.gkHoldTimer = 110;
        this.bannerText = `🧤 SAVED & HELD! (${gk.shortName.toUpperCase()} SAVE ${saveChance}%)`;
        this.bannerTimer = 65;
        this.addLog(`🧤 ${gk.shortName} dives towards the ball and holds it (${saveChance}% save chance). Waiting for formation regain.`);

        if (isHome) this.stats.awayShotsOnTarget++;
        else this.stats.homeShotsOnTarget++;
      }
    }
  }

  private executeGoalkeeperKickOut(gk: RealtimePlayer) {
    this.releaseBallFromKicker(gk);
    gk.isKicking = 18;
    gk.isRushing = false;
    gk.gk
	    gk.gkStrandedTimer = 0;

    const isHome = gk.isHome;
    const kickDir = isHome ? 1 : -1;

    const kickPwr = 15.5 + Math.random() * 3.2;
    const targetY = PITCH_H * (0.28 + Math.random() * 0.44);
    const dy = targetY - gk.y;
    const vy = Math.max(-4.5, Math.min(4.5, dy * 0.015));

    this.ball.x = gk.x + kickDir * 18;
    this.ball.y = gk.y;
    this.ball.z = 8;
    this.ball.vx = kickDir * kickPwr;
    this.ball.vy = vy;
    this.ball.vz = 11.5 + Math.random() * 2.5;
    this.ball.curve = (Math.random() - 0.5) * 0.2;
    this.ball.shotType = 'lob';
    this.ball.lastCarrier = gk;
    this.ball.lastTouchTeam = isHome ? 'home' : 'away';
    this.ball.lastTouchPlayer = gk;
    this.ball.pickupCooldownCarrier = gk;
    this.ball.pickupCooldownTimer = 40;
    this.ball.saveAttemptedGkId = null;

    sound.kick(1.0);
    this.bannerText = `🧤 KICK OUT! (${gk.shortName.toUpperCase()} PUNT UPFIELD)`;
    this.bannerTimer = 65;
    this.addLog(`🧤 ${gk.shortName} punts the ball high downfield into midfield after holding.`);
  }

  private updateOutfieldTacticalAI(p: RealtimePlayer) {
    if (p.isStunned > 0) {
      p.isStunned--;
      p.vx *= 0.65;
      p.vy *= 0.65;
      return;
    }

    const isHome = p.isHome;
    const teamHasBall = this.ball.carrier && this.ball.carrier.isHome === isHome;
    const isCarrier = this.ball.carrier === p;

    if (p.wasCarrier && !isCarrier && p.isKicking === 0) {
      p.vx *= 0.35;
      p.vy *= 0.35;
    }
    p.wasCarrier = isCarrier;

    if (isCarrier) {
      const goalX = isHome ? PITCH_W : 0;
      const distToGoal = Math.abs(goalX - p.x);

      if (distToGoal < 260 && Math.abs(p.y - PITCH_H / 2) < 170) {
        if (Math.random() < 0.05) {
          if (Math.random() < 0.4) {
            this.executeFinesseShot(p, p.facing, 80);
          } else {
            this.executeRegularShot(p, p.facing, 85);
          }
          return;
        }
      }

      if (Math.random() < 0.025) {
        this.executeGroundPass(p, isHome ? 0 : Math.PI, true);
        return;
      }

      const angle = Math.atan2(PITCH_H / 2 - p.y, goalX - p.x);
      p.vx = Math.cos(angle) * p.speed * 0.85;
      p.vy = Math.sin(angle) * p.speed * 0.85;
      p.facing = angle;
      return;
    }

    const gkHolding = this.ball.carrier && this.ball.carrier.position === 'GK' ? this.ball.carrier : null;
    if (gkHolding && p.isHome !== gkHolding.isHome) {
      const retreatTargetX = isHome ? PITCH_W * 0.42 : PITCH_W * 0.58;
      const dx = retreatTargetX - p.x;
      const dy = PITCH_H * p.baseRoleY - p.y;
      const moveAng = Math.atan2(dy, dx);
      p.vx = Math.cos(moveAng) * (p.speed * 0.85);
      p.vy = Math.sin(moveAng) * (p.speed * 0.85);
      p.facing = isHome ? 0 : Math.PI;
      return;
    }

    const relBallX = isHome ? this.ball.x / PITCH_W : (PITCH_W - this.ball.x) / PITCH_W;
    const relBallY = this.ball.y / PITCH_H;

    const zoneX = Math.min(6, Math.max(0, Math.floor(relBallX * 7)));
    const zoneY = Math.min(4, Math.max(0, Math.floor(relBallY * 5)));
    const spotIdx = zoneY * 7 + zoneX;

    let targetRelX = p.baseRoleX;
    let targetRelY = p.baseRoleY;

    const swosTactic: SWOSTacticData =
      p.baseTeam.customSwosTactic || generateSWOSTactic(p.baseTeam.formation, p.baseTeam.tactic);

    const outfieldIdx = p.number >= 2 && p.number <= 11 ? p.number - 2 : Math.max(0, p.number - 1);

    if (swosTactic && swosTactic.spots && swosTactic.spots[spotIdx] && swosTactic.spots[spotIdx][outfieldIdx]) {
      targetRelX = swosTactic.spots[spotIdx][outfieldIdx].x;
      targetRelY = swosTactic.spots[spotIdx][outfieldIdx].y;
    } else {
      const lateralShift = (relBallY - 0.5) * 0.18;
      targetRelX = p.baseRoleX;
      targetRelY = p.baseRoleY + lateralShift;
      if (teamHasBall) {
        if (p.position === 'ATT') targetRelX = Math.min(0.90, p.baseRoleX + 0.12);
        else if (p.position === 'MID') targetRelX = Math.min(0.72, p.baseRoleX + 0.16);
        else targetRelX = Math.min(0.50, p.baseRoleX + 0.18);
      } else {
        if (this.isDefender(p)) targetRelX = Math.min(0.24, 0.15 + zoneX * 0.025);
      }
    }

    targetRelX = Math.max(0.06, Math.min(0.94, targetRelX));
    targetRelY = Math.max(0.06, Math.min(0.94, targetRelY));

    let finalTargetX = isHome ? PITCH_W * targetRelX : PITCH_W * (1 - targetRelX);
    let finalTargetY = PITCH_H * targetRelY;

    // Team coordination & defensive depth
    const isCenterBack = p.role.includes('CB') || p.role === 'SW';
    const isFullback = p.role.includes('LB') || p.role.includes('RB') || p.role.includes('WB');

    if (this.isDefender(p)) {
      const defTeammates = this.players.filter((t) => t.isHome === isHome && t !== p && this.isDefender(t) && !t.isSentOff);
      const fullbacks = defTeammates.filter((t) => t.role.includes('LB') || t.role.includes('RB') || t.role.includes('WB'));
      const centerbacks = defTeammates.filter((t) => t.role.includes('CB') || t.role === 'SW');

      if (isHome) {
        if (isCenterBack && fullbacks.length > 0) {
          const minFullbackX = Math.min(...fullbacks.map((f) => f.x));
          finalTargetX = Math.min(finalTargetX, minFullbackX - 35);
        } else if (isFullback && centerbacks.length > 0) {
          const maxCbX = Math.max(...centerbacks.map((c) => c.x));
          finalTargetX = Math.max(finalTargetX, maxCbX + 35);
        }
      } else {
        if (isCenterBack && fullbacks.length > 0) {
          const maxFullbackX = Math.max(...fullbacks.map((f) => f.x));
          finalTargetX = Math.max(finalTargetX, maxFullbackX + 35);
        } else if (isFullback && centerbacks.length > 0) {
          const minCbX = Math.min(...centerbacks.map((c) => c.x));
          finalTargetX = Math.min(finalTargetX, minCbX - 35);
        }
      }
    }

    // Fullback winger tracking
    if (!teamHasBall && (p.role.includes('LB') || p.role.includes('RB') || p.role.includes('WB') || p.position === 'LB' || p.position === 'RB')) {
      const isLeftBack = p.role.includes('LB') || p.role.includes('LWB') || p.baseRoleY < 0.35;
      const oppOutfield = this.players.filter((opp) => opp.isHome !== isHome && opp.position !== 'GK' && !opp.isSentOff);

      let targetWinger: RealtimePlayer | null = null;
      if (isLeftBack) {
        const topWingers = oppOutfield.filter((opp) =>
          opp.role.includes('RW') || opp.role.includes('RM') || (opp.y < PITCH_H * 0.45 && (opp.position === 'ATT' || opp.position === 'MID'))
        );
        if (topWingers.length > 0) {
          targetWinger = topWingers.sort((a, b) => a.y - b.y)[0];
        }
      } else {
        const bottomWingers = oppOutfield.filter((opp) =>
          opp.role.includes('LW') || opp.role.includes('LM') || (opp.y > PITCH_H * 0.55 && (opp.position === 'ATT' || opp.position === 'MID'))
        );
        if (bottomWingers.length > 0) {
          targetWinger = bottomWingers.sort((a, b) => b.y - a.y)[0];
        }
      }

      if (targetWinger) {
        const posSkill = p.positioning || p.playerData?.positioning || 70;
        const goalSideCushion = Math.max(24, Math.min(65, 68 - ((posSkill - 50) / 50) * 40));
        const lateralShadow = Math.max(12, Math.min(30, 32 - ((posSkill - 50) / 50) * 18));

        const trackingTargetX = isHome
          ? Math.max(PITCH_W * 0.08, targetWinger.x - goalSideCushion)
          : Math.min(PITCH_W * 0.92, targetWinger.x + goalSideCushion);

        const trackingTargetY = isLeftBack
          ? Math.max(PITCH_H * 0.06, targetWinger.y - lateralShadow * 0.5)
          : Math.min(PITCH_H * 0.94, targetWinger.y + lateralShadow * 0.5);

        const trackWeight = Math.min(0.85, 0.55 + (posSkill / 100) * 0.30);
        finalTargetX = finalTargetX * (1 - trackWeight) + trackingTargetX * trackWeight;
        finalTargetY = finalTargetY * (1 - trackWeight) + trackingTargetY * trackWeight;
      }
    }

    // Midfielder marking opposing midfielders
    if (!teamHasBall && p.position === 'MID' && !p.role.includes('W')) {
      const oppMidfielders = this.players.filter((opp) => opp.isHome !== isHome && opp.position === 'MID' && !opp.isSentOff);
      if (oppMidfielders.length > 0) {
        const matchedOppMid = oppMidfielders.sort((a, b) => {
          const distA = Math.hypot(p.x - a.x, (p.y - a.y) * 1.4);
          const distB = Math.hypot(p.x - b.x, (p.y - b.y) * 1.4);
          return distA - distB;
        })[0];

        if (matchedOppMid) {
          const posSkill = p.positioning || p.playerData?.positioning || 70;
          const ballX = this.ball.x;
          const ballY = this.ball.y;
          const toBallAng = Math.atan2(ballY - matchedOppMid.y, ballX - matchedOppMid.x);

          const markDist = Math.max(26, Math.min(56, 58 - ((posSkill - 50) / 50) * 30));
          const markX = matchedOppMid.x + Math.cos(toBallAng) * markDist;
          const markY = matchedOppMid.y + Math.sin(toBallAng) * markDist;

          const markWeight = Math.min(0.78, 0.45 + (posSkill / 100) * 0.30);
          finalTargetX = finalTargetX * (1 - markWeight) + markX * markWeight;
          finalTargetY = finalTargetY * (1 - markWeight) + markY * markWeight;
        }
      }
    }

    // Attacker offside awareness & run timing
    const isForward = p.position === 'ATT' || p.role.includes('ST') || p.role.includes('W') || p.role.includes('CF');
    const isAttackingMid = p.position === 'MID' && (p.role.includes('AM') || p.role.includes('CAM') || p.role.includes('LM') || p.role.includes('RM'));

    let isCheckingRun = false;

    if (isForward || isAttackingMid) {
      const offsideLine = isHome ? this.homeAttackingOffsideLineX : this.awayAttackingOffsideLineX;

      const timeSeed = this.matchSeconds * 2.8 + p.number * 47;
      const cycle = timeSeed % 100;
      const isGamblingRun = cycle > 93.5;

      let desiredOffset: number;
      if (isGamblingRun) {
        const passSkill = p.playerData?.passing ?? 60;
        const depth = 8 + (100 - passSkill) * 0.12;
        desiredOffset = isHome ? depth : -depth;
      } else {
        const safeDepth = 14 + (p.number % 5) * 2.5;
        desiredOffset = isHome ? -safeDepth : safeDepth;
      }

      const boundX = offsideLine + desiredOffset;
      if (isHome) {
        finalTargetX = Math.min(finalTargetX, boundX);
      } else {
        finalTargetX = Math.max(finalTargetX, boundX);
      }

      const isCaughtOffside = isHome ? p.x > offsideLine + 2 : p.x < offsideLine - 2;
      if (isCaughtOffside && !isGamblingRun) {
        isCheckingRun = true;
        finalTargetX = isHome ? offsideLine - 24 : offsideLine + 24;
      }
    }

    // Active defensive shot blocking & man-marking
    const oppCarrier = this.ball.carrier && this.ball.carrier.isHome !== isHome ? this.ball.carrier : null;
    const distToBall = Math.hypot(this.ball.x - p.x, this.ball.y - p.y);
    const myGoalX = isHome ? 35 : PITCH_W - 35;
    const myGoalY = PITCH_H / 2;

    if (!this.ball.carrier && (this.ball.shotType || Math.abs(this.ball.vx) > 3.0)) {
      const isShotTowardsMyGoal = (isHome && this.ball.vx < -1.5) || (!isHome && this.ball.vx > 1.5);
      if (isShotTowardsMyGoal && (this.isDefender(p) || p.position === 'MID') && distToBall < 140) {
        const toGoalAngle = Math.atan2(myGoalY - this.ball.y, myGoalX - this.ball.x);
        const leadX = this.ball.x + Math.cos(toGoalAngle) * 22;
        const leadY = this.ball.y + Math.sin(toGoalAngle) * 22;

        const interceptAng = Math.atan2(leadY - p.y, leadX - p.x);
        p.vx = Math.cos(interceptAng) * (p.speed * 1.25);
        p.vy = Math.sin(interceptAng) * (p.speed * 1.25);
        p.facing = Math.atan2(this.ball.y - p.y, this.ball.x - p.x);

        if (distToBall < 55 && p.isSliding === 0) {
          p.isSliding = 16;
          p.vx = Math.cos(interceptAng) * 8.5;
          p.vy = Math.sin(interceptAng) * 8.5;
          sound.slideTackle();
          this.bannerText = '🛡️ BLOCKING LUNGE!';
          this.bannerTimer = 45;
        }
        return;
      }
    }

    if (oppCarrier) {
      // 1. Defenders step out to block
      if (this.isDefender(p)) {
        const defs = this.players
          .filter((d) => d.isHome === isHome && this.isDefender(d) && d.isStunned === 0 && !d.isSentOff)
          .sort((a, b) => Math.hypot(a.x - oppCarrier.x, a.y - oppCarrier.y) - Math.hypot(b.x - oppCarrier.x, b.y - oppCarrier.y));

        const isPrimaryBlocker = defs[0] === p;

        if (isPrimaryBlocker && distToBall < 180) {
          const toGoalAng = Math.atan2(myGoalY - oppCarrier.y, myGoalX - oppCarrier.x);
          const blockDistance = Math.min(64, Math.max(46, distToBall * 0.52));
          const blockTargetX = oppCarrier.x + Math.cos(toGoalAng) * blockDistance;
          const blockTargetY = oppCarrier.y + Math.sin(toGoalAng) * blockDistance;

          const toBlockAng = Math.atan2(blockTargetY - p.y, blockTargetX - p.x);
          p.vx = Math.cos(toBlockAng) * (p.speed * 0.86);
          p.vy = Math.sin(toBlockAng) * (p.speed * 0.86);
          p.facing = Math.atan2(oppCarrier.y - p.y, oppCarrier.x - p.x);
          p.jockeyTimer = 20;

          if (distToBall < 26) {
            if (p.isSliding === 0 && Math.random() < 0.12) {
              this.executeSlideTackle(p, p.facing);
            } else if (Math.random() < 0.22) {
              this.executeStandingTackle(p);
            }
          }
          return;
        }
      }

      const isAttackerDrivingForward = isHome
        ? (oppCarrier.vx < 0.1 || oppCarrier.x < PITCH_W * 0.7)
        : (oppCarrier.vx > -0.1 || oppCarrier.x > PITCH_W * 0.3);

      const defendingMids = this.players
        .filter((m) => m.isHome === isHome && m.position === 'MID' && m.isStunned === 0 && !m.isSentOff)
        .sort((a, b) => Math.hypot(a.x - oppCarrier.x, a.y - oppCarrier.y) - Math.hypot(b.x - oppCarrier.x, b.y - oppCarrier.y));

      const isPrimaryMidfieldHunter = defendingMids[0] === p;
      const isSecondaryPincer = defendingMids[1] === p;

      // 2. Primary midfield hunter
      if (p.position === 'MID' && isPrimaryMidfieldHunter && distToBall < 200) {
        const leadFrames = Math.min(10, Math.max(3, distToBall / 22));
        const interceptX = oppCarrier.x + oppCarrier.vx * leadFrames;
        const interceptY = oppCarrier.y + oppCarrier.vy * leadFrames;

        const toInterceptAngle = Math.atan2(interceptY - p.y, interceptX - p.x);
        const isSwosPress =
          p.baseTeam.tactic === 'SWOS Press' ||
          p.baseTeam.tactic === 'High Press' ||
          p.baseTeam.tactic === 'SWOS Total';
        const pressSpd = p.speed * (isSwosPress ? 0.94 : 0.86);

        p.vx = Math.cos(toInterceptAngle) * pressSpd;
        p.vy = Math.sin(toInterceptAngle) * pressSpd;
        p.facing = Math.atan2(oppCarrier.y - p.y, oppCarrier.x - p.x);

        if (distToBall < 26) {
          if (p.isSliding === 0 && Math.random() < 0.14) {
            this.executeSlideTackle(p, p.facing);
            this.bannerText = '💥 TACKLE CHALLENGE!';
            this.bannerTimer = 45;
          } else if (Math.random() < 0.22) {
            this.executeStandingTackle(p);
            this.bannerText = '🛡️ MIDFIELD CHALLENGE!';
            this.bannerTimer = 45;
          }
        }
        return;
      }

      // 3. Secondary midfield pincer
      if (p.position === 'MID' && isSecondaryPincer && distToBall < 180 && isAttackerDrivingForward) {
        const lateralOffset = p.y > oppCarrier.y ? 45 : -45;
        const pincerTargetY = oppCarrier.y + lateralOffset;
        const pincerTargetX = oppCarrier.x + (isHome ? 35 : -35);

        const pincerAng = Math.atan2(pincerTargetY - p.y, pincerTargetX - p.x);
        p.vx = Math.cos(pincerAng) * (p.speed * 0.82);
        p.vy = Math.sin(pincerAng) * (p.speed * 0.82);
        p.facing = Math.atan2(oppCarrier.y - p.y, oppCarrier.x - p.x);

        if (distToBall < 24 && Math.random() < 0.18) {
          this.executeStandingTackle(p);
        }
        return;
      }
    }

    // 4. Loose ball reaction
    if (!this.ball.carrier && this.ball.pickupCooldownCarrier !== p && this.state === 'play') {
      const outfieldTeammates = this.players.filter(
        (t) => t.isHome === isHome && t.position !== 'GK' && t.isStunned === 0 && !t.isSentOff
      );

      let closestTeammate: RealtimePlayer | null = null;
      let minTeammateDist = Infinity;
      for (const tm of outfieldTeammates) {
        const d = Math.hypot(this.ball.landingX - tm.x, this.ball.landingY - tm.y);
        if (d < minTeammateDist) {
          minTeammateDist = d;
          closestTeammate = tm;
        }
      }

      const isClosestToBall = closestTeammate === p;

      if (isClosestToBall || distToBall < 220) {
        const toBallAng = Math.atan2(this.ball.landingY - p.y, this.ball.landingX - p.x);
        const chaseSpeed = isClosestToBall ? p.speed * 1.18 : p.speed * 1.05;
        p.vx = Math.cos(toBallAng) * chaseSpeed;
        p.vy = Math.sin(toBallAng) * chaseSpeed;
        p.facing = toBallAng;
        return;
      }
    }

    // 5. Zonal positioning & teammate repulsion
    let repelX = 0;
    let repelY = 0;
    const nearbyTeammates = this.players.filter((t) => t.isHome === isHome && t !== p && t.position !== 'GK' && !t.isSentOff);
    for (const tm of nearbyTeammates) {
      const tdist = Math.hypot(p.x - tm.x, p.y - tm.y);
      if (tdist < 48 && tdist > 0.1) {
        const push = ((48 - tdist) / 48) * 0.65;
        repelX += ((p.x - tm.x) / tdist) * push;
        repelY += ((p.y - tm.y) / tdist) * push;
      }
    }

    if (isCheckingRun) {
      const runBackAng = isHome ? Math.PI : 0;
      p.vx = Math.cos(runBackAng) * (p.speed * 1.15);
      p.vy = (finalTargetY - p.y) * 0.08;
      p.facing = isHome ? 0 : Math.PI;
      return;
    }

    const dx = finalTargetX - p.x;
    const dy = finalTargetY - p.y;
    const distToAnchor = Math.hypot(dx, dy);

    if (distToAnchor > 14) {
      const stepSpd = Math.min(distToAnchor * 0.07, p.speed * 0.92);
      const moveAng = Math.atan2(dy, dx);
      p.vx = Math.cos(moveAng) * stepSpd + repelX;
      p.vy = Math.sin(moveAng) * stepSpd + repelY;
      p.facing = isHome ? 0 : Math.PI;
    } else {
      p.vx = p.vx * 0.6 + repelX * 0.3;
      p.vy = p.vy * 0.6 + repelY * 0.3;
    }
  }

  // ================= 3D BALL PHYSICS (FLOATING ARC & PREDICTED LANDING) =================
  private updateBallPhysics() {
    if (this.ball.pickupCooldownTimer > 0) {
      this.ball.pickupCooldownTimer--;
      if (this.ball.pickupCooldownTimer === 0) {
        this.ball.pickupCooldownCarrier = null;
      }
    }

    if (this.ball.carrier) {
      const carrier = this.ball.carrier;
      const carrierMoveSpd = Math.hypot(carrier.vx, carrier.vy);

      if (
        carrierMoveSpd > 2.2 &&
        this.state === 'play' &&
        carrier.isKicking === 0 &&
        carrier.position !== 'GK'
      ) {
        const dribSkill = carrier.dribbling || 70;
        if (dribSkill < 82) {
          const isSprinting = carrier.isDashing > 0 || Math.abs(carrierMoveSpd) > carrier.speed * 1.1;
          const sprintMultiplier = isSprinting ? 1.7 : 1.0;
          const looseChance = ((82 - dribSkill) / 82) * 0.0032 * sprintMultiplier;

          if (Math.random() < looseChance) {
            this.releaseBallFromKicker(carrier);
            const pushSpd = carrierMoveSpd * 1.35 + 1.4;
            this.ball.vx = Math.cos(carrier.facing) * pushSpd;
            this.ball.vy = Math.sin(carrier.facing) * pushSpd;
            this.ball.pickupCooldownCarrier = carrier;
            this.ball.pickupCooldownTimer = 16;
            this.bannerText = `💨 HEAVY TOUCH! (${carrier.shortName.toUpperCase()} DRI ${dribSkill})`;
            this.bannerTimer = 40;
            sound.kick(0.3);
            return;
          }
        }
      }

      const offset = 15;
      this.ball.x = this.ball.carrier.x + Math.cos(this.ball.carrier.facing) * offset;
      this.ball.y = this.ball.carrier.y + Math.sin(this.ball.carrier.facing) * offset;
      this.ball.z = 0;
      this.ball.vx = this.ball.carrier.vx;
      this.ball.vy = this.ball.carrier.vy;
      this.ball.vz = 0;
      this.ball.landingX = this.ball.x;
      this.ball.landingY = this.ball.y;
      return;
    }

    if (this.ball.z > 0 && Math.abs(this.ball.curve) > 0.01) {
      const lateralX = -this.ball.vy * this.ball.curve * 0.035;
      const lateralY = this.ball.vx * this.ball.curve * 0.035;
      this.ball.vx += lateralX;
      this.ball.vy += lateralY;
    }

    if (this.ball.isKnuckle && this.ball.z > 4) {
      this.ball.vx += (Math.random() - 0.5) * 0.35;
      this.ball.vy += (Math.random() - 0.5) * 0.35;
    }

    this.ball.x += this.ball.vx * this.gameSpeed;
    this.ball.y += this.ball.vy * this.gameSpeed;
    this.ball.z += this.ball.vz * this.gameSpeed;

    const gravity = 0.32;

    if (this.ball.z > 0) {
      this.ball.vz -= gravity * this.gameSpeed;
      this.ball.vx *= 0.996;
      this.ball.vy *= 0.996;

      const t1 = Math.max(0, this.ball.vz / gravity);
      const zMax = Math.max(this.ball.z, this.ball.z + 0.5 * this.ball.vz * t1);
      const t2 = Math.sqrt(Math.max(0, (2 * zMax) / gravity));
      const tTotal = t1 + t2;
      this.ball.landingX = this.ball.x + this.ball.vx * tTotal;
      this.ball.landingY = this.ball.y + this.ball.vy * tTotal;
    } else {
      this.ball.z = 0;
      this.ball.landingX = this.ball.x;
      this.ball.landingY = this.ball.y;

      if (Math.abs(this.ball.vz) > 0.8) {
        if (this.ball.shotType === 'lob') {
          const bounceCoeff = 0.28 + Math.random() * 0.34;
          this.ball.vz = -this.ball.vz * bounceCoeff;

          const currentSpeed = Math.hypot(this.ball.vx, this.ball.vy);
          const currentHeading = Math.atan2(this.ball.vy, this.ball.vx);

          const oddDeflection = (Math.random() - 0.5) * 0.44;
          const spinBite = 0.50 + Math.random() * 0.40;
          const newSpeed = currentSpeed * spinBite;

          this.ball.vx = Math.cos(currentHeading + oddDeflection) * newSpeed;
          this.ball.vy = Math.sin(currentHeading + oddDeflection) * newSpeed;

          if (Math.abs(this.ball.vz) > 1.8) {
            this.ball.vy += (Math.random() - 0.5) * 2.2;
          }
          sound.kick(0.35);
        } else {
          this.ball.vz = -this.ball.vz * 0.45;
        }
        this.ball.curve *= 0.7;
      } else {
        this.ball.vz = 0;
        this.ball.isKnuckle = false;
      }

      this.ball.vx *= 0.982;
      this.ball.vy *= 0.982;
    }

    // Active outfield shot & cross blocking
    if (this.ball.z < 38 && (this.ball.shotType || Math.abs(this.ball.vx) > 2.8) && !this.ball.carrier) {
      for (const p of this.players) {
        if (p.position === 'GK') continue;
        if (p.isStunned > 0) continue;
        if (p.isSentOff) continue;
        const isDefending = (p.isHome && this.ball.vx < -1.0) || (!p.isHome && this.ball.vx > 1.0);
        if (!isDefending) continue;

        const d = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
        const blockReach = p.isSliding > 0 ? 38 : (p.jockeyTimer ? 30 : 24);

        if (d < blockReach) {
          sound.tackle();
          p.isKicking = 8;
          this.ball.lastTouchTeam = p.isHome ? 'home' : 'away';
          this.ball.lastTouchPlayer = p;
          this.ball.shotType = null;
          this.activePassOffside = null;

          const isAtGoalLine = (p.isHome ? p.x < 48 : p.x > PITCH_W - 48) && p.isSliding > 0;
          if (isAtGoalLine && Math.random() < 0.08) {
            this.ball.deflectedBehindByDefense = true;
            this.ball.vx = p.isHome ? -5.0 - Math.random() * 2.0 : 5.0 + Math.random() * 2.0;
            this.ball.vy = (Math.random() - 0.5) * 6.5;
            this.ball.vz = 2.0 + Math.random() * 1.5;
            this.bannerText = `🛡️ DEFLECTED BEHIND BY ${p.shortName.toUpperCase()}!`;
            this.bannerTimer = 65;
          } else {
            this.ball.deflectedBehindByDefense = false;
            const clearDir = p.isHome ? 1 : -1;
            this.ball.vx = clearDir * (3.5 + Math.random() * 3.5);
            this.ball.vy = (Math.random() - 0.5) * 5.0;
            this.ball.vz = Math.min(4.0, Math.abs(this.ball.vz) * 0.4 + 1.2);
            this.bannerText = `🛡️ SHOT BLOCKED BY ${p.shortName.toUpperCase()}!`;
            this.bannerTimer = 55;
            this.addLog(`Heroic block by ${p.shortName} to deny the shot!`);
          }

          if (p.isHome) this.stats.homeTacklesWon++;
          else this.stats.awayTacklesWon++;
          break;
        }
      }
    }

    // Loose ball pickup
    if (this.ball.z < 26 && !this.ball.carrier) {
      for (const p of this.players) {
        if (p.isSentOff) continue;
        const d = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);

        if (d < 20 && (p.isStunned > 0 || (p === this.ball.pickupCooldownCarrier && this.ball.pickupCooldownTimer > 0))) {
          this.ball.lastTouchTeam = p.isHome ? 'home' : 'away';
          this.ball.lastTouchPlayer = p;
          this.ball.vx = this.ball.vx * -0
		            this.ball.vx = this.ball.vx * -0.45 + (Math.random() - 0.5) * 2;
          this.ball.vy = this.ball.vy * -0.45 + (Math.random() - 0.5) * 2;
          continue;
        }

        if (p.isStunned > 0) continue;
        if (p === this.ball.pickupCooldownCarrier && this.ball.pickupCooldownTimer > 0) continue;

        if (d < 24) {
          if (this.activePassOffside) {
            if (this.activePassOffside.isHomeAttacking === p.isHome) {
              if (this.activePassOffside.offsidePlayerIds.has(p.id)) {
                this.triggerOffside(p);
                return;
              } else if (p.id !== this.activePassOffside.passerId) {
                this.activePassOffside = null;
              }
            } else {
              this.activePassOffside = null;
            }
          }

          this.ball.carrier = p;
          this.ball.lastCarrier = p;
          this.ball.lastTouchTeam = p.isHome ? 'home' : 'away';
          this.ball.lastTouchPlayer = p;
          this.ball.shotType = null;
          this.ball.pickupCooldownCarrier = null;
          this.ball.pickupCooldownTimer = 0;

          if (p.position === 'GK') {
            p.isUser = false;
            p.gkHoldTimer = 110;
          } else if (p.isHome === this.userIsHome) {
            this.activeUserPlayer = p;
            for (const other of this.players) other.isUser = other === p;
          }
          break;
        }
      }
    }
  }

  // ================= PLAYER PHYSICS & BOUNDARIES =================
  private updatePlayerPhysics() {
    for (const p of this.players) {
      if (p.isSentOff) continue;

      if (p.isSliding > 0) {
        p.isSliding--;
        const slideRatio = p.isSliding / 22;
        const slideSpeed = 1.5 + slideRatio * 2.8;
        p.vx = Math.cos(p.facing) * slideSpeed;
        p.vy = Math.sin(p.facing) * slideSpeed;
      }
      if (p.isKicking > 0) p.isKicking--;
      if (p.isDashing > 0) p.isDashing--;
      if (p.jockeyTimer > 0) p.jockeyTimer--;

      if (p.isStunned > 0) {
        p.vx *= 0.72;
        p.vy *= 0.72;
      }

      p.x += p.vx * this.gameSpeed;
      p.y += p.vy * this.gameSpeed;

      p.x = Math.max(16, Math.min(PITCH_W - 16, p.x));
      p.y = Math.max(16, Math.min(PITCH_H - 16, p.y));
    }
  }

  // ================= DYNAMIC COLLISION ZONES & IMPACT DISPERSION =================
  private handlePlayerCollisionsAndDuels() {
    if (this.state !== 'play') return;

    // 1. CARRIER PHYSICAL DUELS ON IMPACT
    const carrier = this.ball.carrier;
    if (carrier && carrier.position !== 'GK' && carrier.isStunned === 0 && !carrier.isSentOff) {
      for (const opp of this.players) {
        if (opp.isHome === carrier.isHome) continue;
        if (opp.position === 'GK') continue;
        if (opp.isStunned > 0) continue;
        if (opp.isSentOff) continue;

        const dist = Math.hypot(opp.x - carrier.x, opp.y - carrier.y);

        const oppStr = opp.strength || 70;
        const oppCtrl = opp.control || 70;
        const carrierWeight = carrier.weight || 75;
        const carrierDrib = carrier.dribbling || 70;

        const dynamicCollisionZone = Math.max(
          18,
          Math.min(
            38,
            24 +
              ((oppStr * 0.6 + oppCtrl * 0.4) / 100) * 14 -
              ((carrierWeight * 0.5 + carrierDrib * 0.5) / 100) * 10
          )
        );

        if (dist < dynamicCollisionZone) {
          const isChallengerTooWeak = (oppStr < 65 && carrierDrib >= 70) || (oppStr < carrierDrib - 10);
          if (isChallengerTooWeak) {
            const baseAngle = Math.atan2(opp.y - carrier.y, opp.x - carrier.x);
            const repelAngle = baseAngle + (Math.random() - 0.5) * 0.8;
            opp.vx = Math.cos(repelAngle) * 4.2;
            opp.vy = Math.sin(repelAngle) * 4.2;
            opp.isStunned = 14;
            this.bannerText = `💨 ${carrier.shortName.toUpperCase()} SHIELDS! (${opp.shortName.toUpperCase()} STR ${oppStr} TOO LOW VS DRI ${carrierDrib})`;
            this.bannerTimer = 45;
            sound.kick(0.3);
            break;
          }

          const oppTac = opp.playerData?.tackling ?? 60;
          const carrierStr = carrier.strength || 70;
          const defScore = oppStr * 0.44 + oppTac * 0.44 + oppCtrl * 0.12;
          const attScore = carrierDrib * 0.44 + carrierStr * 0.38 + (carrier.control || 70) * 0.18;
          const diff = defScore - attScore;

          const winProb = Math.max(0.12, Math.min(0.92, 0.50 + diff * 0.010));

          if (Math.random() < winProb) {
            sound.tackle();
            this.releaseBallFromKicker(carrier);
            this.ball.carrier = opp;
            this.ball.lastCarrier = opp;
            this.ball.lastTouchTeam = opp.isHome ? 'home' : 'away';
            this.ball.lastTouchPlayer = opp;

            const baseAngle = Math.atan2(carrier.y - opp.y, carrier.x - opp.x);
            const randomSpread = (Math.random() - 0.5) * 1.6;
            const knockAngle = baseAngle + randomSpread;
            const knockSpeed = 5.2 + (oppStr / 100) * 2.8;

            carrier.vx = Math.cos(knockAngle) * knockSpeed;
            carrier.vy = Math.sin(knockAngle) * knockSpeed;
            carrier.isStunned = 22 + Math.floor(Math.random() * 10);

            if (opp.isHome === this.userIsHome) {
              this.activeUserPlayer = opp;
              for (const p of this.players) p.isUser = p === opp;
            }

            this.bannerText = `🛡️ ${opp.shortName.toUpperCase()} MUSCLES BALL OFF ${carrier.shortName.toUpperCase()}!`;
            this.bannerTimer = 45;

            if (opp.isHome) this.stats.homeTacklesWon++;
            else this.stats.awayTacklesWon++;
            break;
          } else {
            const baseAngle = Math.atan2(opp.y - carrier.y, opp.x - carrier.x);
            const repelAngle = baseAngle + (Math.random() - 0.5) * 0.8;
            opp.vx = Math.cos(repelAngle) * 3.5;
            opp.vy = Math.sin(repelAngle) * 3.5;
            opp.isStunned = 10;
            this.bannerText = `💨 ${carrier.shortName.toUpperCase()} BRUSHES OFF CHALLENGE!`;
            this.bannerTimer = 35;
            break;
          }
        }
      }
    }

    // 2. MASS-WEIGHTED BODY CONTACT SEPARATION
    for (let i = 0; i < this.players.length; i++) {
      const p1 = this.players[i];
      if (p1.position === 'GK' || p1.isSentOff) continue;

      for (let j = i + 1; j < this.players.length; j++) {
        const p2 = this.players[j];
        if (p2.position === 'GK' || p2.isSentOff) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);

        const bodyDist = 20;
        if (dist >= bodyDist || dist <= 0.01) continue;

        const m1 = Math.max(50, p1.mass);
        const m2 = Math.max(50, p2.mass);
        const totalM = m1 + m2;
        const push1 = m2 / totalM;
        const push2 = m1 / totalM;

        const s1 = (p1.strength || 70) / 100;
        const s2 = (p2.strength || 70) / 100;
        const hold1 = 1 - s1 * 0.3;
        const hold2 = 1 - s2 * 0.3;

        const overlap = (bodyDist - dist) / dist;

        p1.x -= dx * overlap * push1 * hold1 * 0.55;
        p1.y -= dy * overlap * push1 * hold1 * 0.55;
        p2.x += dx * overlap * push2 * hold2 * 0.55;
        p2.y += dy * overlap * push2 * hold2 * 0.55;

        const vRel = (p2.vx - p1.vx) * dx + (p2.vy - p1.vy) * dy;
        if (vRel < 0) {
          const impulse = -vRel * 0.05 * overlap;
          p1.vx -= (dx * impulse / Math.max(1, dist)) * push1;
          p1.vy -= (dy * impulse / Math.max(1, dist)) * push1;
          p2.vx += (dx * impulse / Math.max(1, dist)) * push2;
          p2.vy += (dy * impulse / Math.max(1, dist)) * push2;
        }
      }
    }
  }

  // ================= GOAL & BOUNDARY DETECTION =================
  private checkGoalAndPitchBounds() {
    if (this.state !== 'play') return;

    if (this.ball.carrier) {
      this.ball.lastTouchTeam = this.ball.carrier.isHome ? 'home' : 'away';
      this.ball.lastTouchPlayer = this.ball.carrier;
    }

    const isStrictlyBetweenPosts =
      this.ball.y > (GOAL_Y_TOP + 5) && this.ball.y < (GOAL_Y_BOTTOM - 5);
    const isUnderCrossbar = this.ball.z <= CROSSBAR_HEIGHT;

    // LEFT GOAL
    const isNearLeftTopPost =
      Math.abs(this.ball.y - GOAL_Y_TOP) <= 7.5 &&
      this.ball.x >= 2 &&
      this.ball.x <= 18 &&
      this.ball.z <= CROSSBAR_HEIGHT + 4;
    const isNearLeftBottomPost =
      Math.abs(this.ball.y - GOAL_Y_BOTTOM) <= 7.5 &&
      this.ball.x >= 2 &&
      this.ball.x <= 18 &&
      this.ball.z <= CROSSBAR_HEIGHT + 4;

    if (isNearLeftTopPost || isNearLeftBottomPost) {
      sound.postHit();
      this.ball.vx = Math.abs(this.ball.vx) * 0.75 + 2.5;
      this.ball.vy = (isNearLeftTopPost ? -1 : 1) * (Math.abs(this.ball.vy) * 0.75 + 2.0);
      this.bannerText = '💥 OFF THE POST!';
      this.bannerTimer = 45;
      return;
    }

    if (
      isStrictlyBetweenPosts &&
      Math.abs(this.ball.z - CROSSBAR_HEIGHT) <= 7.0 &&
      this.ball.x >= 2 &&
      this.ball.x <= 18
    ) {
      sound.postHit();
      this.ball.vx = Math.abs(this.ball.vx) * 0.70 + 2.5;
      this.ball.vz = -Math.abs(this.ball.vz) * 0.6;
      this.bannerText = '💥 OFF THE CROSSBAR!';
      this.bannerTimer = 45;
      return;
    }

    if (this.ball.x <= 8) {
      if (isStrictlyBetweenPosts && isUnderCrossbar) {
        this.onGoalScored(false);
        return;
      } else {
        const isTopSide = this.ball.y < PITCH_H / 2;
        if (this.ball.deflectedBehindByDefense && this.ball.lastTouchTeam === 'home') {
          this.stats.awayCorners = (this.stats.awayCorners || 0) + 1;
          this.setupCornerKick(false, isTopSide);
        } else {
          this.setupGoalKick(true);
        }
        return;
      }
    }

    // RIGHT GOAL
    const isNearRightTopPost =
      Math.abs(this.ball.y - GOAL_Y_TOP) <= 7.5 &&
      this.ball.x >= PITCH_W - 18 &&
      this.ball.x <= PITCH_W - 2 &&
      this.ball.z <= CROSSBAR_HEIGHT + 4;
    const isNearRightBottomPost =
      Math.abs(this.ball.y - GOAL_Y_BOTTOM) <= 7.5 &&
      this.ball.x >= PITCH_W - 18 &&
      this.ball.x <= PITCH_W - 2 &&
      this.ball.z <= CROSSBAR_HEIGHT + 4;

    if (isNearRightTopPost || isNearRightBottomPost) {
      sound.postHit();
      this.ball.vx = -Math.abs(this.ball.vx) * 0.75 - 2.5;
      this.ball.vy = (isNearRightTopPost ? -1 : 1) * (Math.abs(this.ball.vy) * 0.75 + 2.0);
      this.bannerText = '💥 OFF THE POST!';
      this.bannerTimer = 45;
      return;
    }

    if (
      isStrictlyBetweenPosts &&
      Math.abs(this.ball.z - CROSSBAR_HEIGHT) <= 7.0 &&
      this.ball.x >= PITCH_W - 18 &&
      this.ball.x <= PITCH_W - 2
    ) {
      sound.postHit();
      this.ball.vx = -Math.abs(this.ball.vx) * 0.70 - 2.5;
      this.ball.vz = -Math.abs(this.ball.vz) * 0.6;
      this.bannerText = '💥 OFF THE CROSSBAR!';
      this.bannerTimer = 45;
      return;
    }

    if (this.ball.x >= PITCH_W - 8) {
      if (isStrictlyBetweenPosts && isUnderCrossbar) {
        this.onGoalScored(true);
        return;
      } else {
        const isTopSide = this.ball.y < PITCH_H / 2;
        if (this.ball.deflectedBehindByDefense && this.ball.lastTouchTeam === 'away') {
          this.stats.homeCorners = (this.stats.homeCorners || 0) + 1;
          this.setupCornerKick(true, isTopSide);
        } else {
          this.setupGoalKick(false);
        }
        return;
      }
    }

    // TOUCHLINES
    if (this.ball.y <= 6 || this.ball.y >= PITCH_H - 6) {
      const isTop = this.ball.y <= 6;
      const homeGetsThrowIn = this.ball.lastTouchTeam === 'away';
      if (homeGetsThrowIn) {
        this.stats.homeThrowIns = (this.stats.homeThrowIns || 0) + 1;
      } else {
        this.stats.awayThrowIns = (this.stats.awayThrowIns || 0) + 1;
      }
      this.setupThrowIn(homeGetsThrowIn, this.ball.x, isTop);
      return;
    }
  }

  // ================= SET PIECE RESTARTS =================
  public setupCornerKick(isHomeAttacking: boolean, isTopCorner: boolean) {
    this.state = 'corner';
    this.stateTimer = 110;
    this.cornerSideIsTop = isTopCorner;
    sound.whistle();

    const attackingTeam = isHomeAttacking ? this.home : this.away;
    const defendingTeam = isHomeAttacking ? this.away : this.home;
    const attackingColor = isHomeAttacking ? 'RED' : 'BLUE';
    const defendingColor = isHomeAttacking ? 'BLUE' : 'RED';

    this.bannerText = `🚩 CORNER KICK: ${attackingTeam.shortName.toUpperCase()} (${attackingColor}) [Knocked behind by ${defendingTeam.shortName} (${defendingColor})]`;
    this.bannerTimer = 110;
    this.addLog(`🚩 Corner kick awarded to ${attackingTeam.shortName} (${attackingColor}) after ${defendingTeam.shortName} (${defendingColor}) knocked it behind their own goal line!`);

    const cornerX = isHomeAttacking ? PITCH_W - 20 : 20;
    const cornerY = isTopCorner ? 20 : PITCH_H - 20;

    this.ball.x = cornerX;
    this.ball.y = cornerY;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.shotType = null;
    this.ball.deflectedBehindByDefense = false;

    const attackers = this.players.filter((p) => p.isHome === isHomeAttacking && p.position !== 'GK' && !p.isSentOff);
    const cornerTaker =
      attackers.find((p) => (isTopCorner ? p.role.includes('L') : p.role.includes('R'))) ||
      attackers.find((p) => p.role.includes('W') || p.role.includes('M')) ||
      attackers[0];

    if (!cornerTaker) return;

    cornerTaker.x = cornerX;
    cornerTaker.y = cornerY;
    const targetBoxX = isHomeAttacking ? PITCH_W - 170 : 170;
    cornerTaker.facing = Math.atan2(PITCH_H / 2 - cornerY, targetBoxX - cornerX);
    cornerTaker.vx = 0;
    cornerTaker.vy = 0;

    this.ball.carrier = cornerTaker;
    this.ball.lastCarrier = cornerTaker;
    this.ball.lastTouchTeam = isHomeAttacking ? 'home' : 'away';
    this.ball.lastTouchPlayer = cornerTaker;

    if (isHomeAttacking === this.userIsHome) {
      this.activeUserPlayer = cornerTaker;
      for (const p of this.players) p.isUser = p === cornerTaker;
    }

    const defenders = this.players.filter((p) => p.isHome !== isHomeAttacking && p.position !== 'GK' && !p.isSentOff);
    const defGK = this.players.find((p) => p.isHome !== isHomeAttacking && p.position === 'GK');
    if (defGK) {
      defGK.x = isHomeAttacking ? PITCH_W - 45 : 45;
      defGK.y = PITCH_H / 2;
      defGK.facing = isHomeAttacking ? Math.PI : 0;
    }

    let aIdx = 0;
    for (const att of attackers) {
      if (att === cornerTaker) continue;
      att.vx = 0;
      att.vy = 0;
      att.x = targetBoxX + (Math.random() - 0.5) * 80;
      att.y = PITCH_H / 2 + (aIdx - 1.5) * 55;
      att.facing = Math.atan2(PITCH_H / 2 - att.y, (isHomeAttacking ? PITCH_W : 0) - att.x);
      aIdx++;
    }

    let dIdx = 0;
    for (const def of defenders) {
      def.vx = 0;
      def.vy = 0;
      def.x = (isHomeAttacking ? PITCH_W - 110 : 110) + (Math.random() - 0.5) * 50;
      def.y = PITCH_H / 2 + (dIdx - 2) * 50;
      def.facing = isHomeAttacking ? Math.PI : 0;
      dIdx++;
    }
  }

  private handleCornerKick(inp: InputState) {
    const taker = this.ball.carrier;
    if (!taker) {
      this.state = 'play';
      return;
    }

    const isUserTaker = taker.isUser;
    const isHome = taker.isHome;
    const targetBoxX = isHome ? PITCH_W - 170 : 170;
    const targetBoxY = PITCH_H / 2;

    if (isUserTaker) {
      if (inp.moveMag > 0.1) {
        taker.facing = inp.moveAngle;
      }
      this.bannerText = '🚩 CORNER: [✕] Low Ground Cross | [◯] High Lofted Cross to Box!';
      this.bannerTimer = 10;

      if (inp.passPressed) {
        sound.kick(0.75);
        taker.isKicking = 12;
        this.releaseBallFromKicker(taker);
        this.ball.vx = Math.cos(taker.facing) * 11.5;
        this.ball.vy = Math.sin(taker.facing) * 11.5;
        this.ball.z = 0;
        this.ball.vz = 0;
        this.state = 'play';
        this.bannerText = '👟 CORNER DRIVEN LOW!';
        this.bannerTimer = 50;
        return;
      }

      if (inp.shootPressed || inp.lob || inp.throughPressed) {
        sound.kick(0.9);
        taker.isKicking = 14;
        this.releaseBallFromKicker(taker);
        const ang = Math.atan2(targetBoxY - taker.y, targetBoxX - taker.x);
        this.ball.vx = Math.cos(ang) * 9.5;
        this.ball.vy = Math.sin(ang) * 9.5;
        this.ball.vz = 9.5;
        this.ball.shotType = 'lob';
        this.state = 'play';
        this.bannerText = '✈️ HIGH LOFTED CORNER INTO BOX!';
        this.bannerTimer = 60;
        return;
      }
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      sound.kick(0.85);
      taker.isKicking = 14;
      this.releaseBallFromKicker(taker);
      const ang = Math.atan2(targetBoxY + (Math.random() - 0.5) * 100 - taker.y, targetBoxX - taker.x);
      this.ball.vx = Math.cos(ang) * 9.5;
      this.ball.vy = Math.sin(ang) * 9.5;
      this.ball.vz = 9.2;
      this.ball.shotType = 'lob';
      this.state = 'play';
      this.bannerText = '✈️ CORNER INSWINGER!';
      this.bannerTimer = 55;
    }
  }

  public setupThrowIn(isHomeThrowing: boolean, outX: number, isTopTouchline: boolean) {
    this.state = 'throwin';
    this.stateTimer = 95;
    this.throwInIsTop = isTopTouchline;
    sound.whistle();

    const throwingTeam = isHomeThrowing ? this.home : this.away;
    const puttingOutTeam = isHomeThrowing ? this.away : this.home;
    const throwingColor = isHomeThrowing ? 'RED' : 'BLUE';
    const puttingOutColor = isHomeThrowing ? 'BLUE' : 'RED';

    this.bannerText = `🤾 THROW-IN: ${throwingTeam.shortName.toUpperCase()} (${throwingColor}) [Put out by ${puttingOutTeam.shortName} (${puttingOutColor})]`;
    this.bannerTimer = 95;
    this.addLog(`🤾 Throw-in awarded to ${throwingTeam.shortName} (${throwingColor}) - knocked into touch by ${puttingOutTeam.shortName} (${puttingOutColor}).`);

    const throwX = Math.max(90, Math.min(PITCH_W - 90, outX));
    const throwY = isTopTouchline ? 22 : PITCH_H - 22;

    this.ball.x = throwX;
    this.ball.y = throwY;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;

    const candidates = this.players.filter((p) => p.isHome === isHomeThrowing && p.position !== 'GK' && !p.isSentOff);
    let thrower = candidates[0];
    let minD = Infinity;
    for (const c of candidates) {
      const d = Math.hypot(c.x - throwX, c.y - throwY);
      if (d < minD) {
        minD = d;
        thrower = c;
      }
    }

    if (!thrower) return;

    thrower.x = throwX;
    thrower.y = throwY;
    thrower.facing = isTopTouchline ? Math.PI / 2 : -Math.PI / 2;
    thrower.vx = 0;
    thrower.vy = 0;

    this.ball.carrier = thrower;
    this.ball.lastCarrier = thrower;
    this.ball.lastTouchTeam = isHomeThrowing ? 'home' : 'away';
    this.ball.lastTouchPlayer = thrower;

    if (isHomeThrowing === this.userIsHome) {
      this.activeUserPlayer = thrower;
      for (const p of this.players) p.isUser = p === thrower;
    }

    const mates = candidates.filter((p) => p !== thrower);
    if (mates.length > 0) {
      const receiver = mates[0];
      receiver.x = throwX + (isHomeThrowing ? 65 : -65);
      receiver.y = isTopTouchline ? 110 : PITCH_H - 110;
      receiver.facing = Math.atan2(throwY - receiver.y, throwX - receiver.x);
    }
  }

  private handleThrowIn(inp: InputState) {
    const thrower = this.ball.carrier;
    if (!thrower) {
      this.state = 'play';
      return;
    }

    const isUser = thrower.isUser;

    if (isUser) {
      if (inp.moveMag > 0.1) {
        thrower.facing = inp.moveAngle;
      }
      this.bannerText = '🤾 THROW-IN: Aim with Stick & Press [✕] or [◯] to Throw!';
      this.bannerTimer = 10;

      if (inp.passPressed || inp.shootPressed || inp.throughPressed || inp.lob) {
        sound.kick(0.5);
        thrower.isKicking = 8;
        this.releaseBallFromKicker(thrower);

        let throwVy = Math.sin(thrower.facing) * 9.5;
        if (this.throwInIsTop && throwVy < 3.0) throwVy = 3.5;
        if (!this.throwInIsTop && throwVy > -3.0) throwVy = -3.5;

        this.ball.vx = Math.cos(thrower.facing) * 8.5;
        this.ball.vy = throwVy;
        this.ball.z = 3;
        this.ball.vz = 2.0;
        this.state = 'play';
        this.bannerText = '🤾 THROWN IN!';
        this.bannerTimer = 40;
        return;
      }
    }

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      sound.kick(0.5);
      thrower.isKicking = 8;
      this.releaseBallFromKicker(thrower);
      const mates = this.players.filter((p) => p.isHome === thrower.isHome && p !== thrower && p.position !== 'GK' && !p.isSentOff);
      let targetAng = thrower.facing;
      if (mates.length > 0) {
        targetAng = Math.atan2(mates[0].y - thrower.y, mates[0].x - thrower.x);
      }
      let throwVy = Math.sin(targetAng) * 9.0;
      if (this.throwInIsTop && throwVy < 3.0) throwVy = 3.5;
      if (!this.throwInIsTop && throwVy > -3.0) throwVy = -3.5;

      this.ball.vx = Math.cos(targetAng) * 8.5;
      this.ball.vy = throwVy;
      this.ball.z = 3;
      this.ball.vz = 2.0;
      this.state = 'play';
      this.bannerText = '🤾 THROW-IN COMPLETED';
      this.bannerTimer = 40;
    }
  }

  public setupGoalKick(isHomeDefending: boolean) {
    this.state = 'goalkick';
    this.stateTimer = 90;
    sound.whistle();

    const defTeam = isHomeDefending ? this.home : this.away;
    const attTeam = isHomeDefending ? this.away : this.home;
    const defColor = isHomeDefending ? 'RED' : 'BLUE';
    const attColor = isHomeDefending ? 'BLUE' : 'RED';

    this.bannerText = `🥅 GOAL KICK: ${defTeam.shortName.toUpperCase()} (${defColor}) [Wide by ${attTeam.shortName} (${attColor})]`;
    this.bannerTimer = 90;
    this.addLog(`🥅 Goal kick to ${defTeam.shortName} (${defColor}) after ${attTeam.shortName} (${attColor}) put it wide.`);

    const gkX = isHomeDefending ? 55 : PITCH_W - 55;
    const gkY = PITCH_H / 2;

    this.ball.x = gkX;
    this.ball.y = gkY;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.deflectedBehindByDefense = false;

    const gk = this.players.find((p) => p.isHome === isHomeDefending && p.position === 'GK');
    if (gk) {
      gk.x = gkX + (isHomeDefending ? -14 : 14);
      gk.y = gkY;
      gk.facing = isHomeDefending ? 0 : Math.PI;
      gk.vx = 0;
      gk.vy = 0;
      this.ball.carrier = gk;
      this.ball.lastCarrier = gk;
      this.ball.lastTouchTeam = isHomeDefending ? 'home' : 'away';
      this.ball.lastTouchPlayer = gk;

      gk.isUser = false;
      if (isHomeDefending === this.userIsHome) {
        const outfieldPlayer = this.players.find((p) => p.isHome === isHomeDefending && p.position !== 'GK' && !p.isSentOff);
        if (outfieldPlayer) {
          this.activeUserPlayer = outfieldPlayer;
          for (const p of this.players) p.isUser = p === outfieldPlayer;
        }
      }
    }

    for (const p of this.players) {
      if (p.position === 'GK') continue;
      if (p.isSentOff) continue;
      const targetMidX = p.isHome ? PITCH_W * 0.45 : PITCH_W * 0.55;
      p.x += (targetMidX - p.x) * 0.4;
      p.vx = 0;
      p.vy = 0;
    }
  }

  private handleGoalKick(inp: InputState) {
    const gk = this.ball.carrier;
    if (!gk) {
      this.state = 'play';
      return;
    }

    const isHome = gk.isHome;
    gk.isUser = false;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      sound.kick(0.9);
      gk.isKicking = 12;
      this.releaseBallFromKicker(gk);
      const ang = isHome ? 0 : Math.PI;
      this.ball.vx = Math.cos(ang) * 16.5;
      this.ball.vy = (Math.random() - 0.5) * 4.0;
      this.ball.vz = 10.5;
      this.ball.shotType = 'lob';
      this.state = 'play';
      this.bannerText = `🚀 GOAL KICK LAUNCHED BY ${gk.shortName.toUpperCase()}!`;
      this.bannerTimer = 50;
    }
  }

  private onGoalScored(homeScored: boolean) {
    if (this.state === 'goal') return;

    this.state = 'goal';
    this.stateTimer = 95;
    this.lastGoalTeam = homeScored ? 'home' : 'away';
    sound.goal();

    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.z = Math.min(18, this.ball.z);
    if (homeScored) {
      this.ball.x = PITCH_W + 16;
    } else {
      this.ball.x = -16;
    }

    const scoringTeam = homeScored ? this.home : this.away;
    const scorerCandidate =
      this.ball.lastTouchTeam === (homeScored ? 'home' : 'away') && this.ball.lastTouchPlayer
        ? this.ball.lastTouchPlayer
        : this.players.find((p) => p.isHome === homeScored && p.position === 'ATT');
    const scorerName = scorerCandidate?.name || `${scoringTeam.shortName} Striker`;
    const scorerShort = scorerCandidate?.shortName || `${scoringTeam.shortName}`;

    if (homeScored) {
      this.homeScore++;
      this.goalScorer = scorerName;
      this.bannerText = `⚽ GOAL FOR ${this.home.name.toUpperCase()}! [${scorerShort.toUpperCase()}]`;
    } else {
      this.awayScore++;
      this.goalScorer = scorerName;
      this.bannerText = `⚽ GOAL FOR ${this.away.name.toUpperCase()}! [${scorerShort.toUpperCase()}]`;
    }

    this.bannerTimer = 110;
    this.addLog(`⚽ GOAL! ${scoringTeam.shortName} scores (${this.homeScore} - ${this.awayScore}) via ${scorerShort}!`);

      this.scorers.push({
      playerShortName: scorerShort,
      teamShortName: scoringTeam.shortName,
      minute: Math.min(90, Math.floor(this.matchSeconds / 60)),
      isHome: homeScored,
    });
  }
}