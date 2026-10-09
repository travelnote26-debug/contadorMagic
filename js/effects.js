"use strict";

function effectAlpha(progress) {
  let a;
  if (progress < 0.15) a = progress / 0.15;
  else if (progress < 0.4) a = 1;
  else a = 1 - (progress - 0.4) / 0.6;
  return Math.max(0, Math.min(1, a));
}

const POTION_GREEN = {
  glow: "#00CC66",
  glowOuter: "#00FF88",
  body: "#00AA55",
  shine: "#33FF88",
  particle: "#66FFAA"
};

const POTION_RED = {
  glow: "#CC0000",
  glowOuter: "#FF2222",
  body: "#AA0000",
  shine: "#FF3333",
  particle: "#FF6666"
};

function drawPotionEffect(ctx, w, h, progress, palette) {
  const c = palette || POTION_GREEN;
  const alpha = effectAlpha(progress);
  const cx = w / 2;
  const cy = h / 2;
  const dpx = Math.max(1, Math.min(w, h) / 200);
  const yOff = -progress * h * 0.03;

  ctx.save();

  const isRed = palette === POTION_RED;
  
  if (isRed) {
    ctx.globalAlpha = alpha * 0.12;
    ctx.fillStyle = c.glow;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 6 * dpx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const size = Math.min(w, h) * 0.5;
    const y = cy + yOff;
    const slashes = 3;
    for (let i = 0; i < slashes; i++) {
      const offset = (i - 1) * (size * 0.25);
      ctx.beginPath();
      ctx.moveTo(cx + offset - size * 0.6, y - size * 0.8);
      ctx.lineTo(cx + offset + size * 0.4, y + size * 0.8);
      ctx.stroke();
    }
  } else {
    ctx.globalAlpha = alpha * 0.14;
    ctx.fillStyle = c.glow;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.07;
    ctx.fillStyle = c.glowOuter;
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
    ctx.fillStyle = c.body;
    rrect(cx - fw / 2, bodyTop, fw, fh * 0.5, fw * 0.25);
    ctx.fill();
    rrect(cx - nw / 2, bodyTop - nh + 2 * dpx, nw, nh, nw * 0.15);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.45;
    ctx.fillStyle = c.shine;
    rrect(cx - fw * 0.32, bodyTop + fh * 0.15, fw * 0.64, fh * 0.25, fw * 0.18);
    ctx.fill();

    const cs = fw * 0.18;
    const crossY = bodyTop + fh * 0.25;
    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2 * dpx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - cs, crossY);
    ctx.lineTo(cx + cs, crossY);
    ctx.moveTo(cx, crossY - cs);
    ctx.lineTo(cx, crossY + cs);
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const seed = i * 97 + 17;
    const ang = ((seed % 360) * Math.PI) / 180;
    const dist = Math.min(w, h) * 0.13 + (seed % 25);
    const rise = (1 + (i % 3) * 0.4) * progress;
    const px = cx + Math.cos(ang) * dist * (0.5 + progress * 0.5);
    const py = cy + Math.sin(ang) * dist - rise * fh * 0.5 + yOff;
    ctx.globalAlpha = alpha * 0.55 * (1 - progress * 0.3);
    ctx.fillStyle = c.particle;
    ctx.beginPath();
    ctx.arc(px, py, 2.5 * dpx * (1 - progress * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
