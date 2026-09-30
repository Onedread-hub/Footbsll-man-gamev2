import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  RealtimeMatch,
  PITCH_W,
  PITCH_H,
} from '../services/realtimeMatchEngine';
import { input } from '../services/inputEngine';
import { sound } from '../services/audio';
import {
  Gamepad,
  Keyboard,
  Sliders,
  Play,
  ShieldAlert,
  Gauge,
  Flag,
  Camera,
} from 'lucide-react';

// --- Modular imports ---
import { useGameLoop } from '../hooks/useGameLoop';
import { CameraMode } from '../types/camera';
import {
  drawPitchTurf,
  drawPitchMarkings,
  drawCornerFlags,
  drawGoal3D,
  drawLine3D,
  drawPoly3D,
} from '../renderers/pitchRenderer';
import { drawStadium } from '../renderers/stadiumRenderer';
import { drawPlayer } from '../renderers/playerRenderer';
import {
  drawBall,
  drawAerialLandingReticle,
  drawOffsideVisualizer,
} from '../renderers/ballRenderer';
import { drawAllHUD } from '../renderers/hudRenderer';

// Re-export CameraMode so existing consumers don't break
export type { CameraMode } from '../types/camera';

interface PlayablePitchCanvasProps {
  match: RealtimeMatch;
  onFinishMatch: () => void;
  onOpenTactics: () => void;
  onOpenStats: () => void;
  onOpenControls?: () => void;
}

