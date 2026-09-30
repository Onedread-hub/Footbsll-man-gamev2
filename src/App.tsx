/**
 * ASCII Football Manager 2026
 * Retro tactical football management simulation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Team,
  FormationName,
  TacticName,
  Fixture,
  LeagueSeasonData,
  MatchDifficulty,
  DIFFICULTY_SETTINGS,
  FORMATIONS,
  TACTICS,
  LeagueId,
  LEAGUES,
} from './types/football';
import {
  initNewSeason,
  simulateMatch,
  saveSeasonState,
  loadSeasonState,
  clearSeasonState,
  advanceToNextSeason,
  ensureTeamSquadIntegrity,
  regenerateAllYouthTeams,
} from './services/leagueEngine';
import { LiveMatch, MatchActionType } from './services/matchEngine';
import { RealtimeMatch } from './services/realtimeMatchEngine';
import { sound } from './services/audio';
import {
  getTrainingTokens,
  calculateMatchReward,
  addTrainingTokens,
  TokenRewardBreakdown,
} from './services/trainingTokensEngine';
import { PitchCanvas } from './components/PitchCanvas';
import { PlayablePitchCanvas } from './components/PlayablePitchCanvas';
import { VirtualGamepad } from './components/VirtualGamepad';
import { ScoreBanner } from './components/ScoreBanner';
import { MatchControls } from './components/MatchControls';
import { MatchLog } from './components/MatchLog';
import { MatchStatsModal } from './components/MatchStatsModal';
import { TacticsBoard } from './components/TacticsBoard';
import { LeagueTable } from './components/LeagueTable';
import { SquadViewer } from './components/SquadViewer';
import { FixturesView } from './components/FixturesView';
import { TopScorersView } from './components/TopScorersView';
import { PostMatchResults } from './components/PostMatchResults';
import { FriendlyMatchModal } from './components/FriendlyMatchModal';
import { ScreenshotsModal } from './components/ScreenshotsModal';
import { TrainingHubModal } from './components/TrainingHubModal';
import { MatchControlsTab } from './components/MatchControlsTab';
import { RandomEncounterModal } from './components/RandomEncounterModal';
import {
  RandomEncounter,
  rollRandomEncounter,
  processSquadSuspensionsAfterMatch,
  loadStoredEncounters,
  saveStoredEncounters,
} from './services/randomEncounterEngine';
import {
  Volume2,
  VolumeX,
  Monitor,
  Trophy,
  Users,
  Calendar,
  Play,
  RotateCcw,
  Sliders,
  Award,
  Gamepad,
  Camera,
  Zap,
  ChevronRight,
  Shield,
  ArrowRight,
  Activity,
  Home,
  Newspaper,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

type ScreenName =
  | 'menu'
  | 'table'
  | 'pickSquad'
  | 'squad'
  | 'pickTeam'
  | 'tactics'
  | 'fixtures'
  | 'topScorers'
  | 'match'
  | 'postMatch';

export default function App() {
  // Season & Club State - Initialized synchronously so state is never empty on first render
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = loadSeasonState();
    if (saved && saved.teams && saved.teams.length > 0) {
      const list = saved.teams.map((t) => Team.fromJSON(t));
      list.forEach((t) => ensureTeamSquadIntegrity(t));
      return list;
    }
    const fresh = initNewSeason().teams;
    fresh.forEach((t) => ensureTeamSquadIntegrity(t));
    return fresh;
  });

  const [seasonYear, setSeasonYear] = useState<number>(() => {
    const saved = loadSeasonState();
    return saved?.year || 2026;
  });

  const [fixtures, setFixtures] = useState<Fixture[]>(() => {
    const saved = loadSeasonState();
    if (saved && saved.fixtures && saved.fixtures.length > 0) {
      return saved.fixtures;
    }
    return initNewSeason().fixtures;
  });

  const [currentRound, setCurrentRound] = useState<number>(() => {
    const saved = loadSeasonState();
    return saved?.currentRound || 1;
  });

  const [userTeamId, setUserTeamId] = useState<string | null>(() => {
    const saved = loadSeasonState();
    return saved?.userTeamId || 'northwood_united';
  });

  // Screen State
  const [screen, setScreen] = useState<ScreenName>('menu');
  const [viewTeamId, setViewTeamId] = useState<string | null>(null);

  const userTeam = teams.find((t) => t.id === userTeamId) || teams[0];
  const viewedTeam = teams.find((t) => t.id === viewTeamId) || userTeam;

  const userLeagueId: LeagueId = userTeam?.leagueId || 'big_time';
  const totalRounds = userLeagueId === 'up_and_comers' ? 22 : 26;

  const [pickerLeagueFilter, setPickerLeagueFilter] = useState<LeagueId>(userLeagueId);

  // Training & Points System with Difficulty Ratio
  const [difficulty, setDifficulty] = useState<MatchDifficulty>(() => {
    const saved = loadSeasonState();
    return saved?.difficulty || 'Professional';
  });
  const [trainingTokens, setTrainingTokens] = useState<number>(() => {
    const saved = loadSeasonState();
    return saved?.trainingTokens ?? getTrainingTokens();
  });
  const [trainingModalOpen, setTrainingModalOpen] = useState<boolean>(false);
  const [trainingPlayerId, setTrainingPlayerId] = useState<string | undefined>(undefined);

  // Live Match State
  const [matchMode, setMatchMode] = useState<'realtime' | 'turnBased'>('realtime');
  const [matchTab, setMatchTab] = useState<'pitch' | 'controls'>('pitch');
  const [realtimeMatch, setRealtimeMatch] = useState<RealtimeMatch | null>(null);
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [showVirtualPad, setShowVirtualPad] = useState<boolean>(true);
  const [isGoalFlash, setIsGoalFlash] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [postMatchDetails, setPostMatchDetails] = useState<{
    home: Team;
    away: Team;
    userTeam: Team;
    homeScore: number;
    awayScore: number;
    scorers: any[];
    simulatedFixturesInRound: Fixture[];
    isFriendly: boolean;
    tokenBreakdown?: TokenRewardBreakdown;
  } | null>(null);

  // Modals & Options
  const [tacticsModalOpen, setTacticsModalOpen] = useState<boolean>(false);
  const [statsModalOpen, setStatsModalOpen] = useState<boolean>(false);
  const [friendlyModalOpen, setFriendlyModalOpen] = useState<boolean>(false);
  const [screenshotsModalOpen, setScreenshotsModalOpen] = useState<boolean>(false);
  const [crtOverlay, setCrtOverlay] = useState<boolean>(true);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [aiAdaptChance, setAiAdaptChance] = useState<number>(0.75);

  // Random Encounter Tabloid State
  const [currentEncounter, setCurrentEncounter] = useState<RandomEncounter | null>(null);
  const [encounterModalOpen, setEncounterModalOpen] = useState<boolean>(false);
  const [storedEncounters, setStoredEncounters] = useState<RandomEncounter[]>(() => loadStoredEncounters());

  const handleTriggerRandomEncounter = (forceType?: 'positive' | 'negative') => {
    if (!userTeam) return;
    const enc = rollRandomEncounter(userTeam, forceType);
    if (enc) {
      setCurrentEncounter(enc);
      setEncounterModalOpen(true);
      setStoredEncounters((prev) => {
        const next = [enc, ...prev.filter((e) => e.id !== enc.id)].slice(0, 20);
        saveStoredEncounters(next);
        return next;
      });
      setTeams([...teams]);
      sound.whistle();
    }
  };

  // Save season on update
  useEffect(() => {
    if (teams.length === 0) return;
    const data: LeagueSeasonData = {
      year: seasonYear,
      name: `PREMIER ASCII LEAGUE ${seasonYear}`,
      teams: teams.map((t) => t.toJSON()),
      currentRound,
      totalRounds,
      fixtures,
      userTeamId,
      trainingTokens,
      difficulty,
    };
    saveSeasonState(data);
  }, [teams, fixtures, currentRound, userTeamId, trainingTokens, difficulty, seasonYear]);

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    sound.enabled = !next;
    if (!next) sound.click();
  };

  const handleResetSeason = () => {
    if (window.confirm('Reset all season progress and start a new 2026 campaign?')) {
      clearSeasonState();
      const fresh = initNewSeason();
      setTeams(fresh.teams);
      setFixtures(fresh.fixtures);
      setCurrentRound(1);
      setSeasonYear(2026);
      setUserTeamId(fresh.teams[0].id);
      setLiveMatch(null);
      setRealtimeMatch(null);
      setScreen('menu');
      sound.whistle();
    }
  };

  const handleAdvanceSeason = useCallback(() => {
    const nextYear = seasonYear + 1;
    if (
      window.confirm(
        `Advance to the ${nextYear} season?\n\n• Player ages increment by 1\n• Match scores and cards reset\n• Fresh Youth Academy intakes randomly scouted & generated for ALL 26 clubs!\n• Fresh season fixtures generated`
      )
    ) {
      const nextSeason = advanceToNextSeason(teams);
      setTeams(nextSeason.teams);
      setFixtures(nextSeason.fixtures);
      setCurrentRound(1);
      setSeasonYear(nextYear);
      setLiveMatch(null);
      setRealtimeMatch(null);
      setScreen('menu');
      sound.whistle();
      alert(
        `🎉 Welcome to the ${nextYear} Campaign!\n\nFresh Youth Academy prospects have arrived for all clubs. Head over to Squad Roster -> "Youth Academy" tab to inspect your new batch of wonderkids!`
      );
    }
  }, [teams, seasonYear]);

  // Start friendly exhibition match
  const handleStartFriendly = (home: Team, away: Team, userClub: Team) => {
    const rMatch = new RealtimeMatch(home, away, userClub.id === home.id, true, aiAdaptChance);
    const tMatch = new LiveMatch(home, away, userClub, true, aiAdaptChance);
    setRealtimeMatch(rMatch);
    setLiveMatch(tMatch);
    setMatchTab('pitch');
    setFriendlyModalOpen(false);
    setScreen('match');
  };

  // Start league championship match for current round
  const handleStartLeagueFixture = useCallback(() => {
    if (!userTeam) return;

    if (currentRound > totalRounds) {
      if (
        window.confirm(
          `The ${seasonYear} season has completed! Would you like to advance to Season ${seasonYear + 1} now?\n\n(Player ages will advance and brand-new youth academy prospects will be randomly scouted and generated for all clubs)`
        )
      ) {
        handleAdvanceSeason();
      } else {
        setScreen('table');
      }
      return;
    }

    // Find the fixture for user team in currentRound
    const userFixture = fixtures.find(
      (f) =>
        f.round === currentRound &&
        (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id)
    );

    if (!userFixture) {
      alert('No fixture found for this round!');
      return;
    }

    const home = teams.find((t) => t.id === userFixture.homeTeamId)!;
    const away = teams.find((t) => t.id === userFixture.awayTeamId)!;

    const rMatch = new RealtimeMatch(home, away, userTeam.id === home.id, false, aiAdaptChance);
    const tMatch = new LiveMatch(home, away, userTeam, false, aiAdaptChance);
    setRealtimeMatch(rMatch);
    setLiveMatch(tMatch);
    setMatchTab('pitch');
    setScreen('match');
  }, [userTeam, currentRound, totalRounds, fixtures, teams, aiAdaptChance]);

  // Execute interactive match action
  const handleMatchAction = useCallback(
    (actionKind: MatchActionType) => {
      if (!liveMatch || liveMatch.finished || busy) return;

      setBusy(true);
      const prevHomeScore = liveMatch.homeScore;
      const prevAwayScore = liveMatch.awayScore;

      liveMatch.userAction(actionKind);
      const tickResult = liveMatch.tick();

      const scored =
        liveMatch.homeScore !== prevHomeScore || liveMatch.awayScore !== prevAwayScore;

      if (scored) {
        setIsGoalFlash(true);
        setTimeout(() => setIsGoalFlash(false), 800);
      }

      // Re-trigger live match render
      setLiveMatch(Object.assign(Object.create(Object.getPrototypeOf(liveMatch)), liveMatch));

      setTimeout(() => {
        setBusy(false);
        if (tickResult.isFinished) {
          handleMatchFinished(liveMatch);
        }
      }, 300);
    },
    [liveMatch, busy]
  );

  // Fast-Forward to Full Time
  const handleFastForward = useCallback(() => {
    if (!liveMatch || liveMatch.finished) return;

    while (!liveMatch.finished && liveMatch.minute < 90) {
      if (liveMatch.minute === 45 && !liveMatch.halfTime) {
        liveMatch.halfTime = true;
      }
      const activeTeam = liveMatch.possession;
      liveMatch.aiAction(activeTeam);
      liveMatch.tick();
    }

    setLiveMatch(Object.assign(Object.create(Object.getPrototypeOf(liveMatch)), liveMatch));
    handleMatchFinished(liveMatch);
  }, [liveMatch]);

  // Handle Match Full Time & simulate other round fixtures
  const handleMatchFinished = (match: LiveMatch | RealtimeMatch) => {
    let otherFixturesSimulated: Fixture[] = [];

    if (!match.isFriendly) {
      // If completed via RealtimeMatch, update team table records directly
      if (match instanceof RealtimeMatch) {
        const h = match.home;
        const a = match.away;
        h.played++;
        a.played++;
        h.gf += match.homeScore;
        h.ga += match.awayScore;
        a.gf += match.awayScore;
        a.ga += match.homeScore;

        if (match.homeScore > match.awayScore) {
          h.won++;
          a.lost++;
        } else if (match.awayScore > match.homeScore) {
          a.won++;
          h.lost++;
        } else {
          h.drawn++;
          a.drawn++;
        }
      }

      // Find and mark user fixture as played
      const updatedFixtures = [...fixtures];
      const matchFixture = updatedFixtures.find(
        (f) =>
          f.round === currentRound &&
          f.homeTeamId === match.home.id &&
          f.awayTeamId === match.away.id
      );

      if (matchFixture) {
        matchFixture.played = true;
        matchFixture.homeScore = match.homeScore;
        matchFixture.awayScore = match.awayScore;
        matchFixture.scorers = [...match.scorers];
      }

      // Simulate all other matches in this round!
      const teamMap = new Map<string, Team>();
      teams.forEach((t) => teamMap.set(t.id, t));

      const otherFixtures = updatedFixtures.filter(
        (f) => f.round === currentRound && !f.played
      );

      otherFixtures.forEach((f) => {
        const homeT = teamMap.get(f.homeTeamId);
        const awayT = teamMap.get(f.awayTeamId);
        if (homeT && awayT) {
          const simRes = simulateMatch(homeT, awayT, aiAdaptChance);
          f.played = true;
          f.homeScore = simRes.homeScore;
          f.awayScore = simRes.awayScore;
          f.scorers = simRes.scorers;
        }
      });

      otherFixturesSimulated = otherFixtures;
      setFixtures(updatedFixtures);
      setTeams([...teams]);
    }

    // Calculate match tokens reward with difficulty multiplier
    const isUserHome = match.userTeam.id === match.home.id;
    const userScore = isUserHome ? match.homeScore : match.awayScore;
    const oppScore = isUserHome ? match.awayScore : match.homeScore;
    const result = userScore > oppScore ? 'win' : userScore === oppScore ? 'draw' : 'loss';
    const oppTeam = isUserHome ? match.away : match.home;

    const tokenBreakdown = calculateMatchReward(
      result,
      userScore,
      oppScore,
      difficulty,
      match.userTeam.teamRating(),
      oppTeam.teamRating()
    );
    const newTokens = addTrainingTokens(tokenBreakdown.totalTokens);
    setTrainingTokens(newTokens);

    setPostMatchDetails({
      home: match.home,
      away: match.away,
      userTeam: match.userTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      scorers: match.scorers,
      simulatedFixturesInRound: otherFixturesSimulated,
      isFriendly: match.isFriendly,
      tokenBreakdown,
    });

    setScreen('postMatch');
  };

  const handleNextMatchday = () => {
    if (currentRound < totalRounds) {
      setCurrentRound((prev) => prev + 1);
    }

    if (userTeam) {
      // Process active suspensions after matchday
      processSquadSuspensionsAfterMatch(userTeam.squad);

      // 45% chance of a breaking morning tabloid story / random encounter!
      if (Math.random() < 0.45) {
        const enc = rollRandomEncounter(userTeam);
        if (enc) {
          setCurrentEncounter(enc);
          setEncounterModalOpen(true);
          setStoredEncounters((prev) => {
            const next = [enc, ...prev.filter((e) => e.id !== enc.id)].slice(0, 20);
            saveStoredEncounters(next);
            return next;
          });
        }
      }
    }

    setTeams([...teams]);
    setScreen('table');
  };

  // Keyboard navigation for main menu
  useEffect(() => {
    if (screen !== 'menu') return;
    const handleMenuKeys = (e: KeyboardEvent) => {
      if (e.key === '1') setScreen('table');
      else if (e.key === '2') setScreen('pickSquad');
      else if (e.key === '3') setScreen('pickTeam');
      else if (e.key === '4') setFriendlyModalOpen(true);
      else if (e.key === '5') handleStartLeagueFixture();
      else if (e.key === '6') setScreen('tactics');
      else if (e.key === '7') setScreen('fixtures');
      else if (e.key === '8') setScreen('topScorers');
      else if (e.key === '9') {
        setTrainingPlayerId(undefined);
        setTrainingModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleMenuKeys);
    return () => window.removeEventListener('keydown', handleMenuKeys);
  }, [screen, handleStartLeagueFixture]);

  // Calculations for dashboard and matchday
  const userFixture = fixtures.find(
    (f) =>
      f.round === Math.min(currentRound, totalRounds) &&
      (f.homeTeamId === userTeam?.id || f.awayTeamId === userTeam?.id)
  );

  const opponentTeam = userFixture
    ? teams.find(
        (t) =>
          t.id ===
          (userFixture.homeTeamId === userTeam?.id
            ? userFixture.awayTeamId
            : userFixture.homeTeamId)
      )
    : null;

  const isHomeFixture = userFixture?.homeTeamId === userTeam?.id;

  const userLeagueTeams = teams.filter(
    (t) => (t.leagueId || 'big_time') === (userTeam?.leagueId || 'big_time')
  );

  const sortedStandings = [...userLeagueTeams].sort((a, b) => {
    if (b.points() !== a.points()) return b.points() - a.points();
    if (b.goalDiff() !== a.goalDiff()) return b.goalDiff() - a.goalDiff();
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });

  const userRank = sortedStandings.findIndex((t) => t.id === userTeam?.id) + 1;

  // Pitch dots generator for the SWOS tactical mini-preview
  const getFormationDots = (formation: FormationName) => {
    const dots: { x: number; y: number; role: string }[] = [{ x: 50, y: 86, role: 'GK' }];
    const parts = (formation || '4-4-2').split('-').map(Number);
    const yLines = parts.length === 3 ? [68, 44, 20] : [72, 54, 36, 18];
    const roles = ['DEF', 'MID', 'ATT', 'FWD'];

    parts.forEach((count, lIdx) => {
      const y = yLines[lIdx] || 50;
      const role = roles[lIdx] || 'MID';
      for (let i = 0; i < count; i++) {
        const step = 80 / (count + 1);
        const x = 10 + step * (i + 1);
        dots.push({ x, y, role });
      }
    });

    return dots;
  };

  const navTabs = [
    { id: 'menu' as const, label: 'Overview', icon: '🏠' },
    { id: 'squad' as const, label: 'Squad', icon: '👥' },
    { id: 'tactics' as const, label: 'Tactics (SWOS)', icon: '📋' },
    { id: 'fixtures' as const, label: 'Fixtures', icon: '📅' },
    { id: 'table' as const, label: 'League Table', icon: '🏆' },
    { id: 'training' as const, label: 'Training', icon: '⚡' },
    { id: 'topScorers' as const, label: 'Golden Boot', icon: '👟' },
    { id: 'tabloid' as const, label: 'Tabloid News', icon: '📰' },
    { id: 'match' as const, label: 'Matchday', icon: '⚽' },
  ];

  const isTabActive = (tabId: string) => {
    if (tabId === 'menu') return screen === 'menu';
    if (tabId === 'squad') return screen === 'squad' || screen === 'pickSquad';
    if (tabId === 'tactics') return screen === 'tactics';
    if (tabId === 'fixtures') return screen === 'fixtures';
    if (tabId === 'table') return screen === 'table';
    if (tabId === 'topScorers') return screen === 'topScorers';
    if (tabId === 'tabloid') return encounterModalOpen;
    if (tabId === 'match') return screen === 'match' || screen === 'postMatch';
    return false;
  };

  return (
    <div className="min-h-screen bg-[#090f17] text-[#e2e8f0] font-sans p-2 sm:p-4 flex flex-col justify-between selection:bg-[#38bdf8] selection:text-black">
      {/* CRT Scanline Filter */}
      {crtOverlay && (
        <>
          <div className="crt-overlay-full" />
          <div className="crt-vignette-full" />
        </>
      )}

      {/* Top Universal FM2010 Header & Navigation */}
      <header className="max-w-5xl w-full mx-auto mb-3 fm-panel overflow-hidden shadow-xl">
        {/* Main Ribbon Bar */}
        <div className="bg-gradient-to-r from-[#132238] via-[#101b2a] to-[#0c141f] px-3 sm:px-4 py-2.5 border-b border-[#223347] flex flex-wrap justify-between items-center gap-3 text-xs sm:text-sm">
          {/* Club Info & Title */}
          <div
            onClick={() => setScreen('menu')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <span
              className="w-5 h-5 rounded-full border border-white/60 shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
              style={{ backgroundColor: userTeam?.color || '#ffffff' }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm sm:text-base tracking-wide group-hover:text-[#38bdf8] transition">
                  {userTeam ? userTeam.name : 'ASCII FOOTBALL MANAGER 2026'}
                </span>
                <span className="hidden md:inline text-[10px] bg-[#38bdf8]/20 border border-[#38bdf8]/60 text-[#38bdf8] px-1.5 py-0.2 rounded font-mono font-bold">
                  ROUND {Math.min(currentRound, totalRounds)} / {totalRounds}
                </span>
              </div>
              <div className="text-[11px] text-[#94a3b8] font-mono flex items-center gap-2">
                <span>Manager: <strong className="text-[#e2e8f0]">You</strong></span>
                <span className="text-[#475569]">·</span>
                <span>Pos: <strong className="text-[#38bdf8]">#{userRank}</strong></span>
                <span className="text-[#475569]">·</span>
                <span className="text-[#38bdf8]">{userTeam?.points()} Pts</span>
              </div>
            </div>
          </div>

          {/* Next Match Ticker */}
          {opponentTeam && currentRound <= totalRounds && (
            <div className="hidden lg:flex items-center gap-2 bg-[#09101a] px-3 py-1.5 rounded border border-[#1e2e42] text-xs">
              <span className="text-[#94a3b8]">NEXT FIXTURE:</span>
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: opponentTeam.color }}
              />
              <span className="font-bold text-white">{isHomeFixture ? 'vs' : '@'} {opponentTeam.name}</span>
              <span className="text-[10px] text-[#38bdf8] font-mono font-bold bg-[#38bdf8]/10 px-1 rounded">
                MD {currentRound}
              </span>
            </div>
          )}

          {/* Quick Actions & Continue Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Training Tokens Badge */}
            <button
              onClick={() => {
                setTrainingPlayerId(undefined);
                setTrainingModalOpen(true);
                sound.click();
              }}
              className="flex items-center gap-1.5 bg-[#0284c7]/20 hover:bg-[#0284c7]/30 border border-[#38bdf8]/70 text-[#38bdf8] px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition shadow"
              title="Open Player Academy & Training Hub"
            >
              <Zap className="w-3.5 h-3.5 fill-[#38bdf8]" />
              <span>{trainingTokens} TOKENS</span>
            </button>

            {/* Random Encounter Breaking News Tabloid */}
            <button
              onClick={() => handleTriggerRandomEncounter()}
              className="p-1.5 rounded border text-xs cursor-pointer flex items-center gap-1 transition bg-[#7f1d1d]/30 hover:bg-[#7f1d1d]/60 text-[#fca5a5] border-[#ef4444]/60 shadow"
              title="Read Morning Tabloid / Roll Random Encounter (Busts, Crashes, Babies, Models)"
            >
              <Newspaper className="w-3.5 h-3.5 text-[#ef4444]" />
              <span className="hidden md:inline font-bold">Tabloid</span>
            </button>

            {/* Screenshots Gallery */}
            <button
              onClick={() => setScreenshotsModalOpen(true)}
              className="p-1.5 rounded border text-xs cursor-pointer flex items-center gap-1 transition bg-[#152233] hover:bg-[#1e2e42] text-[#cbd5e1] border-[#223347]"
              title="Feature Gallery & Screenshots"
            >
              <Camera className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="hidden xl:inline">Gallery</span>
            </button>

            {/* CRT scanline toggle */}
            <button
              onClick={() => setCrtOverlay(!crtOverlay)}
              className={`p-1.5 rounded border text-xs cursor-pointer flex items-center gap-1 transition ${
                crtOverlay
                  ? 'bg-[#0284c7]/20 text-[#38bdf8] border-[#38bdf8]'
                  : 'bg-[#152233] text-[#64748b] border-[#223347]'
              }`}
              title="Toggle CRT Scanline Effect"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>

            {/* Audio toggle */}
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded border text-xs cursor-pointer flex items-center gap-1 transition ${
                !soundMuted
                  ? 'bg-[#0284c7]/20 text-[#38bdf8] border-[#38bdf8]'
                  : 'bg-[#152233] text-[#64748b] border-[#223347]'
              }`}
              title="Toggle 8-bit Audio"
            >
              {!soundMuted ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
            </button>

            {/* The Iconic FM2010 "CONTINUE >" Button */}
            <button
              onClick={() => {
                if (currentRound > totalRounds) {
                  handleAdvanceSeason();
                } else if (screen === 'match') {
                  // already in match
                } else {
                  handleStartLeagueFixture();
                }
                sound.click();
              }}
              className="fm-continue-btn px-4 py-1.5 rounded text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Proceed to matchday action or next season"
            >
              <span>{screen === 'match' ? 'IN MATCH' : currentRound > totalRounds ? 'NEXT SEASON' : 'CONTINUE'}</span>
              <span className="text-[14px] leading-none">▶</span>
            </button>
          </div>
        </div>

        {/* FM2010 Tabs Strip */}
        <nav className="fm-tabs-strip flex items-center overflow-x-auto text-xs font-sans">
          {navTabs.map((tab) => {
            const active = isTabActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.click();
                  if (tab.id === 'menu') setScreen('menu');
                  else if (tab.id === 'squad') {
                    if (userTeam) setViewTeamId(userTeam.id);
                    setScreen('squad');
                  } else if (tab.id === 'tactics') setScreen('tactics');
                  else if (tab.id === 'fixtures') setScreen('fixtures');
                  else if (tab.id === 'table') setScreen('table');
                  else if (tab.id === 'training') {
                    setTrainingPlayerId(undefined);
                    setTrainingModalOpen(true);
                  } else if (tab.id === 'topScorers') setScreen('topScorers');
                  else if (tab.id === 'tabloid') {
                    if (currentEncounter) {
                      setEncounterModalOpen(true);
                    } else {
                      handleTriggerRandomEncounter();
                    }
                  } else if (tab.id === 'match') {
                    if (screen !== 'match') handleStartLeagueFixture();
                  }
                }}
                className={`fm-tab ${active ? 'fm-tab-active' : ''}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'match' && screen === 'match' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto flex-1">
        {/* ================= SCREEN: MENU (FM2010 MANAGER HOME) ================= */}
        {screen === 'menu' && (
          <div className="space-y-3.5">
            {/* 1. HERO CLASH BANNER: NEXT MATCH PREVIEW */}
            <div className="fm-panel overflow-hidden border border-[#223347] bg-gradient-to-b from-[#132030] to-[#0e1724]">
              <div className="fm-panel-header px-4 py-2 text-xs flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-[#38bdf8]">
                  <span>⚽</span>
                  <span className="font-bold uppercase tracking-wider">
                    {currentRound <= totalRounds ? `Matchday ${currentRound} of ${totalRounds} · Premier League` : 'Season 2026 Completed'}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-[#94a3b8]">
                  {DIFFICULTY_SETTINGS[difficulty].name} Difficulty ({DIFFICULTY_SETTINGS[difficulty].multiplier}x Rewards)
                </span>
              </div>

              {currentRound <= totalRounds && opponentTeam ? (
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Home Team */}
                    {(() => {
                      const teamToShow = isHomeFixture ? userTeam : opponentTeam;
                      const isUser = isHomeFixture;
                      const tier = teamToShow.tier || (teamToShow.teamRating() >= 82 ? 'ELITE' : teamToShow.teamRating() >= 70 ? 'MID' : 'UNDERDOG');
                      const stars = teamToShow.starPlayers();

                      return (
                        <div className="flex items-center gap-3 flex-1 justify-start">
                          <span
                            className="w-11 h-11 rounded-full border-2 border-white/60 shadow-md shrink-0 flex items-center justify-center font-bold text-sm text-black"
                            style={{ backgroundColor: teamToShow.color }}
                          >
                            ⚽
                          </span>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                              <span>{teamToShow.name}</span>
                              {isUser && (
                                <span className="text-[10px] bg-[#38bdf8] text-black font-extrabold px-1.5 py-0.2 rounded">YOU</span>
                              )}
                              {tier === 'ELITE' && (
                                <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1 py-0.2 rounded font-extrabold font-mono">
                                  ★ BIG 4
                                </span>
                              )}
                              {tier === 'MID' && (
                                <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-400/40 px-1 py-0.2 rounded font-semibold font-mono">
                                  MID-TIER
                                </span>
                              )}
                              {tier === 'UNDERDOG' && (
                                <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-400/40 px-1 py-0.2 rounded font-semibold font-mono">
                                  UNDERDOG
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#94a3b8] font-mono mt-0.5">
                              {teamToShow.formation} · {teamToShow.tactic} · <strong className="text-[#38bdf8]">Rtg {teamToShow.teamRating()}</strong>
                            </div>
                            {tier === 'UNDERDOG' && stars.length > 0 && (
                              <div className="text-[10px] text-[#ffd54f] font-mono mt-0.5">
                                ⭐ Key Stars: {stars.map((s) => `${s.name} (${s.position} ${s.rating()})`).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* VS Badge */}
                    <div className="flex flex-col items-center justify-center px-4 py-1 shrink-0">
                      <span className="text-xs font-black tracking-widest bg-[#1a293d] border border-[#2d435e] text-[#38bdf8] px-3 py-1 rounded-full shadow-inner">
                        VS
                      </span>
                      <span className="text-[10px] font-mono text-[#94a3b8] mt-1">
                        {isHomeFixture ? 'HOME MATCH' : 'AWAY FIXTURE'}
                      </span>
                    </div>

                    {/* Away Team */}
                    {(() => {
                      const teamToShow = !isHomeFixture ? userTeam : opponentTeam;
                      const isUser = !isHomeFixture;
                      const tier = teamToShow.tier || (teamToShow.teamRating() >= 82 ? 'ELITE' : teamToShow.teamRating() >= 70 ? 'MID' : 'UNDERDOG');
                      const stars = teamToShow.starPlayers();

                      return (
                        <div className="flex items-center gap-3 flex-1 justify-end text-right">
                          <div>
                            <div className="text-sm font-bold text-white flex items-center justify-end gap-1.5 flex-wrap">
                              {tier === 'ELITE' && (
                                <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1 py-0.2 rounded font-extrabold font-mono">
                                  ★ BIG 4
                                </span>
                              )}
                              {tier === 'MID' && (
                                <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-400/40 px-1 py-0.2 rounded font-semibold font-mono">
                                  MID-TIER
                                </span>
                              )}
                              {tier === 'UNDERDOG' && (
                                <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-400/40 px-1 py-0.2 rounded font-semibold font-mono">
                                  UNDERDOG
                                </span>
                              )}
                              {isUser && (
                                <span className="text-[10px] bg-[#38bdf8] text-black font-extrabold px-1.5 py-0.2 rounded">YOU</span>
                              )}
                              <span>{teamToShow.name}</span>
                            </div>
                            <div className="text-xs text-[#94a3b8] font-mono mt-0.5">
                              {teamToShow.formation} · {teamToShow.tactic} · <strong className="text-[#38bdf8]">Rtg {teamToShow.teamRating()}</strong>
                            </div>
                            {tier === 'UNDERDOG' && stars.length > 0 && (
                              <div className="text-[10px] text-[#ffd54f] font-mono mt-0.5">
                                ⭐ Key Stars: {stars.map((s) => `${s.name} (${s.position} ${s.rating()})`).join(', ')}
                              </div>
                            )}
                          </div>
                          <span
                            className="w-11 h-11 rounded-full border-2 border-white/60 shadow-md shrink-0 flex items-center justify-center font-bold text-sm text-black"
                            style={{ backgroundColor: teamToShow.color }}
                          >
                            ⚽
                          </span>
                        </div>
                      );
                    })()}

                    {/* Play Match Button */}
                    <div className="w-full md:w-auto shrink-0 flex justify-center md:justify-end pt-2 md:pt-0">
                      <button
                        onClick={handleStartLeagueFixture}
                        className="fm-continue-btn w-full md:w-auto px-6 py-2.5 rounded font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      >
                        <span>PLAY MATCHDAY {currentRound}</span>
                        <span className="text-base leading-none">▶</span>
                      </button>
                    </div>
                  </div>

                  {/* Opposition AI Formation Adaptation & Percentage Control */}
                  <div className={`mt-3.5 pt-2.5 border-t border-[#1e2e42] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono py-2 px-3 rounded border ${
                    opponentTeam.formation === userTeam.formation ? 'bg-[#ffd54f]/10 border-[#ffd54f]/40' : 'bg-[#0b1622]/90 border-[#1e2e42]'
                  }`}>
                    <div className="flex items-center gap-2 text-left">
                      <span className="text-[#ffd54f] text-sm">⚡</span>
                      <div>
                        <div className="text-white font-bold flex items-center gap-2 flex-wrap">
                          <span>Opposition Tactical Adaptation:</span>
                          {opponentTeam.formation === userTeam.formation ? (
                            <span className="text-[10px] bg-[#ffd54f] text-black font-extrabold px-1.5 py-0.2 rounded animate-pulse">
                              MIRROR FORMATION ({userTeam.formation})
                            </span>
                          ) : (
                            <span className="text-[10px] bg-[#38bdf8]/20 text-[#38bdf8] font-bold px-1.5 py-0.2 rounded border border-[#38bdf8]/40">
                              {userTeam.formation} vs {opponentTeam.formation}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#94a3b8] mt-0.5">
                          {opponentTeam.formation === userTeam.formation
                            ? `Identical formations detected! Opposition AI has a ${Math.round(aiAdaptChance * 100)}% chance to adapt to a counter setup at kickoff.`
                            : `If you mirror ${opponentTeam.formation}, opposition AI will have a ${Math.round(aiAdaptChance * 100)}% probability to counter.`}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Percentage Selector */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-[#070d14] p-1 rounded border border-[#1e2e42]">
                      <span className="text-[10px] text-[#94a3b8] px-1 font-semibold">AI Switch %:</span>
                      {[0.25, 0.50, 0.75, 1.0].map((val) => {
                        const isSel = Math.abs(aiAdaptChance - val) < 0.01;
                        return (
                          <button
                            key={val}
                            onClick={() => {
                              setAiAdaptChance(val);
                              sound.click();
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                              isSel
                                ? 'bg-[#38bdf8] text-black font-extrabold shadow'
                                : 'text-[#94a3b8] hover:text-white hover:bg-[#152233]'
                            }`}
                          >
                            {Math.round(val * 100)}%
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center space-y-3">
                  <div className="text-base font-bold text-white flex items-center justify-center gap-2">
                    <span>🏆</span>
                    <span>The {seasonYear} League Championship is Concluded!</span>
                  </div>
                  <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                    Review final standings, promote top academy talents to your squad, and advance to Season {seasonYear + 1} to generate fresh youth intakes for all 26 clubs!
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap pt-1">
                    <button
                      onClick={handleAdvanceSeason}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-2 rounded text-xs border border-emerald-300 shadow cursor-pointer transition flex items-center gap-1.5"
                    >
                      <span>Advance to Season {seasonYear + 1} (Fresh Youth Intake) →</span>
                    </button>
                    <button
                      onClick={() => setScreen('table')}
                      className="fm-continue-btn px-4 py-2 rounded text-xs font-bold"
                    >
                      View Final Standings →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. THREE-PANEL DASHBOARD GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* PANEL A: MANAGER PROFILE & CLUB FORM */}
              <div className="fm-panel p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between border-b border-[#223347] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black inline-block"
                      style={{ backgroundColor: userTeam?.color }}
                    />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">Club Profile</span>
                  </div>
                  <span className="text-[10px] text-[#38bdf8] font-mono font-bold bg-[#38bdf8]/10 px-1.5 py-0.5 rounded">
                    RANK #{userRank}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-white font-extrabold text-base">{userTeam?.name}</div>
                  <div className="text-[#94a3b8] font-mono text-[11px]">
                    Record: <strong className="text-white">{userTeam?.won}W {userTeam?.drawn}D {userTeam?.lost}L</strong> · GD: <strong className="text-[#38bdf8]">{userTeam && userTeam.goalDiff() > 0 ? `+${userTeam.goalDiff()}` : userTeam?.goalDiff()}</strong>
                  </div>
                  <div className="text-[#94a3b8] font-mono text-[11px]">
                    Points: <strong className="text-white font-bold text-sm">{userTeam?.points()}</strong> · Squad Size: <strong className="text-white">{userTeam?.squad.length}</strong>
                  </div>
                  <div className="text-[#94a3b8] font-mono text-[11px] pt-1">
                    Rating: <strong className="text-[#38bdf8] font-bold">{userTeam?.teamRating()}</strong> (ATK: {userTeam?.attackRating()} / DEF: {userTeam?.defenseRating()})
                  </div>
                </div>

                <button
                  onClick={() => {
                    setViewTeamId(userTeam.id);
                    setScreen('squad');
                  }}
                  className="w-full py-1.5 px-3 bg-[#152233] hover:bg-[#1e2e42] text-[#38bdf8] border border-[#223347] rounded text-xs font-semibold cursor-pointer transition flex items-center justify-between"
                >
                  <span>Inspect Squad Roster</span>
                  <span>→</span>
                </button>
              </div>

              {/* PANEL B: SWOS TACTICS WORKSHOP PREVIEW */}
              <div className="fm-panel p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between border-b border-[#223347] pb-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs uppercase tracking-wider">
                    <span>📋</span>
                    <span>SWOS Tactics Pitch</span>
                  </div>
                  <span className="text-[10px] text-[#ffd54f] font-mono font-bold">
                    {userTeam?.formation} · {userTeam?.tactic}
                  </span>
                </div>

                {/* Miniature Sensible Soccer Grass Pitch */}
                <div
                  className="relative w-full h-28 rounded overflow-hidden border border-[#276727] shadow-inner select-none cursor-pointer"
                  style={{
                    background: 'repeating-linear-gradient(0deg, #114b19, #114b19 14px, #165b21 14px, #165b21 28px)',
                  }}
                  onClick={() => setScreen('tactics')}
                  title="Click to open SWOS Tactics room"
                >
                  {/* Pitch Lines */}
                  <div className="absolute inset-1 border border-white/40 rounded-xs pointer-events-none" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/40 pointer-events-none" />
                  {/* Goal boxes */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-6 border-t border-l border-r border-white/40 pointer-events-none" />
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-6 border-b border-l border-r border-white/40 pointer-events-none" />

                  {/* Player Dots */}
                  {userTeam &&
                    getFormationDots(userTeam.formation).map((dot, idx) => (
                      <div
                        key={idx}
                        className="absolute w-2.5 h-2.5 rounded-full border border-black/80 shadow-xs transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[7px] font-mono font-extrabold text-white"
                        style={{
                          left: `${dot.x}%`,
                          top: `${dot.y}%`,
                          backgroundColor: idx === 0 ? '#ffd54f' : userTeam.color || '#38bdf8',
                        }}
                      />
                    ))}
                </div>

                {/* Quick Formation Changer */}
                <div className="flex gap-1.5 items-center">
                  <select
                    value={userTeam?.formation}
                    onChange={(e) => {
                      const f = e.target.value as FormationName;
                      if (userTeam) userTeam.formation = f;
                      setTeams([...teams]);
                      sound.click();
                    }}
                    className="flex-1 bg-[#09101a] border border-[#223347] text-white text-[11px] rounded px-2 py-1 font-mono font-semibold"
                  >
                    {(Object.keys(FORMATIONS) as FormationName[]).map((f) => (
                      <option key={f} value={f}>
                        Formation: {f}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setScreen('tactics')}
                    className="py-1 px-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-[11px] font-bold cursor-pointer transition shrink-0"
                  >
                    SWOS Room →
                  </button>
                </div>
              </div>

              {/* PANEL C: PREMIER LEAGUE STANDINGS SNAPSHOT */}
              <div className="fm-panel p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between border-b border-[#223347] pb-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs uppercase tracking-wider">
                    <span>🏆</span>
                    <span>League Snapshot</span>
                  </div>
                  <span className="text-[10px] text-[#94a3b8] font-mono">Top 4 + You</span>
                </div>

                <div className="space-y-1 text-xs">
                  {sortedStandings.slice(0, 4).map((t, idx) => {
                    const isUser = t.id === userTeam?.id;
                    return (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between py-1 px-1.5 rounded font-mono text-[11px] ${
                          isUser ? 'bg-[#38bdf8]/15 text-[#38bdf8] font-bold border border-[#38bdf8]/40' : 'text-[#cbd5e1]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-4 text-center font-bold text-[#94a3b8]">{idx + 1}</span>
                          <span
                            className="w-2 h-2 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="truncate">{t.shortName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[#94a3b8]">{t.played}p</span>
                          <span className="font-bold text-white">{t.points()} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setScreen('table')}
                  className="w-full py-1.5 px-3 bg-[#152233] hover:bg-[#1e2e42] text-[#38bdf8] border border-[#223347] rounded text-xs font-semibold cursor-pointer transition flex items-center justify-between"
                >
                  <span>Full Championship Standings</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* 3. PLAYER ACADEMY & TRAINING TOKENS WIDGET */}
            <div className="fm-panel p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-[#101b2a] to-[#142337]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-[#38bdf8] text-[#38bdf8]" />
                    <span>Player Academy & Attribute Upgrades</span>
                  </span>
                  <span className="text-xs font-mono font-bold bg-[#38bdf8] text-black px-2 py-0.5 rounded shadow">
                    {trainingTokens} TOKENS
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mt-1 font-mono">
                  Earn tokens by playing matches (multiplied by difficulty) to permanently upgrade your players' passing, shooting, pace, and tackling!
                </p>
              </div>

              <button
                onClick={() => {
                  setTrainingPlayerId(undefined);
                  setTrainingModalOpen(true);
                  sound.click();
                }}
                className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow shrink-0 border border-[#38bdf8]"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Open Training Academy</span>
              </button>
            </div>

            {/* 4. MATCH DIFFICULTY & TOKEN MULTIPLIER BAR */}
            <div className="fm-panel p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2 text-white font-bold">
                  <Gamepad className="w-4 h-4 text-[#38bdf8]" />
                  <span>MATCH DIFFICULTY & REWARD MULTIPLIER:</span>
                  <span className="text-[10px] bg-[#ffd54f] text-black px-1.5 py-0.5 rounded font-extrabold font-mono">
                    {DIFFICULTY_SETTINGS[difficulty].multiplier}x REWARDS
                  </span>
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">
                  {DIFFICULTY_SETTINGS[difficulty].description}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 shrink-0">
                {(['Amateur', 'Semi-Pro', 'Professional', 'World Class', 'Legendary'] as MatchDifficulty[]).map((diff) => {
                  const cfg = DIFFICULTY_SETTINGS[diff];
                  const active = difficulty === diff;
                  return (
                    <button
                      key={diff}
                      onClick={() => {
                        setDifficulty(diff);
                        sound.click();
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition border font-mono ${
                        active
                          ? 'bg-[#0284c7] text-white border-[#38bdf8] shadow'
                          : 'bg-[#152233] text-[#94a3b8] border-[#223347] hover:bg-[#1e2e42] hover:text-white'
                      }`}
                      title={cfg.description}
                    >
                      {cfg.name} ({cfg.multiplier}x)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. TABLOID BREAKING NEWS & RANDOM ENCOUNTERS MECHANIC */}
            <div className="fm-panel p-4 bg-gradient-to-r from-[#2a0e13] via-[#1a121d] to-[#121c29] border border-[#ef4444]/40 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#3b1a20] pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-red-600/20 border border-red-500 flex items-center justify-center text-red-400">
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>THE SUNDAY SPORT & TABLOID WIRE</span>
                      <span className="text-[10px] bg-red-600 text-white font-mono px-1.5 py-0.2 rounded font-extrabold">
                        RANDOM ENCOUNTERS
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#fca5a5]">
                      Unscripted off-pitch events: drug busts & 4-month prison sentences, car crashes, newborn babies, sponsorship deals, & glamour romances!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleTriggerRandomEncounter('negative')}
                    className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/70 text-red-200 rounded text-xs font-bold font-mono cursor-pointer transition flex items-center gap-1"
                    title="Simulate random negative scandal (Prison, Car Crash, Doping)"
                  >
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>Roll Scandal 🚨</span>
                  </button>

                  <button
                    onClick={() => handleTriggerRandomEncounter('positive')}
                    className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/70 text-emerald-200 rounded text-xs font-bold font-mono cursor-pointer transition flex items-center gap-1"
                    title="Simulate random positive windfall (Baby, Boots, Model, Legend)"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Roll Windfall ⭐</span>
                  </button>

                  {currentEncounter && (
                    <button
                      onClick={() => setEncounterModalOpen(true)}
                      className="px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] border border-[#38bdf8]/50 text-[#38bdf8] rounded text-xs font-bold font-mono cursor-pointer transition"
                    >
                      Read Full Story 📰
                    </button>
                  )}
                </div>
              </div>

              {/* Current Tabloid Teaser or Active Suspensions */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                {/* Active Headline Left */}
                <div className="md:col-span-8 bg-black/40 border border-[#3b1a20] p-3 rounded space-y-1.5 font-serif">
                  {currentEncounter ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black uppercase text-white ${
                          currentEncounter.type === 'positive' ? 'bg-emerald-700' : 'bg-red-700'
                        }`}>
                          {currentEncounter.badgeLabel}
                        </span>
                        <span className="text-[10px] text-[#a8a29e] font-mono">
                          {currentEncounter.newspaperName} · {currentEncounter.dateString}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight font-serif leading-tight">
                        {currentEncounter.headline}
                      </h4>
                      <p className="text-xs text-[#cbd5e1] italic line-clamp-2">
                        "{currentEncounter.quote}"
                      </p>
                    </>
                  ) : (
                    <div className="py-2 text-center text-[#94a3b8] italic">
                      No breaking tabloid scandals today. Advance to the next matchday or roll a random encounter to trigger locker room drama!
                    </div>
                  )}
                </div>

                {/* Squad Suspension Tracker Right */}
                <div className="md:col-span-4 bg-black/40 border border-[#3b1a20] p-3 rounded font-mono text-[11px] space-y-1.5">
                  <div className="font-bold text-[#fca5a5] uppercase text-[10px] tracking-wider border-b border-[#3b1a20] pb-1">
                    DISCIPLINARY & INJURY LIST
                  </div>
                  {userTeam && userTeam.squad.filter((p) => p.suspendedMatches > 0).length > 0 ? (
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {userTeam.squad
                        .filter((p) => p.suspendedMatches > 0)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex justify-between items-center bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded text-red-200"
                          >
                            <span className="font-semibold truncate">
                              #{p.number} {p.name}
                            </span>
                            <span className="font-bold text-red-400 shrink-0 ml-1">
                              🚨 {p.suspendedMatches}M BAN
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-[#a5d6a7] py-1 text-center font-bold">
                      ✓ Entire squad available & fit
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 6. QUICK MANAGERIAL ACTIONS BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <button
                onClick={() => setFriendlyModalOpen(true)}
                className="p-3 bg-[#101926] hover:bg-[#182638] border border-[#223347] text-[#cbd5e1] hover:text-[#38bdf8] rounded cursor-pointer transition flex items-center justify-between"
              >
                <span>⚽ Exhibition / Friendly Match</span>
                <span className="text-[#94a3b8]">→</span>
              </button>

              <button
                onClick={() => setScreen('pickTeam')}
                className="p-3 bg-[#101926] hover:bg-[#182638] border border-[#223347] text-[#cbd5e1] hover:text-[#38bdf8] rounded cursor-pointer transition flex items-center justify-between"
              >
                <span>👔 Switch Managed Club</span>
                <span className="text-[#94a3b8]">→</span>
              </button>

              <button
                onClick={handleResetSeason}
                className="p-3 bg-[#101926] hover:bg-red-950/40 border border-[#223347] text-red-400 rounded cursor-pointer transition flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Season Campaign</span>
                </span>
                <span className="text-red-500">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= SCREEN: LEAGUE TABLE ================= */}
        {screen === 'table' && (
          <LeagueTable
            teams={teams}
            userTeamId={userTeamId}
            currentRound={currentRound}
            totalRounds={totalRounds}
            onSelectTeam={(t) => {
              setViewTeamId(t.id);
              setScreen('squad');
            }}
            onBack={() => setScreen('menu')}
            onNextFixture={
              currentRound <= totalRounds ? handleStartLeagueFixture : undefined
            }
            onAdvanceSeason={handleAdvanceSeason}
          />
        )}

        {/* ================= SCREEN: SQUAD PICKER ================= */}
        {screen === 'pickSquad' && (
          <div className="fm-panel font-sans text-xs sm:text-sm overflow-hidden">
            <div className="fm-panel-header px-4 py-3 flex justify-between items-center">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <span className="text-[#38bdf8]">👥</span> INSPECT RIVAL CLUBS & TACTICS
                </h1>
                <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">
                  Explore team tiers, tactical mentalities, and squad rosters across Big Time League (14 clubs) and Up and Comers (12 clubs)
                </p>
              </div>
              <button
                onClick={() => setScreen('menu')}
                className="bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] border border-[#334155] px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
              >
                Back to Overview
              </button>
            </div>

            {/* League Switcher Tabs */}
            <div className="flex bg-[#0b131e] border-b border-[#223347] px-4 pt-2 gap-2 font-mono">
              <button
                onClick={() => setPickerLeagueFilter('big_time')}
                className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pickerLeagueFilter === 'big_time'
                    ? 'bg-[#152233] text-[#38bdf8] border-t-2 border-t-[#38bdf8] border-x border-[#223347]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
                }`}
              >
                <span>🏆</span>
                <span>BIG TIME LEAGUE (14 CLUBS)</span>
              </button>

              <button
                onClick={() => setPickerLeagueFilter('up_and_comers')}
                className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pickerLeagueFilter === 'up_and_comers'
                    ? 'bg-[#152233] text-[#c084fc] border-t-2 border-t-[#c084fc] border-x border-[#223347]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
                }`}
              >
                <span>⚡</span>
                <span>UP AND COMERS (12 CLUBS)</span>
              </button>
            </div>

            <div className="p-4 space-y-6">
              {(pickerLeagueFilter === 'big_time'
                ? [
                    {
                      id: 'ELITE',
                      title: '🏆 THE BIG 4 HEAVYWEIGHTS (4 CLUBS)',
                      subtitle: 'Elite squads with world-class talent and high ratings across all lines (Ratings 85 - 88)',
                      badge: 'BIG 4 ELITE',
                      badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
                      list: teams.filter((t) => (t.leagueId || 'big_time') === 'big_time' && (t.tier === 'ELITE' || t.teamRating() >= 82)),
                    },
                    {
                      id: 'MID',
                      title: '⚖️ MID-LEVEL CONTENDERS (6 CLUBS)',
                      subtitle: 'Disciplined, well-balanced units with established tactical systems (Ratings 73 - 77)',
                      badge: 'MID TIER',
                      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
                      list: teams.filter((t) => (t.leagueId || 'big_time') === 'big_time' && (t.tier === 'MID' || (t.teamRating() >= 70 && t.teamRating() < 82))),
                    },
                    {
                      id: 'UNDERDOG',
                      title: '⚡ LOWER-STRENGTH UNDERDOGS (4 CLUBS WITH KEY STARS)',
                      subtitle: 'Lower strength rosters built around 1-2 standout game-changing talents (Ratings 62 - 66, Stars 82+)',
                      badge: 'UNDERDOG TIER',
                      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
                      list: teams.filter((t) => (t.leagueId || 'big_time') === 'big_time' && (t.tier === 'UNDERDOG' || t.teamRating() < 70)),
                    },
                  ]
                : [
                    {
                      id: 'ELITE',
                      title: '🌟 PROMOTION FAVORITES (2 CLUBS)',
                      subtitle: 'Top-tier contenders with sharp tactical setups and standout leaders (Ratings 68 - 72, Stars 78+)',
                      badge: 'PROMOTION CONTENDER',
                      badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
                      list: teams.filter((t) => t.leagueId === 'up_and_comers' && (t.tier === 'ELITE' || t.teamRating() >= 66)),
                    },
                    {
                      id: 'MID',
                      title: '⚖️ MID-TABLE FIGHTERS (6 CLUBS)',
                      subtitle: 'Gritty, physical mid-division sides with distinct counter and pressing strategies (Ratings 58 - 64)',
                      badge: 'MID-TABLE',
                      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
                      list: teams.filter((t) => t.leagueId === 'up_and_comers' && (t.tier === 'MID' || (t.teamRating() >= 55 && t.teamRating() < 66))),
                    },
                    {
                      id: 'UNDERDOG',
                      title: '🌱 GRASSROOTS UNDERDOGS (4 CLUBS WITH STANDOUT STARS)',
                      subtitle: 'Scrappy underdog squads scaled down in depth, but anchored by 1-2 brilliant talismans (Ratings 48 - 54, Stars 72-76)',
                      badge: 'UNDERDOG TIER',
                      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
                      list: teams.filter((t) => t.leagueId === 'up_and_comers' && (t.tier === 'UNDERDOG' || t.teamRating() < 55)),
                    },
                  ]
              ).map((group) => (
                <div key={group.id} className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#1e2e42] pb-1.5">
                    <div>
                      <h2 className="font-bold text-white text-xs sm:text-sm tracking-wide flex items-center gap-2">
                        <span>{group.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-extrabold border ${group.badgeColor}`}>
                          {group.badge}
                        </span>
                      </h2>
                      <p className="text-[11px] text-[#94a3b8] font-mono mt-0.5">{group.subtitle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.list.map((t) => {
                      const stars = t.starPlayers();
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setViewTeamId(t.id);
                            setScreen('squad');
                          }}
                          className="p-3 bg-[#0d1520] hover:bg-[#162336] border border-[#223347] hover:border-[#38bdf8]/60 rounded text-left cursor-pointer transition flex flex-col justify-between group shadow-sm gap-2"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-4 h-4 rounded-full border border-black inline-block shadow-sm shrink-0"
                                style={{ backgroundColor: t.color }}
                              />
                              <div>
                                <div className="font-bold text-white group-hover:text-[#38bdf8] transition text-sm flex items-center gap-1.5">
                                  <span>{t.name}</span>
                                  {t.id === userTeamId && (
                                    <span className="text-[9px] bg-[#38bdf8] text-black px-1 py-0.2 rounded font-black font-mono">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#94a3b8] font-mono mt-0.5">
                                  {t.formation} · <strong className="text-white">{t.tactic}</strong>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs text-[#38bdf8] font-bold font-mono">Rtg {t.teamRating()}</div>
                              <div className="text-[10px] text-[#94a3b8] font-mono">
                                ATK {t.attackRating()} · DEF {t.defenseRating()}
                              </div>
                            </div>
                          </div>

                          {/* Strategy Note */}
                          <div className="text-[10px] text-[#64748b] font-mono italic truncate w-full">
                            {TACTICS[t.tactic]?.description}
                          </div>

                          {/* Star talents display for underdogs / stars */}
                          {stars.length > 0 && (
                            <div className="text-[10px] text-[#ffd54f] font-mono bg-[#ffd54f]/10 p-1.5 rounded border border-[#ffd54f]/20 flex items-center gap-1.5">
                              <span>⭐</span>
                              <span>
                                <strong>Standout Stars:</strong> {stars.map((s) => `${s.name} (${s.position} ${s.rating()})`).join(', ')}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SCREEN: SQUAD VIEW ================= */}
        {screen === 'squad' && viewedTeam && (
          <SquadViewer
            team={viewedTeam}
            isUserTeam={viewedTeam.id === userTeamId}
            onSelectAsUserTeam={() => {
              setUserTeamId(viewedTeam.id);
              alert(`You are now the head manager of ${viewedTeam.name}!`);
            }}
            onOpenTactics={() => setScreen('tactics')}
            onOpenTraining={(pid) => {
              setTrainingPlayerId(pid);
              setTrainingModalOpen(true);
            }}
            onSquadUpdated={() => setTeams([...teams])}
            onBack={() => setScreen('pickSquad')}
          />
        )}

        {/* ================= SCREEN: PICK USER CLUB ================= */}
        {screen === 'pickTeam' && (
          <div className="fm-panel font-sans text-xs sm:text-sm overflow-hidden">
            <div className="fm-panel-header px-4 py-3 flex justify-between items-center">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <span className="text-[#38bdf8]">👔</span> PICK YOUR CLUB TO MANAGE
                </h1>
                <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">
                  Select your club: take over a Big 4 powerhouse, a mid-level challenger, or guide an underdog with star talents across 2 divisions!
                </p>
              </div>
              <button
                onClick={() => setScreen('menu')}
                className="bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] border border-[#334155] px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
              >
                Back to Overview
              </button>
            </div>

            {/* League Switcher Tabs */}
            <div className="flex bg-[#0b131e] border-b border-[#223347] px-4 pt-2 gap-2 font-mono">
              <button
                onClick={() => setPickerLeagueFilter('big_time')}
                className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pickerLeagueFilter === 'big_time'
                    ? 'bg-[#152233] text-[#38bdf8] border-t-2 border-t-[#38bdf8] border-x border-[#223347]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
                }`}
              >
                <span>🏆</span>
                <span>BIG TIME LEAGUE (14 CLUBS)</span>
              </button>

              <button
                onClick={() => setPickerLeagueFilter('up_and_comers')}
                className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pickerLeagueFilter === 'up_and_comers'
                    ? 'bg-[#152233] text-[#c084fc] border-t-2 border-t-[#c084fc] border-x border-[#223347]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
                }`}
              >
                <span>⚡</span>
                <span>UP AND COMERS (12 CLUBS)</span>
              </button>
            </div>

            <div className="p-4 space-y-6">
              {(pickerLeagueFilter === 'big_time'
                ? [
                    {
                      id: 'ELITE',
                      title: '🏆 THE BIG 4 HEAVYWEIGHTS (4 CLUBS)',
                      subtitle: 'Title contenders with world-class talent and elite ratings (Ratings 85 - 88)',
                      badge: 'BIG 4 ELITE',
                      badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
                      list: teams.filter((t) => (t.leagueId || 'big_time') === 'big_time' && (t.tier === 'ELITE' || t.teamRating() >= 82)),
                    },
                    {
                      id: 'MID',
                      title: '⚖️ MID-LEVEL CONTENDERS (6 CLUBS)',
                      subtitle: 'Solid, disciplined squads with balanced ratings and high work rate (Ratings 73 - 77)',
                      badge: 'MID TIER',
                      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
                      list: teams.filter((t) => (t.leagueId || 'big_time') === 'big_time' && (t.tier === 'MID' || (t.teamRating() >= 70 && t.teamRating() < 82))),
                    },
                    {
                      id: 'UNDERDOG',
                      title: '⚡ LOWER-STRENGTH UNDERDOGS (4 CLUBS WITH KEY STARS)',
                      subtitle: 'Lower strength teams built around 1-2 standout talents (Ratings 62 - 66, Stars 82+)',
                      badge: 'UNDERDOG TIER',
                      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
                      list: teams.filter((t) => (t.leagueId || 'big_time') === 'big_time' && (t.tier === 'UNDERDOG' || t.teamRating() < 70)),
                    },
                  ]
                : [
                    {
                      id: 'ELITE',
                      title: '🌟 PROMOTION FAVORITES (2 CLUBS)',
                      subtitle: 'Top contenders aiming for top flight glory with established squads (Ratings 68 - 72, Stars 78+)',
                      badge: 'PROMOTION CONTENDER',
                      badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
                      list: teams.filter((t) => t.leagueId === 'up_and_comers' && (t.tier === 'ELITE' || t.teamRating() >= 66)),
                    },
                    {
                      id: 'MID',
                      title: '⚖️ MID-TABLE FIGHTERS (6 CLUBS)',
                      subtitle: 'Balanced second division teams with distinct tactical philosophies (Ratings 58 - 64)',
                      badge: 'MID-TABLE',
                      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
                      list: teams.filter((t) => t.leagueId === 'up_and_comers' && (t.tier === 'MID' || (t.teamRating() >= 55 && t.teamRating() < 66))),
                    },
                    {
                      id: 'UNDERDOG',
                      title: '🌱 GRASSROOTS UNDERDOGS (4 CLUBS WITH STANDOUT STARS)',
                      subtitle: 'Scrappy grassroots squads with lower overall depth but standout star players (Ratings 48 - 54, Stars 72-76)',
                      badge: 'UNDERDOG TIER',
                      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
                      list: teams.filter((t) => t.leagueId === 'up_and_comers' && (t.tier === 'UNDERDOG' || t.teamRating() < 55)),
                    },
                  ]
              ).map((group) => (
                <div key={group.id} className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#1e2e42] pb-1.5">
                    <div>
                      <h2 className="font-bold text-white text-xs sm:text-sm tracking-wide flex items-center gap-2">
                        <span>{group.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-extrabold border ${group.badgeColor}`}>
                          {group.badge}
                        </span>
                      </h2>
                      <p className="text-[11px] text-[#94a3b8] font-mono mt-0.5">{group.subtitle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.list.map((t) => {
                      const isSelected = t.id === userTeamId;
                      const stars = t.starPlayers();
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setUserTeamId(t.id);
                            setScreen('menu');
                            sound.whistle();
                          }}
                          className={`p-3 rounded border text-left cursor-pointer transition flex flex-col justify-between shadow-sm gap-2 ${
                            isSelected
                              ? 'bg-[#15273d] border-[#38bdf8] text-[#38bdf8] font-bold shadow'
                              : 'bg-[#0d1520] hover:bg-[#162336] border-[#223347] text-white hover:border-[#38bdf8]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-4 h-4 rounded-full border border-black inline-block shadow-sm shrink-0"
                                style={{ backgroundColor: t.color }}
                              />
                              <div>
                                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                                  <span>{t.name}</span>
                                  {isSelected && (
                                    <span className="text-[9px] bg-[#38bdf8] text-black px-1.5 py-0.2 rounded font-extrabold font-mono">
                                      CURRENT CLUB
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#94a3b8] font-mono mt-0.5">
                                  {t.formation} · <strong className="text-white">{t.tactic}</strong>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-[#38bdf8] font-mono">Rtg {t.teamRating()}</div>
                              <div className="text-[10px] text-[#94a3b8] font-mono">
                                ATK {t.attackRating()} · DEF {t.defenseRating()}
                              </div>
                            </div>
                          </div>

                          {/* Strategy Note */}
                          <div className="text-[10px] text-[#64748b] font-mono italic truncate w-full">
                            {TACTICS[t.tactic]?.description}
                          </div>

                          {/* Standout Stars */}
                          {stars.length > 0 && (
                            <div className="text-[10px] text-[#ffd54f] font-mono bg-[#ffd54f]/10 p-1.5 rounded border border-[#ffd54f]/20 flex items-center gap-1.5">
                              <span>⭐</span>
                              <span>
                                <strong>Standout Stars:</strong> {stars.map((s) => `${s.name} (${s.position} ${s.rating()})`).join(', ')}
                              </span>
                            </div>
                          )}

                          <div className="pt-1 flex justify-end">
                            {isSelected ? (
                              <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                                ✓ MANAGING THIS CLUB
                              </span>
                            ) : (
                              <span className="text-xs text-[#38bdf8] font-semibold group-hover:underline">
                                Take Charge →
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SCREEN: TACTICS BOARD ================= */}
        {screen === 'tactics' && userTeam && (
          <div className="space-y-3">
            <TacticsBoard
              team={userTeam}
              onUpdateFormation={(f: FormationName) => {
                userTeam.formation = f;
                setTeams([...teams]);
                sound.click();
              }}
              onUpdateTactic={(t: TacticName) => {
                userTeam.tactic = t;
                setTeams([...teams]);
                sound.click();
              }}
              onUpdateCustomTactic={(customTac) => {
                userTeam.customSwosTactic = customTac;
                setTeams([...teams]);
                sound.whistle();
              }}
            />
            <div className="flex justify-end">
              <button
                onClick={() => setScreen('menu')}
                className="bg-[#12261a] hover:bg-[#2e7d32] text-[#ffd54f] hover:text-white border border-[#2e7d32] px-4 py-2 rounded text-xs cursor-pointer font-bold transition"
              >
                [Save & Return to Hub]
              </button>
            </div>
          </div>
        )}

        {/* ================= SCREEN: FIXTURES ================= */}
        {screen === 'fixtures' && (
          <FixturesView
            fixtures={fixtures}
            teams={teams}
            userTeamId={userTeamId}
            currentRound={currentRound}
            totalRounds={totalRounds}
            onPlayRound={handleStartLeagueFixture}
            onBack={() => setScreen('menu')}
          />
        )}

        {/* ================= SCREEN: GOLDEN BOOT ================= */}
        {screen === 'topScorers' && (
          <TopScorersView teams={teams} onBack={() => setScreen('menu')} />
        )}

        {/* ================= SCREEN: MATCH (REAL-TIME 360° OR TACTICAL) ================= */}
        {screen === 'match' && (realtimeMatch || liveMatch) && (
          <div className="space-y-3">
            {/* Mode & Tab Selector Header */}
            <div className="flex flex-wrap justify-between items-center bg-[#0a120a] p-2 border border-[#2e7d32] rounded text-xs font-mono gap-2 shadow-sm">
              {/* Left: Match Mode Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-[#ffd54f] font-bold">MODE:</span>
                <button
                  onClick={() => setMatchMode('realtime')}
                  className={`px-3 py-1 rounded cursor-pointer font-bold transition flex items-center gap-1.5 ${
                    matchMode === 'realtime'
                      ? 'bg-[#1b5e20] text-[#ffd54f] border border-[#ffd54f] shadow'
                      : 'bg-transparent text-[#6b8a6b] hover:text-white border border-transparent'
                  }`}
                >
                  <Gamepad className="w-3.5 h-3.5" /> 360° Gamepad / Action
                </button>
                <button
                  onClick={() => setMatchMode('turnBased')}
                  className={`px-3 py-1 rounded cursor-pointer font-bold transition flex items-center gap-1.5 ${
                    matchMode === 'turnBased'
                      ? 'bg-[#1b5e20] text-[#ffd54f] border border-[#ffd54f] shadow'
                      : 'bg-transparent text-[#6b8a6b] hover:text-white border border-transparent'
                  }`}
                >
                  ♟️ Turn-Based Sim
                </button>
              </div>

              {/* Center: Match Screen Tabs (Clean Pitch vs Dedicated Controls Tab) */}
              <div className="flex items-center gap-1 bg-[#060c06] p-0.5 rounded border border-[#1b5e20]">
                <button
                  onClick={() => {
                    setMatchTab('pitch');
                    sound.click();
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                    matchTab === 'pitch'
                      ? 'bg-[#1b5e20] text-[#ffd54f] border border-[#ffd54f] shadow'
                      : 'text-[#81c784] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>⚽ Match Pitch</span>
                </button>
                <button
                  onClick={() => {
                    setMatchTab('controls');
                    sound.click();
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                    matchTab === 'controls'
                      ? 'bg-[#1b5e20] text-[#ffd54f] border border-[#ffd54f] shadow'
                      : 'text-[#81c784] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Gamepad className="w-3.5 h-3.5" />
                  <span>🎮 Controls</span>
                </button>
              </div>

              {/* Right: Touch Pad Toggle & Exit Match */}
              <div className="flex items-center gap-2">
                {matchMode === 'realtime' && matchTab === 'pitch' && (
                  <button
                    onClick={() => setShowVirtualPad((prev) => !prev)}
                    className="px-2.5 py-1 bg-[#12261a] hover:bg-[#1b5e20] text-[#d4e8d4] border border-[#1b5e20] rounded text-[11px] cursor-pointer font-semibold transition"
                  >
                    {showVirtualPad ? 'Hide Touch Pad' : 'Show Touch Pad'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Quit to Manager Hub?')) {
                      setScreen('menu');
                    }
                  }}
                  className="px-2.5 py-1 bg-[#b71c1c] hover:bg-[#d32f2f] text-white rounded text-[11px] cursor-pointer font-bold transition"
                >
                  Exit Match
                </button>
              </div>
            </div>

            {/* TAB: CONTROLS */}
            {matchTab === 'controls' && (
              <MatchControlsTab
                matchMode={matchMode}
                realtimeMatch={realtimeMatch}
                hasPossession={
                  matchMode === 'realtime'
                    ? !!(realtimeMatch?.ball.carrier?.isHome === realtimeMatch?.userIsHome)
                    : !!(liveMatch?.possession === liveMatch?.userTeam)
                }
                showVirtualPad={showVirtualPad}
                onToggleVirtualPad={(show) => setShowVirtualPad(show)}
                onReturnToPitch={() => setMatchTab('pitch')}
              />
            )}

            {/* TAB: MATCH PITCH */}
            {matchTab === 'pitch' && (
              <>
                {/* REAL-TIME 360° GAMEPAD MATCH VIEW */}
                {matchMode === 'realtime' && realtimeMatch && (
                  <div className="space-y-3">
                    <PlayablePitchCanvas
                      match={realtimeMatch}
                      onFinishMatch={() => handleMatchFinished(realtimeMatch)}
                      onOpenTactics={() => setTacticsModalOpen(true)}
                      onOpenStats={() => setStatsModalOpen(true)}
                      onOpenControls={() => setMatchTab('controls')}
                    />

                    {showVirtualPad && (
                      <div className="bg-[#0a120a] border border-[#2e7d32] rounded p-2">
                        <VirtualGamepad
                          match={realtimeMatch}
                          hasPossession={
                            realtimeMatch.ball.carrier?.isHome === realtimeMatch.userIsHome
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

            {/* TURN-BASED SIMULATION VIEW */}
            {matchMode === 'turnBased' && liveMatch && (
              <div className="space-y-3">
                {/* Retro LED Scoreboard */}
                <ScoreBanner
                  home={liveMatch.home}
                  away={liveMatch.away}
                  homeScore={liveMatch.homeScore}
                  awayScore={liveMatch.awayScore}
                  minute={liveMatch.minute}
                  isGoalFlash={isGoalFlash}
                  scorers={liveMatch.scorers}
                  possessionHomePct={liveMatch.getPossessionPercentages().homePct}
                />

                {/* Pitch Canvas Visualizer */}
                <PitchCanvas
                  home={liveMatch.home}
                  away={liveMatch.away}
                  ballX={liveMatch.targetX}
                  ballY={liveMatch.targetY}
                  carrierId={liveMatch.carrier?.id}
                  isGoalFlash={isGoalFlash}
                />

                {/* Controls */}
                <MatchControls
                  onAction={handleMatchAction}
                  onFastForward={handleFastForward}
                  onQuit={() => {
                    if (
                      liveMatch.finished ||
                      window.confirm('Leave active match? Current progress will be conceded.')
                    ) {
                      setLiveMatch(null);
                      setScreen('menu');
                    }
                  }}
                  onOpenTactics={() => setTacticsModalOpen(true)}
                  onOpenStats={() => setStatsModalOpen(true)}
                  disabled={busy}
                  hasPossession={liveMatch.possession === liveMatch.userTeam}
                  carrier={liveMatch.carrier}
                  userTeam={liveMatch.userTeam}
                  isFinished={liveMatch.finished}
                  isHalfTime={liveMatch.halfTime && liveMatch.minute === 45}
                  onNextHalf={() => {
                    liveMatch.halfTime = false;
                    liveMatch.tick();
                    sound.whistle();
                    setLiveMatch(
                      Object.assign(Object.create(Object.getPrototypeOf(liveMatch)), liveMatch)
                    );
                  }}
                />

                {/* Teletype Match Log */}
                <MatchLog logs={liveMatch.log} />
              </div>
            )}
          </>
        )}
      </div>
    )}

        {/* ================= SCREEN: POST-MATCH ================= */}
        {screen === 'postMatch' && postMatchDetails && (
          <PostMatchResults
            home={postMatchDetails.home}
            away={postMatchDetails.away}
            userTeam={postMatchDetails.userTeam}
            homeScore={postMatchDetails.homeScore}
            awayScore={postMatchDetails.awayScore}
            scorers={postMatchDetails.scorers}
            simulatedFixturesInRound={postMatchDetails.simulatedFixturesInRound}
            allTeams={teams}
            isFriendly={postMatchDetails.isFriendly}
            tokenBreakdown={postMatchDetails.tokenBreakdown}
            onOpenTraining={() => {
              setTrainingPlayerId(undefined);
              setTrainingModalOpen(true);
            }}
            onViewTable={() => {
              setScreen('table');
            }}
            onReturnToHub={() => {
              setScreen('menu');
            }}
            onNextMatchday={handleNextMatchday}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto mt-6 pt-3 border-t border-[#1b5e20] text-[11px] text-[#6b8a6b] flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>ASCII Football Manager 2026 — Tactical Console Edition</div>
        <div className="flex gap-4">
          <span>Shortcuts: [P]ass, [D]ribble, [S]hoot, [T]ackle, [A]uto, [Q]uit</span>
        </div>
      </footer>

      {/* Player Academy & Training Hub Modal */}
      {userTeam && (
        <TrainingHubModal
          team={userTeam}
          isOpen={trainingModalOpen}
          onClose={() => setTrainingModalOpen(false)}
          onSquadUpdated={() => setTeams([...teams])}
          initialPlayerId={trainingPlayerId}
        />
      )}

      {/* In-Match Tactics Modal */}
      {(liveMatch || realtimeMatch) && (
        <TacticsBoard
          team={
            (matchMode === 'realtime' && realtimeMatch
              ? realtimeMatch.userTeam
              : liveMatch?.userTeam) || userTeam
          }
          isModal={true}
          isOpen={tacticsModalOpen}
          onClose={() => setTacticsModalOpen(false)}
          onUpdateFormation={(f: FormationName) => {
            if (userTeam) userTeam.formation = f;
            if (liveMatch) liveMatch.userTeam.formation = f;
            if (realtimeMatch) realtimeMatch.userTeam.formation = f;
            setTeams([...teams]);
            sound.click();
          }}
          onUpdateTactic={(t: TacticName) => {
            if (userTeam) userTeam.tactic = t;
            if (liveMatch) liveMatch.userTeam.tactic = t;
            if (realtimeMatch) realtimeMatch.userTeam.tactic = t;
            setTeams([...teams]);
            sound.click();
          }}
        />
      )}

      {/* In-Match Stats Modal */}
      {(liveMatch || realtimeMatch) && (
        <MatchStatsModal
          isOpen={statsModalOpen}
          onClose={() => setStatsModalOpen(false)}
          home={
            (matchMode === 'realtime' && realtimeMatch
              ? realtimeMatch.home
              : liveMatch?.home) || teams[0]
          }
          away={
            (matchMode === 'realtime' && realtimeMatch
              ? realtimeMatch.away
              : liveMatch?.away) || teams[1]
          }
          stats={
            matchMode === 'realtime' && realtimeMatch
              ? realtimeMatch.stats
              : liveMatch?.stats || {
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
                }
          }
          possession={
            matchMode === 'realtime' && realtimeMatch
              ? (() => {
                  const tot =
                    realtimeMatch.stats.homePossessionTicks +
                    realtimeMatch.stats.awayPossessionTicks;
                  const hp =
                    tot === 0
                      ? 50
                      : Math.round(
                          (realtimeMatch.stats.homePossessionTicks / tot) * 100
                        );
                  return { homePct: hp, awayPct: 100 - hp };
                })()
              : liveMatch?.getPossessionPercentages() || { homePct: 50, awayPct: 50 }
          }
        />
      )}

      {/* Friendly Exhibition Match Setup Modal */}
      <FriendlyMatchModal
        teams={teams}
        isOpen={friendlyModalOpen}
        onClose={() => setFriendlyModalOpen(false)}
        onStartMatch={handleStartFriendly}
      />

      {/* Game Screenshots & Feature Showcase Gallery Modal */}
      <ScreenshotsModal
        isOpen={screenshotsModalOpen}
        onClose={() => setScreenshotsModalOpen(false)}
      />

      {/* Random Encounters Breaking Tabloid Newspaper Modal */}
      <RandomEncounterModal
        isOpen={encounterModalOpen}
        encounter={currentEncounter}
        onClose={() => setEncounterModalOpen(false)}
      />
    </div>
  );
}
