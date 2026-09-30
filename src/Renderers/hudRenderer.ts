import { RealtimeMatch, PITCH_W, PITCH_H } from '../services/realtimeMatchEngine';
import { CameraMode } from '../components/PlayablePitchCanvas';

type ProjectFn = (wx: number, wy: number, wz?: number) => { x: number; y: number; scale: number };

// ============================================================
// 1. CAMERA MODE BADGE (Top-Right of screen)
// ============================================================
export function drawCameraHUD(
  ctx: CanvasRenderingContext2D,
  W: number,
  activeMode: CameraMode
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 15, 30, 0.88)';
  ctx.strokeStyle = '#29b6f6';
  ctx.lineWidth = 1.2;
  ctx.fillRect(W - 200, 16, 185, 28);
  ctx.strokeRect(W - 200, 16, 185, 28);

  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#29b6f6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const camLabel =
    activeMode === 'spectator3d'
      ? '🏟️ eFOOTBALL 3D (C)'
      : activeMode === 'broadcast'
      ? '📺 BROADCAST (C)'
      : '🦅 2D OVERHEAD (C)';

  ctx.fillText(camLabel, W - 107, 30);
  ctx.restore();
}

// ============================================================
// 2. CAMERA SWITCH NOTICE BANNER (Centered pop-in)
// ============================================================
export function drawCameraSwitchNotice(
  ctx: CanvasRenderingContext2D,
  W: number,
  noticeText: string | null
) {
  if (!noticeText) return;

  ctx.save();
  const bW = 600;
  const bH = 54;
  const bx = (W - bW) / 2;
  const by = 80;

  ctx.fillStyle = 'rgba(0, 15, 30, 0.96)';
  ctx.fillRect(bx, by, bW, bH);
  ctx.strokeStyle = '#29b6f6';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bW, bH);

  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 4, by + 4, bW - 8, bH - 8);

  ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.fillStyle = '#29b6f6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(noticeText, W / 2, by + 27);
  ctx.restore();
}

// ============================================================
// 3. MATCH ACTION BANNER (Yellow text pill at top-center)
// ============================================================
export function drawActionBanner(
  ctx: CanvasRenderingContext2D,
  W: number,
  match: RealtimeMatch
) {
  if (match.bannerTimer <= 0) return;

  ctx.save();
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textW = ctx.measureText(match.bannerText).width + 36;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
  ctx.fillRect(W / 2 - textW / 2, 42, textW, 32);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W / 2 - textW / 2, 42, textW, 32);

  ctx.fillStyle = '#ffd54f';
  ctx.fillText(match.bannerText, W / 2, 58);
  ctx.restore();
}

