import React from 'react';
import { Team, MatchScorer, Fixture, MatchDifficulty } from '../types/football';
import { TokenRewardBreakdown } from '../services/trainingTokensEngine';
import { Zap, Sparkles } from 'lucide-react';

interface PostMatchResultsProps {
  home: Team;
  away: Team;
  userTeam: Team;
  homeScore: number;
  awayScore: number;
  scorers: MatchScorer[];
  simulatedFixturesInRound: Fixture[];
  allTeams: Team[];
  isFriendly: boolean;
  onViewTable: () => void;
  onReturnToHub: () => void;
  onNextMatchday?: () => void;
  tokenBreakdown?: TokenRewardBreakdown;
  onOpenTraining?: () => void;
}

export const PostMatchResults: React.FC<PostMatchResultsProps> = ({
  home,
  away,
  userTeam,
  homeScore,
  awayScore,
  scorers,
  simulatedFixturesInRound,
  allTeams,
  isFriendly,
  onViewTable,
  onReturnToHub,
  onNextMatchday,
  tokenBreakdown,
  onOpenTraining,
}) => {
  const isUserHome = userTeam.id === home.id;
  const userScore = isUserHome ? homeScore : awayScore;
  const oppScore = isUserHome ? awayScore : homeScore;
  const userWon = userScore > oppScore;
  const userDrew = userScore === oppScore;

  const teamMap = new Map<string, Team>();
  allTeams.forEach((t) => teamMap.set(t.id, t));

  return (
    <div className="arcade-panel rounded-lg p-5 font-mono space-y-5 text-xs sm:text-sm max-w-3xl mx-auto shadow-2xl">
      {/* Banner */}
      <div
        className={`p-4 rounded border-2 text-center ${
          userWon
            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
            : userDrew
            ? 'bg-amber-950/80 border-[#ffd54f] text-amber-200'
            : 'bg-red-950/80 border-red-500 text-red-200'
        }`}
      >
        <div className="text-xl sm:text-2xl font-bold tracking-widest uppercase mb-1 font-vt323 text-2xl sm:text-3xl">
          {userWon ? '🎉 VICTORY! 3 POINTS SECURED' : userDrew ? '🤝 HARD-FOUGHT DRAW (1 POINT)' : '💔 FULL TIME WHISTLE'}
        </div>
        <p className="text-xs opacity-90">
          {userWon
            ? `Tremendous performance from ${userTeam.name} to seal the win!`
            : userDrew
            ? 'Honours even after a tight tactical battle.'
            : 'Back to the training pitch to fix tactical and defensive lapses.'}
        </p>
      </div>

      {/* Score Summary Box */}
      <div className="bg-[#061006] border-2 border-[#1b441b] p-4 rounded text-center">
        <div className="text-[11px] text-[#81c784] uppercase tracking-wider mb-2 font-mono">TELETEXT FINAL SCORELINE</div>
        <div className="flex justify-center items-center gap-6">
          <div className="text-right flex-1 truncate">
            <span
              className="text-base sm:text-lg font-bold truncate block"
              style={{ color: home.color }}
            >
              {home.name}
            </span>
          </div>
          <div className="text-4xl sm:text-5xl font-extrabold text-[#ffd54f] tracking-widest px-4 font-vt323 arcade-amber">
            {homeScore} - {awayScore}
          </div>
          <div className="text-left flex-1 truncate">
            <span
              className="text-base sm:text-lg font-bold truncate block"
              style={{ color: away.color }}
            >
              {away.name}
            </span>
          </div>
        </div>

        {/* Scorers */}
        {scorers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1a381a] text-xs text-[#ffd54f] space-y-1">
            {scorers.map((s, i) => (
              <div key={i} className="flex justify-center items-center gap-2">
                <span>⚽</span>
                <span className="font-semibold">{s.playerShortName}</span>
                <span className="text-[#81c784]">({s.teamShortName})</span>
                <span className="text-white font-bold">{s.minute}'</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Training Tokens Earned Reward Card */}
      {tokenBreakdown && (
        <div className="bg-[#081808] border-2 border-[#ffd54f] p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#1b441b]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#ffd54f]/20 border border-[#ffd54f] flex items-center justify-center text-[#ffd54f]">
                <Zap className="w-5 h-5 fill-[#ffd54f]" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#ffd54f] uppercase tracking-wider flex items-center gap-2">
                  <span>MATCH TOKENS AWARDED</span>
                  <span className="text-[10px] bg-[#2e7d32] text-white px-2 py-0.5 rounded font-black">
                    {tokenBreakdown.difficultyName} ({tokenBreakdown.difficultyMultiplier}x RATIO)
                  </span>
                </div>
                <div className="text-[11px] text-[#81c784]">
                  Tokens deposited to your club account. Train your players to elevate their stats!
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-[#ffd54f] font-mono leading-none">
                  +{tokenBreakdown.totalTokens}
                </span>
                <div className="text-[10px] text-[#81c784] font-bold">TOKENS</div>
              </div>

              {onOpenTraining && (
                <button
                  onClick={onOpenTraining}
                  className="bg-[#ffd54f] hover:bg-[#ffe082] text-black px-3.5 py-2 rounded-lg font-black text-xs cursor-pointer transition shadow flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Train Squad</span>
                </button>
              )}
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="flex flex-wrap gap-2 pt-2.5 text-[11px]">
            <span className="bg-black/50 border border-[#1b441b] text-[#d4e8d4] px-2 py-0.5 rounded">
              Base Result: <strong className="text-white">+{tokenBreakdown.baseTokens}</strong>
            </span>
            {tokenBreakdown.goalBonus > 0 && (
              <span className="bg-black/50 border border-[#1b441b] text-[#ffd54f] px-2 py-0.5 rounded">
                Goals Bonus: <strong className="text-[#ffd54f]">+{tokenBreakdown.goalBonus}</strong>
              </span>
            )}
            {tokenBreakdown.cleanSheetBonus > 0 && (
              <span className="bg-black/50 border border-[#1b441b] text-[#00e676] px-2 py-0.5 rounded">
                Clean Sheet Bonus: <strong className="text-[#00e676]">+{tokenBreakdown.cleanSheetBonus}</strong>
              </span>
            )}
            {tokenBreakdown.underdogBonus > 0 && (
              <span className="bg-black/50 border border-[#1b441b] text-[#29b6f6] px-2 py-0.5 rounded">
                Underdog Bonus: <strong className="text-[#29b6f6]">+{tokenBreakdown.underdogBonus}</strong>
              </span>
            )}
            <span className="bg-[#ffd54f]/15 border border-[#ffd54f]/40 text-[#ffd54f] px-2 py-0.5 rounded font-bold ml-auto">
              Difficulty Multiplier: {tokenBreakdown.difficultyMultiplier}x
            </span>
          </div>
        </div>
      )}

      {/* Other League Results for this Matchday */}
      {!isFriendly && simulatedFixturesInRound.length > 0 && (
        <div className="border border-[#1b3d1b] bg-[#061006] p-3 rounded space-y-2">
          <div className="text-xs text-[#ffd54f] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1b3d1b] pb-1.5">
            <span>📢 RESULTS AROUND THE PREMIER ASCII LEAGUE</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {simulatedFixturesInRound.map((f) => {
              const h = teamMap.get(f.homeTeamId);
              const a = teamMap.get(f.awayTeamId);
              if (!h || !a) return null;

              return (
                <div
                  key={f.id}
                  className="bg-[#0b180b] border border-[#1a381a] p-2 rounded flex justify-between items-center text-xs"
                >
                  <span className="truncate flex-1 font-semibold" style={{ color: h.color }}>
                    {h.shortName}
                  </span>
                  <span className="font-bold px-3 text-[#ffd54f] font-vt323 text-base">
                    {f.homeScore} - {f.awayScore}
                  </span>
                  <span className="truncate flex-1 text-right font-semibold" style={{ color: a.color }}>
                    {a.shortName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-[#1b3d1b]">
        <button
          onClick={onReturnToHub}
          className="bg-[#0b180b] hover:bg-[#143014] text-[#d4e8d4] border border-[#204d20] px-4 py-2 rounded text-xs cursor-pointer transition"
        >
          [Main Menu]
        </button>

        <div className="flex gap-2">
          {!isFriendly && (
            <button
              onClick={onViewTable}
              className="bg-[#0b180b] hover:bg-[#143014] text-[#ffd54f] border border-[#ffd54f]/60 px-4 py-2 rounded text-xs cursor-pointer font-bold transition"
            >
              📊 View Updated Standings
            </button>
          )}

          {!isFriendly && onNextMatchday && (
            <button
              onClick={onNextMatchday}
              className="arcade-button text-[#ffd54f] hover:text-white px-4 py-2 rounded text-xs font-bold cursor-pointer transition shadow"
            >
              Advance to Next Matchday →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

