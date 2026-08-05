"use strict";

const SYMBOL_COLORS = {
  WHITE: "#1A1A1A",
  BLUE: "#E8E8E8",
  BLACK: "#C8C8C8",
  RED: "#FFF0D0",
  GREEN: "#E0F0D0"
};

const CX = 100;
const CY = 100;
const R = 75;

const f2 = (v) => v.toFixed(2);
const pt = (x, y) => `${f2(x)},${f2(y)}`;
const ctrl = (ax, ay, bx, by, x, y) => `${pt(ax, ay)}, ${pt(bx, by)}, ${pt(x, y)}`;

function sunPath() {
  let d = "";
  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const angle = (((360 / rays) * i - 90) * Math.PI) / 180;
    const innerR = R * 0.45;
    const outerR = R * 0.85;
    const half = (12 * Math.PI) / 180;
    const p1 = [CX + innerR * Math.cos(angle - half), CY + innerR * Math.sin(angle - half)];
    const p2 = [CX + outerR * Math.cos(angle), CY + outerR * Math.sin(angle)];
    const p3 = [CX + innerR * Math.cos(angle + half), CY + innerR * Math.sin(angle + half)];
    d += `M ${pt(p1[0], p1[1])} L ${pt(p2[0], p2[1])} L ${pt(p3[0], p3[1])} Z `;
  }
  return d;
}

function dropletPath() {
  return [
    `M ${pt(CX, CY - R * 0.85)}`,
    `C ${ctrl(CX + R * 0.05, CY - R * 0.7, CX + R * 0.65, CY - R * 0.15, CX + R * 0.6, CY + R * 0.15)}`,
    `C ${ctrl(CX + R * 0.55, CY + R * 0.55, CX + R * 0.3, CY + R * 0.8, CX, CY + R * 0.8)}`,
    `C ${ctrl(CX - R * 0.3, CY + R * 0.8, CX - R * 0.55, CY + R * 0.55, CX - R * 0.6, CY + R * 0.15)}`,
    `C ${ctrl(CX - R * 0.65, CY - R * 0.15, CX - R * 0.05, CY - R * 0.7, CX, CY - R * 0.85)}`,
    "Z"
  ].join(" ");
}

function skullPath() {
  const L = (x, y) => `L ${pt(x, y)}`;
  return [
    `M ${pt(CX, CY - R * 0.8)}`,
    `C ${ctrl(CX + R * 0.7, CY - R * 0.8, CX + R * 0.8, CY - R * 0.1, CX + R * 0.55, CY + R * 0.3)}`,
    L(CX + R * 0.4, CY + R * 0.3),
    L(CX + R * 0.35, CY + R * 0.65),
    L(CX + R * 0.15, CY + R * 0.65),
    L(CX + R * 0.1, CY + R * 0.3),
    L(CX - R * 0.1, CY + R * 0.3),
    L(CX - R * 0.15, CY + R * 0.65),
    L(CX - R * 0.35, CY + R * 0.65),
    L(CX - R * 0.4, CY + R * 0.3),
    L(CX - R * 0.55, CY + R * 0.3),
    `C ${ctrl(CX - R * 0.8, CY - R * 0.1, CX - R * 0.7, CY - R * 0.8, CX, CY - R * 0.8)}`,
    "Z"
  ].join(" ");
}

function firePaths() {
  const outer = [
    `M ${pt(CX, CY - R * 0.85)}`,
    `C ${ctrl(CX + R * 0.15, CY - R * 0.6, CX + R * 0.5, CY - R * 0.5, CX + R * 0.55, CY - R * 0.2)}`,
    `C ${ctrl(CX + R * 0.65, CY + R * 0.1, CX + R * 0.5, CY + R * 0.5, CX + R * 0.35, CY + R * 0.65)}`,
    `C ${ctrl(CX + R * 0.2, CY + R * 0.8, CX + R * 0.05, CY + R * 0.85, CX, CY + R * 0.8)}`,
    `C ${ctrl(CX - R * 0.05, CY + R * 0.85, CX - R * 0.2, CY + R * 0.8, CX - R * 0.35, CY + R * 0.65)}`,
    `C ${ctrl(CX - R * 0.5, CY + R * 0.5, CX - R * 0.65, CY + R * 0.1, CX - R * 0.55, CY - R * 0.2)}`,
    `C ${ctrl(CX - R * 0.5, CY - R * 0.5, CX - R * 0.15, CY - R * 0.6, CX, CY - R * 0.85)}`,
    "Z"
  ].join(" ");
  const inner = [
    `M ${pt(CX, CY - R * 0.4)}`,
    `C ${ctrl(CX + R * 0.1, CY - R * 0.2, CX + R * 0.25, CY + R * 0.05, CX + R * 0.2, CY + R * 0.3)}`,
    `C ${ctrl(CX + R * 0.15, CY + R * 0.5, CX + R * 0.05, CY + R * 0.55, CX, CY + R * 0.5)}`,
    `C ${ctrl(CX - R * 0.05, CY + R * 0.55, CX - R * 0.15, CY + R * 0.5, CX - R * 0.2, CY + R * 0.3)}`,
    `C ${ctrl(CX - R * 0.25, CY + R * 0.05, CX - R * 0.1, CY - R * 0.2, CX, CY - R * 0.4)}`,
    "Z"
  ].join(" ");
  return { outer, inner };
}

