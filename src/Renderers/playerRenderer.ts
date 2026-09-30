import { RealtimePlayer, RealtimeMatch } from '../services/realtimeMatchEngine';

interface PlayerRenderContext {
  ctx: CanvasRenderingContext2D;
  match: RealtimeMatch;
}

/**
 * Draws all players (sorted by Y for depth) along with their overlays.
 * NOTE: Player positions/scales are computed by the caller via `project` and applied here directly.
 */
export function drawPlayer(
  { ctx, match }: PlayerRenderContext,
  p: RealtimePlayer,
  project: (wx: number, wy: number, wz?: number) => { x: number; y: number; scale: number }
) {
  const pt = project(p.x, p.y, 0);
  const s = pt.scale;

  ctx.save();
  ctx.translate(pt.x, pt.y);
  ctx.scale(s, s);
  ctx.translate(-p.x, -p.y);

  if (p.isSliding > 0) {
    drawSlidingPlayer(ctx, p, match);
  } else {
    drawUprightPlayer(ctx, p);
  }

  // Name & role label
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = p.isUser ? '#ffd54f' : 'rgba(255, 255, 255, 0.88)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${p.shortName} (${p.role})`, p.x, p.y - 18);

  // Command press indicator
  if (p.isCommandPressed || match.commandPressPlayerId === p.id) {
    drawCommandPressIndicator(ctx, p);
  }

  // Active user cursor + power gauge
  if (p.isUser) {
    drawActiveUserCursor(ctx, p);
    drawPlayerPowerGauge(ctx, p);
    drawStaminaBar(ctx, p);
  }

  ctx.restore();
}

