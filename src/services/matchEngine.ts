import { Team, Player, MatchScorer, MatchStats, TACTICS, Position, adaptOppositionFormationIfIdentical } from '../types/football';
import { sound } from './audio';

export const PW = 60;
export const PH = 28;

export type MatchActionType = 'pass' | 'dribble' | 'shoot' | 'tackle' | 'auto';

export class LiveMatch {
  home: Team;
  away: Team;
  userTeam: Team;
  minute: number;
  homeScore: number;
  awayScore: number;
  finished: boolean;
  halfTime: boolean;
  possession: Team;
  carrier: Player | null;
  ballX: number;
  ballY: number;
  targetX: number;
  targetY: number;
  scorers: MatchScorer[];
  log: string[];
  stats: MatchStats;
  isFriendly: boolean;

  constructor(home: Team, away: Team, userTeam: Team, isFriendly: boolean = false, aiAdaptChance: number = 0.75) {
    this.home = home;
    this.away = away;
    this.userTeam = userTeam;
    this.minute = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.finished = false;
    this.halfTime = false;
    this.possession = home;
    this.carrier = null;
    this.ballX = PW / 2;
    this.ballY = PH / 2;
    this.targetX = PW / 2;
    this.targetY = PH / 2;
    this.scorers = [];
    this.log = [];
    this.isFriendly = isFriendly;

    // Tactical adaptation if opponent AI has identical formation to user
    const aiTeam = userTeam.id === home.id ? away : home;
    const adaptResult = adaptOppositionFormationIfIdentical(aiTeam, userTeam.formation, aiAdaptChance);
    if (adaptResult) {
      if (adaptResult.switched) {
        this.log.push(`[TACTICS (${Math.round(aiAdaptChance * 100)}% TRIGGER)] ${aiTeam.shortName} adjusted setup from ${adaptResult.previousFormation} to ${adaptResult.newFormation} to counter mirror formation!`);
      } else {
        this.log.push(`[TACTICS] ${aiTeam.shortName} maintained ${adaptResult.previousFormation} despite mirror formation (${Math.round((1 - aiAdaptChance) * 100)}% roll).`);
      }
    }

    this.stats = {
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
    };

    this.kickoff(this.home);
    this.addLog(`Referee blows whistle. Kick-off at 0'! Match underway.`);
    sound.whistle();
  }

  other(team: Team): Team {
    return team === this.home ? this.away : this.home;
  }

  attackingRight(team: Team): boolean {
    // Home team attacks left -> right in first half
    // If minute > 45, teams swap sides!
    const isFirstHalf = this.minute <= 45;
    return team === this.home ? isFirstHalf : !isFirstHalf;
  }

  pickPlayer(team: Team, pos: Position): Player {
    const list = team.byPosition(pos);
    if (list.length === 0) return team.sortedSquad()[0];
    return list[Math.floor(Math.random() * list.length)];
  }

  addLog(text: string) {
    this.log.push(`[${this.minute}'] ${text}`);
    if (this.log.length > 80) {
      this.log.shift();
    }
  }

  kickoff(team: Team) {
    this.possession = team;
    this.carrier = this.pickPlayer(team, 'MID') || team.sortedSquad()[0];
    this.ballX = PW / 2;
    this.ballY = PH / 2;
    this.targetX = PW / 2;
    this.targetY = PH / 2;
  }

  goalKick(team: Team) {
    this.possession = team;
    this.carrier = this.pickPlayer(team, 'GK') || this.pickPlayer(team, 'DEF');
    const right = this.attackingRight(team);
    this.ballX = right ? 3 : PW - 4;
    this.ballY = PH / 2;
    this.targetX = this.ballX;
    this.targetY = this.ballY;
  }

  advanceBall(dx: number, dySpread: number = 2) {
    let nx = this.targetX + dx;
    nx = Math.max(2, Math.min(PW - 3, nx));
    const ny = Math.max(3, Math.min(PH - 4, PH / 2 + (Math.random() - 0.5) * dySpread * 4));
    this.ballX = this.targetX;
    this.ballY = this.targetY;
    this.targetX = nx;
    this.targetY = ny;
  }

