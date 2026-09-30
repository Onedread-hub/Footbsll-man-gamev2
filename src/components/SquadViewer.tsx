import React, { useState } from 'react';
import { Team, Position, Player } from '../types/football';
import { Zap, Sparkles, UserPlus, RefreshCw, Shield, Users } from 'lucide-react';
import { generateYouthSquad } from '../services/leagueEngine';
import { sound } from '../services/audio';

interface SquadViewerProps {
  team: Team;
  onBack: () => void;
  isUserTeam?: boolean;
  onSelectAsUserTeam?: () => void;
  onOpenTactics?: () => void;
  onOpenTraining?: (playerId?: string) => void;
  onSquadUpdated?: () => void;
}

export const SquadViewer: React.FC<SquadViewerProps> = ({
  team,
  onBack,
  isUserTeam,
  onSelectAsUserTeam,
  onOpenTactics,
  onOpenTraining,
  onSquadUpdated,
}) => {
  if (!team) return null;

  const [squadTab, setSquadTab] = useState<'all' | 'firstTeam' | 'secondTeam' | 'youth'>('all');
  const [, setForceUpdate] = useState(0);

  const getPosClass = (pos: Position) => {
    switch (pos) {
      case 'GK':
        return 'text-[#ffd54f] font-bold';
      case 'LB':
      case 'RB':
        return 'text-[#29b6f6] font-bold';
      case 'DEF':
        return 'text-[#42a5f5] font-bold';
      case 'MID':
        return 'text-[#81c784] font-bold';
      case 'ATT':
        return 'text-[#ef5350] font-bold';
      default:
        return '';
    }
  };

  const sortedSquad = team.sortedSquad();
  const firstTeam = team.firstTeam();
  const secondTeam = team.secondTeam();
  const youthSquad = team.sortedYouthSquad();

  const toggleGkStyle = (player: Player) => {
    player.gkStyle = player.gkStyle === 'attacking' ? 'defensive' : 'attacking';
    setForceUpdate((n) => n + 1);
    if (onSquadUpdated) onSquadUpdated();
  };

  const handlePromoteYouth = (playerId: string) => {
    const promoted = team.promoteYouthPlayer(playerId);
    if (promoted) {
      sound.whistle();
      alert(`🎉 Promoted to Senior Squad!\n${promoted.name} (Age ${promoted.age}, Potential ${promoted.potential ?? 80}) is now part of the senior squad!`);
      setForceUpdate((n) => n + 1);
      if (onSquadUpdated) onSquadUpdated();
    }
  };

  const handleRerollYouthIntake = () => {
    if (window.confirm(`Scout a fresh intake of Youth Academy prospects for ${team.name}?`)) {
      team.youthSquad = generateYouthSquad(team, Math.random);
      sound.click();
      setForceUpdate((n) => n + 1);
      if (onSquadUpdated) onSquadUpdated();
    }
  };

  // Determine which list to display
  let currentPlayers: Player[] = sortedSquad;
  if (squadTab === 'firstTeam') currentPlayers = firstTeam;
  else if (squadTab === 'secondTeam') currentPlayers = secondTeam;
  else if (squadTab === 'youth') currentPlayers = youthSquad;

  return (
    <div className="fm-panel font-sans text-xs sm:text-sm overflow-hidden">
      {/* Club Banner Header */}
      <div className="fm-panel-header px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="w-3.5 h-3.5 rounded-full border border-black inline-block shadow-sm"
              style={{ backgroundColor: team.color }}
            />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              {team.name.toUpperCase()} · SQUAD ROSTER
            </h1>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                team.leagueId === 'up_and_comers'
                  ? 'bg-purple-900/40 text-purple-300 border-purple-500/40'
                  : 'bg-sky-900/40 text-sky-300 border-sky-500/40'
              }`}
            >
              {team.leagueId === 'up_and_comers' ? '⚡ UP AND COMERS' : '🏆 BIG TIME LEAGUE'}
            </span>
            {isUserTeam && (
              <span className="text-[10px] bg-[#38bdf8] text-black px-1.5 py-0.5 rounded font-extrabold uppercase">
                Managed Club
              </span>
            )}
          </div>
          <div className="text-xs text-[#94a3b8] mt-1 font-mono flex items-center gap-2 flex-wrap">
            <span>Formation: <strong className="text-white">{team.formation}</strong></span>
            <span>|</span>
            <span>Tactic: <strong className="text-white">{team.tactic}</strong></span>
            <span>|</span>
            <span>Senior Squad: <strong className="text-[#38bdf8] font-bold">{team.squad.length} Players</strong> (1st: 11 / 2nd: {secondTeam.length})</span>
            <span>|</span>
            <span>Youth Team: <strong className="text-[#4ade80] font-bold">{youthSquad.length} Academy U-18s</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isUserTeam && onOpenTraining && (
            <button
              onClick={() => onOpenTraining()}
              className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 py-1.5 rounded font-bold text-xs cursor-pointer transition shadow flex items-center gap-1.5 border border-[#38bdf8]"
            >
              <Zap className="w-3.5 h-3.5 fill-[#38bdf8]" />
              <span>Train Squad</span>
            </button>
          )}
          {onSelectAsUserTeam && (
            <button
              onClick={onSelectAsUserTeam}
              className="bg-[#059669] hover:bg-[#10b981] text-white px-3 py-1.5 rounded font-bold text-xs border border-emerald-400 cursor-pointer transition shadow"
            >
              Take Over Club ★
            </button>
          )}
          {onOpenTactics && (
            <button
              onClick={onOpenTactics}
              className="bg-[#1e293b] hover:bg-[#334155] text-[#38bdf8] border border-[#38bdf8]/50 px-3 py-1.5 rounded text-xs cursor-pointer transition font-bold flex items-center gap-1 shadow"
            >
              ⚽ SWOS Tactics
            </button>
          )}
          <button
            onClick={onBack}
            className="bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] border border-[#334155] px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
          >
            Back
          </button>
        </div>
      </div>

      {/* Squad Department Tabs (All, 1st Team, 2nd Team, Youth Academy) */}
      <div className="flex bg-[#0a121c] border-b border-[#223347] px-3 pt-2 gap-1.5 font-mono overflow-x-auto">
        <button
          onClick={() => setSquadTab('all')}
          className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            squadTab === 'all'
              ? 'bg-[#152233] text-[#38bdf8] border-t-2 border-t-[#38bdf8] border-x border-[#223347]'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>ALL SENIOR PLAYERS ({team.squad.length})</span>
        </button>

        <button
          onClick={() => setSquadTab('firstTeam')}
          className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            squadTab === 'firstTeam'
              ? 'bg-[#152233] text-[#ffd54f] border-t-2 border-t-[#ffd54f] border-x border-[#223347]'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
          }`}
        >
          <span>⭐</span>
          <span>FIRST TEAM (11)</span>
        </button>

        <button
          onClick={() => setSquadTab('secondTeam')}
          className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            squadTab === 'secondTeam'
              ? 'bg-[#152233] text-[#60a5fa] border-t-2 border-t-[#60a5fa] border-x border-[#223347]'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>SECOND TEAM / RESERVES ({secondTeam.length})</span>
          <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-600/50 px-1 py-0.2 rounded">
            {team.leagueId === 'big_time' ? '15-17 Members' : '10-13 Members (Min 10)'}
          </span>
        </button>

        <button
          onClick={() => setSquadTab('youth')}
          className={`px-3 py-1.5 rounded-t text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            squadTab === 'youth'
              ? 'bg-[#152233] text-[#4ade80] border-t-2 border-t-[#4ade80] border-x border-[#223347]'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#121c29]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
          <span>YOUTH ACADEMY ({youthSquad.length} U-18s)</span>
          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/50 px-1 py-0.2 rounded">
            New Season Intake
          </span>
        </button>
      </div>

      {/* Sub-Header Notice / Actions for selected department */}
      {squadTab === 'firstTeam' && (
        <div className="bg-[#1f1d0b] border-b border-[#4e451b] px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-[#fde68a] gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#ffd54f] font-bold">⭐ STARTING XI ({team.formation}):</span>
            <span>
              Core 11 starters with guaranteed frontline striker(s) leading the attack ({firstTeam.filter((p) => p.position === 'ATT').map((p) => `${p.name} (#${p.number})`).join(', ') || '1 Striker'}).
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#ffd54f] shrink-0 font-bold">
            ⚽ {firstTeam.filter((p) => p.position === 'ATT').length} Striker(s) in First Team
          </span>
        </div>
      )}

      {squadTab === 'secondTeam' && (
        <div className="bg-[#0c1826] border-b border-[#223347] px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-[#94a3b8] gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#38bdf8] font-bold">🛡️ SECOND TEAM / RESERVES:</span>
            <span>
              {secondTeam.length} members providing tactical depth and substitute options. (Guaranteed at least 10 members on smaller clubs, scaling up to 17 on First League elite teams).
            </span>
          </div>
          <span className="text-[11px] font-mono text-white/80 shrink-0">
            Total Squad Roster: {team.squad.length} Players
          </span>
        </div>
      )}

      {squadTab === 'youth' && (
        <div className="bg-[#0b1f14] border-b border-[#1b4e2b] px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-[#a7f3d0] gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#34d399] shrink-0" />
            <span>
              <strong>YOUTH ACADEMY SQUAD:</strong> Freshly generated intake for the new season (Ages 15–18). Review potential wonderkids and promote top prospects directly to the senior squad!
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isUserTeam && (
              <button
                onClick={handleRerollYouthIntake}
                className="bg-[#064e3b] hover:bg-[#047857] text-[#a7f3d0] border border-[#10b981] px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-sm"
                title="Scout a fresh batch of academy prospects"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Scout Fresh Intake</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#0c141e] border-b border-[#223347] text-[#94a3b8] text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-3 text-center w-10">No.</th>
              <th className="py-2.5 px-3">Player</th>
              <th className="py-2.5 px-3 text-center">Pos</th>
              <th className="py-2.5 px-3">Versatility</th>
              <th className="py-2.5 px-3 text-center">Age</th>
              <th className="py-2.5 px-3 text-center font-bold text-[#38bdf8]">Rtg</th>
              {squadTab === 'youth' && (
                <th className="py-2.5 px-2 text-center text-[#4ade80] font-bold" title="Development Potential">Pot</th>
              )}
              <th className="py-2.5 px-2 text-center text-[#38bdf8]" title="Pace / Sprint Speed">Spd</th>
              <th className="py-2.5 px-2 text-center text-[#f87171]" title="Attack Rating (Forwards higher to bypass defenders)">Att</th>
              <th className="py-2.5 px-2 text-center text-[#60a5fa]" title="Defence Rating (Defenders higher to stop attackers)">Def</th>
              <th className="py-2.5 px-2 text-center" title="Passing & Vision">Pas</th>
              <th className="py-2.5 px-2 text-center" title="Shooting & Finishing">Sho</th>
              <th className="py-2.5 px-2 text-center" title="Tackling & Interceptions">Tac</th>
              <th className="py-2.5 px-2 text-center text-[#38bdf8]" title="Dribbling & Ball Retention">Dri</th>
              <th className="py-2.5 px-2 text-center text-[#ffd54f]" title="Strength & Physical Shielding">Str</th>
              <th className="py-2.5 px-2 text-center text-[#81c784]" title="Tactical Positioning & Tracking">Pos</th>
              <th className="py-2.5 px-2 text-center text-[#ff80ab]" title="First Touch & Ball Control (Control)">Ctrl</th>
              <th className="py-2.5 px-2 text-center" title="Aerobic Stamina">Sta</th>
              <th className="py-2.5 px-2 text-center" title="Match Fitness">Fit</th>
              <th className="py-2.5 px-2 text-center" title="Tactical Profile & Goalkeeper Sweeper/Line Style">Style / Role</th>
              {squadTab !== 'youth' && (
                <th className="py-2.5 px-3 text-right">Goals</th>
              )}
              {isUserTeam && (
                <th className="py-2.5 px-3 text-center">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2e42] text-xs">
            {currentPlayers.map((p, idx) => (
              <tr key={p.id || idx} className="fm-table-row transition">
                <td className="py-2.5 px-3 text-center text-[#94a3b8] font-mono font-bold">
                  {squadTab === 'youth' ? 30 + idx + 1 : p.number}
                </td>
                <td className="py-2.5 px-3 font-medium">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white font-semibold">{p.name}</span>
                    {p.isStar && (
                      <span className="text-[9px] bg-[#ffd54f]/20 border border-[#ffd54f]/70 text-[#ffd54f] px-1 py-0.2 rounded font-mono font-extrabold shadow-xs">
                        ★ {squadTab === 'youth' ? 'WONDERKID' : 'STAR'}
                      </span>
                    )}
                    {squadTab === 'youth' && p.potential && p.potential >= 88 && (
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500 px-1 py-0.2 rounded font-mono font-extrabold animate-pulse">
                        🔥 ELITE PROSPECT
                      </span>
                    )}
                    {p.suspendedMatches > 0 && (
                      <span className="text-[9px] bg-red-950 text-red-400 border border-red-500 px-1 py-0.2 rounded font-mono font-extrabold animate-pulse">
                        🚨 BANNED ({p.suspendedMatches}M)
                      </span>
                    )}
                    {p.activeEncounter && (
                      <span className="text-[9px] bg-amber-950/60 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-mono" title={p.activeEncounter}>
                        📰 TABLOID
                      </span>
                    )}
                  </div>
                  {p.primaryRole && p.primaryRole !== p.position && (
                    <span className="text-[10px] text-[#38bdf8] font-mono">Role: {p.primaryRole}</span>
                  )}
                </td>
                <td className={`py-2.5 px-3 text-center ${getPosClass(p.position)}`}>{p.position}</td>
                <td className="py-2.5 px-3">
                  {p.secondaryPositions && p.secondaryPositions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.secondaryPositions.map((sec, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] px-1.5 py-0.5 rounded font-mono font-bold"
                          title={`Can also play effectively as ${sec}`}
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#64748b] text-[11px]">-</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center text-[#94a3b8]">
                  {p.age} {squadTab === 'youth' && <span className="text-[10px] text-emerald-400 font-bold">U-18</span>}
                </td>
                <td className="py-2.5 px-3 text-center font-extrabold text-[#38bdf8] text-sm">{p.rating()}</td>

                {/* Potential column for Youth Academy */}
                {squadTab === 'youth' && (
                  <td className="py-2.5 px-2 text-center font-mono font-extrabold">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] border ${
                        (p.potential ?? 75) >= 88
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-xs'
                          : (p.potential ?? 75) >= 80
                          ? 'bg-sky-950 text-sky-300 border-sky-500/60'
                          : 'bg-yellow-950 text-yellow-300 border-yellow-500/60'
                      }`}
                    >
                      {p.potential ?? 75}
                    </span>
                  </td>
                )}

                <td className="py-2.5 px-2 text-center text-[#38bdf8] font-mono font-bold">{p.speed ?? p.pace}</td>
                <td className="py-2.5 px-2 text-center text-[#f87171] font-mono font-bold">{p.attack ?? (p.position === 'ATT' ? 84 : 70)}</td>
                <td className="py-2.5 px-2 text-center text-[#60a5fa] font-mono font-bold">{p.defence ?? (p.position === 'DEF' ? 84 : p.position === 'GK' ? 86 : 65)}</td>
                <td className="py-2.5 px-2 text-center text-[#cbd5e1] font-mono">{p.passing}</td>
                <td className="py-2.5 px-2 text-center text-[#cbd5e1] font-mono">{p.shooting}</td>
                <td className="py-2.5 px-2 text-center text-[#cbd5e1] font-mono">{p.tackling}</td>
                <td className="py-2.5 px-2 text-center text-[#38bdf8] font-mono font-bold">{p.dribbling}</td>
                <td className="py-2.5 px-2 text-center text-[#ffd54f] font-mono font-bold">{p.strength}</td>
                <td className="py-2.5 px-2 text-center text-[#81c784] font-mono font-bold">{p.positioning}</td>
                <td className="py-2.5 px-2 text-center text-[#ff80ab] font-mono font-bold">{p.control}</td>
                <td className="py-2.5 px-2 text-center text-[#cbd5e1] font-mono">{p.stamina}</td>
                <td className="py-2.5 px-2 text-center">
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      p.condition > 80
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : p.condition > 60
                        ? 'bg-yellow-950/80 text-yellow-400 border border-yellow-800/60'
                        : 'bg-red-950/80 text-red-400 border border-red-800/60'
                    }`}
                  >
                    {Math.round(p.condition)}%
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center">
                  {p.position === 'GK' ? (
                    <button
                      onClick={() => toggleGkStyle(p)}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border cursor-pointer transition shadow-xs flex items-center gap-1 mx-auto ${
                        p.gkStyle === 'attacking'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500/60 hover:bg-amber-900/60'
                          : 'bg-blue-950/60 text-blue-300 border-blue-500/60 hover:bg-blue-900/60'
                      }`}
                      title={`GK Skills: Awr ${p.gkAwareness ?? 82} | Rch ${p.gkReach ?? 84} | Jmp ${p.gkJumping ?? 80}. Click to toggle style!`}
                    >
                      <span>{p.gkStyle === 'attacking' ? '⚔️ ATT Sweeper' : '🛡️ DEF Line'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-[#94a3b8] font-mono">
                      {p.position === 'ATT' ? '⚡ Finisher' : p.position === 'DEF' ? '🛡️ Stopper' : '🔄 Playmaker'}
                    </span>
                  )}
                </td>
                {squadTab !== 'youth' && (
                  <td className="py-2.5 px-3 text-right font-bold text-white font-mono">
                    {p.seasonGoals > 0 ? (
                      <span className="text-[#ffd54f]">⚽ {p.seasonGoals}</span>
                    ) : (
                      <span className="text-[#64748b]">-</span>
                    )}
                  </td>
                )}
                {isUserTeam && (
                  <td className="py-2.5 px-3 text-center">
                    {squadTab === 'youth' ? (
                      <button
                        onClick={() => handlePromoteYouth(p.id)}
                        className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/60 rounded text-[11px] font-bold cursor-pointer transition flex items-center gap-1 mx-auto shadow-xs"
                        title="Promote this youth prospect to the Senior/Second Squad"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Promote ★</span>
                      </button>
                    ) : onOpenTraining ? (
                      <button
                        onClick={() => onOpenTraining(p.id)}
                        className="px-2.5 py-1 bg-[#1e293b] hover:bg-[#0284c7] text-[#38bdf8] hover:text-white border border-[#38bdf8]/40 rounded text-[11px] font-bold cursor-pointer transition flex items-center gap-1 mx-auto"
                        title="Train this player with tokens"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Train</span>
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


