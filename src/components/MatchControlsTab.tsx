import React, { useState, useEffect } from 'react';
import { Gamepad, Keyboard, Zap, Shield, Target, Play, Flame, Info, CheckCircle2 } from 'lucide-react';
import { RealtimeMatch } from '../services/realtimeMatchEngine';
import { VirtualGamepad } from './VirtualGamepad';
import { sound } from '../services/audio';

interface MatchControlsTabProps {
  matchMode: 'realtime' | 'turnBased';
  realtimeMatch: RealtimeMatch | null;
  hasPossession: boolean;
  showVirtualPad: boolean;
  onToggleVirtualPad: (show: boolean) => void;
  onReturnToPitch: () => void;
}

export const MatchControlsTab: React.FC<MatchControlsTabProps> = ({
  matchMode,
  realtimeMatch,
  hasPossession,
  showVirtualPad,
  onToggleVirtualPad,
  onReturnToPitch,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'gamepad' | 'keyboard' | 'touch' | 'mechanics'>('all');
  const [simulatedPossession, setSimulatedPossession] = useState<boolean>(hasPossession);
  const [detectedGamepad, setDetectedGamepad] = useState<string | null>(null);

  useEffect(() => {
    setSimulatedPossession(hasPossession);
  }, [hasPossession]);

  useEffect(() => {
    const checkPads = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const pads = navigator.getGamepads();
        for (const p of pads) {
          if (p && p.connected) {
            setDetectedGamepad(p.id.length > 25 ? `${p.id.slice(0, 25)}...` : p.id);
            return;
          }
        }
      }
      setDetectedGamepad(null);
    };
    checkPads();
    const interval = setInterval(checkPads, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 font-mono select-none">
      {/* 1. TOP STATUS & NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1622] border border-[#223347] p-3 rounded-lg shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-[#0284c7]/20 border border-[#38bdf8]/40 text-[#38bdf8]">
            <Gamepad className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-sm flex items-center gap-2">
              <span>MATCH CONTROLS & MANUAL</span>
              <span className="text-[10px] bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-2 py-0.5 rounded font-bold uppercase">
                {matchMode === 'realtime' ? '360° Real-Time Action' : 'Turn-Based Sim'}
              </span>
            </div>
            <div className="text-[11px] text-[#94a3b8]">
              Full gamepad layout, keyboard bindings, slide tackle physics & power gauge mechanics.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {detectedGamepad ? (
            <div className="flex items-center gap-1.5 text-[11px] bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 px-2.5 py-1 rounded">
              <Gamepad className="w-3.5 h-3.5" />
              <span>Gamepad: <strong>{detectedGamepad}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] bg-[#152233] border border-[#223347] text-[#94a3b8] px-2.5 py-1 rounded">
              <Keyboard className="w-3.5 h-3.5 text-[#ffd54f]" />
              <span>Keyboard & Gamepad Ready</span>
            </div>
          )}

          <button
            onClick={() => {
              sound.click();
              onReturnToPitch();
            }}
            className="px-3.5 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-xs font-bold cursor-pointer transition shadow flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Return to Pitch</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-TABS & DYNAMIC POSSESSION SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#223347] pb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1 text-xs rounded font-bold cursor-pointer transition ${
              activeSubTab === 'all'
                ? 'bg-[#38bdf8] text-black shadow'
                : 'bg-[#101b2a] text-[#94a3b8] hover:text-white border border-[#223347]'
            }`}
          >
            📋 All Controls
          </button>
          <button
            onClick={() => setActiveSubTab('gamepad')}
            className={`px-3 py-1 text-xs rounded font-bold cursor-pointer transition flex items-center gap-1 ${
              activeSubTab === 'gamepad'
                ? 'bg-[#38bdf8] text-black shadow'
                : 'bg-[#101b2a] text-[#94a3b8] hover:text-white border border-[#223347]'
            }`}
          >
            <Gamepad className="w-3.5 h-3.5" /> Gamepad
          </button>
          <button
            onClick={() => setActiveSubTab('keyboard')}
            className={`px-3 py-1 text-xs rounded font-bold cursor-pointer transition flex items-center gap-1 ${
              activeSubTab === 'keyboard'
                ? 'bg-[#38bdf8] text-black shadow'
                : 'bg-[#101b2a] text-[#94a3b8] hover:text-white border border-[#223347]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" /> Keyboard
          </button>
          <button
            onClick={() => setActiveSubTab('touch')}
            className={`px-3 py-1 text-xs rounded font-bold cursor-pointer transition flex items-center gap-1 ${
              activeSubTab === 'touch'
                ? 'bg-[#38bdf8] text-black shadow'
                : 'bg-[#101b2a] text-[#94a3b8] hover:text-white border border-[#223347]'
            }`}
          >
            📱 Touch Gamepad
          </button>
          <button
            onClick={() => setActiveSubTab('mechanics')}
            className={`px-3 py-1 text-xs rounded font-bold cursor-pointer transition flex items-center gap-1 ${
              activeSubTab === 'mechanics'
                ? 'bg-[#38bdf8] text-black shadow'
                : 'bg-[#101b2a] text-[#94a3b8] hover:text-white border border-[#223347]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Slide & Power Gauge
          </button>
        </div>

        {/* Live Attack vs Defense Context Preview Toggle */}
        <div className="flex items-center gap-1 bg-[#09111c] border border-[#223347] p-1 rounded-md text-[11px]">
          <span className="text-[#94a3b8] px-1 font-bold">Context:</span>
          <button
            onClick={() => setSimulatedPossession(true)}
            className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
              simulatedPossession
                ? 'bg-emerald-500 text-black shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            ⚽ Attacking
          </button>
          <button
            onClick={() => setSimulatedPossession(false)}
            className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
              !simulatedPossession
                ? 'bg-red-500 text-white shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            🛡️ Defending
          </button>
        </div>
      </div>

      {/* 3. DYNAMIC CONTROLS CHEAT SHEET (ATTACK / DEFENSE) */}
      {(activeSubTab === 'all' || activeSubTab === 'gamepad' || activeSubTab === 'keyboard') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* A. ATTACK CONTROLS */}
          <div
            className={`p-4 rounded-lg border transition ${
              simulatedPossession
                ? 'bg-[#0f2115] border-emerald-500/70 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-[#0c1520] border-[#223347] opacity-80'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#223347] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-sm text-emerald-400 uppercase tracking-wide">
                  ⚽ IN POSSESSION (ATTACK)
                </span>
              </div>
              <span className="text-[10px] text-emerald-300/80 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                Hold button for Dynamic Power Bar
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-[#1e293b] border border-blue-400 text-blue-400 font-bold flex items-center justify-center text-xs">
                    ✕
                  </span>
                  <div>
                    <div className="text-white font-bold">Ground Pass</div>
                    <div className="text-[11px] text-[#94a3b8]">Quick ground pass to feet of teammate</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-blue-400 border border-blue-500/40 text-[11px] font-bold">
                    Space / J
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-[#1e293b] border border-pink-400 text-pink-400 font-bold flex items-center justify-center text-xs">
                    ▢
                  </span>
                  <div>
                    <div className="text-white font-bold">Power Strike</div>
                    <div className="text-[11px] text-[#94a3b8]">Rocket shot aimed towards corners</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-pink-400 border border-pink-500/40 text-[11px] font-bold">
                    K
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 h-7 rounded bg-[#1e293b] border border-cyan-400 text-cyan-400 font-bold flex items-center justify-center text-[10px]">
                    R2+▢
                  </span>
                  <div>
                    <div className="text-cyan-300 font-bold flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" />
                      <span>🎯 Precision Curled Shot</span>
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">Laser-accurate curve into side netting</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-cyan-400 border border-cyan-500/40 text-[11px] font-bold">
                    Shift + K
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-[#1e293b] border border-red-400 text-red-400 font-bold flex items-center justify-center text-xs">
                    ◯
                  </span>
                  <div>
                    <div className="text-white font-bold">Lofted Cross / High Ball</div>
                    <div className="text-[11px] text-[#94a3b8]">Aerial ball with floating trajectory & landing reticle</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-red-400 border border-red-500/40 text-[11px] font-bold">
                    I / C
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-[#1e293b] border border-emerald-400 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    △
                  </span>
                  <div>
                    <div className="text-white font-bold">Through Ball</div>
                    <div className="text-[11px] text-[#94a3b8]">Leads sprinting forward runner into open grass</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-emerald-400 border border-emerald-500/40 text-[11px] font-bold">
                    O / U
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* B. DEFENSE CONTROLS */}
          <div
            className={`p-4 rounded-lg border transition ${
              !simulatedPossession
                ? 'bg-[#220e11] border-red-500/70 shadow-md ring-1 ring-red-500/30'
                : 'bg-[#0c1520] border-[#223347] opacity-80'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#223347] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                <span className="font-bold text-sm text-red-400 uppercase tracking-wide">
                  🛡️ OUT OF POSSESSION (DEFENSE)
                </span>
              </div>
              <span className="text-[10px] text-red-300/80 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                Switches to attack automatically on win
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-[#1e293b] border border-blue-400 text-blue-400 font-bold flex items-center justify-center text-xs">
                    ✕
                  </span>
                  <div>
                    <div className="text-white font-bold">Active Pressure & Tackle</div>
                    <div className="text-[11px] text-[#94a3b8]">Close down ball carrier and make standing tackle</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-blue-400 border border-blue-500/40 text-[11px] font-bold">
                    Space / J
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-[#1e293b] border border-pink-400 text-pink-400 font-bold flex items-center justify-center text-xs">
                    ▢
                  </span>
                  <div>
                    <div className="text-pink-300 font-bold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ Slide Tackle</span>
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">Dynamic turf slide with momentum & dispossess</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-pink-400 border border-pink-500/40 text-[11px] font-bold">
                    K
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-[#1e293b] border border-red-400 text-red-400 font-bold flex items-center justify-center text-xs">
                    ◯
                  </span>
                  <div>
                    <div className="text-white font-bold">Clearance</div>
                    <div className="text-[11px] text-[#94a3b8]">Blast ball out of danger zone upfield</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-red-400 border border-red-500/40 text-[11px] font-bold">
                    I / C
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-[#1e293b] border border-emerald-400 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    △
                  </span>
                  <div>
                    <div className="text-white font-bold">Goalkeeper Rush</div>
                    <div className="text-[11px] text-[#94a3b8]">Goalkeeper charges off line to smother loose ball</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-emerald-400 border border-emerald-500/40 text-[11px] font-bold">
                    O / U
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 h-7 rounded bg-[#1e293b] border border-amber-400 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                    L1 / L2
                  </span>
                  <div>
                    <div className="text-white font-bold">Switch Player & Jockey</div>
                    <div className="text-[11px] text-[#94a3b8]">L1 switches defender · L2 jockey stands off carrier</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#152233] text-amber-400 border border-amber-500/40 text-[11px] font-bold">
                    Q (Switch) / R (Jockey)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SPEED, MODIFIERS & CAMERA BAR */}
      <div className="bg-[#09111c] border border-[#223347] p-3.5 rounded-lg">
        <div className="text-xs font-bold text-white mb-2.5 flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#ffd54f]" />
          <span>MOVEMENT, SPRINTING & CAMERA CONTROLS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#101b2a] p-2.5 rounded border border-[#1e2d40]">
            <div className="text-[#38bdf8] font-bold mb-1">⚡ BURST DASH SPRINT</div>
            <div className="text-[#94a3b8] text-[11px] mb-1.5">
              Press <strong>R2</strong> or <strong>Shift</strong> while moving for an explosive dash burst. Pushes ball ahead when dribbling.
            </div>
            <div className="font-bold text-white text-[11px]">
              Gamepad: [R2 / RT] · Keyboard: [Shift]
            </div>
          </div>

          <div className="bg-[#101b2a] p-2.5 rounded border border-[#1e2d40]">
            <div className="text-[#00e676] font-bold mb-1">🛡️ 2ND MAN TEAMMATE PRESS</div>
            <div className="text-[#94a3b8] text-[11px] mb-1.5">
              Hold <strong>R1</strong> or <strong>E</strong> on defense to command the nearest teammate to swarm the opposing ball carrier.
            </div>
            <div className="font-bold text-white text-[11px]">
              Gamepad: [R1 / RB] · Keyboard: [E]
            </div>
          </div>

          <div className="bg-[#101b2a] p-2.5 rounded border border-[#1e2d40]">
            <div className="text-[#ffd54f] font-bold mb-1">🎥 CAMERA CYCLING & 360° STEERING</div>
            <div className="text-[#94a3b8] text-[11px] mb-1.5">
              Press <strong>C</strong> to switch between eFootball 3D Broadcast, TV Sideline, and Classic 2D Overhead views anytime.
            </div>
            <div className="font-bold text-white text-[11px]">
              Steer: [Analog Stick / Arrows / WASD] · Cam: [C]
            </div>
          </div>
        </div>
      </div>

      {/* 5. SLIDE TACKLE REFINEMENT & POWER GAUGE DEEP DIVE */}
      {(activeSubTab === 'all' || activeSubTab === 'mechanics') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SLIDE TACKLE GUIDE */}
          <div className="bg-[#101a24] border border-[#23405c] p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 border-b border-[#223347] pb-2 text-white font-bold text-sm">
              <Zap className="w-4 h-4 text-[#38bdf8]" />
              <span>⚡ REFINED SLIDE TACKLE MECHANICS</span>
            </div>
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              When you press <strong className="text-[#f06292]">▢ / K</strong> without possession, your defender launches into a dynamic slide tackle with physical momentum, sliding across the turf with realistic grass spray and twin skid tracks.
            </p>
            <div className="space-y-1.5 text-[11px] text-[#94a3b8]">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Kinetic Deceleration:</strong> The slide starts with high speed to reach the ball and smoothly slows as grass friction grips the boots.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Front & Side Challenges:</strong> Tackling cleanly from the side or front wins the ball and knocks the opponent off balance.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Avoid Tackles from Behind:</strong> Sliding directly into a player's back has a higher referee whistle and foul rate!</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Tackling Attribute:</strong> Upgrading your players' Tackling in the Academy significantly widens reach and reduces fouls.</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC POWER GAUGE GUIDE */}
          <div className="bg-[#101a24] border border-[#23405c] p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 border-b border-[#223347] pb-2 text-white font-bold text-sm">
              <Target className="w-4 h-4 text-[#ffd54f]" />
              <span>⚡ DYNAMIC ON-PLAYER POWER GAUGE</span>
            </div>
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              A visible power bar charges directly under your active player when holding pass or shoot buttons:
            </p>
            <div className="space-y-1.5 text-[11px] text-[#94a3b8]">
              <div className="flex items-start gap-1.5">
                <span className="text-[#38bdf8] font-bold">✕ Pass Bar:</span>
                <span>Tap for a short pass to nearby feet. Hold to unleash a driving long pass along the deck.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#f06292] font-bold">▢ Strike Bar:</span>
                <span>Tap for a low snap finish. Charge into the yellow/red zone for unstoppable long-range rockets.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#00e5ff] font-bold">🎯 R2+▢ Precision:</span>
                <span>Hold to charge laser accuracy with deadly curve into the corners.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#ef5350] font-bold">◯ Lofted Cross:</span>
                <span>Higher power sends hanging aerial crosses deep towards the back post.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. VIRTUAL TOUCH GAMEPAD TEST & TOGGLE */}
      {(activeSubTab === 'all' || activeSubTab === 'touch') && (
        <div className="bg-[#09111c] border border-[#223347] p-4 rounded-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#223347] pb-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Gamepad className="w-4 h-4 text-[#00e676]" />
              <span>📱 ON-SCREEN TOUCHPAD SETTINGS & PRACTICE PAD</span>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer bg-[#101b2a] border border-[#223347] px-3 py-1.5 rounded hover:border-[#38bdf8] transition">
              <input
                type="checkbox"
                checked={showVirtualPad}
                onChange={(e) => {
                  onToggleVirtualPad(e.target.checked);
                  sound.click();
                }}
                className="accent-[#38bdf8] cursor-pointer"
              />
              <span>Show Touch Pad on Live Match Screen</span>
            </label>
          </div>

          <p className="text-xs text-[#94a3b8]">
            Test the 360° virtual analog stick and possession-aware action buttons below. When toggled on, this touch pad will also be visible directly underneath the pitch in the Match view for tablet and mobile play.
          </p>

          <div className="bg-[#060c14] border border-[#1b2b3d] rounded p-2">
            <VirtualGamepad
              match={realtimeMatch || undefined}
              hasPossession={simulatedPossession}
            />
          </div>
        </div>
      )}

      {/* 7. BOTTOM ACTION BUTTON */}
      <div className="flex justify-end pt-1">
        <button
          onClick={() => {
            sound.whistle();
            onReturnToPitch();
          }}
          className="px-5 py-2.5 bg-[#1b5e20] hover:bg-[#2e7d32] border border-[#ffd54f] text-[#ffd54f] hover:text-white rounded-lg text-xs font-bold cursor-pointer transition shadow flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>⚽ RETURN TO MATCH PITCH</span>
        </button>
      </div>
    </div>
  );
};
