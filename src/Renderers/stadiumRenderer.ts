import { RealtimeMatch, PITCH_W } from '../services/realtimeMatchEngine';

export function drawStadium(ctx: CanvasRenderingContext2D, W: number, match: RealtimeMatch) {
  ctx.save();
  // Night sky
  ctx.fillStyle = '#060d08';
  ctx.fillRect(0, 0, W, 275);

  // Roof canopy
  ctx.fillStyle = '#0a1a0e';
  ctx.fillRect(0, 0, W, 42);
  ctx.strokeStyle = '#1b3b22';
  ctx.lineWidth = 2.5;
  for (let tx = 0; tx <= W; tx += 90) {
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx + 45, 42);
    ctx.lineTo(tx + 90, 0);
    ctx.stroke();
  }

  const tiers = [
    { y: 42, h: 48, c: '#0d1f12', shadow: '#050c07' },
    { y: 90, h: 50, c: '#122a18', shadow: '#08140c' },
    { y: 140, h: 54, c: '#17361f', shadow: '#0c1c10' },
    { y: 194, h: 52, c: '#1c4226', shadow: '#0f2214' },
  ];

  for (const t of tiers) {
    ctx.fillStyle = t.c;
    ctx.fillRect(0, t.y, W, t.h);
    ctx.fillStyle = t.shadow;
    ctx.fillRect(0, t.y + t.h - 4, W, 4);
    ctx.strokeStyle = '#e6b800';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, t.y + 12);
    ctx.lineTo(W, t.y + 12);
    ctx.stroke();
  }

  drawCrowd(ctx, W, tiers, match);
  drawJumbotron(ctx, W, match);
  drawFloodlights(ctx, W);
  drawAdHoardings(ctx, W);

  ctx.restore();
}

function drawCrowd(
  ctx: CanvasRenderingContext2D,
  W: number,
  tiers: { y: number; h: number }[],
  match: RealtimeMatch
) {
  const timeMs = Date.now();
  const crowdColors = [
    match.home.color, match.home.color, match.away.color,
    '#ffffff', '#ffd54f', '#00e676', '#ff3b30', '#29b6f6',
  ];
  const skinTones = ['#f5cba7', '#dfa878', '#d49b6a', '#8d5524', '#c68642'];

  for (let row = 0; row < tiers.length; row++) {
    const tr = tiers[row];
    const stepX = 14;
    for (let cx = 8; cx < W - 8; cx += stepX) {
      const seed = (cx * 17 + row * 31) & 0xffff;
      const fanColor = crowdColors[seed % crowdColors.length];
      const skin = skinTones[(seed >> 2) % skinTones.length];
      const bob = Math.sin(timeMs * 0.004 + cx * 0.05 + row) * 2;
      const cheerJump = match.state === 'goal' ? Math.abs(Math.sin(timeMs * 0.01 + seed)) * 6 : 0;
      const fanX = cx;
      const fanY = tr.y + 24 - bob - cheerJump;

      ctx.fillStyle = fanColor;
      ctx.fillRect(fanX - 4, fanY, 8, 10);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(fanX, fanY - 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (cheerJump > 2) {
        ctx.fillStyle = fanColor;
        ctx.fillRect(fanX - 6, fanY - 7, 2.5, 7);
        ctx.fillRect(fanX + 3.5, fanY - 7, 2.5, 7);
      }
    }
  }
}

function drawJumbotron(ctx: CanvasRenderingContext2D, W: number, match: RealtimeMatch) {
  const sbW = 340;
  const sbH = 50;
  const sbX = (W - sbW) / 2;
  const sbY = 8;
  ctx.fillStyle = '#050c05';
  ctx.fillRect(sbX, sbY, sbW, sbH);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.strokeRect(sbX, sbY, sbW, sbH);

  ctx.font = 'bold 12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  const sbText = `${match.home.shortName} ${match.homeScore} - ${match.awayScore} ${match.away.shortName}`;
  ctx.fillText(sbText, W / 2, sbY + 20);

  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#00e676';
  const minText = `● LIVE ${Math.min(90, Math.floor(match.matchSeconds / 60))}'`;
  ctx.fillText(minText, W / 2, sbY + 38);
}

function drawFloodlights(ctx: CanvasRenderingContext2D, W: number) {
  const drawLightCone = (fx: number, fy: number) => {
    ctx.fillStyle = '#222222';
    ctx.fillRect(fx - 14, fy - 6, 28, 14);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(fx - 18, fy + 4, 36, 6);
    const grad = ctx.createRadialGradient(fx, fy + 10, 5, fx, fy + 220, 360);
    grad.addColorStop(0, 'rgba(255, 255, 210, 0.22)');
    grad.addColorStop(1, 'rgba(255, 255, 210, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(fx - 18, fy + 10);
    ctx.lineTo(fx + 220, fy + 380);
    ctx.lineTo(fx - 220, fy + 380);
    ctx.closePath();
    ctx.fill();
  };
  drawLightCone(180, 20);
  drawLightCone(W - 180, 20);
}

function drawAdHoardings(ctx: CanvasRenderingContext2D, W: number) {
  ctx.fillStyle = '#040804';
  ctx.fillRect(0, 246, W, 29);
  ctx.strokeStyle = '#225522';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 246, W, 29);

  const ads = [
    { text: '★ eFOOTBALL 2026 ★', color: '#ffd54f' },
    { text: 'SENSIBLE SOCCER', color: '#00e5ff' },
    { text: 'AMIGA 1200 POWER', color: '#ffd700' },
    { text: 'SUPER SIDEKICKS ARCADE', color: '#00e676' },
    { text: 'PREMIER ASCII LEAGUE', color: '#ff3b30' },
  ];
  const adW = W / ads.length;
  ctx.font = 'bold 9px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const timeMs = Date.now();
  ads.forEach((ad, i) => {
    ctx.fillStyle = ad.color;
    const glow = Math.sin(timeMs / 400 + i) * 0.2 + 0.8;
    ctx.globalAlpha = glow;
    ctx.fillText(ad.text, i * adW + adW / 2, 260);
  });
  ctx.globalAlpha = 1.0;
}