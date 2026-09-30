import { RealtimeMatch, RealtimeBall, PITCH_W, PITCH_H } from '../services/realtimeMatchEngine';

type ProjectFn = (wx: number, wy: number, wz?: number) => { x: number; y: number; scale: number };

// Module-level rotation state — persists across frames.
// NOTE: If you prefer keeping this in the match object, feel free to move it,
// but a module-local ref works fine since there's only ever one live match at a time.
let ballRotation = 0;

export function drawBall(
  ctx: CanvasRenderingContext2D,
  match: RealtimeMatch,
  project: ProjectFn
) {
  const b = match.ball;
  const ballSpeed = Math.hypot(b.vx, b.vy);
  ballRotation += ballSpeed * 0.1;

  drawBallShadow(ctx, b, project);
  drawBallTrail(ctx, b, project);
  drawBallSphere(ctx, b, project, ballRotation);
  drawSetPieceMarker(ctx, match, project);
}

function drawBallShadow(ctx: CanvasRenderingContext2D, b: RealtimeBall, project: ProjectFn) {
  const groundPt = project(b.x, b.y, 0);
  const shadowScale = Math.max(0.2, 1 - b.z / 95);
  const shadowOffsetX = b.z * 0.25;
  const shadowOffsetY = 4 + b.z * 0.35;

  ctx.save();
  ctx.translate(groundPt.x, groundPt.y);
  ctx.scale(groundPt.scale, groundPt.scale);
  ctx.translate(-b.x, -b.y);

  ctx.fillStyle = `rgba(0, 10, 0, ${Math.max(0.12, 0.5 * shadowScale)})`;
  ctx.beginPath();
  ctx.ellipse(
    b.x + shadowOffsetX,
    b.y + shadowOffsetY,
    9 * shadowScale,
    4.5 * shadowScale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function drawBallTrail(ctx: CanvasRenderingContext2D, b: RealtimeBall, project: ProjectFn) {
  if (!(b.isKnuckle || b.shotType === 'precision') || b.z <= 2) return;

  ctx.save();
  const trailColor = b.shotType === 'precision' ? 'rgba(0, 229, 255, ' : 'rgba(255, 213, 79, ';
  for (let t = 1; t <= 4; t++) {
    const tp = project(
      b.x - b.vx * t * 1.5,
      b.y - b.vy * t * 1.5,
      Math.max(0, b.z - t * 2)
    );
    ctx.fillStyle = `${trailColor}${0.6 / t})`;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, (6 - t) * tp.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBallSphere(
  ctx: CanvasRenderingContext2D,
  b: RealtimeBall,
  project: ProjectFn,
  rotation: number
) {
  const airPt = project(b.x, b.y, b.z);
  const ballRadius = 7.5;

  ctx.save();
  ctx.translate(airPt.x, airPt.y);
  ctx.scale(airPt.scale, airPt.scale);
  ctx.translate(-b.x, -b.y);

  // Leather shading gradient
  const ballGrad = ctx.createRadialGradient(
    b.x - 2.2, b.y - 2.2, 1,
    b.x, b.y, ballRadius
  );
  ballGrad.addColorStop(0, '#ffffff');
  ballGrad.addColorStop(0.55, '#f8fafc');
  ballGrad.addColorStop(0.85, '#e2e8f0');
  ballGrad.addColorStop(1, '#cbd5e1');

  ctx.fillStyle = ballGrad;
  ctx.beginPath();
  ctx.arc(b.x, b.y, ballRadius, 0, Math.PI * 2);
  ctx.fill();

  // Sharp outline
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Rolling seams
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
  ctx.lineWidth = 1.0;
  for (let f = 0; f < 3; f++) {
    const pAngle = rotation + (f * Math.PI * 2) / 3;
    const sx = b.x + Math.cos(pAngle) * 3.8;
    const sy = b.y + Math.sin(pAngle) * 3.8;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.8, pAngle, pAngle + Math.PI);
    ctx.stroke();
  }

  // Central panel dot
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(b.x, b.y, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSetPieceMarker(ctx: CanvasRenderingContext2D, match: RealtimeMatch, project: ProjectFn) {
  const b = match.ball;
  const st = match.state;
  if (st !== 'corner' && st !== 'throwin' && st !== 'goalkick' && st !== 'freekick') return;

  const pulse = 1 + Math.sin(Date.now() / 140) * 0.22;
  const spPt = project(b.x, b.y, 0);

  ctx.save();
  ctx.beginPath();
  ctx.arc(spPt.x, spPt.y, 25 * pulse * spPt.scale, 0, Math.PI * 2);
  ctx.strokeStyle =
    st === 'corner' ? '#ffd54f'
    : st === 'throwin' ? '#42a5f5'
    : st === 'freekick' ? '#ff5252'
    : '#00e676';
  ctx.lineWidth = 2.5 * spPt.scale;
  ctx.setLineDash([5, 4]);
  ctx.stroke();

  // Corner target reticle inside the box
  if (st === 'corner') {
    const targetBoxX = b.carrier?.isHome ? PITCH_W - 170 : 170;
    const boxPt = project(targetBoxX, PITCH_H / 2, 0);
    ctx.beginPath();
    ctx.arc(boxPt.x, boxPt.y, 45 * pulse * boxPt.scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.55)';
    ctx.lineWidth = 2 * boxPt.scale;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the aerial landing reticle (crosshair where a lofted ball will touch down).
 * Separated so it can be drawn BEFORE players if you want it under them.
 */
export function drawAerialLandingReticle(
  ctx: CanvasRenderingContext2D,
  match: RealtimeMatch,
  project: ProjectFn
) {
  const b = match.ball;
  if (b.z <= 3) return;

  const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.15;
  const targetRadius = Math.max(10, 24 * pulse);
  const landPt = project(b.landingX, b.landingY, 0);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 213, 79, 0.75)';
  ctx.lineWidth = 2 * landPt.scale;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.arc(landPt.x, landPt.y, targetRadius * landPt.scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(landPt.x - (targetRadius + 4) * landPt.scale, landPt.y);
  ctx.lineTo(landPt.x + (targetRadius + 4) * landPt.scale, landPt.y);
  ctx.moveTo(landPt.x, landPt.y - (targetRadius + 4) * landPt.scale);
  ctx.lineTo(landPt.x, landPt.y + (targetRadius + 4) * landPt.scale);
  ctx.stroke();

  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ffd54f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `ALT: ${Math.round(b.z)}ft`,
    landPt.x,
    landPt.y + (targetRadius + 14) * landPt.scale
  );
  ctx.restore();
}

/**
 * Draws the red dashed offside line + tag when the offside visual timer is active.
 */
export function drawOffsideVisualizer(
  ctx: CanvasRenderingContext2D,
  match: RealtimeMatch,
  project: ProjectFn,
  drawLine3D: (x1: number, y1: number, x2: number, y2: number, z1?: number, z2?: number) => void
) {
  if (match.offsideVisualTimer <= 0) return;

  const alpha = Math.min(1, match.offsideVisualTimer / 35);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 59, 48, ${0.85 * alpha})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  drawLine3D(match.offsideVisualX, 8, match.offsideVisualX, PITCH_H - 8);

  const offsideTag = project(match.offsideVisualX, 40);
  ctx.fillStyle = `rgba(255, 59, 48, ${0.92 * alpha})`;
  ctx.fillRect(offsideTag.x - 45, offsideTag.y - 12, 90, 24);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(offsideTag.x - 45, offsideTag.y - 12, 90, 24);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚩 OFFSIDE', offsideTag.x, offsideTag.y);
  ctx.restore();
}