import React, { useEffect } from 'react';
import { MatchActionType } from '../services/matchEngine';
import { Team, Player } from '../types/football';

interface MatchControlsProps {
  onAction: (action: MatchActionType) => void;
  onFastForward: () => void;
  onQuit: () => void;
  onOpenTactics: () => void;
  onOpenStats: () => void;
  disabled: boolean;
  hasPossession: boolean;
  carrier: Player | null;
  userTeam: Team;
  isFinished: boolean;
  isHalfTime: boolean;
  onNextHalf: () => void;
}

export const MatchControls: React.FC<MatchControlsProps> = ({
  onAction,
  onFastForward,
  onQuit,
  onOpenTactics,
  onOpenStats,
  disabled,
  hasPossession,
  carrier,
  userTeam,
  isFinished,
  isHalfTime,
  onNextHalf,
}) => {
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if modal or typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (isFinished) {
        if (e.key.toLowerCase() === 'q') onQuit();
        return;
      }

      if (isHalfTime) {
        if (e.key === ' ' || e.key.toLowerCase() === 'enter') {
          onNextHalf();
        }
        return;
      }

      if (disabled) return;

      const key = e.key.toLowerCase();
      if (key === 'p' && hasPossession) {
        e.preventDefault();
        onAction('pass');
      } else if (key === 'd' && hasPossession) {
        e.preventDefault();
        onAction('dribble');
      } else if (key === 's' && hasPossession) {
        e.preventDefault();
        onAction('shoot');
      } else if (key === 't' && !hasPossession) {
        e.preventDefault();
        onAction('tackle');
      } else if (key === 'a' || key === ' ') {
        e.preventDefault();
        onAction('auto');
      } else if (key === 'q') {
        e.preventDefault();
        onQuit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, hasPossession, isFinished, isHalfTime, onAction, onFastForward, onQuit, onNextHalf]);

  return (
    <div className="space-y-3">
      {/* Dynamic Turn & Situation Indicator */}
      <div
        className={`px-3 py-2.5 rounded border text-sm font-mono flex items-center justify-between transition-colors ${
          isFinished
            ? 'bg-red-950/40 border-red-500/60 text-red-200'
            : isHalfTime
            ? 'bg-amber-950/40 border-[#ffd54f]/60 text-amber-200'
            : hasPossession
            ? 'bg-emerald-950/50 border-emerald-500/70 text-emerald-200'
            : 'bg-orange-950/40 border-orange-500/60 text-orange-200'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-base">
            {isFinished ? '🏁' : isHalfTime ? '⏸️' : hasPossession ? '🟢' : '🔴'}
          </span>
          <span className="font-semibold">
            {isFinished ? (
              'Match Completed. Full time score confirmed.'
            ) : isHalfTime ? (
              'Half Time break. Make tactical tweaks or start the 2nd half.'
            ) : hasPossession ? (
              <>
                <span className="text-[#ffd54f] font-bold">{userTeam.shortName}</span> in possession!{' '}
                {carrier ? (
                  <span>
                    Carrier: <span className="underline">{carrier.name}</span> (#{carrier.number} {carrier.position})
                  </span>
                ) : null}
              </>
            ) : (
              <>Opponent attacks! Press <span className="text-[#ffd54f] font-bold">[T]</span> to tackle or <span className="text-[#ffd54f] font-bold">[A]</span> to simulate.</>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenStats}
            className="text-xs bg-[#0a0e0a] hover:bg-[#1b5e20] text-[#ffd54f] px-2 py-1 rounded border border-[#2e7d32] transition"
          >
            📊 Stats
          </button>
          <button
            onClick={onOpenTactics}
            className="text-xs bg-[#0a0e0a] hover:bg-[#1b5e20] text-[#ffd54f] px-2 py-1 rounded border border-[#2e7d32] transition"
          >
            ⚙️ Tactics ({userTeam.formation})
          </button>
        </div>
      </div>

      {/* Half Time Action */}
      {isHalfTime && (
        <div className="bg-[#12261a] border border-[#ffd54f] p-3 rounded flex justify-between items-center">
          <span className="text-sm font-mono text-[#ffd54f]">
            45 minutes played. Ready to commence the second half?
          </span>
          <button
            onClick={onNextHalf}
            className="bg-[#2e7d32] hover:bg-[#388e3c] text-white px-4 py-1.5 rounded font-mono font-bold text-sm border border-emerald-400 cursor-pointer shadow transition"
          >
            [Enter] Kick-off 2nd Half →
          </button>
        </div>
      )}

      {/* Button Controls Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
        <button
          onClick={() => onAction('pass')}
          disabled={disabled || isFinished || isHalfTime || !hasPossession}
          className="p-2.5 bg-[#12261a] hover:bg-[#2e7d32] text-left text-sm border border-[#2e7d32] rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
          title="Pass the ball to a teammate"
        >
          <span className="text-[#ffd54f] font-bold mr-1 group-hover:text-white">[P]</span> Pass
        </button>

        <button
          onClick={() => onAction('dribble')}
          disabled={disabled || isFinished || isHalfTime || !hasPossession}
          className="p-2.5 bg-[#12261a] hover:bg-[#2e7d32] text-left text-sm border border-[#2e7d32] rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
          title="Dribble forward past defenders"
        >
          <span className="text-[#ffd54f] font-bold mr-1 group-hover:text-white">[D]</span> Dribble
        </button>

        <button
          onClick={() => onAction('shoot')}
          disabled={disabled || isFinished || isHalfTime || !hasPossession}
          className="p-2.5 bg-[#12261a] hover:bg-red-800 text-left text-sm border border-[#2e7d32] rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
          title="Take a shot at goal"
        >
          <span className="text-[#ffd54f] font-bold mr-1 group-hover:text-white">[S]</span> Shoot
        </button>

        <button
          onClick={() => onAction('tackle')}
          disabled={disabled || isFinished || isHalfTime || hasPossession}
          className="p-2.5 bg-[#12261a] hover:bg-orange-800 text-left text-sm border border-[#2e7d32] rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
          title="Tackle or press ball carrier"
        >
          <span className="text-[#ffd54f] font-bold mr-1 group-hover:text-white">[T]</span> Tackle
        </button>

        <button
          onClick={() => onAction('auto')}
          disabled={disabled || isFinished || isHalfTime}
          className="p-2.5 bg-[#12261a] hover:bg-[#2e7d32] text-left text-sm border border-[#2e7d32] rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
          title="Let AI take this turn (Spacebar)"
        >
          <span className="text-[#ffd54f] font-bold mr-1 group-hover:text-white">[A]</span> Auto-play
        </button>
      </div>

      {/* Auxiliary actions */}
      <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
        <button
          onClick={onFastForward}
          disabled={disabled || isFinished}
          className="bg-[#12261a] hover:bg-[#1b5e20] text-[#d4e8d4] border border-[#2e7d32] px-3 py-1.5 rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Simulate remainder of match rapidly"
        >
          ⏩ Fast Sim to 90'
        </button>

        <button
          onClick={onQuit}
          className="bg-transparent hover:bg-red-950/60 text-red-300 border border-red-900/60 px-3 py-1.5 rounded transition cursor-pointer ml-auto"
          title="Quit match and return to menu"
        >
          [Q] Quit to Dashboard
        </button>
      </div>
    </div>
  );
};
