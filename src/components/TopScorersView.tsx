import React from 'react';
import { Team, Player } from '../types/football';

interface TopScorersViewProps {
  teams: Team[];
  onBack: () => void;
}

interface ScorerEntry {
  player: Player;
  team: Team;
  goals: number;
}

export const TopScorersView: React.FC<TopScorersViewProps> = ({ teams, onBack }) => {
  const scorers: ScorerEntry[] = [];
  teams.forEach((t) => {
    t.squad.forEach((p) => {
      if (p.seasonGoals > 0) {
        scorers.push({
          player: p,
          team: t,
          goals: p.seasonGoals,
        });
      }
    });
  });

  scorers.sort((a, b) => b.goals - a.goals);

  return (
    <div className="fm-panel font-sans text-xs sm:text-sm overflow-hidden">
      <div className="fm-panel-header px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="text-[#38bdf8]">👟</span> GOLDEN BOOT — TOP SCORERS
          </h1>
          <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">Premier League Goalscoring Leaderboard</p>
        </div>
        <button
          onClick={onBack}
          className="bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] border border-[#334155] px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
        >
          Hub
        </button>
      </div>

      {scorers.length === 0 ? (
        <div className="py-12 text-center text-[#94a3b8] font-mono">
          No goals recorded yet this season. Play matches to see top scorers!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#0c141e] border-b border-[#223347] text-[#94a3b8] text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center w-12">Rank</th>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3">Club</th>
                <th className="py-2.5 px-3 text-center">Pos</th>
                <th className="py-2.5 px-3 text-center">Shooting</th>
                <th className="py-2.5 px-3 text-right font-bold text-[#38bdf8]">Goals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e42] text-xs">
              {scorers.map((s, idx) => (
                <tr
                  key={s.player.id}
                  className={`fm-table-row transition ${
                    idx === 0 ? 'bg-[#38bdf8]/10 font-bold' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-center font-bold text-[#38bdf8]">
                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {s.player.name} <span className="text-[#94a3b8] font-mono text-[11px]">#{s.player.number}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-black"
                        style={{ backgroundColor: s.team.color }}
                      />
                      <span className="text-[#cbd5e1]">{s.team.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#94a3b8] font-semibold">{s.player.position}</td>
                  <td className="py-2.5 px-3 text-center text-[#cbd5e1] font-mono">{s.player.shooting}</td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-[#38bdf8] text-sm font-mono">
                    ⚽ {s.goals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