  actionPass(actor: Team): { success: boolean; event: string } {
    const p = this.carrier;
    if (!p) return { success: false, event: 'no carrier' };

    const actorTactic = TACTICS[actor.tactic] || TACTICS['Balanced'];
    const mates = actor.squad.filter((x) => x !== p);
    if (mates.length === 0) return { success: false, event: 'no mates' };

    // Select suitable receiver
    const target = mates[Math.floor(Math.random() * mates.length)];
    const right = this.attackingRight(actor);
    const forwardDirection = right ? 1 : -1;

    // Passing success depends on passing attribute, condition, and tactic modifier
    const fatigue = p.condition / 100;
    const baseChance = 0.55 + (p.passing / 300) * actorTactic.passModifier * fatigue;
    const chance = Math.min(0.94, Math.max(0.25, baseChance));

    sound.kick();

    if (Math.random() < chance) {
      this.carrier = target;
      const advanceDistance = (3 + Math.floor(Math.random() * 4)) * forwardDirection;
      this.advanceBall(advanceDistance);

      if (actor === this.home) this.stats.homePassesCompleted++;
      else this.stats.awayPassesCompleted++;

      const logMsg = `${actor.shortName}: ${p.shortName()} → ${target.shortName()} (pass complete)`;
      this.addLog(logMsg);
      return { success: true, event: logMsg };
    } else {
      // Interception
      const opp = this.other(actor);
      const def = this.pickPlayer(opp, 'DEF') || this.pickPlayer(opp, 'MID');
      this.carrier = def;
      this.possession = opp;
      this.advanceBall(forwardDirection * 2);

      if (opp === this.home) this.stats.homeTacklesWon++;
      else this.stats.awayTacklesWon++;

      sound.tackle();
      const logMsg = `${actor.shortName}: ${p.shortName()}'s pass intercepted by ${opp.shortName} (${def.shortName()})`;
      this.addLog(logMsg);
      return { success: false, event: logMsg };
    }
  }

  actionDribble(actor: Team): { success: boolean; event: string } {
    const p = this.carrier;
    if (!p) return { success: false, event: 'no carrier' };

    const opp = this.other(actor);
    const def = this.pickPlayer(opp, 'DEF') || this.pickPlayer(opp, 'MID');
    const right = this.attackingRight(actor);
    const forwardDirection = right ? 1 : -1;

    const defStr = def.strength || 70;
    const pDrib = p.dribbling || 70;
    const isWeakDefender = (defStr < 65 && pDrib >= 70) || (defStr < pDrib - 10);

    if (isWeakDefender) {
      // Low strength defender cannot dispossess high dribbler!
      const distance = (5 + Math.floor(Math.random() * 5)) * forwardDirection;
      this.advanceBall(distance);
      sound.kick();
      const logMsg = `⚡ ${actor.shortName}: ${p.shortName()} shields effortlessly past ${def.shortName()} (defender strength too low to dispossess)!`;
      this.addLog(logMsg);
      return { success: true, event: logMsg };
    }

    const atk = (p.dribbling * 0.50 + (p.strength || 70) * 0.30 + p.control * 0.20) * (p.condition / 100);
    const dfn = (def.tackling * 0.45 + (def.strength || 70) * 0.45 + (def.positioning || 70) * 0.10) * (def.condition / 100);
    const chance = Math.max(0.12, Math.min(0.90, 0.50 + (atk - dfn) / 160));

    sound.kick();

    if (Math.random() < chance) {
      const distance = (5 + Math.floor(Math.random() * 5)) * forwardDirection;
      this.advanceBall(distance);
      const logMsg = `⚡ ${actor.shortName}: ${p.shortName()} bursts past ${def.shortName()} with great skill!`;
      this.addLog(logMsg);
      return { success: true, event: logMsg };
    } else {
      this.carrier = def;
      this.possession = opp;
      if (opp === this.home) this.stats.homeTacklesWon++;
      else this.stats.awayTacklesWon++;

      sound.tackle();
      const logMsg = `🛑 ${actor.shortName}: ${p.shortName()} is muscled off the ball by ${def.shortName()}`;
      this.addLog(logMsg);
      return { success: false, event: logMsg };
    }
  }

