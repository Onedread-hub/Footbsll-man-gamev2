import React, { useState } from 'react';
import { Team } from '../types/football';

interface FriendlyMatchModalProps {
  teams: Team[];
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (home: Team, away: Team, userTeam: Team) => void;
}

export const FriendlyMatchModal: React.FC<FriendlyMatchModalProps> = ({
  teams,
  isOpen,
  onClose,
  onStartMatch,
}) => {
  const [homeIdx, setHomeIdx] = useState<number>(0);
  const [awayIdx, setAwayIdx] = useState<number>(1);
  const [playAsHome, setPlayAsHome] = useState<boolean>(true);

  if (!isOpen) return null;

  const homeTeam = teams[homeIdx];
  const awayTeam = teams[awayIdx];

  const handleStart = () => {
    if (homeIdx === awayIdx) return;
    const userTeam = playAsHome ? homeTeam : awayTeam;
    onStartMatch(homeTeam, awayTeam, userTeam);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs font-mono text-xs sm:text-sm">
      <div className="bg-[#0a0e0a] border-2 border-[#2e7d32] rounded max-w-lg w-full p-5 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#1b5e20]">
          <h2 className="text-base sm:text-lg font-bold text-[#ffd54f]">
            ⚽ EXHIBITION / FRIENDLY MATCH
          </h2>
          <button
            onClick={onClose}
            className="text-[#6b8a6b] hover:text-white px-2 py-1 border border-[#1b5e20] rounded text-xs cursor-pointer"
          >
            [CLOSE]
          </button>
        </div>

        {/* Home Team Select */}
        <div>
          <label className="block text-[#ffd54f] font-semibold mb-1">Home Team:</label>
          <select
            value={homeIdx}
            onChange={(e) => {
              const val = Number(e.target.value);
              setHomeIdx(val);
              if (val === awayIdx) setAwayIdx((val + 1) % teams.length);
            }}
            className="w-full bg-[#12261a] border border-[#2e7d32] text-[#d4e8d4] p-2 rounded font-mono cursor-pointer"
          >
            <optgroup label="🏆 Big Time League (14 Clubs)">
              {teams
                .map((t, idx) => ({ t, idx }))
                .filter(({ t }) => (t.leagueId || 'big_time') === 'big_time')
                .map(({ t, idx }) => (
                  <option key={t.id} value={idx}>
                    {t.name} (Rtg: {t.teamRating()} · {t.formation} {t.tactic})
                  </option>
                ))}
            </optgroup>
            <optgroup label="⚡ Up and Comers (12 Clubs)">
              {teams
                .map((t, idx) => ({ t, idx }))
                .filter(({ t }) => t.leagueId === 'up_and_comers')
                .map(({ t, idx }) => (
                  <option key={t.id} value={idx}>
                    {t.name} (Rtg: {t.teamRating()} · {t.formation} {t.tactic})
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        {/* Away Team Select */}
        <div>
          <label className="block text-[#ffd54f] font-semibold mb-1">Away Team:</label>
          <select
            value={awayIdx}
            onChange={(e) => {
              const val = Number(e.target.value);
              setAwayIdx(val);
              if (val === homeIdx) setHomeIdx((val + 1) % teams.length);
            }}
            className="w-full bg-[#12261a] border border-[#2e7d32] text-[#d4e8d4] p-2 rounded font-mono cursor-pointer"
          >
            <optgroup label="🏆 Big Time League (14 Clubs)">
              {teams
                .map((t, idx) => ({ t, idx }))
                .filter(({ t }) => (t.leagueId || 'big_time') === 'big_time')
                .map(({ t, idx }) => (
                  <option key={t.id} value={idx} disabled={idx === homeIdx}>
                    {t.name} (Rtg: {t.teamRating()} · {t.formation} {t.tactic})
                  </option>
                ))}
            </optgroup>
            <optgroup label="⚡ Up and Comers (12 Clubs)">
              {teams
                .map((t, idx) => ({ t, idx }))
                .filter(({ t }) => t.leagueId === 'up_and_comers')
                .map(({ t, idx }) => (
                  <option key={t.id} value={idx} disabled={idx === homeIdx}>
                    {t.name} (Rtg: {t.teamRating()} · {t.formation} {t.tactic})
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        {/* Manage Which Club */}
        <div>
          <label className="block text-[#ffd54f] font-semibold mb-1">You Are Managing:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPlayAsHome(true)}
              className={`p-2 rounded border text-center cursor-pointer transition ${
                playAsHome
                  ? 'bg-[#1b5e20] border-[#ffd54f] text-[#ffd54f] font-bold'
                  : 'bg-[#12261a] border-[#2e7d32] text-[#d4e8d4]'
              }`}
            >
              {homeTeam.shortName} (Home)
            </button>
            <button
              onClick={() => setPlayAsHome(false)}
              className={`p-2 rounded border text-center cursor-pointer transition ${
                !playAsHome
                  ? 'bg-[#1b5e20] border-[#ffd54f] text-[#ffd54f] font-bold'
                  : 'bg-[#12261a] border-[#2e7d32] text-[#d4e8d4]'
              }`}
            >
              {awayTeam.shortName} (Away)
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-[#1b5e20] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-[#12261a] hover:bg-[#1b5e20] text-[#d4e8d4] border border-[#2e7d32] px-4 py-2 rounded text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={homeIdx === awayIdx}
            className="bg-[#2e7d32] hover:bg-[#388e3c] text-white px-5 py-2 rounded text-xs font-bold border border-emerald-400 cursor-pointer shadow transition disabled:opacity-40"
          >
            Kick-off Match →
          </button>
        </div>
      </div>
    </div>
  );
};
