import React, { useState, useRef, useEffect } from 'react';
import { Team, FORMATIONS, TACTICS, FormationName, TacticName, COUNTER_FORMATIONS } from '../types/football';
import {
  SWOSTacticData,
  SWOSPosition,
  SWOS_BALL_SPOTS,
  SWOS_GRID_COLS,
  SWOS_GRID_ROWS,
  SWOS_TOTAL_SPOTS,
  getOutfieldRoles,
  generateSWOSTactic,
  evaluatePlayerTick,
  evaluateSWOSTactic,
  flipTacticHorizontally,
  copyBallSpot,
  loadSavedCustomTactics,
  saveCustomTacticSlot,
} from '../services/swosTacticsEngine';
import {
  Zap,
  ShieldCheck,
  Crosshair,
  CheckCircle2,
  XCircle,
  Copy,
  FlipHorizontal,
  Save,
  FolderOpen,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface TacticsBoardProps {
  team: Team;
  isOpen?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  onUpdateFormation: (formation: FormationName) => void;
  onUpdateTactic: (tactic: TacticName) => void;
  onUpdateCustomTactic?: (tactic: SWOSTacticData) => void;
}

export const TacticsBoard: React.FC<TacticsBoardProps> = ({
  team,
  isOpen = true,
  isModal = false,
  onClose,
  onUpdateFormation,
  onUpdateTactic,
  onUpdateCustomTactic,
}) => {
  if (isModal && !isOpen) return null;
  if (!team) return null;

  // Active view tab: 'swos_editor' or 'standard_presets'
  const [activeTab, setActiveTab] = useState<'swos_editor' | 'standard_presets'>('swos_editor');

  // SWOS Tactic state
  const [swosTactic, setSwosTactic] = useState<SWOSTacticData>(() => {
    if (team.customSwosTactic && team.customSwosTactic.spots) {
      return team.customSwosTactic;
    }
    return generateSWOSTactic(team.formation || '4-4-2', team.tactic || 'Balanced');
  });

  // Current selected ball spot (0..34)
  const [selectedSpotIndex, setSelectedSpotIndex] = useState<number>(17); // 17 is Center Line - Center Channel

  // Selected player index (0..9) for editing
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState<number>(0);

  // Saved slots state from localStorage
  const [savedSlots, setSavedSlots] = useState<Record<number, SWOSTacticData>>({});
  const [notification, setNotification] = useState<string | null>(null);

  const primaryGk = team.squad?.find((p) => p.position === 'GK');
  const [gkStyle, setGkStyle] = useState<'attacking' | 'defensive'>(() => primaryGk?.gkStyle || 'attacking');

  const handleUpdateGkStyle = (style: 'attacking' | 'defensive') => {
    setGkStyle(style);
    if (primaryGk) {
      primaryGk.gkStyle = style;
    }
    for (const p of team.squad || []) {
      if (p.position === 'GK') p.gkStyle = style;
    }
    showNotification(`Goalkeeper style set to ${style === 'attacking' ? '⚔️ Attacking Sweeper-Keeper' : '🛡️ Defensive Line-Stopper'}!`);
  };

  // Dragging state on canvas
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Load saved slots on mount
  useEffect(() => {
    setSavedSlots(loadSavedCustomTactics());
  }, []);

  // Update swos tactic if team's formation/tactic is altered externally
  useEffect(() => {
    if (!team.customSwosTactic) {
      setSwosTactic(generateSWOSTactic(team.formation || '4-4-2', team.tactic || 'Balanced'));
    }
  }, [team.formation, team.tactic]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const formationList = Object.keys(FORMATIONS) as FormationName[];
  const tacticList = Object.keys(TACTICS) as TacticName[];
  const roles = getOutfieldRoles(swosTactic.formation);

  // Current ball spot & player positions
  const currentSpot = SWOS_BALL_SPOTS[selectedSpotIndex] || SWOS_BALL_SPOTS[17];
  const currentPositions: SWOSPosition[] =
    swosTactic.spots[selectedSpotIndex] ||
    roles.map((r) => ({ x: r.baseX, y: r.baseY }));

  // Evaluate tactic ticks
  const evaluation = evaluateSWOSTactic(swosTactic);

  // Handle pointer down on pitch or player token to drag or move
  const handlePitchPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const clickX = Math.max(0.06, Math.min(0.94, (e.clientX - rect.left) / rect.width));
    const clickY = Math.max(0.06, Math.min(0.94, (e.clientY - rect.top) / rect.height));

    // Check if clicked close to an existing player token
    let foundIdx = -1;
    let minDist = 0.06; // ~6% radius threshold
    for (let i = 0; i < currentPositions.length; i++) {
      const p = currentPositions[i];
      const d = Math.hypot(p.x - clickX, p.y - clickY);
      if (d < minDist) {
        minDist = d;
        foundIdx = i;
      }
    }

    if (foundIdx >= 0) {
      setSelectedPlayerIdx(foundIdx);
      setIsDragging(true);
    } else {
      // Reposition currently selected player directly to clicked location
      updatePlayerPos(selectedPlayerIdx, clickX, clickY);
      setIsDragging(true);
    }
  };

  const handlePitchPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = Math.max(0.06, Math.min(0.94, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.06, Math.min(0.94, (e.clientY - rect.top) / rect.height));
    updatePlayerPos(selectedPlayerIdx, x, y);
  };

  const handlePitchPointerUp = () => {
    setIsDragging(false);
  };

  const updatePlayerPos = (pIdx: number, nx: number, ny: number) => {
    const newSpots = { ...swosTactic.spots };
    const curList = [...(newSpots[selectedSpotIndex] || currentPositions)];
    curList[pIdx] = {
      x: Math.round(nx * 100) / 100,
      y: Math.round(ny * 100) / 100,
    };
    newSpots[selectedSpotIndex] = curList;

    setSwosTactic({
      ...swosTactic,
      spots: newSpots,
    });
  };

  // SWOS Tools: Flip
  const handleFlip = () => {
    const flipped = flipTacticHorizontally(swosTactic);
    setSwosTactic(flipped);
    showNotification('FLIP: Tactic mirrored horizontally across flanks!');
  };

  // SWOS Tools: Copy
  const handleCopyCurrentSpot = (targetMode: 'col' | 'row' | 'all') => {
    const updated = { ...swosTactic };
    const sourcePositions = swosTactic.spots[selectedSpotIndex] || currentPositions;

    for (let s = 0; s < SWOS_TOTAL_SPOTS; s++) {
      const sp = SWOS_BALL_SPOTS[s];
      let shouldCopy = false;
      if (targetMode === 'all') shouldCopy = true;
      else if (targetMode === 'col' && sp.col === currentSpot.col) shouldCopy = true;
      else if (targetMode === 'row' && sp.row === currentSpot.row) shouldCopy = true;

      if (shouldCopy && s !== selectedSpotIndex) {
        updated.spots[s] = sourcePositions.map((p) => ({ ...p }));
      }
    }

    setSwosTactic(updated);
    showNotification(
      `COPY: Spot #${selectedSpotIndex} copied to ${
        targetMode === 'all' ? 'all 35 zones' : targetMode === 'col' ? 'all column zones' : 'all row zones'
      }!`
    );
  };

  // SWOS Tools: Presets
  const handleLoadPreset = (formName: FormationName, tacName: TacticName) => {
    const preset = generateSWOSTactic(formName, tacName);
    setSwosTactic(preset);
    onUpdateFormation(formName);
    onUpdateTactic(tacName);
    showNotification(`Loaded preset: SWOS ${formName} (${tacName})`);
  };

  // Save to slot
  const handleSaveToSlot = (slot: number) => {
    saveCustomTacticSlot(slot, swosTactic);
    setSavedSlots(loadSavedCustomTactics());
    showNotification(`Saved custom tactic to SLOT ${slot}!`);
  };

  // Load from slot
  const handleLoadSlot = (slot: number) => {
    const target = savedSlots[slot];
    if (target) {
      setSwosTactic(target);
      onUpdateFormation(target.formation);
      onUpdateTactic(target.tactic);
      showNotification(`Loaded custom tactic from SLOT ${slot}: ${target.name}`);
    }
  };

  // Apply to Active Team
  const handleApplyToTeam = () => {
    team.customSwosTactic = swosTactic;
    team.formation = swosTactic.formation;
    team.tactic = swosTactic.tactic;
    if (onUpdateCustomTactic) {
      onUpdateCustomTactic(swosTactic);
    }
    showNotification(`⚡ APPLIED TO ${team.name}: Ready for 360° Realtime Match!`);
  };

  const content = (
    <div className="fm-panel font-sans text-xs sm:text-sm overflow-hidden select-none max-h-[92vh] overflow-y-auto">
      {/* Header */}
      <div className="fm-panel-header px-4 py-3 flex justify-between items-center">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 tracking-wide">
            <span className="text-[#38bdf8]">⚽</span> TACTICAL WORKSHOP · SWOS & FM2010 HYBRID
          </h2>
          <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">
            Sensible Soccer 35-Zone Pitch Matrix & Interception Logic // Managing: <span className="font-semibold text-white">{team.name}</span>
          </p>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-[#cbd5e1] hover:text-white px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-xs cursor-pointer transition font-medium"
          >
            Close
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Notification Toast */}
        {notification && (
          <div className="p-2.5 bg-[#0369a1] border border-[#38bdf8] text-white rounded text-xs font-bold text-center shadow-md animate-pulse">
            {notification}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#223347] pb-2 font-mono">
          <button
            onClick={() => setActiveTab('swos_editor')}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'swos_editor'
                ? 'bg-[#0284c7] text-white border border-[#38bdf8] shadow'
                : 'bg-[#152233] text-[#94a3b8] border border-[#223347] hover:bg-[#1e2e42] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>SWOS 35-BALL DIY PITCH EDITOR</span>
          </button>

          <button
            onClick={() => setActiveTab('standard_presets')}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'standard_presets'
                ? 'bg-[#0284c7] text-white border border-[#38bdf8] shadow'
                : 'bg-[#152233] text-[#94a3b8] border border-[#223347] hover:bg-[#1e2e42] hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>FORMATIONS & MENTALITY PRESETS</span>
          </button>
        </div>

      {/* ================= TAB 1: SWOS 35-SPOT DIY EDITOR ================= */}
      {activeTab === 'swos_editor' && (
        <div className="space-y-4">
          {/* Top Status & Evaluation Bar */}
          <div className="p-2.5 bg-[#12261a] border border-[#2e7d32] rounded flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[#ffd54f] font-bold text-sm">{swosTactic.name}</span>
              <span className="text-xs bg-[#1b5e20] px-2 py-0.5 rounded text-white border border-[#2e7d32]">
                {swosTactic.formation}
              </span>
            </div>

            {/* SWOS Green Ticks Gauge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b8a6b]">SWOS Evaluation:</span>
              <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded border border-[#2e7d32]">
                <CheckCircle2 className="w-4 h-4 text-[#00e676]" />
                <span className="text-sm font-bold text-[#00e676]">
                  {evaluation.totalGreenTicks} / {evaluation.maxTicks}
                </span>
                <span className="text-xs text-[#ffd54f] font-semibold">({evaluation.ratingPercent}%)</span>
                <span className="text-xs text-[#81c784] border-l border-[#2e7d32] pl-1.5 ml-1">
                  {evaluation.verdict}
                </span>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyToTeam}
              className="px-3 py-1.5 bg-[#ffd54f] hover:bg-[#ffe082] text-black font-bold rounded text-xs cursor-pointer shadow flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>APPLY TO MATCH ENGINE</span>
            </button>
          </div>

          {/* 35 Ball Zones Selector & Stepper */}
          <div className="p-3 bg-[#0d1a0d] border border-[#1b5e20] rounded space-y-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#ffd54f] font-bold">BALL SPOT {selectedSpotIndex + 1}/35:</span>
                <span className="text-white font-semibold">{currentSpot.name}</span>
                <span className="text-[#6b8a6b] text-[11px]">
                  (Col {currentSpot.col + 1}/7, Row {currentSpot.row + 1}/5)
                </span>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelectedSpotIndex((prev) => (prev > 0 ? prev - 1 : SWOS_TOTAL_SPOTS - 1))}
                  className="px-2 py-0.5 bg-[#12261a] hover:bg-[#1b5e20] text-[#ffd54f] border border-[#2e7d32] rounded text-xs cursor-pointer flex items-center gap-0.5"
                >
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <button
                  onClick={() => setSelectedSpotIndex((prev) => (prev < SWOS_TOTAL_SPOTS - 1 ? prev + 1 : 0))}
                  className="px-2 py-0.5 bg-[#12261a] hover:bg-[#1b5e20] text-[#ffd54f] border border-[#2e7d32] rounded text-xs cursor-pointer flex items-center gap-0.5"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 7x5 Interactive Ball Spots Grid */}
            <div className="grid grid-cols-7 gap-1 pt-1">
              {SWOS_BALL_SPOTS.map((sp) => {
                const isSelected = sp.index === selectedSpotIndex;
                return (
                  <button
                    key={sp.index}
                    onClick={() => setSelectedSpotIndex(sp.index)}
                    className={`p-1 rounded text-center text-[10px] font-mono cursor-pointer transition border ${
                      isSelected
                        ? 'bg-[#ffd54f] text-black font-bold border-white shadow-md'
                        : 'bg-[#12261a] text-[#81c784] border-[#1b5e20] hover:bg-[#1b5e20]/60'
                    }`}
                    title={sp.name}
                  >
                    #{sp.index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Pitch Canvas Board */}
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Pitch Surface */}
            <div className="flex-1 flex flex-col items-center">
              <div
                ref={pitchRef}
                onPointerDown={handlePitchPointerDown}
                onPointerMove={handlePitchPointerMove}
                onPointerUp={handlePitchPointerUp}
                className="relative w-full aspect-[5/3] max-w-2xl bg-[#143c1b] border-2 border-[#2e7d32] rounded shadow-2xl overflow-hidden cursor-crosshair touch-none select-none"
              >
                {/* Grass Stripes */}
                <div className="absolute inset-0 grid grid-cols-7 pointer-events-none opacity-40">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={i % 2 === 0 ? 'bg-[#1b4d24]' : 'bg-[#143c1b]'}
                    />
                  ))}
                </div>

                {/* SWOS 7x5 Zonal Grid Lines (Subtle tactical overlay) */}
                <div className="absolute inset-0 grid grid-cols-7 grid-rows-5 pointer-events-none border border-white/20">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div
                      key={i}
                      className={`border border-white/10 ${
                        i === selectedSpotIndex ? 'bg-[#ffd54f]/15' : ''
                      }`}
                    />
                  ))}
                </div>

                {/* Pitch Markings */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Halfway line & center circle */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/60 -translate-x-1/2" />
                  <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60" />
                  {/* Left Penalty Box */}
                  <div className="absolute left-0 top-[25%] bottom-[25%] w-[16%] border border-white/60" />
                  {/* Right Penalty Box */}
                  <div className="absolute right-0 top-[25%] bottom-[25%] w-[16%] border border-white/60" />
                </div>

                {/* Fixed Goalkeeper (1) in goal */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                  style={{ left: '3.5%', top: '50%' }}
                >
                  <div className="w-5 h-5 rounded-full bg-[#ffd54f] text-black font-bold text-[10px] flex items-center justify-center border border-black shadow">
                    1
                  </div>
                  <span className="text-[9px] text-[#ffd54f] font-bold">GK</span>
                </div>

                {/* Ball at current spot */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center"
                  style={{ left: `${currentSpot.x * 100}%`, top: `${currentSpot.y * 100}%` }}
                >
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center text-[10px] shadow-lg animate-bounce">
                    ⚽
                  </div>
                  <span className="text-[8px] bg-black/80 text-[#ffd54f] px-1 rounded font-bold mt-0.5">
                    BALL
                  </span>
                </div>

                {/* 10 Outfield Players */}
                {currentPositions.map((pos, pIdx) => {
                  const roleInfo = roles[pIdx];
                  const isSelected = selectedPlayerIdx === pIdx;
                  const isTick = evaluatePlayerTick(pos, pIdx, selectedSpotIndex, swosTactic.formation);

                  return (
                    <div
                      key={pIdx}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-20 transition-transform ${
                        isSelected ? 'scale-115' : 'hover:scale-105'
                      }`}
                      style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                    >
                      {/* Green Tick / Red Cross Indicator */}
                      <div className="mb-0.5">
                        {isTick ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00e676] bg-black/70 rounded-full" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-[#ef5350] bg-black/70 rounded-full" />
                        )}
                      </div>

                      {/* Shirt Token */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 ${
                          isSelected
                            ? 'bg-[#ffd54f] text-black border-white ring-2 ring-[#00e676]'
                            : roleInfo.position === 'DEF' || roleInfo.position === 'LB' || roleInfo.position === 'RB'
                            ? 'bg-[#42a5f5] text-black border-black'
                            : roleInfo.position === 'MID'
                            ? 'bg-[#81c784] text-black border-black'
                            : 'bg-[#ef5350] text-white border-black'
                        }`}
                      >
                        {pIdx + 2}
                      </div>

                      {/* Role Label */}
                      <span
                        className={`text-[9px] font-bold px-1 rounded mt-0.5 leading-none ${
                          isSelected ? 'bg-black text-[#ffd54f]' : 'bg-black/70 text-white'
                        }`}
                      >
                        {roleInfo.role}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#81c784] mt-1.5 text-center">
                💡 <span className="font-semibold text-[#ffd54f]">SWOS Controls:</span> Drag player tokens or click anywhere on the pitch to set positions for Spot #{selectedSpotIndex + 1}.
              </p>
            </div>

            {/* Outfield Player Selection Sidebar & Green Ticks Count */}
            <div className="w-full lg:w-64 bg-[#0d1a0d] border border-[#1b5e20] p-2.5 rounded space-y-2">
              <div className="text-xs font-bold text-[#ffd54f] pb-1 border-b border-[#1b5e20] flex justify-between items-center">
                <span>OUTFIELD PLAYERS</span>
                <span className="text-[10px] text-[#6b8a6b]">35 SPOTS EVAL</span>
              </div>

              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {roles.map((r, pIdx) => {
                  const isSelected = selectedPlayerIdx === pIdx;
                  const ticks = evaluation.playerTicks[pIdx];
                  const tickPercent = Math.round((ticks / SWOS_TOTAL_SPOTS) * 100);
                  const isCurrentTick = evaluatePlayerTick(
                    currentPositions[pIdx],
                    pIdx,
                    selectedSpotIndex,
                    swosTactic.formation
                  );

                  return (
                    <button
                      key={pIdx}
                      onClick={() => setSelectedPlayerIdx(pIdx)}
                      className={`w-full p-1.5 rounded text-left border cursor-pointer transition flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-[#1b5e20] border-[#ffd54f] text-[#ffd54f] font-bold'
                          : 'bg-[#12261a] border-[#2e7d32] text-[#d4e8d4] hover:bg-[#1b5e20]/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-black ${
                            r.position === 'DEF' || r.position === 'LB' || r.position === 'RB'
                              ? 'bg-[#42a5f5]'
                              : r.position === 'MID'
                              ? 'bg-[#81c784]'
                              : 'bg-[#ef5350]'
                          }`}
                        >
                          {pIdx + 2}
                        </span>
                        <span>{r.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        {isCurrentTick ? (
                          <span className="text-[#00e676] font-bold">✓</span>
                        ) : (
                          <span className="text-[#ef5350] font-bold">✗</span>
                        )}
                        <span
                          className={ticks >= 28 ? 'text-[#00e676]' : ticks >= 20 ? 'text-[#ffd54f]' : 'text-[#ef5350]'}
                        >
                          {ticks}/35
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SWOS Tools & Preset Bar */}
          <div className="p-3 bg-[#0d1a0d] border border-[#1b5e20] rounded space-y-3">
            <div className="text-xs font-bold text-[#ffd54f] uppercase tracking-wide">
              SWOS TACTICAL TOOLS & REPOSITORY
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {/* Flip */}
              <button
                onClick={handleFlip}
                className="p-2 bg-[#12261a] hover:bg-[#1b5e20] border border-[#2e7d32] rounded text-xs text-[#81c784] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                title="Mirror tactic horizontally between flanks"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-[#ffd54f]" />
                <span>FLIP (MIRROR)</span>
              </button>

              {/* Copy to Column */}
              <button
                onClick={() => handleCopyCurrentSpot('col')}
                className="p-2 bg-[#12261a] hover:bg-[#1b5e20] border border-[#2e7d32] rounded text-xs text-[#d4e8d4] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                title="Copy current spot to all vertical spots in this column"
              >
                <Copy className="w-3.5 h-3.5 text-[#ffd54f]" />
                <span>COPY TO COL</span>
              </button>

              {/* Copy to Row */}
              <button
                onClick={() => handleCopyCurrentSpot('row')}
                className="p-2 bg-[#12261a] hover:bg-[#1b5e20] border border-[#2e7d32] rounded text-xs text-[#d4e8d4] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                title="Copy current spot across all spots in this channel row"
              >
                <Copy className="w-3.5 h-3.5 text-[#81c784]" />
                <span>COPY TO ROW</span>
              </button>

              {/* Copy to All */}
              <button
                onClick={() => handleCopyCurrentSpot('all')}
                className="p-2 bg-[#12261a] hover:bg-[#1b5e20] border border-[#2e7d32] rounded text-xs text-[#d4e8d4] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                title="Copy current spot to all 35 zones"
              >
                <Copy className="w-3.5 h-3.5 text-[#00e676]" />
                <span>COPY TO ALL</span>
              </button>

              {/* Reset to formation default */}
              <button
                onClick={() => {
                  setSwosTactic(generateSWOSTactic(swosTactic.formation, swosTactic.tactic));
                  showNotification('Reset to standard formation defaults');
                }}
                className="p-2 bg-[#12261a] hover:bg-[#1b5e20] border border-[#2e7d32] rounded text-xs text-red-400 font-bold cursor-pointer transition flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET FORM</span>
              </button>

              {/* Apply to active team */}
              <button
                onClick={handleApplyToTeam}
                className="p-2 bg-[#1b5e20] hover:bg-[#2e7d32] border border-[#ffd54f] rounded text-xs text-[#ffd54f] font-bold cursor-pointer transition flex items-center justify-center gap-1 shadow"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ffd54f]" />
                <span>APPLY MATCH</span>
              </button>
            </div>

            {/* Custom Tactics Slots (1..6) */}
            <div className="pt-2 border-t border-[#1b5e20]">
              <div className="text-[11px] text-[#6b8a6b] font-bold mb-1.5 flex justify-between items-center">
                <span>CUSTOM TACTIC SLOTS (SWOS MEMORY SLOTS 1..6):</span>
                <span>Click slot to Save or Load</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((slot) => {
                  const saved = savedSlots[slot];
                  return (
                    <div
                      key={slot}
                      className="p-2 bg-[#12261a] border border-[#2e7d32] rounded flex flex-col justify-between gap-1 text-[11px]"
                    >
                      <div className="font-bold text-[#ffd54f] flex justify-between items-center">
                        <span>SLOT {slot}</span>
                        {saved && <span className="text-[9px] bg-[#1b5e20] px-1 rounded text-white">SAVED</span>}
                      </div>
                      <div className="text-[10px] text-[#6b8a6b] truncate">
                        {saved ? `${saved.formation} (${saved.tactic})` : 'Empty'}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => handleSaveToSlot(slot)}
                          className="flex-1 py-0.5 bg-[#1b5e20] hover:bg-[#2e7d32] text-[#ffd54f] rounded font-bold text-[10px] cursor-pointer text-center"
                          title={`Save current tactic to slot ${slot}`}
                        >
                          Save
                        </button>
                        {saved && (
                          <button
                            onClick={() => handleLoadSlot(slot)}
                            className="flex-1 py-0.5 bg-[#ffd54f] hover:bg-[#ffe082] text-black rounded font-bold text-[10px] cursor-pointer text-center"
                            title={`Load tactic from slot ${slot}`}
                          >
                            Load
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: STANDARD PRESETS & MENTALITY ================= */}
      {activeTab === 'standard_presets' && (
        <div className="space-y-4">
          {/* SWOS Signature Tactical Presets Banner */}
          <div className="p-3 bg-gradient-to-r from-[#122b16] via-[#1b4320] to-[#122b16] border border-[#ffd54f]/50 rounded shadow-md">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-4 h-4 text-[#ffd54f]" />
              <span className="text-xs sm:text-sm font-bold text-[#ffd54f] tracking-wide">
                AUTHENTIC SENSIBLE SOCCER (SWOS) PRESETS
              </span>
              <span className="text-[10px] bg-[#ffd54f] text-black px-1.5 py-0.5 rounded font-bold">
                CLASSIC FACTORY TACTICS
              </span>
            </div>
            <p className="text-[11px] text-[#d4e8d4] leading-relaxed mb-2.5">
              Load legendary SWOS presets designed with optimized 35-ball-position coverage, green-tick balance, and rapid midfield harassment.
            </p>

            {/* 1-Click SWOS Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleLoadPreset('4-4-2', 'SWOS Press')}
                className="p-2.5 bg-[#0c1f10] hover:bg-[#1a3d1f] border border-[#2e7d32] rounded text-left cursor-pointer transition flex flex-col justify-between"
              >
                <div className="font-bold text-[#ffd54f] flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5 text-[#ffd54f]" />
                  <span>SWOS 4-4-2 Classic</span>
                </div>
                <div className="text-[10px] text-[#81c784] mt-1">
                  Double midfield destroyers with crunch tackles & dual strikers
                </div>
              </button>

              <button
                onClick={() => handleLoadPreset('4-2-4', 'SWOS Total')}
                className="p-2.5 bg-[#0c1f10] hover:bg-[#1a3d1f] border border-[#2e7d32] rounded text-left cursor-pointer transition flex flex-col justify-between"
              >
                <div className="font-bold text-[#ffd54f] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#ffd54f]" />
                  <span>SWOS 4-2-4 Brazil</span>
                </div>
                <div className="text-[10px] text-[#81c784] mt-1">
                  Legendary Sensible 4-man attack blitz & high-tempo transitions
                </div>
              </button>

              <button
                onClick={() => handleLoadPreset('3-5-2', 'SWOS Press')}
                className="p-2.5 bg-[#0c1f10] hover:bg-[#1a3d1f] border border-[#2e7d32] rounded text-left cursor-pointer transition flex flex-col justify-between"
              >
                <div className="font-bold text-[#ffd54f] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#ffd54f]" />
                  <span>SWOS 3-5-2 Dominance</span>
                </div>
                <div className="text-[10px] text-[#81c784] mt-1">
                  5-man midfield pincer suffocation & central dominance
                </div>
              </button>
            </div>
          </div>

          {/* Formations Grid */}
          <div>
            <label className="block text-[#ffd54f] font-semibold mb-2 uppercase tracking-wider text-xs">
              Select Formation:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {formationList.map((f) => {
                const isSelected = team.formation === f;
                return (
                  <button
                    key={f}
                    onClick={() => {
                      onUpdateFormation(f);
                      handleLoadPreset(f, team.tactic || 'Balanced');
                    }}
                    className={`p-2 rounded text-left border cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#1b5e20] border-[#ffd54f] text-[#ffd54f] font-bold shadow'
                        : 'bg-[#12261a] border-[#2e7d32] text-[#d4e8d4] hover:bg-[#1b5e20]/60'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{f}</span>
                      {isSelected && <span className="text-[10px] bg-[#ffd54f] text-black px-1 rounded">ACTIVE</span>}
                    </div>
                    <div className="text-[10px] opacity-75 mt-1 truncate">
                      {FORMATIONS[f].description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mentality / Tactical instructions */}
          <div>
            <label className="block text-[#ffd54f] font-semibold mb-2 uppercase tracking-wider text-xs">
              Tactical Mentality:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {tacticList.map((t) => {
                const isSelected = team.tactic === t;
                const isSwosTactic = t.startsWith('SWOS');
                return (
                  <button
                    key={t}
                    onClick={() => {
                      onUpdateTactic(t);
                      handleLoadPreset(team.formation || '4-4-2', t);
                    }}
                    className={`p-2 rounded text-left border cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#1b5e20] border-[#ffd54f] text-[#ffd54f] font-bold shadow'
                        : isSwosTactic
                        ? 'bg-[#142818] border-[#ffd54f]/40 text-[#ffd54f] hover:bg-[#1b5e20]/60'
                        : 'bg-[#12261a] border-[#2e7d32] text-[#d4e8d4] hover:bg-[#1b5e20]/60'
                    }`}
                  >
                    <div className="truncate font-semibold flex items-center gap-1">
                      {isSwosTactic && <Zap className="w-3 h-3 text-[#ffd54f]" />}
                      <span>{t}</span>
                    </div>
                    <div className="text-[10px] text-[#ffd54f] mt-1">
                      ATK x{TACTICS[t].atk.toFixed(2)} / DEF x{TACTICS[t].def.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#6b8a6b] mt-2 italic bg-[#12261a] p-2 rounded border border-[#1b5e20]">
              Strategy Note: {TACTICS[team.tactic]?.description || TACTICS['Balanced'].description}
            </p>
          </div>

          {/* Goalkeeper Tactical Directive */}
          <div className="p-3 bg-[#0d1722] border border-[#223347] rounded space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#ffd54f] text-sm">🧤</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Goalkeeper Tactical Directive & Sweeper Profile
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                gkStyle === 'attacking'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                  : 'bg-blue-950/60 text-blue-300 border-blue-500/50'
              }`}>
                {gkStyle === 'attacking' ? '⚔️ ATTACKING SWEEPER' : '🛡️ DEFENSIVE LINE-STOPPER'}
              </span>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Configure your goalkeeper's AI positioning and pass interception behavior. All goalkeepers are fully AI-controlled, hold after saves to allow full team formation recovery, then launch long upfield clearance kicks. Save success is determined dynamically by GK Reach, Awareness, Jumping, and Defence.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleUpdateGkStyle('attacking')}
                className={`p-2.5 rounded border text-left cursor-pointer transition flex flex-col justify-between ${
                  gkStyle === 'attacking'
                    ? 'bg-amber-950/50 border-amber-400 text-white shadow'
                    : 'bg-[#091018] border-[#1e2e42] text-[#94a3b8] hover:border-amber-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>⚔️ Attacking Sweeper-Keeper</span>
                    </span>
                    {gkStyle === 'attacking' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <p className="text-[10px] leading-relaxed text-[#cbd5e1]">
                    Stands forward off goal line. Actively reads loose balls and crosses when defenders are caught behind, sprinting to cut out passes before attackers reach them.
                  </p>
                </div>
                <div className="text-[9px] font-mono mt-2 text-amber-400 font-semibold">
                  ⚠️ Risk/Reward: Fast keepers intercept cleanly; slow/mistimed rushes leave open goals!
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateGkStyle('defensive')}
                className={`p-2.5 rounded border text-left cursor-pointer transition flex flex-col justify-between ${
                  gkStyle === 'defensive'
                    ? 'bg-blue-950/50 border-blue-400 text-white shadow'
                    : 'bg-[#091018] border-[#1e2e42] text-[#94a3b8] hover:border-blue-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <span>🛡️ Defensive Line-Stopper</span>
                    </span>
                    {gkStyle === 'defensive' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                  <p className="text-[10px] leading-relaxed text-[#cbd5e1]">
                    Stays anchored directly on the goal line. Refuses to rush into no-man's land, maintaining tight goalmouth angles and never giving away easy open-net tap-ins.
                  </p>
                </div>
                <div className="text-[9px] font-mono mt-2 text-blue-400 font-semibold">
                  🛡️ +9% Shot Save Bonus from ideal line positioning and angle coverage.
                </div>
              </button>
            </div>

            {primaryGk && (
              <div className="pt-2 border-t border-[#1e2e42] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#94a3b8]">
                <span>Active Keeper: <strong className="text-white">{primaryGk.name}</strong></span>
                <span className="flex items-center gap-2">
                  <span className="text-[#38bdf8]">Spd: <strong className="text-white">{primaryGk.speed ?? primaryGk.pace}</strong></span>
                  <span className="text-[#ffd54f]">Awr: <strong className="text-white">{primaryGk.gkAwareness ?? 82}</strong></span>
                  <span className="text-[#4ade80]">Rch: <strong className="text-white">{primaryGk.gkReach ?? 84}</strong></span>
                  <span className="text-[#a78bfa]">Jmp: <strong className="text-white">{primaryGk.gkJumping ?? 80}</strong></span>
                </span>
              </div>
            )}
          </div>

          {/* AI Tactical Reaction System */}
          <div className="p-3 bg-[#0d1722] border border-[#223347] rounded space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#38bdf8] text-sm">⚡</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Opposition AI Formation Adaptation Protocol
                </span>
              </div>
              <span className="text-[10px] bg-[#38bdf8]/20 text-[#38bdf8] font-bold px-2 py-0.5 rounded font-mono">
                75% DEFAULT CHANCE
              </span>
            </div>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              If an opposition manager detects you are fielding an identical formation, they will trigger a tactical adaptation roll to switch to an asymmetrical counter-formation to exploit spatial mismatches.
            </p>
            <div className="pt-1 border-t border-[#1e2e42] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              {Object.entries(COUNTER_FORMATIONS).map(([form, counters]) => (
                <div key={form} className="p-1.5 bg-[#091018] rounded border border-[#1c2c3e]">
                  <div className="text-[#ffd54f] font-bold">{form} is countered by:</div>
                  <div className="text-[#38bdf8] font-semibold mt-0.5">{counters.join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs font-mono">
        <div className="max-w-4xl w-full">{content}</div>
      </div>
    );
  }

  return content;
};