  actionShoot(actor: Team): { scored: boolean; event: string } {
    const p = this.carrier;
    if (!p) return { scored: false, event: 'no carrier' };

    const right = this.attackingRight(actor);
    const goalX = right ? PW - 1 : 0;
    const dist = Math.abs(goalX - this.targetX);

    if (actor === this.home) this.stats.homeShots++;
    else this.stats.awayShots++;

    sound.kick();

    // Shot precision based on distance and shooting stat
    const actorTactic = TACTICS[actor.tactic] || TACTICS['Balanced'];
    let base = 0.65 - dist * 0.015 + (p.shooting / 350) * actorTactic.atk;
    base = Math.max(0.06, Math.min(0.88, base));

    const opp = this.other(actor);
    const gk = this.pickPlayer(opp, 'GK');
    const saveChance = gk ? 0.40 + (gk.tackling / 320) : 0.42;

    const roll = Math.random();

    // Off target or woodwork
    if (roll > base) {
      if (Math.random() < 0.15) {
        sound.tackle();
        const msg = `💥 CLANG! ${actor.shortName}: ${p.shortName()}'s thunderbolt rattles against the crossbar!`;
        this.addLog(msg);
      } else {
        const msg = `💨 ${actor.shortName}: ${p.shortName()} shoots from ${Math.round(dist * 1.5)}m... wide!`;
        this.addLog(msg);
      }
      this.goalKick(opp);
      return { scored: false, event: 'wide' };
    }

    // Shot is on target!
    if (actor === this.home) this.stats.homeShotsOnTarget++;
    else this.stats.awayShotsOnTarget++;

    // Keeper save check
    if (Math.random() < saveChance) {
      sound.save();
      const gkName = gk ? gk.shortName() : 'keeper';
      const msg = `🧤 SPECTACULAR SAVE! ${opp.shortName}'s ${gkName} dives to deny ${p.shortName()}!`;
      this.addLog(msg);
      this.goalKick(opp);
      return { scored: false, event: 'save' };
    }

    // GOAL SCORED!
    sound.goal();
    const isHome = actor === this.home;
    if (isHome) this.homeScore++;
    else this.awayScore++;

    p.seasonGoals++;
    this.scorers.push({
      playerShortName: p.shortName(),
      teamShortName: actor.shortName,
      minute: this.minute,
      isHome,
    });

    const msg = `⚽ GOAL!!! ${actor.shortName}: ${p.shortName()} finds the back of the net! (${this.homeScore} - ${this.awayScore})`;
    this.addLog(msg);

    // Ball in the back of the net
    this.ballX = this.targetX;
    this.ballY = this.targetY;
    this.targetX = goalX;
    this.targetY = PH / 2;

    this.kickoff(opp);
    return { scored: true, event: 'goal' };
  }

  actionTackle(actor: Team): { success: boolean; event: string } {
    const p = this.pickPlayer(actor, 'DEF') || this.pickPlayer(actor, 'MID');
    if (this.possession === actor) {
      const msg = `${actor.shortName}: ${p.shortName()} steps up to apply tactical pressure.`;
      this.addLog(msg);
      return { success: true, event: msg };
    }

    const victim = this.carrier;
    if (!victim) return { success: false, event: 'no victim' };

    const pStr = p.strength || 70;
    const vicDrib = victim.dribbling || 70;
    const isTooWeak = (pStr < 65 && vicDrib >= 70) || (pStr < vicDrib - 10);
    if (isTooWeak) {
      const msg = `💨 ${actor.shortName}: ${p.shortName()}'s tackle shielded by ${victim.shortName()} (strength too low to contest DRI ${vicDrib})!`;
      this.addLog(msg);
      sound.kick(0.3);
      return { success: false, event: msg };
    }

    const atk = (p.tackling * 0.48 + (p.strength || 70) * 0.42 + (p.positioning || 70) * 0.10) * (p.condition / 100);
    const dfn = (victim.dribbling * 0.50 + (victim.strength || 70) * 0.35 + victim.control * 0.15) * (victim.condition / 100);
    const chance = Math.max(0.12, Math.min(0.88, 0.50 + (atk - dfn) / 160));

    // Potential foul chance
    if (Math.random() < 0.08) {
      sound.whistle();
      if (actor === this.home) this.stats.homeFouls++;
      else this.stats.awayFouls++;
      const msg = `⚠️ FOUL! ${actor.shortName}'s ${p.shortName()} booked for a cynical tackle on ${victim.shortName()}. Free kick.`;
      this.addLog(msg);
      return { success: false, event: msg };
    }

    if (Math.random() < chance) {
      sound.tackle();
      this.carrier = p;
      this.possession = actor;
      if (actor === this.home) this.stats.homeTacklesWon++;
      else this.stats.awayTacklesWon++;

      const msg = `🛡️ CRUNCH! ${actor.shortName}'s ${p.shortName()} cleanly dispossesses ${victim.shortName()}!`;
      this.addLog(msg);
      return { success: true, event: msg };
    } else {
      const msg = `${actor.shortName}: ${p.shortName()} lunges in but ${victim.shortName()} evades the tackle!`;
      this.addLog(msg);
      return { success: false, event: msg };
    }
  }