// ============================================================
// 4. TACTICAL MINI RADAR MAP (Bottom-right or bottom-center)
// ============================================================
export function drawRadarMap(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  match: RealtimeMatch,
  activeMode: CameraMode
) {
  const radarW = 160;
  const radarH = 96;
  const is3Dish = activeMode === 'spectator3d' || activeMode === 'broadcast';
  const radarX = is3Dish ? W - radarW - 20 : (W - radarW) / 2;
  const radarY = H - radarH - 18;

  // Panel background
  ctx.fillStyle = 'rgba(0, 20, 0, 0.82)';
  ctx.fillRect(radarX, radarY, radarW, radarH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(radarX, radarY, radarW, radarH);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(radarX + radarW / 2, radarY);
  ctx.lineTo(radarX + radarW / 2, radarY + radarH);
  ctx.stroke();

  // Dynamic offside lines on radar
  const homeOffsideRx = radarX + (match.homeAttackingOffsideLineX / PITCH_W) * radarW;
  const awayOffsideRx = radarX + (match.awayAttackingOffsideLineX / PITCH_W) * radarW;

  ctx.save();
  ctx.setLineDash([2, 2]);

  ctx.strokeStyle = 'rgba(66, 165, 245, 0.45)';
  ctx.beginPath();
  ctx.moveTo(homeOffsideRx, radarY);
  ctx.lineTo(homeOffsideRx, radarY + radarH);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(239, 83, 80, 0.45)';
  ctx.beginPath();
  ctx.moveTo(awayOffsideRx, radarY);
  ctx.lineTo(awayOffsideRx, radarY + radarH);
  ctx.stroke();
  ctx.restore();

  // Player dots
  for (const p of match.players) {
    const rx = radarX + (p.x / PITCH_W) * radarW;
    const ry = radarY + (p.y / PITCH_H) * radarH;

    ctx.fillStyle = p.isHome ? '#ef5350' : '#42a5f5';
    if (p.isUser) ctx.fillStyle = '#ffd54f';
    if (p.isCommandPressed) ctx.fillStyle = '#00e676';

    ctx.beginPath();
    ctx.arc(rx, ry, p.isUser ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ball dot
  const rbx = radarX + (match.ball.x / PITCH_W) * radarW;
  const rby = radarY + (match.ball.y / PITCH_H) * radarH;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(rbx, rby, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================
// 5. HUD POWER GAUGE (Bottom-left widget)
// ============================================================
export function drawHUDGauge(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  match: RealtimeMatch
) {
  const activeUser = match.activeUserPlayer;
  if (!activeUser || activeUser.chargePower <= 0 || !activeUser.chargingType) return;

  const gaugeW = 160;
  const gaugeH = 36;
  const gaugeX = 24;
  const gaugeY = H - gaugeH - 18;
  const pct = Math.min(1, activeUser.chargePower / 100);

  ctx.save();
  ctx.fillStyle = 'rgba(5, 15, 5, 0.94)';
  ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
  ctx.strokeStyle = activeUser.chargingType === 'precision' ? '#00e5ff' : '#ffd54f';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const typeLabel =
    activeUser.chargingType === 'precision' ? '🎯 PRECISION (R2+▢)'
    : activeUser.chargingType === 'shoot' ? '💥 SHOOT (▢)'
    : activeUser.chargingType === 'lob' ? '✈️ LOFTED PASS (◯)'
    : '⚡ GROUND PASS (✕)';

  ctx.fillText(typeLabel, gaugeX + 8, gaugeY + 4);

  ctx.textAlign = 'right';
  ctx.fillStyle = activeUser.chargingType === 'precision' ? '#00e5ff' : '#ffd54f';
  ctx.fillText(`${Math.round(activeUser.chargePower)}%`, gaugeX + gaugeW - 8, gaugeY + 4);

  // Empty track
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(gaugeX + 8, gaugeY + 19, gaugeW - 16, 10);

  // Fill colour logic
  ctx.fillStyle =
    activeUser.chargingType === 'precision'
      ? pct > 0.8 ? '#ffd700' : '#00e5ff'
      : activeUser.chargingType === 'shoot'
      ? pct > 0.8 ? '#ff1744' : pct > 0.5 ? '#ff9100' : '#ffd54f'
      : activeUser.chargingType === 'lob'
      ? pct > 0.8 ? '#ff9100' : '#ffd54f'
      : pct > 0.8 ? '#40c4ff' : '#00e676';

  ctx.fillRect(gaugeX + 8, gaugeY + 19, (gaugeW - 16) * pct, 10);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(gaugeX + 8, gaugeY + 19, gaugeW - 16, 10);

  ctx.restore();
}

// ============================================================
// 6. GOAL CELEBRATION (Starburst rays + arcade signboard)
// ============================================================
export function drawGoalCelebration(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  match: RealtimeMatch
) {
  if (match.state !== 'goal') return;

  ctx.save();

  // Rotating starburst rays
  const t = Date.now() / 300;
  const rayCount = 16;
  for (let r = 0; r < rayCount; r++) {
    const a1 = t + (r * Math.PI * 2) / rayCount;
    const a2 = t + ((r + 0.5) * Math.PI * 2) / rayCount;
    ctx.fillStyle =
      r % 2 === 0
        ? 'rgba(255, 213, 79, 0.16)'
        : 'rgba(255, 59, 48, 0.12)';
    ctx.beginPath();
    ctx.moveTo(W / 2, H / 2);
    ctx.arc(W / 2, H / 2, 1000, a1, a2);
    ctx.closePath();
    ctx.fill();
  }

  // Retro arcade GOAL signboard
  const bW = 640;
  const bH = 120;
  const bx = (W - bW) / 2;
  const by = H / 2 - 90;

  ctx.fillStyle = '#060f06';
  ctx.fillRect(bx, by, bW, bH);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 5;
  ctx.strokeRect(bx, by, bW, bH);

  ctx.strokeStyle = '#ff3b30';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 5, by + 5, bW - 10, bH - 10);

  ctx.font = 'bold 36px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow
  ctx.fillStyle = '#000000';
  ctx.fillText('⚽ GOOOOOAL! ⚽', W / 2 + 3, by + 47);

  // Foreground
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('⚽ GOOOOOAL! ⚽', W / 2, by + 44);

  ctx.font = 'bold 15px "Press Start 2P", monospace';
  ctx.fillStyle = '#00e676';
  ctx.fillText(match.bannerText || 'WHAT A FINISH!', W / 2, by + 86);

  ctx.restore();
}

// ============================================================
// CONVENIENCE: draw all HUD layers in the right order
// ============================================================
export function drawAllHUD(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  match: RealtimeMatch,
  cameraMode: CameraMode,
  cameraSwitchNotice: string | null
) {
  drawCameraHUD(ctx, W, cameraMode);
  drawCameraSwitchNotice(ctx, W, cameraSwitchNotice);
  drawActionBanner(ctx, W, match);
  drawRadarMap(ctx, W, H, match, cameraMode);
  drawHUDGauge(ctx, W, H, match);
  drawGoalCelebration(ctx, W, H, match);
}