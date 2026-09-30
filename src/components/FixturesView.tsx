import React, { useState } from 'react';
import { Fixture, Team, LeagueId, LEAGUES } from '../types/football';

interface FixturesViewProps {
  fixtures: Fixture[];
  teams: Team[];
  userTeamId: string | null;
  currentRound: number;
  totalRounds: number;
  onPlayRound?: () => void;
  onBack: () => void;
  defaultLeagueId?: LeagueId;
}

export const FixturesView: React.FC<FixturesViewProps> = ({
  fixtures,
  teams,
  userTeamId,
  currentRound,
  totalRounds,
  onPlayRound,
  onBack,
  defaultLeagueId,
}) => {
  const userTeam = teams.find((t) => t.id === userTeamId);
  const initialLeague: LeagueId = defaultLeagueId || userTeam?.leagueId || 'big_time';
  const [selectedLeague, setSelectedLeague] = useState<LeagueId>(initialLeague);

  const leagueInfo = LEAGUES[selectedLeague];
  const maxRounds = leagueInfo.totalRounds;
  const [selectedRound, setSelectedRound] = useState<number>(Math.min(currentRound, maxRounds));

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const roundFixtures = fixtures.filter(
    (f) => (f.leagueId || 'big_time') === selectedLeague && f.round === selectedRound
  );

  return (
    <div className="fm-panel font-sans text-xs sm:text-sm overflow-hidden">
      <div className="fm-panel-header px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>{selectedLeague === 'big_time' ? '🏆' : '⚡'}</span>
            <span>{leagueInfo.name.toUpperCase()} — FIXTURES & RESULTS</span>
          </h1>
          <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">
            {maxRounds}-Matchday {leagueInfo.name} Calendar ({leagueInfo.totalTeams} Clubs)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onPlayRound && selectedRound === currentRound && currentRound <= maxRounds && (
            <button
              onClick={onPlayRound}
              className="fm-continue-btn px-4 py-1.5 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              Play Matchday {currentRound} →
            </button>
          )}
          <button
            onClick={onBack}
            className="bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] border border-[#334155] px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
          >
            Hub
          </button>
        </div>
      </div>

      {/* League Filter Tabs */}
      <div className="flex bg-[#0b131e] border-b border-[#223347] px-3 pt-2 gap-2 font-mono">
        <button
          onClick={() => {
            setSelectedLeague('big_time');
            setSelectedRound(Math.min(currentRound, 26));
          }}
          className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            selectedLeague === 'big_time'
              ? 'bg-[#152233] text-[#38bdf8] border-t-2 border-t-[#38bdf8] border-x border-[#223347]'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
          }`}
        >
          <span>🏆</span>
          <span>BIG TIME LEAGUE (26 ROUNDS)</span>
        </button>

        <button
          onClick={() => {
            setSelectedLeague('up_and_comers');
            setSelectedRound(Math.min(currentRound, 22));
          }}
          className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            selectedLeague === 'up_and_comers'
              ? 'bg-[#152233] text-[#c084fc] border-t-2 border-t-[#c084fc] border-x border-[#223347]'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
          }`}
        >
          <span>⚡</span>
          <span>UP AND COMERS (22 ROUNDS)</span>
        </button>
      </div>

      {/* Round Selector Bar */}
      <div className="flex gap-1.5 overflow-x-auto p-3 bg-[#0c131d] border-b border-[#223347]">
        {Array.from({ length: maxRounds }).map((_, i) => {
          const r = i + 1;
          const isCurrent = r === currentRound;
          const isSelected = r === selectedRound;
          const isDone = r < currentRound;

          return (
            <button
              key={r}
              onClick={() => setSelectedRound(r)}
              className={`px-3 py-1.5 rounded text-xs shrink-0 cursor-pointer font-semibold border transition ${
                isSelected
                  ? 'bg-[#0284c7] text-white border-[#38bdf8] shadow-sm'
                  : isCurrent
                  ? 'bg-[#152233] text-[#38bdf8] border-[#38bdf8]/60 font-bold'
                  : isDone
                  ? 'bg-[#111c29] text-[#94a3b8] border-[#1e2f42] hover:bg-[#182638]'
                  : 'bg-[#0c131d] text-[#64748b] border-[#1e2f42] hover:bg-[#182638]'
              }`}
            >
              MD {r} {isDone ? '✓' : ''}
            </button>
          );
        })}
      </div>

      {/* Match Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-[#101926]">
        {roundFixtures.map((f) => {
          const home = teamMap.get(f.homeTeamId);
          const away = teamMap.get(f.awayTeamId);
          if (!home || !away) return null;

          const isUserMatch = userTeamId && (home.id === userTeamId || away.id === userTeamId);

          return (
            <div
              key={f.id}
              className={`border p-3.5 rounded transition ${
                isUserMatch
                  ? 'bg-[#0284c7]/10 border-[#38bdf8]/60 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                  : 'bg-[#0d1622] border-[#223347]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2 font-mono">
                <span>MATCHDAY {f.round}</span>
                {isUserMatch && (
                  <span className="text-[10px] bg-[#38bdf8] text-black font-extrabold px-1.5 py-0.2 rounded font-sans">
                    YOUR FIXTURE
                  </span>
                )}
                {f.played ? (
                  <span className="text-emerald-400 font-bold">FULL TIME</span>
                ) : (
                  <span className="text-[#64748b]">UPCOMING</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* Home */}
                <div className="flex items-center gap-2 flex-1 justify-start">
                  <span
                    className="w-3 h-3 rounded-full inline-block border border-black shrink-0"
                    style={{ backgroundColor: home.color }}
                  />
                  <span className={`font-semibold ${home.id === userTeamId ? 'text-[#38bdf8]' : 'text-white'}`}>
                    {home.name}
                  </span>
                </div>

                {/* Score / VS */}
                <div className="px-3 py-1 bg-[#09101a] border border-[#1e2f42] rounded text-center shrink-0 min-w-16 font-mono font-bold">
                  {f.played ? (
                    <span className="text-white text-sm">
                      {f.homeScore} - {f.awayScore}
                    </span>
                  ) : (
                    <span className="text-[#94a3b8] text-xs">VS</span>
                  )}
                </div>

                {/* Away */}
                <div className="flex items-center gap-2 flex-1 justify-end text-right">
                  <span className={`font-semibold ${away.id === userTeamId ? 'text-[#38bdf8]' : 'text-white'}`}>
                    {away.name}
                  </span>
                  <span
                    className="w-3 h-3 rounded-full inline-block border border-black shrink-0"
                    style={{ backgroundColor: away.color }}
                  />
                </div>
              </div>

              {/* Scorers ticker */}
              {f.played && f.scorers.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#1e2f42] text-[11px] text-[#94a3b8] flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="text-[#64748b]">Goals:</span>
                  {f.scorers.map((s, idx) => (
                    <span key={idx} className="font-mono">
                      ⚽ {s.playerShortName} {s.minute}&apos;
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