  aiAction(team: Team): { action: string; scored?: boolean } {
    if (this.possession !== team) {
      this.actionTackle(team);
      return { action: 'tackle' };
    }

    const right = this.attackingRight(team);
    const goalX = right ? PW - 1 : 0;
    const dist = Math.abs(goalX - this.targetX);

    // AI tactical decision
    const shootUrge = dist < 14 ? 0.72 : dist < 22 ? 0.35 : 0.06;
    const passUrge = 0.58;
    const roll = Math.random();

    if (roll < shootUrge) {
      const res = this.actionShoot(team);
      return { action: 'shoot', scored: res.scored };
    } else if (roll < shootUrge + passUrge) {
      this.actionPass(team);
      return { action: 'pass' };
    } else {
      this.actionDribble(team);
      return { action: 'dribble' };
    }
  }

  userAction(kind: MatchActionType): { scored: boolean } {
    const actor = this.userTeam;
    if (kind === 'pass') {
      this.actionPass(actor);
      return { scored: false };
    } else if (kind === 'dribble') {
      this.actionDribble(actor);
      return { scored: false };
    } else if (kind === 'shoot') {
      const res = this.actionShoot(actor);
      return { scored: res.scored };
    } else if (kind === 'tackle') {
      this.actionTackle(actor);
      return { scored: false };
    } else if (kind === 'auto') {
      const res = this.aiAction(actor);
      return { scored: !!res.scored };
    }
    return { scored: false };
  }

  tick(): { isFinished: boolean; isHalfTime: boolean } {
    if (this.finished) return { isFinished: true, isHalfTime: false };

    // Advance clock
    this.minute++;

    // Track possession ticks
    if (this.possession === this.home) {
      this.stats.homePossessionTicks++;
    } else {
      this.stats.awayPossessionTicks++;
    }

    // Stamina drain
    if (this.minute % 15 === 0) {
      [...this.home.squad, ...this.away.squad].forEach((p) => {
        p.condition = Math.max(40, p.condition - (100 - p.stamina) / 30);
      });
    }

    // Half-time check
    if (this.minute === 45 && !this.halfTime) {
      this.halfTime = true;
      this.addLog(`⏸️ HALF TIME! The referee calls for the break. Score: ${this.home.shortName} ${this.homeScore} - ${this.awayScore} ${this.away.shortName}`);
      sound.whistle();
      // Kick off second half with away team
      this.kickoff(this.away);
      return { isFinished: false, isHalfTime: true };
    }

    // Full time check
    if (this.minute >= 90) {
      this.finished = true;
      this.addLog(`🔚 FULL TIME! Final score: ${this.home.shortName} ${this.homeScore} - ${this.awayScore} ${this.away.shortName}`);
      sound.whistle(true);

      // If not friendly, update league table
      if (!this.isFriendly) {
        const h = this.home;
        const a = this.away;
        h.played++;
        a.played++;
        h.gf += this.homeScore;
        h.ga += this.awayScore;
        a.gf += this.awayScore;
        a.ga += this.homeScore;

        if (this.homeScore > this.awayScore) {
          h.won++;
          a.lost++;
        } else if (this.awayScore > this.homeScore) {
          a.won++;
          h.lost++;
        } else {
          h.drawn++;
          a.drawn++;
        }
      }

      return { isFinished: true, isHalfTime: false };
    }

    // Opponent AI turn if opponent has possession
    const opp = this.other(this.userTeam);
    if (this.possession === opp) {
      this.aiAction(opp);
    }

    return { isFinished: false, isHalfTime: false };
  }

  getPossessionPercentages(): { homePct: number; awayPct: number } {
    const total = this.stats.homePossessionTicks + this.stats.awayPossessionTicks;
    if (total === 0) return { homePct: 50, awayPct: 50 };
    const homePct = Math.round((this.stats.homePossessionTicks / total) * 100);
    return { homePct, awayPct: 100 - homePct };
  }
}
