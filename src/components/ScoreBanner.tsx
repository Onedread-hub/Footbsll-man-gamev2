import React from 'react';
import { Team, MatchScorer } from '../types/football';

interface ScoreBannerProps {
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  minute: number;
  isGoalFlash: boolean;
  scorers: MatchScorer[];
  possessionHomePct?: number;
}

export const ScoreBanner: React.FC<ScoreBannerProps> = ({
  home,
  away,
  homeScore,
  awayScore,
  minute,
  isGoalFlash,
  scorers,
  possessionHomePct = 50,
}) => {
  const homeScorers = scorers.filter((s) => s.isHome);
  const awayScorers = scorers.filter((s) => !s.isHome);

  return (
    <div
      className={`border border-[#2e7d32] transition-colors duration-200 rounded p-3 mb-3 ${
        isGoalFlash ? 'bg-[#ffd54f] text-black shadow-lg font-bold' : 'bg-[#12261a] text-[#d4e8d4]'
      }`}
    >
      <div className="flex justify-between items-center px-2">
        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full border border-black inline-block shrink-0"
            style={{ backgroundColor: home.color }}
          />
          <span className="font-bold tracking-wider truncate text-sm sm:text-base md:text-lg">
            {home.name.toUpperCase()}
          </span>
        </div>

        {/* Center Score & Minute */}
        <div className="flex flex-col items-center justify-center px-4 shrink-0">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-widest flex items-center gap-2">
            <span>{homeScore}</span>
            <span className="text-xs sm:text-sm text-[#ffd54f] opacity-80">-</span>
            <span>{awayScore}</span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
              minute >= 90
                ? 'bg-red-900/80 text-white'
                : minute === 45
                ? 'bg-amber-800/80 text-white'
                : 'bg-black/40 text-[#ffd54f]'
            }`}
          >
            {minute >= 90 ? 'FT' : minute === 45 ? 'HT' : `${minute}'`}
          </span>
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
          <span className="font-bold tracking-wider truncate text-sm sm:text-base md:text-lg">
            {away.name.toUpperCase()}
          </span>
          <span
            className="w-3.5 h-3.5 rounded-full border border-black inline-block shrink-0"
            style={{ backgroundColor: away.color }}
          />
        </div>
      </div>

      {/* Goalscorers sub-row */}
      {(homeScorers.length > 0 || awayScorers.length > 0) && (
        <div className="grid grid-cols-2 text-xs text-[#ffd54f] mt-2 pt-2 border-t border-[#1b5e20]/60 px-2 font-mono">
          <div className="truncate">
            {homeScorers.map((s, i) => (
              <span key={i} className="mr-2">
                ⚽ {s.playerShortName} {s.minute}'
              </span>
            ))}
          </div>
          <div className="text-right truncate">
            {awayScorers.map((s, i) => (
              <span key={i} className="ml-2">
                {s.playerShortName} {s.minute}' ⚽
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Micro possession bar */}
      <div className="w-full bg-[#0a0e0a] h-1.5 rounded-full mt-2 overflow-hidden flex">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${possessionHomePct}%`, backgroundColor: home.color }}
          title={`${home.shortName} possession: ${possessionHomePct}%`}
        />
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${100 - possessionHomePct}%`, backgroundColor: away.color }}
          title={`${away.shortName} possession: ${100 - possessionHomePct}%`}
        />
      </div>
    </div>
  );
};
