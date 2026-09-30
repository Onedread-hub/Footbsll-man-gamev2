import { PITCH_W, PITCH_H, GOAL_Y_TOP, GOAL_Y_BOTTOM, GOAL_DEPTH, CROSSBAR_HEIGHT } from '../services/realtimeMatchEngine';

export type ProjectFn = (wx: number, wy: number, wz?: number) => { x: number; y: number; scale: number };

export function drawPitchTurf(ctx: CanvasRenderingContext2D, project: ProjectFn, is3D: boolean) {
  // Outer turf apron
  ctx.fillStyle = '#0a240f';
  drawPoly3D(ctx, project, [
    { x: -50, y: -25 },
    { x: PITCH_W + 50, y: -25 },
    { x: PITCH_W + 50, y: PITCH_H + 25 },
    { x: -50, y: PITCH_H + 25 },
  ], true, false);

  // Alternating lawn stripes
  const numStripes = 18;
  const stripeW = PITCH_W / numStripes;
  for (let i = 0; i < numStripes; i++) {
    const sx = i * stripeW;
    ctx.fillStyle = i % 2 === 0 ? '#187a28' : '#146b22';
    drawPoly3D(ctx, project, [
      { x: sx, y: 0 },
      { x: sx + stripeW, y: 0 },
      { x: sx + stripeW, y: PITCH_H },
      { x: sx, y: PITCH_H },
    ], true, false);
  }
}

export function drawPitchMarkings(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn,
  drawLine3D: (x1: number, y1: number, x2: number, y2: number, z1?: number, z2?: number) => void,
  drawPoly3D: (pts: { x: number; y: number; z?: number }[], fill?: boolean, stroke?: boolean) => void
) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 3.5;

  // Outer boundary
  drawPoly3D([
    { x: 8, y: 8 },
    { x: PITCH_W - 8, y: 8 },
    { x: PITCH_W - 8, y: PITCH_H - 8 },
    { x: 8, y: PITCH_H - 8 },
  ], false, true);

  // Halfway line
  drawLine3D(PITCH_W / 2, 8, PITCH_W / 2, PITCH_H - 8);

  // Center circle
  const centerPts: { x: number; y: number }[] = [];
  for (let a = 0; a <= Math.PI * 2; a += Math.PI / 18) {
    centerPts.push({
      x: PITCH_W / 2 + Math.cos(a) * 100,
      y: PITCH_H / 2 + Math.sin(a) * 100,
    });
  }
  drawPoly3D(centerPts, false, true);

  // Center spot
  const cSpot = project(PITCH_W / 2, PITCH_H / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cSpot.x, cSpot.y, 5 * cSpot.scale, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas
  const boxTop = (PITCH_H - 540) / 2;
  const boxBottom = (PITCH_H + 540) / 2;
  const sixTop = (PITCH_H - 280) / 2;
  const sixBottom = (PITCH_H + 280) / 2;

  drawPoly3D([
    { x: 8, y: boxTop }, { x: 278, y: boxTop },
    { x: 278, y: boxBottom }, { x: 8, y: boxBottom },
  ], false, true);
  drawPoly3D([
    { x: 8, y: sixTop }, { x: 103, y: sixTop },
    { x: 103, y: sixBottom }, { x: 8, y: sixBottom },
  ], false, true);

  const spotL = project(180, PITCH_H / 2);
  ctx.beginPath();
  ctx.arc(spotL.x, spotL.y, 4.5 * spotL.scale, 0, Math.PI * 2);
  ctx.fill();

  // Penalty arc left
  const arcLPts: { x: number; y: number }[] = [];
  for (let a = -0.68; a <= 0.68; a += 0.08) {
    arcLPts.push({ x: 180 + Math.cos(a) * 100, y: PITCH_H / 2 + Math.sin(a) * 100 });
  }
  drawPoly3D(arcLPts, false, true);

  // Right box
  drawPoly3D([
    { x: PITCH_W - 278, y: boxTop }, { x: PITCH_W - 8, y: boxTop },
    { x: PITCH_W - 8, y: boxBottom }, { x: PITCH_W - 278, y: boxBottom },
  ], false, true);
  drawPoly3D([
    { x: PITCH_W - 103, y: sixTop }, { x: PITCH_W - 8, y: sixTop },
    { x: PITCH_W - 8, y: sixBottom }, { x: PITCH_W - 103, y: sixBottom },
  ], false, true);

  const spotR = project(PITCH_W - 180, PITCH_H / 2);
  ctx.beginPath();
  ctx.arc(spotR.x, spotR.y, 4.5 * spotR.scale, 0, Math.PI * 2);
  ctx.fill();

  const arcRPts: { x: number; y: number }[] = [];
  for (let a = Math.PI - 0.68; a <= Math.PI + 0.68; a += 0.08) {
    arcRPts.push({ x: PITCH_W - 180 + Math.cos(a) * 100, y: PITCH_H / 2 + Math.sin(a) * 100 });
  }
  drawPoly3D(arcRPts, false, true);
}

