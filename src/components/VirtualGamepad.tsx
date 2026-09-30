import React, { useRef, useState, useEffect } from 'react';
import { input } from '../services/inputEngine';
import { RealtimeMatch } from '../services/realtimeMatchEngine';

interface VirtualGamepadProps {
  hasPossession?: boolean;
  match?: RealtimeMatch;
}

export const VirtualGamepad: React.FC<VirtualGamepadProps> = ({ hasPossession = true, match }) => {
  const stickBaseRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Real-time possession tracking for instant attack <-> defense UI toggle
  const [inPossession, setInPossession] = useState<boolean>(hasPossession);

  useEffect(() => {
    if (!match) {
      setInPossession(hasPossession);
      return;
    }
    const timer = setInterval(() => {
      const teamHasBall = match.ball.carrier && match.ball.carrier.isHome === match.userIsHome;
      setInPossession(!!teamHasBall);
    }, 80);
    return () => clearInterval(timer);
  }, [match, hasPossession]);

  // Handle virtual analog stick
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateStick(e);
  };

  const updateStick = (e: React.PointerEvent | PointerEvent) => {
    if (!stickBaseRef.current) return;
    const rect = stickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const maxRadius = rect.width / 2;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });
    input.virtualStick.x = kx / maxRadius;
    input.virtualStick.y = ky / maxRadius;
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) updateStick(e);
    };
    const onPointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        input.virtualStick.x = 0;
        input.virtualStick.y = 0;
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging]);

  const setBtn = (name: string, val: boolean) => {
    input.virtualButtons[name] = val;
  };

  // Dedicated Precision Shot Trigger (R2 + Square simultaneously)
  const setPrecisionShot = (val: boolean) => {
    input.virtualButtons['dash'] = val;
    input.virtualButtons['sprint'] = val;
    input.virtualButtons['shoot'] = val;
  };

  return (
    <div className="w-full flex justify-between items-end p-2 select-none pointer-events-auto">
      {/* 360 Analog Stick on Left */}
      <div className="flex flex-col items-center">
        <div
          ref={stickBaseRef}
          onPointerDown={handlePointerDown}
          className="relative w-28 h-28 rounded-full bg-black/60 border-2 border-[#2e7d32] shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        >
          {/* Inner ring */}
          <div className="w-14 h-14 rounded-full border border-dashed border-[#81c784]/40" />

          {/* Moveable Knob */}
          <div
            className="absolute w-12 h-12 rounded-full bg-[#1b5e20] border-2 border-[#ffd54f] shadow-md flex items-center justify-center font-bold text-[10px] text-[#ffd54f]"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            360°
          </div>
        </div>
        <span className="text-[10px] text-[#6b8a6b] font-mono mt-1 font-semibold">MOVE / AIM</span>
      </div>

      {/* Center Modifiers, Dash & Precision Shot Controls */}
      <div className="flex flex-col gap-1.5 pb-1 items-center">
        {/* Dynamic Mode Badge */}
        <div className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1">
          {inPossession ? (
            <span className="bg-[#1b5e20] text-[#ffd54f] border border-[#2e7d32] px-2 py-0.5 rounded">
              ⚽ ATTACK: Hold Buttons for Power Bar
            </span>
          ) : (
            <span className="bg-[#b71c1c] text-white border border-[#ff5252] px-2 py-0.5 rounded animate-pulse">
              🛡️ DEFENSE: Press [✕] & Slide [▢]
            </span>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap justify-center">
          <button
            onPointerDown={() => setBtn('chip', true)}
            onPointerUp={() => setBtn('chip', false)}
            className="px-2 py-1.5 bg-[#0a180a] border border-[#2e7d32] rounded text-[10px] font-mono text-[#81c784] font-bold active:bg-[#1b5e20]"
          >
            [L1] CHIP
          </button>
          <button
            onPointerDown={() => {
              setBtn('finesse', true);
              setBtn('press', true);
            }}
            onPointerUp={() => {
              setBtn('finesse', false);
              setBtn('press', false);
            }}
            className={`px-2 py-1.5 bg-[#0a180a] border rounded text-[10px] font-mono font-bold active:bg-[#1b5e20] ${
              !inPossession ? 'border-[#00e676] text-[#00e676]' : 'border-[#2e7d32] text-[#ffd54f]'
            }`}
          >
            {inPossession ? '[R1] CURL' : '[R1] 2nd PRESS'}
          </button>

          {/* R2 + Square Precision Shoot (Takes longer to charge, pinpoint accuracy) */}
          {inPossession && (
            <button
              onPointerDown={() => setPrecisionShot(true)}
              onPointerUp={() => setPrecisionShot(false)}
              className="px-2 py-1.5 bg-[#00e5ff]/20 border-2 border-[#00e5ff] rounded text-[10px] font-mono text-[#00e5ff] font-bold active:bg-[#00e5ff]/50 shadow-md"
              title="Hold for Precision Shot power gauge"
            >
              [R2+▢] 🎯 PRECIS
            </button>
          )}

          <button
            onPointerDown={() => setBtn('dash', true)}
            onPointerUp={() => setBtn('dash', false)}
            className="px-2 py-1.5 bg-[#ff8f00]/30 border border-[#ff8f00] rounded text-[10px] font-mono text-[#ffb74d] font-bold active:bg-[#ff8f00]/60 animate-pulse"
          >
            [R2] ⚡ DASH
          </button>
        </div>

        <div className="flex justify-center gap-2">
          <button
            onPointerDown={() => setBtn('switch', true)}
            onPointerUp={() => setBtn('switch', false)}
            className="px-3 py-1 bg-[#12261a] border border-[#81c784] rounded text-[10px] font-mono text-[#d4e8d4] font-bold active:bg-[#2e7d32]"
          >
            SWITCH PLAYER (L1 / Q)
          </button>
        </div>
      </div>

      {/* Action Buttons on Right (PlayStation Pad Diamond: ✕ Pass/Press, ▢ Shoot/Slide, △ Through/GK Rush, ◯ Loft/Clear) */}
      <div className="relative w-36 h-36">
        {/* Pass / Pressure (Bottom / ✕ Cross) */}
        <button
          onPointerDown={() => setBtn('pass', true)}
          onPointerUp={() => setBtn('pass', false)}
          className={`absolute bottom-0 left-12 w-12 h-12 rounded-full border-2 text-white font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition ${
            inPossession
              ? 'bg-[#1b3a5e] border-[#42a5f5]'
              : 'bg-[#0d2818] border-[#00e676] animate-pulse ring-1 ring-[#00e676]'
          }`}
        >
          <span className="text-xs text-[#90caf9] font-black">✕</span>
          <span className="text-[8px] leading-tight font-mono font-bold">
            {inPossession ? 'PASS' : 'PRESS'}
          </span>
        </button>

        {/* Shoot / Slide Tackle (Left / ▢ Square) */}
        <button
          onPointerDown={() => setBtn('shoot', true)}
          onPointerUp={() => setBtn('shoot', false)}
          className={`absolute top-12 left-0 w-12 h-12 rounded-full border-2 text-white font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition ${
            inPossession
              ? 'bg-[#5c1d3f] border-[#f06292]'
              : 'bg-[#4a0e17] border-[#ef5350] ring-1 ring-[#ef5350]'
          }`}
        >
          <span className="text-xs text-[#f48fb1] font-black">▢</span>
          <span className="text-[8px] leading-tight font-mono font-bold">
            {inPossession ? 'SHOOT' : 'SLIDE'}
          </span>
        </button>

        {/* Lofted Pass / Clearance (Right / ◯ Circle) */}
        <button
          onPointerDown={() => setBtn('lob', true)}
          onPointerUp={() => setBtn('lob', false)}
          className="absolute top-12 right-0 w-12 h-12 rounded-full bg-[#b71c1c] border-2 border-[#ef5350] text-white font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition"
        >
          <span className="text-xs text-[#ff8a80] font-black">◯</span>
          <span className="text-[8px] leading-tight font-mono font-bold">
            {inPossession ? 'LOFT' : 'CLEAR'}
          </span>
        </button>

        {/* Through Ball / GK Rush (Top / △ Triangle) */}
        <button
          onPointerDown={() => setBtn('through', true)}
          onPointerUp={() => setBtn('through', false)}
          className="absolute top-0 left-12 w-12 h-12 rounded-full bg-[#1b5e20] border-2 border-[#00e676] text-white font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition"
        >
          <span className="text-xs text-[#69f0ae] font-black">△</span>
          <span className="text-[8px] leading-tight font-mono font-bold">
            {inPossession ? 'THRU' : 'GK RUSH'}
          </span>
        </button>

        {/* Sprint / Dash Shortcut */}
        <button
          onPointerDown={() => setBtn('dash', true)}
          onPointerUp={() => setBtn('dash', false)}
          className="absolute bottom-0 right-0 px-2 py-1 rounded bg-[#ffd54f] text-black font-bold text-[9px] border border-black shadow active:scale-95 flex items-center gap-0.5"
        >
          ⚡ DASH
        </button>
      </div>
    </div>
  );
};
