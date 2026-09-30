import React, { useState } from 'react';
import { Team, LeagueId, LEAGUES } from '../types/football';

interface LeagueTableProps {
  teams: Team[];
  userTeamId?: string | null;
  onSelectTeam?: (team: Team) => void;
  onBack?: () => void;
  onNextFixture?: () => void;
  currentRound?: number;
  totalRounds?: number;
  defaultLeagueId?: LeagueId;
  onAdvanceSeason?: () => void;
}

export const LeagueTable: React.FC<LeagueTableProps> = ({
  teams,
  userTeamId,
  onSelectTeam,
  onBack,
  onNextFixture,
  currentRound = 1,
  totalRounds = 26,
  defaultLeagueId,
  onAdvanceSeason,
}) => {
  const userTeam = teams.find((t) => t.id === userTeamId);
  const initialLeague: LeagueId = defaultLeagueId || userTeam?.leagueId || 'big_time';
  const [selectedLeague, setSelectedLeague] = useState<LeagueId>(initialLeague);

  const leagueInfo = LEAGUES[selectedLeague];
  const leagueTeams = teams.filter((t) => (t.leagueId || 'big_time') === selectedLeague);

  // Sort teams by Points, then Goal Difference, then Goals For, then Name
  const sorted = [...leagueTeams].sort((a, b) => {
    if (b.points() !== a.points()) return b.points() - a.points();
    if (b.goalDiff() !== a.goalDiff()) return b.goalDiff() - a.goalDiff();
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });

  const isBigTime = selectedLeague === 'big_time';
  const leagueTotalRounds = leagueInfo.totalRounds;

  return (
    <div className="fm-panel font-sans text-xs sm:text-sm overflow-hidden">
      {/* Header */}
      <div className="fm-panel-header px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>{isBigTime ? '🏆' : '⚡'}</span>
            <span>{leagueInfo.name.toUpperCase()} — STANDINGS</span>
          </h1>
          <div className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">
            Matchday {Math.min(currentRound, leagueTotalRounds)} of {leagueTotalRounds} · {leagueInfo.totalTeams} Clubs Table
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentRound > totalRounds && onAdvanceSeason ? (
            <button
              onClick={onAdvanceSeason}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-1.5 rounded text-xs border border-emerald-300 shadow cursor-pointer transition flex items-center gap-1.5"
            >
              <span>Advance to Season 2027 →</span>
            </button>
          ) : onNextFixture ? (
            <button
              onClick={onNextFixture}
              className="fm-continue-btn px-4 py-1.5 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              Play Matchday {currentRound} →
            </button>
          ) : null}
          {onBack && (
            <button
              onClick={onBack}
              className="bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] border border-[#334155] px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
            >
              Hub
            </button>
          )}
        </div>
      </div>

      {/* Season Finished Banner */}
      {currentRound > totalRounds && (
        <div className="bg-gradient-to-r from-emerald-950/90 to-sky-950/90 border-b border-emerald-500/50 px-4 py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-emerald-300 font-extrabold flex items-center gap-1.5 text-xs">
              <span>🏆</span> 2026 SEASON COMPLETE! Final League Standings
            </span>
            <p className="text-[11px] text-emerald-200/80 mt-0.5 font-mono">
              Advance to the new season: increments player ages, archives stats, and randomly generates fresh Youth Academy prospects for all 26 clubs!
            </p>
          </div>
          {onAdvanceSeason && (
            <button
              onClick={onAdvanceSeason}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded text-xs border border-emerald-300 shadow cursor-pointer transition shrink-0"
            >
              Advance Season & Generate Youth Intake →
            </button>
          )}
        </div>
      )}

      {/* League Switcher Tabs */}
      <div className="flex bg-[#0b131e] border-b border-[#223347] px-3 pt-2 gap-2 font-mono">
        <button
          onClick={() => setSelectedLeague('big_time')}
          className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            selectedLeague === 'big_time'
              ? 'bg-[#152233] text-[#38bdf8] border-t-2 border-t-[#38bdf8] border-x border-[#223347]'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
          }`}
        >
          <span>🏆</span>
          <span>BIG TIME LEAGUE (14 CLUBS)</span>
        </button>

        <button
          onClick={() => setSelectedLeague('up_and_comers')}
          className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            selectedLeague === 'up_and_comers'
              ? 'bg-[#152233] text-[#c084fc] border-t-2 border-t-[#c084fc] border-x border-[#223347]'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
          }`}
        >
          <span>⚡</span>
          <span>UP AND COMERS (12 CLUBS)</span>
        </button>
      </div>

      {/* Zone Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] bg-[#0c131d] px-4 py-2 border-b border-[#223347]">
        {isBigTime ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0284c7]" />
              <span className="text-[#93c5fd]">1st–4th: Champions Cup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
              <span className="text-[#fca5a5]">13th–14th: Relegation to Up & Comers</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
              <span className="text-[#6ee7b7]">1st–2nd: Automatic Promotion to Big Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />
              <span className="text-[#fde68a]">3rd–6th: Promotion Playoff Zone</span>
            </div>
          </>
        )}
        {userTeam && userTeam.leagueId === selectedLeague && (
          <div className="flex items-center gap-1.5 ml-auto text-[#e2e8f0]">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
            <span className="text-[#cbd5e1]">Your Club ({userTeam.name})</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left font-sans">
          <thead>
            <tr className="bg-[#152233] text-[#94a3b8] text-[11px] font-semibold uppercase tracking-wider border-b border-[#223347]">
              <th className="py-2.5 px-3 text-center w-10">Pos</th>
              <th className="py-2.5 px-3">Club</th>
              <th className="py-2.5 px-2 text-center w-12">Rtg</th>
              <th className="py-2.5 px-2 text-center w-10">Pld</th>
              <th className="py-2.5 px-2 text-center w-10">W</th>
              <th className="py-2.5 px-2 text-center w-10">D</th>
              <th className="py-2.5 px-2 text-center w-10">L</th>
              <th className="py-2.5 px-2 text-center w-10">GF</th>
              <th className="py-2.5 px-2 text-center w-10">GA</th>
              <th className="py-2.5 px-2 text-center w-12">GD</th>
              <th className="py-2.5 px-3 text-right font-bold w-14 text-white">Pts</th>
            </tr>
          </thead>
          <tbody className="tabular-nums font-mono-tight text-xs text-[#cbd5e1]">
            {sorted.map((t, idx) => {
              const isUser = userTeamId && t.id === userTeamId;

              // Zones depending on league
              let isPromoted = false;
              let isPlayoff = false;
              let isTop4 = false;
              let isRelegated = false;

              if (isBigTime) {
                isTop4 = idx < 4;
                isRelegated = idx >= sorted.length - 2;
              } else {
                isPromoted = idx < 2;
                isPlayoff = idx >= 2 && idx < 6;
              }

              let rowClass = 'fm-table-row border-b border-[#1c293a] transition-colors ';
              if (isUser) {
                rowClass += 'bg-[#0284c7]/20 font-bold border-l-4 border-l-[#38bdf8] ';
              } else if (isBigTime && isTop4) {
                rowClass += 'border-l-4 border-l-[#0284c7]/60 ';
              } else if (isBigTime && isRelegated) {
                rowClass += 'border-l-4 border-l-[#ef4444]/60 ';
              } else if (!isBigTime && isPromoted) {
                rowClass += 'border-l-4 border-l-[#10b981]/60 ';
              } else if (!isBigTime && isPlayoff) {
                rowClass += 'border-l-4 border-l-[#f59e0b]/60 ';
              } else {
                rowClass += 'border-l-4 border-l-transparent ';
              }

              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTeam && onSelectTeam(t)}
                  className={`${rowClass} ${onSelectTeam ? 'cursor-pointer' : ''}`}
                >
                  <td
                    className={`py-2 px-3 text-center font-bold ${
                      isTop4 || isPromoted
                        ? 'text-[#38bdf8]'
                        : isPlayoff
                        ? 'text-[#f59e0b]'
                        : isRelegated
                        ? 'text-[#ef4444]'
                        : 'text-[#64748b]'
                    }`}
                  >
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full inline-block border border-black/40 shadow-sm shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className={`font-medium ${isUser ? 'text-white font-bold' : 'text-[#e2e8f0]'}`}>
                        {t.name}
                        {isUser && (
                          <span className="ml-2 text-[10px] bg-[#0284c7] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            YOU
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center text-[#94a3b8] font-mono-tight">{t.teamRating()}</td>
                  <td className="py-2 px-2 text-center">{t.played}</td>
                  <td className="py-2 px-2 text-center text-[#34d399]">{t.won}</td>
                  <td className="py-2 px-2 text-center text-[#94a3b8]">{t.drawn}</td>
                  <td className="py-2 px-2 text-center text-[#f87171]">{t.lost}</td>
                  <td className="py-2 px-2 text-center">{t.gf}</td>
                  <td className="py-2 px-2 text-center">{t.ga}</td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={
                        t.goalDiff() > 0
                          ? 'text-[#34d399]'
                          : t.goalDiff() < 0
                          ? 'text-[#f87171]'
                          : 'text-[#94a3b8]'
                      }
                    >
                      {t.goalDiff() > 0 ? `+${t.goalDiff()}` : t.goalDiff()}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-extrabold text-white text-sm bg-white/[0.02]">
                    {t.points()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