export function drawCornerFlags(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn
) {
  const drawCornerFlag3D = (fx: number, fy: number, isRight: boolean) => {
    const basePt = project(fx, fy, 0);
    const topPt = project(fx, fy, 20);
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * basePt.scale;
    ctx.beginPath();
    ctx.moveTo(basePt.x, basePt.y);
    ctx.lineTo(topPt.x, topPt.y);
    ctx.stroke();

    const wave = Math.sin(Date.now() / 150) * 3;
    const bladeX = isRight ? -12 * basePt.scale + wave : 12 * basePt.scale + wave;
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(topPt.x + bladeX, topPt.y + 4 * basePt.scale);
    ctx.lineTo(topPt.x, topPt.y + 9 * basePt.scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(topPt.x, topPt.y, 2.5 * basePt.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawCornerFlag3D(9, 9, false);
  drawCornerFlag3D(9, PITCH_H - 9, false);
  drawCornerFlag3D(PITCH_W - 9, 9, true);
  drawCornerFlag3D(PITCH_W - 9, PITCH_H - 9, true);
}

export function drawGoal3D(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn,
  drawLine3D: (x1: number, y1: number, x2: number, y2: number, z1?: number, z2?: number) => void,
  isLeft: boolean
) {
  ctx.save();
  const gx = isLeft ? 8 : PITCH_W - 8;
  const backX = isLeft ? 8 - GOAL_DEPTH : PITCH_W - 8 + GOAL_DEPTH;

  const pBot1 = project(gx, GOAL_Y_TOP, 0);
  const pBot2 = project(gx, GOAL_Y_BOTTOM, 0);
  const pTop1 = project(gx, GOAL_Y_TOP, 65);
  const pTop2 = project(gx, GOAL_Y_BOTTOM, 65);

  const bBot1 = project(backX, GOAL_Y_TOP, 0);
  const bBot2 = project(backX, GOAL_Y_BOTTOM, 0);
  const bTop1 = project(backX, GOAL_Y_TOP, 55);
  const bTop2 = project(backX, GOAL_Y_BOTTOM, 55);

  // Net backdrop
  ctx.fillStyle = 'rgba(0, 15, 0, 0.45)';
  ctx.beginPath();
  ctx.moveTo(bTop1.x, bTop1.y);
  ctx.lineTo(bTop2.x, bTop2.y);
  ctx.lineTo(bBot2.x, bBot2.y);
  ctx.lineTo(bBot1.x, bBot1.y);
  ctx.closePath();
  ctx.fill();

  // Side nets
  ctx.beginPath();
  ctx.moveTo(pTop1.x, pTop1.y);
  ctx.lineTo(bTop1.x, bTop1.y);
  ctx.lineTo(bBot1.x, bBot1.y);
  ctx.lineTo(pBot1.x, pBot1.y);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pTop2.x, pTop2.y);
  ctx.lineTo(bTop2.x, bTop2.y);
  ctx.lineTo(bBot2.x, bBot2.y);
  ctx.lineTo(pBot2.x, pBot2.y);
  ctx.closePath();
  ctx.fill();

  // Net mesh
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  const netSteps = 8;
  for (let s = 1; s < netSteps; s++) {
    const frac = s / netSteps;
    const fy = GOAL_Y_TOP + (GOAL_Y_BOTTOM - GOAL_Y_TOP) * frac;
    drawLine3D(gx, fy, backX, fy, 30, 25);
  }

  // Posts & crossbar
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5 * pBot1.scale;
  ctx.beginPath();
  ctx.moveTo(pBot1.x, pBot1.y);
  ctx.lineTo(pTop1.x, pTop1.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pBot2.x, pBot2.y);
  ctx.lineTo(pTop2.x, pTop2.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pTop1.x, pTop1.y);
  ctx.lineTo(pTop2.x, pTop2.y);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(pTop1.x, pTop1.y, 3 * pBot1.scale, 0, Math.PI * 2);
  ctx.arc(pTop2.x, pTop2.y, 3 * pBot2.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Helper exports
export function drawPoly3D(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn,
  pts: { x: number; y: number; z?: number }[],
  fill = false,
  stroke = true
) {
  if (pts.length < 2) return;
  const p0 = project(pts[0].x, pts[0].y, pts[0].z || 0);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < pts.length; i++) {
    const p = project(pts[i].x, pts[i].y, pts[i].z || 0);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

export function drawLine3D(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  z1 = 0,
  z2 = 0
) {
  const p1 = project(x1, y1, z1);
  const p2 = project(x2, y2, z2);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}