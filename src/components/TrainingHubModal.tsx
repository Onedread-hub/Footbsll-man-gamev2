import React, { useState } from 'react';
import { Player, Team } from '../types/football';
import {
  getTrainingTokens,
  TRAINING_PROGRAMS,
  TrainingProgram,
  trainPlayerAttribute,
} from '../services/trainingTokensEngine';
import { sound } from '../services/audio';
import { Zap, Sparkles, Trophy, X, ChevronRight, CheckCircle2, ArrowUpCircle } from 'lucide-react';

interface TrainingHubModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onSquadUpdated: () => void;
  initialPlayerId?: string;
}

export const TrainingHubModal: React.FC<TrainingHubModalProps> = ({
  team,
  isOpen,
  onClose,
  onSquadUpdated,
  initialPlayerId,
}) => {
  const [tokens, setTokens] = useState<number>(() => getTrainingTokens());
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(() => {
    return initialPlayerId || (team.squad.length > 0 ? team.squad[0].id : '');
  });
  const [lastTrainedAttr, setLastTrainedAttr] = useState<string | null>(null);
  const [rewardNotice, setRewardNotice] = useState<string | null>(null);

  if (!isOpen || !team) return null;

  const squad = team.sortedSquad();
  const selectedPlayer = squad.find((p) => p.id === selectedPlayerId) || squad[0];

  const handleTrain = (program: TrainingProgram) => {
    if (!selectedPlayer) return;
    if (tokens < program.tokenCost) {
      sound.whistle();
      return;
    }

    const currentVal = selectedPlayer[program.attribute] || 50;
    if (currentVal >= 99) return;

    const res = trainPlayerAttribute(selectedPlayer, program);
    if (res.success) {
      sound.powerShot();
      setTokens(res.currentTokens);
      setLastTrainedAttr(program.attribute);
      setRewardNotice(`+${program.boostAmount} ${program.attribute.toUpperCase()}! Rating now ${res.newRating}`);
      onSquadUpdated();

      setTimeout(() => {
        setLastTrainedAttr(null);
        setRewardNotice(null);
      }, 2500);
    }
  };

  const getStatColor = (val: number) => {
    if (val >= 85) return 'text-[#ffd54f] bg-[#ffd54f]';
    if (val >= 75) return 'text-[#69f0ae] bg-[#69f0ae]';
    if (val >= 65) return 'text-[#40c4ff] bg-[#40c4ff]';
    return 'text-[#ffab40] bg-[#ffab40]';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 font-mono">
      <div className="arcade-panel bg-[#061006] border-2 border-[#2e7d32] rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#1b441b] bg-[#0a180a] flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#ffd54f]/20 border border-[#ffd54f] flex items-center justify-center text-[#ffd54f]">
              <Zap className="w-5 h-5 fill-[#ffd54f]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#ffd54f] tracking-wider uppercase flex items-center gap-2">
                <span>PLAYER TRAINING & ACADEMY</span>
                <span className="text-[10px] bg-[#ffd54f] text-black px-1.5 py-0.5 rounded font-extrabold">SWOS 2026</span>
              </h2>
              <p className="text-[11px] text-[#81c784]">
                Spend training tokens earned from competitive matches to hone attributes & build superstars!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-black/70 border border-[#ffd54f] px-3 py-1.5 rounded-lg flex items-center gap-2 text-[#ffd54f] shadow-inner">
              <Zap className="w-4 h-4 fill-[#ffd54f]" />
              <span className="text-xs font-bold font-mono tracking-wider">
                {tokens} <span className="text-[10px] text-[#a5d6a7]">TOKENS</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#81c784] hover:text-white hover:bg-[#1b441b] rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split View (Player Picker Left, Development Workshop Right) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#1b441b]">
          {/* Left Column: Squad Roster Picker */}
          <div className="md:col-span-4 p-3 bg-[#040a04] overflow-y-auto max-h-[300px] md:max-h-none space-y-1.5">
            <div className="text-[11px] font-bold text-[#ffd54f] uppercase tracking-wider px-1 pb-1 flex justify-between">
              <span>SQUAD ROSTER</span>
              <span className="text-[10px] text-[#6b8a6b]">{squad.length} PLAYERS</span>
            </div>

            {squad.map((p) => {
              const isSelected = p.id === selectedPlayerId;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPlayerId(p.id);
                    sound.click();
                  }}
                  className={`p-2 rounded cursor-pointer transition border flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-[#1b441b] border-[#ffd54f] text-white shadow-md'
                      : 'bg-[#081408] border-[#132c13] text-[#b2d8b2] hover:bg-[#0e240e]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[#ffd54f] w-5 text-center font-bold">
                      {p.number}
                    </span>
                    <span className="font-semibold truncate">{p.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[10px] px-1 rounded font-bold ${
                        p.position === 'GK'
                          ? 'bg-[#ffd54f]/20 text-[#ffd54f]'
                          : p.position === 'ATT'
                          ? 'bg-red-900/40 text-red-300'
                          : p.position === 'MID'
                          ? 'bg-emerald-900/40 text-emerald-300'
                          : 'bg-blue-900/40 text-blue-300'
                      }`}
                    >
                      {p.position}
                    </span>
                    <span className="font-extrabold text-[#ffd54f] min-w-[24px] text-right">
                      {p.rating()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Player Training Center */}
          {selectedPlayer && (
            <div className="md:col-span-8 p-4 sm:p-5 space-y-5 bg-[#061006]">
              {/* Player Hero Card */}
              <div className="bg-[#0b1c0b] border-2 border-[#1b5e20] p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-lg">
                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">
                      #{selectedPlayer.number} {selectedPlayer.name.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-[#ffd54f] text-black px-2 py-0.5 rounded font-black tracking-wider text-[11px]">
                      PRIMARY: {selectedPlayer.primaryRole || selectedPlayer.position}
                    </span>

                    {/* Secondary Positions Badges */}
                    {selectedPlayer.secondaryPositions && selectedPlayer.secondaryPositions.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#81c784]">VERSATILITY:</span>
                        {selectedPlayer.secondaryPositions.map((sec, idx) => (
                          <span
                            key={idx}
                            className="bg-[#29b6f6]/20 border border-[#29b6f6] text-[#29b6f6] px-1.5 py-0.5 rounded text-[10px] font-bold"
                          >
                            {sec}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="text-[11px] text-[#81c784]">
                      Age: <strong className="text-white">{selectedPlayer.age}</strong>
                    </span>
                    <span className="text-[11px] text-[#81c784]">
                      Season Goals: <strong className="text-[#ffd54f]">⚽ {selectedPlayer.seasonGoals}</strong>
                    </span>
                  </div>
                </div>

                {/* Overall Rating Hexagon/Badge */}
                <div className="flex flex-col items-center bg-black/60 border-2 border-[#ffd54f] px-4 py-2 rounded-xl text-center shadow-md">
                  <span className="text-[10px] text-[#81c784] font-bold uppercase tracking-widest">
                    OVERALL RTG
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-[#ffd54f] font-mono leading-none my-0.5">
                    {selectedPlayer.rating()}
                  </span>
                  <span className="text-[9px] text-[#a5d6a7]">
                    {selectedPlayer.position} RATED
                  </span>
                </div>

                {/* Subtle Background Badge */}
                <div className="absolute right-0 bottom-0 text-[100px] font-black text-white/[0.02] pointer-events-none select-none font-mono">
                  {selectedPlayer.position}
                </div>
              </div>

              {/* Reward Notification Banner */}
              {rewardNotice && (
                <div className="bg-[#ffd54f]/20 border-2 border-[#ffd54f] text-[#ffd54f] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>TRAINING SUCCESSFUL! {rewardNotice}</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#00e676]" />
                </div>
              )}

              {/* Attributes Radar / Bars Grid */}
              <div className="bg-[#081408] border border-[#1b441b] p-3 rounded-lg space-y-2">
                <div className="text-[11px] font-bold text-[#81c784] uppercase tracking-wider mb-1">
                  CURRENT ATTRIBUTE MATRIX
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    { label: 'Pace', key: 'pace', val: selectedPlayer.pace },
                    { label: 'Shooting', key: 'shooting', val: selectedPlayer.shooting },
                    { label: 'Passing', key: 'passing', val: selectedPlayer.passing },
                    { label: 'Tackling', key: 'tackling', val: selectedPlayer.tackling },
                    { label: 'Dribbling', key: 'dribbling', val: selectedPlayer.dribbling },
                    { label: 'Strength', key: 'strength', val: selectedPlayer.strength },
                    { label: 'Positioning', key: 'positioning', val: selectedPlayer.positioning },
                    { label: 'Control', key: 'control', val: selectedPlayer.control },
                    { label: 'Stamina', key: 'stamina', val: selectedPlayer.stamina },
                  ].map((stat) => {
                    const isTrained = lastTrainedAttr === stat.key;
                    const colorClass = getStatColor(stat.val);
                    return (
                      <div
                        key={stat.key}
                        className={`p-2 rounded border transition ${
                          isTrained
                            ? 'bg-[#1b5e20] border-[#ffd54f] text-white shadow'
                            : 'bg-black/40 border-[#132c13]'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-[#a5d6a7] font-semibold">{stat.label}</span>
                          <span className={`font-extrabold ${colorClass.split(' ')[0]}`}>
                            {stat.val}
                            {isTrained && <span className="ml-1 text-[#ffd54f]">▲</span>}
                          </span>
                        </div>
                        <div className="w-full bg-[#1b331b] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${colorClass.split(' ')[1]}`}
                            style={{ width: `${Math.min(100, (stat.val / 99) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Available Training Programs */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-[#ffd54f] uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-[#ffd54f]" />
                    AVAILABLE TRAINING DRILLS
                  </span>
                  <span className="text-[10px] text-[#81c784]">
                    Win competitive matches to earn more tokens
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TRAINING_PROGRAMS.map((prog) => {
                    const currentVal = selectedPlayer[prog.attribute] || 50;
                    const isMaxed = currentVal >= 99;
                    const canAfford = tokens >= prog.tokenCost;

                    return (
                      <div
                        key={prog.id}
                        className={`p-3 rounded-lg border transition flex flex-col justify-between gap-2 ${
                          canAfford && !isMaxed
                            ? 'bg-[#081808] border-[#2e7d32] hover:border-[#ffd54f]'
                            : 'bg-black/40 border-[#1a331a] opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <div className="font-bold text-xs text-[#ffd54f] flex items-center gap-1.5">
                              <span>{prog.icon}</span>
                              <span>{prog.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-white bg-[#1b441b] px-1.5 py-0.5 rounded">
                              +{prog.boostAmount} {prog.attribute.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#81c784] mt-1 leading-snug">
                            {prog.description}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-[#132c13]">
                          <span className="text-[11px] text-[#ffd54f] font-mono font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-[#ffd54f]" />
                            {prog.tokenCost} TOKENS
                          </span>

                          <button
                            disabled={!canAfford || isMaxed}
                            onClick={() => handleTrain(prog)}
                            className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
                              isMaxed
                                ? 'bg-[#222222] text-[#666666] cursor-not-allowed'
                                : canAfford
                                ? 'bg-[#2e7d32] hover:bg-[#388e3c] text-white border border-emerald-400 shadow'
                                : 'bg-[#1a2e1a] text-[#557755] cursor-not-allowed'
                            }`}
                          >
                            {isMaxed ? 'MAXED 99' : 'Train Now ▲'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1b441b] bg-[#0a180a] flex justify-between items-center text-xs text-[#81c784]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#ffd54f]" />
            <span className="hidden sm:inline">
              Tip: Higher match difficulty awards up to 3.5x token multiplier per game!
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1b441b] hover:bg-[#2e7d32] text-white rounded font-bold cursor-pointer transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
