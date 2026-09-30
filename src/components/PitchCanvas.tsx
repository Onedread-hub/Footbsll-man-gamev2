import React, { useEffect, useRef } from 'react';
import { Team, FORMATIONS } from '../types/football';
import { PW, PH } from '../services/matchEngine';

const CELL_W = 16;
const CELL_H = 22;

interface PitchCanvasProps {
  home: Team;
  away: Team;
  ballX: number;
  ballY: number;
  carrierId?: string;
  isGoalFlash?: boolean;
}

export const PitchCanvas: React.FC<PitchCanvasProps> = ({
  home,
  away,
  ballX,
  ballY,
  carrierId,
  isGoalFlash,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const displayPosRef = useRef<{ x: number; y: number }>({ x: ballX, y: ballY });

  // Place players according to formation
  const placeTeam = (team: Team, isHome: boolean) => {
    if (!team) return;
    const lines = (team.formation && FORMATIONS[team.formation]?.lines) || [1, 4, 4, 2];
    const sorted = typeof team.sortedSquad === 'function' ? team.sortedSquad() : [];
    if (sorted.length === 0) return;
    const gk = sorted[0];
    if (gk) {
      gk.px = isHome ? 2.5 / PW : 1 - 2.5 / PW;
      gk.py = 0.5;
    }

    let idx = 1;
    const outfieldLines = lines.length - 1;
    for (let li = 0; li < outfieldLines; li++) {
      const count = lines[li + 1];
      const frac = outfieldLines === 1 ? 0.5 : li / (outfieldLines - 1);
      const xFrac = isHome ? 0.17 + frac * 0.29 : 0.83 - frac * 0.29;
      const colCells = Math.round(xFrac * PW);
      const rowSpacing = 1 / (count + 1);

      for (let i = 0; i < count && idx < sorted.length; i++) {
        const p = sorted[idx++];
        p.px = colCells / PW;
        p.py = rowSpacing * (i + 1);
      }
    }

    while (idx < sorted.length) {
      const p = sorted[idx++];
      p.px = 0.5;
      p.py = 0.5;
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!home || !away) return;

    const W = canvas.width;
    const H = canvas.height;

    placeTeam(home, true);
    placeTeam(away, false);

    // Draw pitch grass stripes
    const stripeW = 8 * CELL_W;
    for (let x = 0; x < W; x += stripeW) {
      ctx.fillStyle = (x / stripeW) % 2 === 0 ? '#1b5e20' : '#2e7d32';
      ctx.fillRect(x, 0, stripeW, H);
    }

    // Goal flash overlay if celebratory
    if (isGoalFlash) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, 0, W, H);
    }

    // Pitch lines
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Halfway line & center circle
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 4 * CELL_H, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Penalty areas (18-yard box)
    const boxW = 8 * CELL_W;
    const boxH = 14 * CELL_H;
    ctx.strokeRect(1, (H - boxH) / 2, boxW, boxH);
    ctx.strokeRect(W - boxW - 1, (H - boxH) / 2, boxW, boxH);

    // Goal areas (6-yard box)
    const gbW = 3 * CELL_W;
    const gbH = 6 * CELL_H;
    ctx.strokeRect(1, (H - gbH) / 2, gbW, gbH);
    ctx.strokeRect(W - gbW - 1, (H - gbH) / 2, gbW, gbH);

    // Penalty spots
    ctx.beginPath();
    ctx.arc(6 * CELL_W, H / 2, 3, 0, Math.PI * 2);
    ctx.arc(W - 6 * CELL_W, H / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Goal nets
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(0, H / 2 - CELL_H * 1.5, 4, CELL_H * 3);
    ctx.fillRect(W - 4, H / 2 - CELL_H * 1.5, 4, CELL_H * 3);

    // Corner arcs
    const arcRadius = 14;
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W, 0, arcRadius, Math.PI / 2, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, H, arcRadius, (3 * Math.PI) / 2, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W, H, arcRadius, Math.PI, (3 * Math.PI) / 2);
    ctx.stroke();

    // Draw teams
    const drawTeamPlayers = (team: Team) => {
      const sorted = team.sortedSquad();
      for (const p of sorted) {
        const cx = p.px * PW * CELL_W;
        const cy = p.py * PH * CELL_H;
        const isCarrier = carrierId && p.id === carrierId;

        // Carrier indicator glow
        if (isCarrier) {
          ctx.beginPath();
          ctx.arc(cx, cy, CELL_H * 0.58, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 213, 79, 0.45)';
          ctx.fill();
          ctx.strokeStyle = '#ffd54f';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Player circle
        ctx.beginPath();
        ctx.arc(cx, cy, CELL_H * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = team.color;
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Number
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Consolas, Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p.number || 1), cx, cy + 1);

        // Player short name above token
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '9px Consolas, Courier New, monospace';
        ctx.fillText(p.shortName(), cx, cy - CELL_H * 0.45);
      }
    };

    drawTeamPlayers(home);
    drawTeamPlayers(away);

    // Ball display interpolation
    const bx = displayPosRef.current.x * CELL_W;
    const by = displayPosRef.current.y * CELL_H;

    // Ball shadow
    ctx.beginPath();
    ctx.ellipse(bx + 1, by + 3, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Ball body
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Retro ball pentagon pattern dot
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
    ctx.fill();
  };

  // Animate ball smoothly toward target coordinates
  useEffect(() => {
    let startTime: number | null = null;
    const duration = 280;
    const startX = displayPosRef.current.x;
    const startY = displayPosRef.current.y;
    const targetX = ballX;
    const targetY = ballY;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out quad
      const ease = 1 - (1 - progress) * (1 - progress);

      displayPosRef.current.x = startX + (targetX - startX) * ease;
      displayPosRef.current.y = startY + (targetY - startY) * ease;

      draw();

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [ballX, ballY, home, away, carrierId, isGoalFlash]);

  useEffect(() => {
    draw();
  }, []);

  return (
    <div className="w-full overflow-x-auto bg-[#0a0e0a] border border-[#2e7d32] p-2 rounded shadow-2xl flex justify-center">
      <canvas
        ref={canvasRef}
        width={PW * CELL_W}
        height={PH * CELL_H}
        className="block max-w-full h-auto rounded image-render-pixelated shadow-inner"
        style={{ aspectRatio: `${PW * CELL_W} / ${PH * CELL_H}` }}
      />
    </div>
  );
};
