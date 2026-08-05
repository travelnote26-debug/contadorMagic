"use strict";

function effectAlpha(progress) {
  let a;
  if (progress < 0.15) a = progress / 0.15;
  else if (progress < 0.4) a = 1;
  else a = 1 - (progress - 0.4) / 0.6;
  return Math.max(0, Math.min(1, a));
}

function drawClawEffect(ctx, w, h, progress) {
  const alpha = effectAlpha(progress);
  const cx = w / 2;
  const cy = h / 2;
  const dpx = Math.max(1, Math.min(w, h) / 200);
  const scratch = Math.min(progress / 0.4, 1);
  const markLen = h * 0.4;
  const spacing = w * 0.055;

  ctx.save();

  ctx.globalAlpha = alpha * 0.14;
  ctx.fillStyle = "#CC0000";
  ctx.beginPath();
  ctx.arc(cx, cy, markLen * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    const ox = i * spacing;
    const sx = cx + ox + markLen * 0.12;
    const sy = cy - markLen * 0.5;
    const curLen = markLen * scratch;
    const ex = sx - curLen * 0.25;
    const ey = sy + curLen;

    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = "#8B0000";
    ctx.lineWidth = 5 * dpx;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = "#FF2222";
    ctx.lineWidth = 1.8 * dpx;
    ctx.beginPath();
    ctx.moveTo(sx + dpx, sy + dpx);
    ctx.lineTo(ex + dpx, ey + dpx);
    ctx.stroke();
  }

  if (progress > 0.1) {
    for (let i = 0; i < 6; i++) {
      const seed = i * 137 + 42;
      const ang = ((seed % 360) * Math.PI) / 180;
      const dist = markLen * 0.3 * progress + (seed % 20);
      ctx.globalAlpha = alpha * 0.45;
      ctx.fillStyle = "#CC3333";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 2 * dpx * (1 - progress), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPotionEffect(ctx, w, h, progress) {
  const alpha = effectAlpha(progress);
  const cx = w / 2;
  const cy = h / 2;
  const dpx = Math.max(1, Math.min(w, h) / 200);
  const yOff = -progress * h * 0.03;

  ctx.save();

  ctx.globalAlpha = alpha * 0.14;
  ctx.fillStyle = "#00CC66";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.07;
  ctx.fillStyle = "#00FF88";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.5, 0, Math.PI * 2);
  ctx.fill();

  const fh = h * 0.22;
  const fw = fh * 0.45;
  const nw = fw * 0.35;
  const nh = fh * 0.28;
  const bodyTop = cy - fh * 0.15 + yOff;

  const rrect = (x, y, wd, ht, rad) => {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, wd, ht, rad);
    } else {
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + wd, y, x + wd, y + ht, rad);
      ctx.arcTo(x + wd, y + ht, x, y + ht, rad);
      ctx.arcTo(x, y + ht, x, y, rad);
      ctx.arcTo(x, y, x + wd, y, rad);
      ctx.closePath();
    }
  };

  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = "#00AA55";
  rrect(cx - fw / 2, bodyTop, fw, fh * 0.5, fw * 0.25);
  ctx.fill();
  rrect(cx - nw / 2, bodyTop - nh + 2 * dpx, nw, nh, nw * 0.15);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.45;
  ctx.fillStyle = "#33FF88";
  rrect(cx - fw * 0.32, bodyTop + fh * 0.15, fw * 0.64, fh * 0.25, fw * 0.18);
  ctx.fill();

  const cs = fw * 0.18;
  const crossY = bodyTop + fh * 0.25;
  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2 * dpx;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - cs, crossY);
  ctx.lineTo(cx + cs, crossY);
  ctx.moveTo(cx, crossY - cs);
  ctx.lineTo(cx, crossY + cs);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const seed = i * 97 + 17;
    const ang = ((seed % 360) * Math.PI) / 180;
    const dist = Math.min(w, h) * 0.13 + (seed % 25);
    const rise = (1 + (i % 3) * 0.4) * progress;
    const px = cx + Math.cos(ang) * dist * (0.5 + progress * 0.5);
    const py = cy + Math.sin(ang) * dist - rise * fh * 0.5 + yOff;
    ctx.globalAlpha = alpha * 0.55 * (1 - progress * 0.3);
    ctx.fillStyle = "#66FFaa";
    ctx.beginPath();
    ctx.arc(px, py, 2.5 * dpx * (1 - progress * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