function drawSlidingPlayer(ctx: CanvasRenderingContext2D, p: RealtimePlayer, match: RealtimeMatch) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);

  const slideRatio = p.isSliding / 22;
  const slideElapsed = 22 - p.isSliding;
  const trenchLen = 22 + slideElapsed * 0.9;

  // Turf trench
  ctx.fillStyle = 'rgba(6, 26, 9, 0.82)';
  ctx.beginPath();
  ctx.moveTo(8, -5);
  ctx.lineTo(-trenchLen, -2);
  ctx.lineTo(-trenchLen - 4, 3);
  ctx.lineTo(6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(27, 94, 32, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Scrape lines
  ctx.strokeStyle = 'rgba(5, 18, 5, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, -1);
  ctx.lineTo(-trenchLen + 2, -1);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * slideRatio})`;
  ctx.beginPath();
  ctx.moveTo(16, -1);
  ctx.lineTo(-6, -1);
  ctx.stroke();

  // Turf particles
  for (let g = 0; g < 7; g++) {
    const pSeed = (p.number * 7 + g * 13 + slideElapsed * 5) % 17;
    const px = -trenchLen * 0.6 - pSeed * 1.6;
    const py = ((pSeed % 7) - 3) * 2.8;
    const pSize = 1.5 + (g % 3) * 0.8;
    ctx.fillStyle = g % 3 === 0 ? '#4e342e' : g % 2 === 0 ? '#2e7d32' : '#81c784';
    ctx.fillRect(px, py, pSize, pSize);
  }

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 15, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-2, 3, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const skinTones = ['#f5cba7', '#dfa878', '#d49b6a', '#8d5524', '#c68642'];
  const skinTone = skinTones[(p.number + p.name.length) % skinTones.length];
  const hairColors = ['#1a110a', '#4a2e18', '#734d26', '#d4a373', '#2b1d0c', '#000000'];
  const hairColor = hairColors[p.number % hairColors.length];
  const isGK = p.position === 'GK';
  const shortsColor = isGK ? '#111111' : p.isHome ? '#f5f5f5' : '#0d1b2a';
  const jerseyColor = isGK ? '#aeea00' : p.baseTeam.color;

  // Supporting arm
  ctx.fillStyle = skinTone;
  ctx.fillRect(-14, 5, 5, 3.5);
  ctx.fillStyle = jerseyColor;
  ctx.fillRect(-17, 3, 4, 4);
  // Counter arm
  ctx.fillStyle = jerseyColor;
  ctx.fillRect(-16, -9, 5, 3.5);
  ctx.fillStyle = skinTone;
  ctx.fillRect(-12, -11, 4, 3);
  // Trailing leg
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-10, 2.5, 7, 4);
  ctx.fillStyle = '#141414';
  ctx.fillRect(-15, 3, 6, 4.5);
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(-15, 6, 2, 1.5);
  // Shorts
  ctx.fillStyle = shortsColor;
  ctx.fillRect(-7, -4.5, 12, 10);
  ctx.strokeStyle = p.baseTeam.color;
  ctx.lineWidth = 1;
  ctx.strokeRect(-7, -4.5, 12, 10);
  ctx.fillStyle = p.baseTeam.color;
  ctx.fillRect(-2, -4.5, 2, 10);
  // Torso
  ctx.fillStyle = jerseyColor;
  ctx.fillRect(-18, -6, 12, 11);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(-18, -6, 12, 11);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(-18, -6, 12, 2.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-19, -3.5, 2, 6);
  // Head
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(-20, -0.5, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(-22, -1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-17, -2, 2, 2);
  ctx.fillStyle = '#000000';
  ctx.fillRect(-16, -2, 1, 1.5);
  // Leading leg
  ctx.fillStyle = skinTone;
  ctx.fillRect(4, -2.5, 5, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(8, -3, 8, 4.5);
  ctx.fillStyle = p.baseTeam.color;
  ctx.fillRect(8, -3, 2.5, 4.5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(11, -3, 4, 1.5);
  // Boot
  ctx.fillStyle = '#141414';
  ctx.beginPath();
  ctx.moveTo(15, -3.5);
  ctx.lineTo(21, -2);
  ctx.lineTo(21, 2);
  ctx.lineTo(15, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(17, -2, 2, 1.5);
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(17, 2, 1.5, 1.5);
  ctx.fillRect(19.5, 1.5, 1.5, 1.5);
  ctx.fillRect(20.5, -0.5, 1.5, 1.5);

  // Kinetic swoosh
  if (p.isSliding > 8) {
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.55 * (p.isSliding / 22)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(20, 0, 5, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawUprightPlayer(ctx: CanvasRenderingContext2D, p: RealtimePlayer) {
  const isGK = p.position === 'GK';
  const speed = Math.hypot(p.vx, p.vy);
  const isRunning = speed > 0.35;
  const legPhase = isRunning ? Math.sin(Date.now() * 0.022 + p.number * 2.3) : 0;
  const legStride = legPhase * 6.5;

  const skinTones = ['#f5cba7', '#dfa878', '#d49b6a', '#8d5524', '#c68642'];
  const skinTone = skinTones[(p.number + p.name.length) % skinTones.length];
  const hairColors = ['#1a110a', '#4a2e18', '#734d26', '#d4a373', '#2b1d0c', '#000000'];
  const hairColor = hairColors[p.number % hairColors.length];
  const shortsColor = isGK ? '#111111' : p.isHome ? '#f5f5f5' : '#0d1b2a';
  const jerseyColor = isGK ? '#aeea00' : p.baseTeam.color;

  // Shadow
  ctx.fillStyle = 'rgba(0, 15, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 6, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const forwardX = Math.cos(p.facing);
  const forwardY = Math.sin(p.facing);
  const perpX = -forwardY;
  const perpY = forwardX;

  // Stunned star spin
  if (p.isStunned > 0) {
    const starT = Date.now() / 120;
    for (let s = 0; s < 3; s++) {
      const sa = starT + (s * Math.PI * 2) / 3;
      const sx = p.x + Math.cos(sa) * 11;
      const sy = p.y - 24 + Math.sin(sa) * 4;
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Left boot & sock
  const leftFootX = p.x + perpX * -4.5 + forwardX * -legStride;
  const leftFootY = p.y + perpY * -4.5 + forwardY * -legStride + 4;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(leftFootX, leftFootY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(leftFootX, leftFootY, 3.5, 2, p.facing, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(leftFootX - 1, leftFootY - 1, 1.5, 1.5);

  // Right boot & sock
  const rightFootX = p.x + perpX * 4.5 + forwardX * legStride;
  const rightFootY = p.y + perpY * 4.5 + forwardY * legStride + 4;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(rightFootX, rightFootY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(rightFootX, rightFootY, 3.5, 2, p.facing, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(rightFootX - 1, rightFootY - 1, 1.5, 1.5);

  // Shorts
  ctx.fillStyle = shortsColor;
  ctx.beginPath();
  ctx.arc(p.x, p.y + 2, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.baseTeam.color;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Jersey torso
  ctx.fillStyle = jerseyColor;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 2, 11, 0, Math.PI * 2);
  ctx.fill();

  // Collar accent
  ctx.strokeStyle = isGK ? '#000000' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 2, 11, 0, Math.PI * 2);
  ctx.stroke();

  // Arms & gloves
  const armSwing = legPhase * 3.5;
  const leftHandX = p.x + perpX * -11.5 + forwardX * armSwing;
  const leftHandY = p.y + perpY * -11.5 + forwardY * armSwing - 2;
  const rightHandX = p.x + perpX * 11.5 - forwardX * armSwing;
  const rightHandY = p.y + perpY * 11.5 - forwardY * armSwing - 2;

  if (isGK) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(leftHandX, leftHandY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightHandX, rightHandY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.arc(leftHandX, leftHandY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightHandX, rightHandY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head & hair
  const headX = p.x + forwardX * 2.5;
  const headY = p.y - 5 + forwardY * 2.5;
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(headX, headY, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(headX - forwardX * 1.5, headY - 1.5 - forwardY * 1.5, 5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(headX + forwardX * 3.5, headY + forwardY * 3.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Shirt number
  ctx.fillStyle = isGK ? '#000000' : '#ffffff';
  ctx.font = 'bold 9px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.number.toString(), p.x - forwardX * 2, p.y - 2 - forwardY * 2);
}

function drawCommandPressIndicator(ctx: CanvasRenderingContext2D, p: RealtimePlayer) {
  ctx.save();
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#00e676';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▲▲ 2ND PRESS', p.x, p.y - 28);
  ctx.restore();
}

function drawActiveUserCursor(ctx: CanvasRenderingContext2D, p: RealtimePlayer) {
  ctx.save();
  // Foot selection ring
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
  ctx.stroke();

  // Bouncing triangle above head
  const bounceY = p.y - 32 - Math.abs(Math.sin(Date.now() / 140)) * 6;
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.moveTo(p.x - 7, bounceY - 10);
  ctx.lineTo(p.x + 7, bounceY - 10);
  ctx.lineTo(p.x, bounceY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 360° aim pointer
  const aimDist = 32;
  const arrowX = p.x + Math.cos(p.facing) * aimDist;
  const arrowY = p.y + Math.sin(p.facing) * aimDist;
  ctx.strokeStyle = 'rgba(255, 213, 79, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(arrowX, arrowY);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.arc(arrowX, arrowY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerPowerGauge(ctx: CanvasRenderingContext2D, p: RealtimePlayer) {
  if (p.chargePower <= 0 || !p.chargingType) return;

  const barW = 54;
  const barH = 8;
  const barY = p.y - 42;
  const pct = Math.min(1, p.chargePower / 100);
  const fillW = pct * barW;

  ctx.save();
  // Backplate
  ctx.fillStyle = 'rgba(5, 12, 5, 0.94)';
  ctx.fillRect(p.x - barW / 2 - 3, barY - 14, barW + 6, barH + 18);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x - barW / 2 - 3, barY - 14, barW + 6, barH + 18);

  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  let fillStyle = '#00e676';
  let labelText = '✕ PASS';
  let labelColor = '#69f0ae';

  if (p.chargingType === 'precision') {
    labelText = '🎯 PRECISION';
    labelColor = '#00e5ff';
    fillStyle = pct > 0.85 ? '#ffd700' : '#00e5ff';
  } else if (p.chargingType === 'shoot') {
    labelText = '▢ STRIKE';
    labelColor = '#ff5252';
    fillStyle = pct > 0.85 ? '#ff1744' : pct > 0.5 ? '#ff9100' : '#ffd54f';
  } else if (p.chargingType === 'lob') {
    labelText = '◯ CROSS';
    labelColor = '#ffd54f';
    fillStyle = pct > 0.85 ? '#ff9100' : '#ffd54f';
  } else if (p.chargingType === 'through') {
    labelText = '△ THROUGH';
    labelColor = '#00e5ff';
    fillStyle = pct > 0.85 ? '#ffd700' : '#40c4ff';
  } else if (p.chargingType === 'pass') {
    labelText = '✕ PASS';
    labelColor = '#69f0ae';
    fillStyle = pct > 0.85 ? '#40c4ff' : '#00e676';
  }

  ctx.fillStyle = labelColor;
  ctx.fillText(labelText, p.x, barY - 12);

  // Empty track
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(p.x - barW / 2, barY, barW, barH);

  // Fill
  ctx.fillStyle = fillStyle;
  ctx.fillRect(p.x - barW / 2, barY, fillW, barH);

  // 80% sweet-spot marker
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x - barW / 2 + barW * 0.8, barY - 1);
  ctx.lineTo(p.x - barW / 2 + barW * 0.8, barY + barH + 1);
  ctx.stroke();

  // Full power flash
  if (pct >= 0.95 && Math.floor(Date.now() / 70) % 2 === 0) {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(p.x - barW / 2 - 3, barY - 14, barW + 6, barH + 18);
  }
  ctx.restore();
}

function drawStaminaBar(ctx: CanvasRenderingContext2D, p: RealtimePlayer) {
  const stamW = 32;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(p.x - stamW / 2, p.y + 16, stamW, 4);
  ctx.fillStyle = p.stamina > 40 ? '#81c784' : '#ef5350';
  ctx.fillRect(p.x - stamW / 2, p.y + 16, (p.stamina / 100) * stamW, 4);
}