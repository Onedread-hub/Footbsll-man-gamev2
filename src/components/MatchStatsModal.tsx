import React from 'react';
import { Team, MatchStats } from '../types/football';

interface MatchStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  home: Team;
  away: Team;
  stats: MatchStats;
  possession: { homePct: number; awayPct: number };
}

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({
  isOpen,
  onClose,
  home,
  away,
  stats,
  possession,
}) => {
  if (!isOpen) return null;

  const statRows = [
    { label: 'Possession', homeVal: `${possession.homePct}%`, awayVal: `${possession.awayPct}%` },
    { label: 'Total Shots', homeVal: stats.homeShots, awayVal: stats.awayShots },
    { label: 'Shots on Target', homeVal: stats.homeShotsOnTarget, awayVal: stats.awayShotsOnTarget },
    { label: 'Passes Completed', homeVal: stats.homePassesCompleted, awayVal: stats.awayPassesCompleted },
    { label: 'Tackles Won', homeVal: stats.homeTacklesWon, awayVal: stats.awayTacklesWon },
    { label: 'Fouls Committed', homeVal: stats.homeFouls, awayVal: stats.awayFouls },
    { label: 'Offsides Flagged', homeVal: stats.homeOffsides ?? 0, awayVal: stats.awayOffsides ?? 0 },
    { label: 'Corners Awarded', homeVal: stats.homeCorners ?? 0, awayVal: stats.awayCorners ?? 0 },
    { label: 'Throw-Ins Won', homeVal: stats.homeThrowIns ?? 0, awayVal: stats.awayThrowIns ?? 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs font-mono">
      <div className="bg-[#0a0e0a] border-2 border-[#2e7d32] rounded max-w-lg w-full p-5 shadow-2xl relative">
        <div className="flex justify-between items-center pb-3 border-b border-[#1b5e20] mb-4">
          <h2 className="text-base sm:text-lg font-bold text-[#ffd54f] flex items-center gap-2">
            📊 MATCH ANALYTICS
          </h2>
          <button
            onClick={onClose}
            className="text-[#6b8a6b] hover:text-white px-2 py-1 border border-[#1b5e20] rounded text-xs cursor-pointer"
          >
            [ESC / CLOSE]
          </button>
        </div>

        {/* Team Names Header */}
        <div className="grid grid-cols-3 text-center pb-3 mb-2 border-b border-[#1b5e20]/60 text-xs sm:text-sm font-bold">
          <div className="truncate" style={{ color: home.color }}>
            {home.shortName}
          </div>
          <div className="text-[#6b8a6b]">STATISTIC</div>
          <div className="truncate" style={{ color: away.color }}>
            {away.shortName}
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3 py-2 text-xs sm:text-sm">
          {statRows.map((row, i) => (
            <div key={i} className="grid grid-cols-3 text-center items-center py-1 border-b border-[#1b5e20]/30">
              <span className="font-bold text-[#d4e8d4]">{row.homeVal}</span>
              <span className="text-[#ffd54f] text-[11px] uppercase tracking-wider">{row.label}</span>
              <span className="font-bold text-[#d4e8d4]">{row.awayVal}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-[#1b5e20] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#12261a] hover:bg-[#2e7d32] text-[#ffd54f] hover:text-white border border-[#2e7d32] px-4 py-1.5 rounded text-xs cursor-pointer transition"
          >
            Resume Match
          </button>
        </div>
      </div>
    </div>
  );
};