export const PlayablePitchCanvas: React.FC<PlayablePitchCanvasProps> = ({
  match,
  onFinishMatch,
  onOpenTactics,
  onOpenStats,
  onOpenControls,
}) => {
  // ---------------------------------------------------------------
  // 1. CAMERA STATE
  // ---------------------------------------------------------------
  const initialCamMode: CameraMode = (() => {
    try {
      return (
        (localStorage.getItem('ascii_football_camera_mode') as CameraMode) ||
        'spectator3d'
      );
    } catch {
      return 'spectator3d';
    }
  })();

  const [cameraMode, setCameraMode] = useState<CameraMode>(initialCamMode);
  const cameraModeRef = useRef<CameraMode>(initialCamMode);
  cameraModeRef.current = cameraMode;

  const [cameraSwitchNotice, setCameraSwitchNotice] = useState<string | null>(null);
  const cameraSwitchNoticeRef = useRef<string | null>(null);
  cameraSwitchNoticeRef.current = cameraSwitchNotice;

  const cameraPosRef = useRef<{ x: number; y: number }>({
    x: PITCH_W / 2,
    y: PITCH_H / 2,
  });

  // ---------------------------------------------------------------
  // 2. GAME SPEED STATE
  // ---------------------------------------------------------------
  const [gameSpeed, setGameSpeed] = useState<number>(match.gameSpeed || 0.82);

  const changeGameSpeed = (speed: number) => {
    const clamped = Math.max(0.4, Math.min(1.5, Number(speed.toFixed(2))));
    match.gameSpeed = clamped;
    setGameSpeed(clamped);
  };

  // ---------------------------------------------------------------
  // 3. CAMERA SWITCH HELPERS
  // ---------------------------------------------------------------
  const setAndSyncCameraMode = useCallback((next: CameraMode) => {
    cameraModeRef.current = next;
    setCameraMode(next);
    try {
      localStorage.setItem('ascii_football_camera_mode', next);
    } catch {}

    const label =
      next === 'spectator3d'
        ? '🏟️ eFOOTBALL 3D BROADCAST'
        : next === 'broadcast'
        ? '📺 TV BROADCAST SIDELINE'
        : '🦅 2D CLASSIC OVERHEAD';

    setCameraSwitchNotice(label);
    setTimeout(() => {
      setCameraSwitchNotice((curr) => (curr === label ? null : curr));
    }, 1800);
    sound.click();
  }, []);

  const cycleCamera = useCallback(() => {
    const cur = cameraModeRef.current;
    const next: CameraMode =
      cur === 'spectator3d'
        ? 'broadcast'
        : cur === 'broadcast'
        ? 'classic2d'
        : 'spectator3d';
    setAndSyncCameraMode(next);
  }, [setAndSyncCameraMode]);

  // C key cycles camera
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === 'c' || e.key === 'C') {
        cycleCamera();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cycleCamera]);

  // ---------------------------------------------------------------
  // 4. THROTTLED HUD STATE (React-side, updated ~3x per second)
  // ---------------------------------------------------------------
  const [hudState, setHudState] = useState<{
    minute: number;
    homeScore: number;
    awayScore: number;
    hasGamepad: boolean;
    gamepadName: string;
    isHalfTime: boolean;
    isFullTime: boolean;
    isPressing: boolean;
    hasPossession: boolean;
    matchState: string;
    possessionHomePct: number;
    aiAdaptedFormation: string | null;
  }>({
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    hasGamepad: false,
    gamepadName: 'Keyboard / Touch',
    isHalfTime: false,
    isFullTime: false,
    isPressing: false,
    hasPossession: true,
    matchState: 'play',
    possessionHomePct: 50,
    aiAdaptedFormation: null,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const inp = input.poll();
      const teamHasBall =
        match.ball.carrier && match.ball.carrier.isHome === match.userIsHome;

      // Live possession from the match engine
      const poss = match.getPossessionPercentages();

      // Surface AI counter-tactics from the log (opponent adapted formation)
      let aiAdaptedFormation: string | null = null;
      for (let i = 0; i < match.matchLog.length; i++) {
        const line = match.matchLog[i];
        if (line.includes('[AI TACTICS')) {
          const m = line.match(/to\s+([0-9\-]+)/);
          if (m) aiAdaptedFormation = m[1];
          break;
        }
      }

      setHudState({
        minute: Math.min(90, Math.floor(match.matchSeconds / 60)),
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        hasGamepad: inp.gamepadConnected,
        gamepadName:
          inp.gamepadConnected && inp.gamepadId
            ? inp.gamepadId.substring(0, 20)
            : 'Keyboard / Touch',
        isHalfTime: match.isHalfTime,
        isFullTime: match.isFullTime,
        isPressing: !!match.commandPressPlayerId,
        hasPossession: !!teamHasBall,
        matchState: match.state,
        possessionHomePct: poss.homePct,
        aiAdaptedFormation,
      });
    }, 300);

    return () => clearInterval(timer);
  }, [match]);

  // ---------------------------------------------------------------
  // 5. PROJECTION FACTORY
  // ---------------------------------------------------------------
  const buildProjector = useCallback(
    (canvasW: number, activeMode: CameraMode) => {
      const is3D = activeMode === 'spectator3d';
      const isBroadcast = activeMode === 'broadcast';

      // Smoothly track the ball horizontally
      const targetCamX = match.ball.x + match.ball.vx * 12;
      cameraPosRef.current.x +=
        (targetCamX - cameraPosRef.current.x) * 0.08;
      const camX = Math.max(
        380,
        Math.min(PITCH_W - 380, cameraPosRef.current.x)
      );

      // Smoothly track the ball vertically
      const targetCamY = match.ball.y;
      cameraPosRef.current.y +=
        (targetCamY - cameraPosRef.current.y) * 0.05;
      const camY = Math.max(
        260,
        Math.min(PITCH_H - 260, cameraPosRef.current.y)
      );

      const project = (wx: number, wy: number, wz = 0) => {
        if (is3D) {
          const t = Math.max(-0.25, Math.min(1.25, wy / PITCH_H));

          const pitchTopY = 275;
          const pitchBottomY = 1035;
          const groundY =
            pitchTopY +
            Math.pow(Math.max(0, t), 0.9) * (pitchBottomY - pitchTopY) +
            (t < 0 ? t * 180 : 0);

          const scale = 0.88 + t * 0.44;
          const screenX = canvasW / 2 + (wx - camX) * scale;
          const screenY = groundY - wz * scale * 1.35;

          return { x: screenX, y: screenY, scale };
        } else if (isBroadcast) {
          const zoom = 1.38;
          const screenX = canvasW / 2 + (wx - camX) * zoom;
          const screenY =
            PITCH_H / 2 + (wy - camY) * zoom * 0.92 - wz * zoom;
          return { x: screenX, y: screenY, scale: zoom };
        } else {
          return {
            x: (wx / PITCH_W) * canvasW,
            y: (wy / PITCH_H) * PITCH_H - wz,
            scale: 1.0,
          };
        }
      };

      return project;
    },
    [match]
  );

  // ---------------------------------------------------------------
  // 6. RENDER FRAME CALLBACK
  // ---------------------------------------------------------------
  const renderFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      m: RealtimeMatch
    ) => {
      const W = canvas.width;
      const H = canvas.height;
      const activeMode = cameraModeRef.current;

      ctx.clearRect(0, 0, W, H);
      ctx.save();

      const project = buildProjector(W, activeMode);

      const drawLineLocal = (
        x1: number, y1: number, x2: number, y2: number, z1 = 0, z2 = 0
      ) => drawLine3D(ctx, project, x1, y1, x2, y2, z1, z2);

      const drawPolyLocal = (
        pts: { x: number; y: number; z?: number }[],
        fill = false,
        stroke = true
      ) => drawPoly3D(ctx, project, pts, fill, stroke);

      // LAYER 1: Stadium (3D mode only)
      if (activeMode === 'spectator3d') {
        drawStadium(ctx, W, m);
      }

      // LAYER 2: Pitch turf + markings + goals + corners
      drawPitchTurf(ctx, project, activeMode === 'spectator3d');
      drawPitchMarkings(ctx, project, drawLineLocal, drawPolyLocal);
      drawCornerFlags(ctx, project);
      drawGoal3D(ctx, project, drawLineLocal, true);
      drawGoal3D(ctx, project, drawLineLocal, false);

      // LAYER 3: Offside visualizer
      drawOffsideVisualizer(ctx, m, project, drawLineLocal);

      // LAYER 4: Aerial landing reticle
      drawAerialLandingReticle(ctx, m, project);

      // LAYER 5: Players (depth-sorted)
      const sortedPlayers = [...m.players].sort((a, b) => a.y - b.y);
      for (const p of sortedPlayers) {
        drawPlayer({ ctx, match: m }, p, project);
      }

      // LAYER 6: Ball
      drawBall(ctx, m, project);

      ctx.restore();

      // LAYER 7: Screen-space HUD
      drawAllHUD(
        ctx,
        W,
        H,
        m,
        activeMode,
        cameraSwitchNoticeRef.current
      );
    },
    [buildProjector]
  );

  // ---------------------------------------------------------------
  // 7. WIRE UP THE 60FPS GAME LOOP
  // ---------------------------------------------------------------
  const canvasRef = useGameLoop({
    match,
    onFrame: renderFrame,
  });

  // ---------------------------------------------------------------
  // 8. JSX
  // ---------------------------------------------------------------
  return (
    <div className="flex flex-col items-center space-y-2 select-none w-full">
      {/* ============================================================= */}
      {/* TOP MATCH BAR                                                  */}
      {/* ============================================================= */}
      <div className="w-full bg-[#001e44] border-2 border-[#ffd700] p-2 rounded shadow-lg text-xs font-mono">
        {/* Row 1: Teams / Score / Clock / Buttons */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded-sm border-2 border-black inline-block shadow"
                style={{ backgroundColor: match.home.color }}
              />
              <span className="font-bold text-[#ffd54f] font-['Press_Start_2P',monospace] text-[11px] tracking-wide">
                {match.home.shortName}
              </span>
              <span className="text-[9px] text-[#00e5ff] font-semibold">
                ({match.home.formation})
              </span>
            </div>

            <div className="bg-[#000f24] px-3.5 py-1 rounded border-2 border-[#00e5ff] text-base font-extrabold text-[#ffd700] font-['Press_Start_2P',monospace] tracking-widest shadow-inner">
              {hudState.homeScore} - {hudState.awayScore}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#ffd54f] font-['Press_Start_2P',monospace] text-[11px] tracking-wide">
                {match.away.shortName}
              </span>
              <span className="text-[9px] text-[#00e5ff] font-semibold">
                ({match.away.formation})
              </span>
              <span
                className="w-3.5 h-3.5 rounded-sm border-2 border-black inline-block shadow"
                style={{ backgroundColor: match.away.color }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-[#00e676] font-bold text-xs bg-black/80 px-2.5 py-1 rounded border border-[#00e5ff] font-['Press_Start_2P',monospace]">
              ⏱️ {hudState.minute}'
            </div>

            {hudState.isPressing && (
              <div className="flex items-center gap-1 text-[10px] bg-[#00e676]/20 border-2 border-[#00e676] text-[#00e676] px-2 py-0.5 rounded font-bold animate-pulse font-['Press_Start_2P',monospace]">
                <ShieldAlert className="w-3 h-3" />
                <span>SWOS PRESS</span>
              </div>
            )}

            {hudState.aiAdaptedFormation && (
              <div
                className="flex items-center gap-1 text-[10px] bg-[#ff3b30]/20 border-2 border-[#ff3b30] text-[#ff8a80] px-2 py-0.5 rounded font-bold font-['Press_Start_2P',monospace]"
                title="Opposition AI adapted its formation to counter yours!"
              >
                <span>⚔️ AI: {hudState.aiAdaptedFormation}</span>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-[10px] bg-[#00142e] px-2 py-0.5 rounded border border-[#00e5ff]/50 font-['Press_Start_2P',monospace]">
              {hudState.hasGamepad ? (
                <>
                  <Gamepad className="w-3.5 h-3.5 text-[#00e676]" />
                  <span className="text-[#00e676] font-semibold">
                    {hudState.gamepadName}
                  </span>
                </>
              ) : (
                <>
                  <Keyboard className="w-3.5 h-3.5 text-[#ffd54f]" />
                  <span className="text-[#d4e8d4]">KEYBOARD</span>
                </>
              )}
            </div>

            <div className="flex gap-1.5">
              {onOpenControls && (
                <button
                  onClick={onOpenControls}
                  className="px-2.5 py-1 bg-[#1b5e20] hover:bg-[#2e7d32] border border-[#00e676] text-[#ffd54f] rounded text-[10px] font-bold font-['Press_Start_2P',monospace] cursor-pointer transition flex items-center gap-1 shadow"
                  title="Open Controls & Gamepad Manual Tab"
                >
                  <Gamepad className="w-3 h-3" />
                  <span className="hidden sm:inline">CONTROLS</span>
                </button>
              )}
              <button
                onClick={onOpenTactics}
                className="px-2.5 py-1 bg-[#004080] hover:bg-[#0059b3] border border-[#00e5ff] text-[#ffd54f] rounded text-[10px] font-bold font-['Press_Start_2P',monospace] cursor-pointer transition flex items-center gap-1 shadow"
              >
                <Sliders className="w-3 h-3" />
                <span>TACTICS</span>
              </button>
              <button
                onClick={onOpenStats}
                className="px-2.5 py-1 bg-[#002b54] hover:bg-[#004080] border border-[#ffd54f] text-[#d4e8d4] rounded text-[10px] font-bold font-['Press_Start_2P',monospace] cursor-pointer transition shadow"
              >
                STATS
              </button>
              <button
                onClick={onFinishMatch}
                className="px-2.5 py-1 bg-[#b71c1c] hover:bg-[#d32f2f] border border-[#ff8a80] text-white rounded text-[10px] font-bold font-['Press_Start_2P',monospace] cursor-pointer transition shadow"
              >
                FT
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Possession bar */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[9px] text-[#00e5ff] font-bold font-['Press_Start_2P',monospace] tracking-wider shrink-0">
            POSS
          </span>
          <div className="flex-1 bg-[#000f24] h-3 rounded-full overflow-hidden border border-[#00e5ff]/40 flex">
            <div
              className="h-full transition-all duration-300 flex items-center justify-start pl-2"
              style={{
                width: `${hudState.possessionHomePct}%`,
                backgroundColor: match.home.color,
              }}
            >
              {hudState.possessionHomePct >= 12 && (
                <span className="text-[9px] font-bold text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] font-['Press_Start_2P',monospace]">
                  {hudState.possessionHomePct}%
                </span>
              )}
            </div>
            <div
              className="h-full transition-all duration-300 flex items-center justify-end pr-2"
              style={{
                width: `${100 - hudState.possessionHomePct}%`,
                backgroundColor: match.away.color,
              }}
            >
              {100 - hudState.possessionHomePct >= 12 && (
                <span className="text-[9px] font-bold text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] font-['Press_Start_2P',monospace]">
                  {100 - hudState.possessionHomePct}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MATCH STATUS & PACE SLIDER BAR                                 */}
      {/* ============================================================= */}
      <div className="w-full bg-[#0a140a] border border-[#1b5e20] px-3 py-1.5 rounded flex flex-wrap justify-between items-center text-xs font-mono gap-2">
        <div className="flex items-center gap-2">
          {hudState.matchState === 'freekick' && (
            <span className="bg-[#ff5252]/20 border border-[#ff5252] text-[#ff5252] px-2.5 py-0.5 rounded font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
              <Flag className="w-3.5 h-3.5" />
              <span>🚩 OFFSIDE FREE KICK</span>
            </span>
          )}
          {hudState.matchState === 'corner' && (
            <span className="bg-[#ffd54f]/20 border border-[#ffd54f] text-[#ffd54f] px-2.5 py-0.5 rounded font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
              <Flag className="w-3.5 h-3.5" />
              <span>🚩 CORNER KICK IN PROGRESS</span>
            </span>
          )}
          {hudState.matchState === 'throwin' && (
            <span className="bg-[#42a5f5]/20 border border-[#42a5f5] text-[#42a5f5] px-2.5 py-0.5 rounded font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
              <span>🤾 THROW-IN AWARDED</span>
            </span>
          )}
          {hudState.matchState === 'kickoff' && (
            <span className="bg-[#ffd54f]/20 border border-[#ffd54f] text-[#ffd54f] px-2.5 py-0.5 rounded font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
              <span>⚽ WAITING FOR KICK-OFF</span>
            </span>
          )}
          {hudState.matchState === 'goalkick' && (
            <span className="bg-[#00e676]/20 border border-[#00e676] text-[#00e676] px-2.5 py-0.5 rounded font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
              <span>🥅 GOAL KICK</span>
            </span>
          )}
          {hudState.matchState === 'play' && (
            <span className="text-[#81c784] font-medium text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00e676] inline-block animate-ping" />
              <span>BALL IN PLAY</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-[#29b6f6]/40 text-[11px]">
            <span
              className="text-[#29b6f6] px-1 font-bold flex items-center gap-1"
              title="Camera Perspective (Press 'C' to cycle)"
            >
              <Camera className="w-3.5 h-3.5 text-[#29b6f6]" />
              <span className="hidden sm:inline">CAM (C):</span>
            </span>
            <button
              onClick={() => setAndSyncCameraMode('spectator3d')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                cameraMode === 'spectator3d'
                  ? 'bg-[#29b6f6] text-black shadow-sm'
                  : 'text-[#81c784] hover:text-white hover:bg-white/10'
              }`}
            >
              🏟️ eFootball 3D
            </button>
            <button
              onClick={() => setAndSyncCameraMode('broadcast')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                cameraMode === 'broadcast'
                  ? 'bg-[#29b6f6] text-black shadow-sm'
                  : 'text-[#81c784] hover:text-white hover:bg-white/10'
              }`}
            >
              📺 Broadcast
            </button>
            <button
              onClick={() => setAndSyncCameraMode('classic2d')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                cameraMode === 'classic2d'
                  ? 'bg-[#29b6f6] text-black shadow-sm'
                  : 'text-[#81c784] hover:text-white hover:bg-white/10'
              }`}
            >
              🦅 2D Full
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[#ffd54f] font-semibold text-[11px]">
            <Gauge className="w-3.5 h-3.5 text-[#ffd54f]" />
            <span className="hidden sm:inline">Game Pace:</span>
            <span className="bg-black/60 px-1.5 py-0.5 rounded border border-[#2e7d32] text-white font-mono min-w-[44px] text-center font-bold">
              {gameSpeed.toFixed(2)}x
            </span>
          </div>

          <input
            type="range"
            min="0.5"
            max="1.3"
            step="0.05"
            value={gameSpeed}
            onChange={(e) => changeGameSpeed(parseFloat(e.target.value))}
            className="w-24 sm:w-32 accent-[#ffd54f] cursor-pointer"
            title="Adjust match engine pace on the fly"
          />

          <div className="flex gap-1 text-[10px]">
            <button
              onClick={() => changeGameSpeed(0.65)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                gameSpeed === 0.65
                  ? 'bg-[#ffd54f] text-black font-bold'
                  : 'bg-[#12261a] hover:bg-[#1b5e20] text-[#a5d6a7]'
              }`}
            >
              Slow
            </button>
            <button
              onClick={() => changeGameSpeed(0.82)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                gameSpeed === 0.82
                  ? 'bg-[#ffd54f] text-black font-bold'
                  : 'bg-[#12261a] hover:bg-[#1b5e20] text-[#a5d6a7]'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => changeGameSpeed(1.0)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                gameSpeed === 1.0
                  ? 'bg-[#ffd54f] text-black font-bold'
                  : 'bg-[#12261a] hover:bg-[#1b5e20] text-[#a5d6a7]'
              }`}
            >
              Brisk
            </button>
            <button
              onClick={() => changeGameSpeed(1.2)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                gameSpeed === 1.2
                  ? 'bg-[#ffd54f] text-black font-bold'
                  : 'bg-[#12261a] hover:bg-[#1b5e20] text-[#a5d6a7]'
              }`}
            >
              Fast
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* RETRO ARCADE CRT CHASSIS + CANVAS                              */}
      {/* ============================================================= */}
      <div className="crt-chassis w-full max-w-6xl p-2 sm:p-3 select-none">
        <div className="flex justify-between items-center px-2 py-1 text-[10px] font-mono text-[#81c784] border-b border-[#1b3d1b] mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] inline-block shadow-[0_0_8px_#00e676] animate-pulse" />
            <span className="text-[#a5d6a7] font-bold">
              ARCADE CRT 60Hz // LOW LATENCY
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-[#ffd54f] font-arcade text-[8px]">
              SWOS 96 ENGINE
            </span>
            <span className="text-[#6b8a6b]">1800x1080 RESOLUTION</span>
          </div>
        </div>

        <div className="crt-screen relative w-full aspect-[5/3] bg-[#061006] border border-[#1b441b] rounded overflow-hidden">
          <canvas
            ref={canvasRef}
            width={PITCH_W}
            height={PITCH_H}
            className="w-full h-full block"
            style={{
              filter: 'contrast(1.08) brightness(1.03) saturate(1.18)',
            }}
          />

          {/* Kick-Off Waiting Prompt */}
          {hudState.matchState === 'kickoff' &&
            !hudState.isHalfTime &&
            !hudState.isFullTime && (
              <div
                onClick={() => {
                  if (match.state === 'kickoff') {
                    const inp = input.poll();
                    match.handleKickoff({
                      ...inp,
                      passPressed: true,
                      pass: true,
                    });
                  }
                }}
                className="absolute bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 bg-[#001e44]/95 hover:bg-[#002b5e] border-2 border-[#ffd700] text-[#ffd54f] px-5 py-2.5 rounded-lg font-['Press_Start_2P',monospace] text-[10px] sm:text-xs tracking-wider shadow-2xl cursor-pointer hover:scale-105 transition flex items-center gap-2 animate-pulse z-10"
                title="Click or press any movement / action key on keyboard or gamepad"
              >
                <Play className="w-3.5 h-3.5 text-[#00e676]" />
                <span>⚽ PRESS ANY KEY / TAP TO KICK OFF</span>
              </div>
            )}

          {/* Half-Time Overlay */}
          {hudState.isHalfTime && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center font-mono text-center p-4 z-20">
              <h2 className="text-2xl font-bold text-[#ffd54f] mb-2 tracking-widest">
                HALF TIME WHISTLE
              </h2>
              <div className="text-lg text-white mb-4">
                {match.home.name} {hudState.homeScore} - {hudState.awayScore}{' '}
                {match.away.name}
              </div>
              <p className="text-xs text-[#81c784] mb-4 max-w-md">
                Players are recharging stamina in the locker room. Make
                tactical adjustments or kick off the 2nd half.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onOpenTactics}
                  className="px-4 py-2 bg-[#1b5e20] hover:bg-[#2e7d32] text-[#ffd54f] rounded font-bold text-xs cursor-pointer"
                >
                  Change Tactics
                </button>
                <button
                  onClick={() => {
                    match.isHalfTime = false;
                    match.setupKickoff(!match.userIsHome);
                  }}
                  className="px-4 py-2 bg-[#ffd54f] hover:bg-[#ffe082] text-black rounded font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4" /> Start 2nd Half
                </button>
              </div>
            </div>
          )}

          {/* Full-Time Overlay */}
          {hudState.isFullTime && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center font-mono text-center p-4 z-20">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#ffd54f] mb-2 tracking-widest">
                FULL TIME WHISTLE!
              </h2>
              <div className="text-xl sm:text-2xl font-bold text-white mb-4">
                {match.home.name} {hudState.homeScore} - {hudState.awayScore}{' '}
                {match.away.name}
              </div>
              <div className="text-xs text-[#81c784] mb-6">
                Match concluded. Standings and player goals will be updated.
              </div>
              <button
                onClick={onFinishMatch}
                className="px-6 py-2.5 bg-[#1b5e20] hover:bg-[#2e7d32] text-[#ffd54f] border border-[#ffd54f] rounded font-bold text-sm cursor-pointer shadow-lg"
              >
                View Match Analysis & League Results →
              </button>
            </div>
          )}
        </div>
      </div>

           {/* ============================================================= */}
      {/* CONTROLS HINT BAR                                               */}
      {/* ============================================================= */}
      <div className="w-full bg-[#0a120a] border border-[#1b5e20] px-3 py-1.5 rounded text-[11px] font-mono text-[#d4e8d4] flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#ffd54f] font-bold">🎮 CONTROLS:</span>
          {hudState.hasPossession ? (
            <span className="text-[#42a5f5]">
              [Space/J] Pass · [K] Shoot · [Shift+K] Curled Finesse · [I/C]
              Cross · [Shift] Burst
            </span>
          ) : (
            <span className="text-[#f06292]">
              [Space/J] Pressure · [K] ⚡ Slide Tackle · [I/C] Clear · [E] 2nd
              Man · [Q] Switch
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenControls && (
            <button
              onClick={onOpenControls}
              className="px-2.5 py-0.5 bg-[#1b5e20] hover:bg-[#2e7d32] border border-[#ffd54f] text-[#ffd54f] rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1 shadow"
            >
              <Gamepad className="w-3 h-3" />
              <span>Full Controls Tab →</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};