function leafData() {
  const leaf = [
    `M ${pt(CX, CY - R * 0.85)}`,
    `C ${ctrl(CX + R * 0.6, CY - R * 0.6, CX + R * 0.75, CY + R * 0.1, CX + R * 0.15, CY + R * 0.85)}`,
    `C ${ctrl(CX + R * 0.05, CY + R * 0.6, CX - R * 0.05, CY + R * 0.6, CX - R * 0.15, CY + R * 0.85)}`,
    `C ${ctrl(CX - R * 0.75, CY + R * 0.1, CX - R * 0.6, CY - R * 0.6, CX, CY - R * 0.85)}`,
    "Z"
  ].join(" ");
  let veins = "";
  for (let i = 1; i <= 3; i++) {
    const yOffset = CY - R * 0.3 + i * R * 0.3;
    const spread = R * 0.25 * ((4 - i) / 3);
    veins += `<line x1="${f2(CX)}" y1="${f2(yOffset)}" x2="${f2(CX - spread)}" y2="${f2(yOffset + R * 0.15)}" stroke="${SYMBOL_COLORS.GREEN}" stroke-opacity="0.4" stroke-width="2"/>`;
    veins += `<line x1="${f2(CX)}" y1="${f2(yOffset)}" x2="${f2(CX + spread)}" y2="${f2(yOffset + R * 0.15)}" stroke="${SYMBOL_COLORS.GREEN}" stroke-opacity="0.4" stroke-width="2"/>`;
  }
  return { leaf, veins };
}

function manaSymbolSVG(colorKey, { size = 40, selected = false } = {}) {
  const color = MagicColorByKey[colorKey];
  const symbolColor = SYMBOL_COLORS[colorKey];
  let inner = "";

  switch (colorKey) {
    case "WHITE":
      inner =
        `<circle cx="${CX}" cy="${CY}" r="${f2(R * 0.35)}" fill="${symbolColor}"/>` +
        `<path d="${sunPath()}" fill="${symbolColor}"/>`;
      break;
    case "BLUE":
      inner = `<path d="${dropletPath()}" fill="${symbolColor}"/>`;
      break;
    case "BLACK":
      inner =
        `<path d="${skullPath()}" fill="${symbolColor}"/>` +
        `<circle cx="${f2(CX - R * 0.25)}" cy="${f2(CY - R * 0.2)}" r="${f2(R * 0.12)}" fill="${symbolColor}" fill-opacity="0.3"/>` +
        `<circle cx="${f2(CX + R * 0.25)}" cy="${f2(CY - R * 0.2)}" r="${f2(R * 0.12)}" fill="${symbolColor}" fill-opacity="0.3"/>`;
      break;
    case "RED": {
      const f = firePaths();
      inner =
        `<path d="${f.outer}" fill="${symbolColor}"/>` +
        `<path d="${f.inner}" fill="${symbolColor}" fill-opacity="0.4"/>`;
      break;
    }
    case "GREEN": {
      const l = leafData();
      inner =
        `<path d="${l.leaf}" fill="${symbolColor}"/>` +
        `<line x1="${f2(CX)}" y1="${f2(CY - R * 0.6)}" x2="${f2(CX)}" y2="${f2(CY + R * 0.65)}" stroke="${symbolColor}" stroke-opacity="0.5" stroke-width="3"/>` +
        l.veins;
      break;
    }
  }

  const borderColor = selected ? "#D4AF37" : "#8B7355";
  const borderAlpha = selected ? "1" : "0.5";
  const borderWidth = selected ? "5" : "2";
  const ring = selected
    ? `<circle cx="${CX}" cy="${CY}" r="96" fill="none" stroke="#D4AF37" stroke-opacity="0.3" stroke-width="4"/>`
    : "";

  return (
    `<svg viewBox="0 0 200 200" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${CX}" cy="${CY}" r="100" fill="${color.composeColor}"/>` +
    `<circle cx="${CX}" cy="${CY}" r="99" fill="none" stroke="${borderColor}" stroke-opacity="${borderAlpha}" stroke-width="${borderWidth}"/>` +
    inner +
    ring +
    `</svg>`
  );
}

function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 0.5;
}
