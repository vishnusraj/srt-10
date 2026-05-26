/* ── Cricket game: offscreen scene generators ──────────────────────────────
   Each function paints a static layer to an offscreen canvas. They run
   once per resize and the result is blitted every frame in render.ts. */

import { pitchHalfWidthAt } from "./state";
import {
  PITCH_TOP_Y_FRAC,
  STUMPS_Y_FRAC,
  PITCH_NARROW_FRAC,
  PITCH_WIDE_FRAC,
} from "./config";
import type { SceneLayers } from "./types";

/* ── Stadium backdrop — blurred crowd + lights at the far end ──────────── */
export function generateStadiumBackdrop(w: number, h: number): HTMLCanvasElement {
  const src = document.createElement("canvas");
  src.width = w; src.height = h;
  const c = src.getContext("2d");
  if (c) {
    const bandH = h * 0.34;

    const sky = c.createLinearGradient(0, 0, 0, bandH);
    sky.addColorStop(0,    "rgba(8,10,18,1)");
    sky.addColorStop(0.55, "rgba(22,18,14,1)");
    sky.addColorStop(1,    "rgba(34,26,18,1)");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, bandH);

    c.strokeStyle = "rgba(0,0,0,0.45)";
    c.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = bandH * 0.30 + (bandH * 0.65 * i) / 4;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }

    // Crowd density — denser tier of dots gives a deeper, more populated
    // gallery once blurred. Back rows (top of band) use cooler, dimmer
    // dots; front rows use warmer, brighter ones for a "stand depth" cue.
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * w;
      const y = bandH * 0.30 + Math.random() * (bandH * 0.70);
      const depthT = (y - bandH * 0.30) / (bandH * 0.70);   // 0 = back, 1 = front
      const r = 1 + Math.random() * 1.6 * (0.7 + depthT * 0.5);
      // Hue swings warm; back rows are duller, front rows lift
      const hue = 18 + Math.random() * 32;
      const sat = 16 + Math.random() * 38 * depthT;
      const lt  = 14 + Math.random() * 28 + depthT * 14;
      const a   = 0.25 + Math.random() * 0.45 + depthT * 0.15;
      c.fillStyle = `hsla(${hue}, ${sat}%, ${lt}%, ${a})`;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    // Sparse warm haze across the front of the crowd — sells the
    // stadium-light spill onto the nearest spectators after the blur.
    for (let i = 0; i < 110; i++) {
      const x = Math.random() * w;
      const y = bandH * 0.65 + Math.random() * (bandH * 0.30);
      const r = 4 + Math.random() * 7;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,210,150,${0.10 + Math.random() * 0.08})`);
      g.addColorStop(1, "rgba(255,210,150,0)");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const lights = 5;
    for (let i = 0; i < lights; i++) {
      const x = ((i + 0.5) / lights) * w;
      const y = 10 + Math.random() * 14;
      const r = 60 + Math.random() * 30;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,    "rgba(255,242,210,0.90)");
      g.addColorStop(0.25, "rgba(255,228,170,0.42)");
      g.addColorStop(1,    "rgba(255,228,170,0)");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  // Slightly deeper blur — the dot field is denser now so a hair more blur
  // smooths it into a "wall of faces" without losing the light highlights.
  const blurred = document.createElement("canvas");
  blurred.width = w; blurred.height = h;
  const bc = blurred.getContext("2d");
  if (bc) {
    bc.filter = "blur(3.2px)";
    bc.drawImage(src, 0, 0);
  }
  return blurred;
}

/* ── Pitch scene — pitch, grass, creases, far stumps, boundary, spotlight ── */
export function generatePitchScene(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  const cx       = w * 0.5;
  const halfTop  = w * PITCH_NARROW_FRAC;
  const halfBot  = w * PITCH_WIDE_FRAC;
  const topY     = h * PITCH_TOP_Y_FRAC;
  const botY     = h * STUMPS_Y_FRAC;

  /* 1. Surrounding grass */
  const grassGrad = ctx.createLinearGradient(0, topY, 0, h);
  grassGrad.addColorStop(0,    "rgba(8,18,12,0)");
  grassGrad.addColorStop(0.12, "rgba(10,22,14,0.78)");
  grassGrad.addColorStop(1,    "rgba(14,28,18,0.92)");
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, topY - 4, w, h - topY + 4);

  for (let i = 0; i < 480; i++) {
    const x = Math.random() * w;
    const y = topY + Math.random() * (h - topY);
    const r = 0.5 + Math.random() * 0.9;
    ctx.fillStyle = `rgba(${28 + Math.random() * 20},${56 + Math.random() * 22},${36 + Math.random() * 14},${0.06 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* 2. Pitch trapezoid */
  ctx.beginPath();
  ctx.moveTo(cx - halfTop, topY);
  ctx.lineTo(cx + halfTop, topY);
  ctx.lineTo(cx + halfBot, botY);
  ctx.lineTo(cx - halfBot, botY);
  ctx.closePath();

  ctx.save();
  ctx.clip();

  // Brighter near-end of the pitch — eye is drawn toward the batter.
  const pitchGrad = ctx.createLinearGradient(0, topY, 0, botY);
  pitchGrad.addColorStop(0,    "rgba(54,38,22,1)");
  pitchGrad.addColorStop(0.45, "rgba(102,72,42,1)");
  pitchGrad.addColorStop(1,    "rgba(162,114,68,1)");
  ctx.fillStyle = pitchGrad;
  ctx.fillRect(0, topY, w, botY - topY);

  for (let i = 0; i < 1800; i++) {
    const yT     = topY + Math.random() * (botY - topY);
    const tScale = (yT - topY) / (botY - topY);
    const halfAt = halfTop + (halfBot - halfTop) * tScale;
    const xT     = cx + (Math.random() - 0.5) * halfAt * 2;
    const light  = Math.random() < 0.55;
    const a      = 0.04 + Math.random() * 0.10;
    ctx.fillStyle = light
      ? `rgba(210,170,118,${a})`
      : `rgba(34,22,14,${a})`;
    const sz = 0.4 + Math.random() * 1.3;
    ctx.fillRect(xT, yT, sz, sz);
  }

  for (let i = 0; i < 14; i++) {
    const yT     = topY + Math.random() * (botY - topY);
    const tScale = (yT - topY) / (botY - topY);
    const halfAt = halfTop + (halfBot - halfTop) * tScale;
    const xT     = cx + (Math.random() - 0.5) * halfAt * 1.4;
    const r      = 6 + Math.random() * 16;
    const patch  = ctx.createRadialGradient(xT, yT, 0, xT, yT, r);
    patch.addColorStop(0, "rgba(22,14,8,0.22)");
    patch.addColorStop(1, "rgba(22,14,8,0)");
    ctx.fillStyle = patch;
    ctx.beginPath();
    ctx.arc(xT, yT, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const centreShade = ctx.createLinearGradient(cx - halfBot * 0.5, 0, cx + halfBot * 0.5, 0);
  centreShade.addColorStop(0,   "rgba(0,0,0,0)");
  centreShade.addColorStop(0.5, "rgba(0,0,0,0.10)");
  centreShade.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = centreShade;
  ctx.fillRect(0, topY, w, botY - topY);

  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(cx - halfTop, topY);
  ctx.lineTo(cx + halfTop, topY);
  ctx.lineTo(cx + halfBot, botY);
  ctx.lineTo(cx - halfBot, botY);
  ctx.closePath();
  ctx.strokeStyle = "rgba(240,205,150,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();

  /* 3. Crease markings */
  const WHITE = "rgba(245,245,235,0.85)";
  ctx.strokeStyle = WHITE;
  ctx.lineCap = "round";

  const popY = h * 0.885;
  const popHalf = pitchHalfWidthAt(popY, w, h);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - popHalf - 8, popY);
  ctx.lineTo(cx + popHalf + 8, popY);
  ctx.stroke();

  const retInset = popHalf * 0.32;
  ctx.lineWidth = 2.0;
  [-retInset, +retInset].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx, popY - 2);
    ctx.lineTo(cx + dx, botY + 4);
    ctx.stroke();
  });

  const farPopY    = topY + (botY - topY) * 0.07;
  const farPopHalf = pitchHalfWidthAt(farPopY, w, h);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - farPopHalf - 3, farPopY);
  ctx.lineTo(cx + farPopHalf + 3, farPopY);
  ctx.stroke();

  const farRetInset = farPopHalf * 0.32;
  ctx.lineWidth = 1.2;
  [-farRetInset, +farRetInset].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx, farPopY);
    ctx.lineTo(cx + dx, topY - 4);
    ctx.stroke();
  });

  /* 4. Far stumps */
  const farStumpsY      = topY + 2;
  const farStumpSpacing = 4;
  const farStumpHeight  = 14;
  ctx.strokeStyle = "rgba(238,220,178,0.62)";
  ctx.lineWidth = 1.2;
  for (let i = -1; i <= 1; i++) {
    const sx = cx + i * farStumpSpacing;
    ctx.beginPath();
    ctx.moveTo(sx, farStumpsY);
    ctx.lineTo(sx, farStumpsY - farStumpHeight);
    ctx.stroke();
  }
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - farStumpSpacing - 1, farStumpsY - farStumpHeight);
  ctx.lineTo(cx + farStumpSpacing + 1, farStumpsY - farStumpHeight);
  ctx.stroke();

  /* 5. Boundary line */
  const boundaryY   = topY - 8;
  const boundaryDip = h * 0.022;
  ctx.strokeStyle = "rgba(248,248,238,0.62)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, boundaryY);
  ctx.quadraticCurveTo(cx, boundaryY + boundaryDip, w, boundaryY);
  ctx.stroke();
  ctx.strokeStyle = "rgba(248,248,238,0.20)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, boundaryY + 10);
  ctx.quadraticCurveTo(cx, boundaryY + boundaryDip + 22, w, boundaryY + 10);
  ctx.stroke();

  /* 6. Stadium spotlight darkening wash */
  const spotCx     = cx;
  const spotCy     = h * 0.74;
  const spotInner  = Math.min(w, h) * 0.18;
  const spotOuter  = Math.max(w, h) * 0.70;
  // Pitch spotlight — steeper rim falloff for stronger contrast between the
  // brightly-lit pitch and the surrounding dim grass. Inner stays fully
  // transparent so the pitch itself reads at full brightness.
  const spotGrad   = ctx.createRadialGradient(spotCx, spotCy, spotInner, spotCx, spotCy, spotOuter);
  spotGrad.addColorStop(0,    "rgba(0,0,0,0)");
  spotGrad.addColorStop(0.40, "rgba(0,0,0,0.22)");
  spotGrad.addColorStop(0.72, "rgba(0,0,0,0.52)");
  spotGrad.addColorStop(1,    "rgba(0,0,0,0.86)");
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, topY - 16, w, h - topY + 16);

  return c;
}

/* ── Gradient lighting overlay ─────────────────────────────────────────── */
export function generateLightingOverlay(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  const warm = ctx.createRadialGradient(
    w * 0.5, h * 0.55, 0,
    w * 0.5, h * 0.55, Math.max(w, h) * 0.85
  );
  // Brighter, tighter warm key so the pitch core glows against the cooler
  // grass + crowd. Bias toward the batter end (impact zone).
  warm.addColorStop(0,    "rgba(255,220,160,0.085)");
  warm.addColorStop(0.40, "rgba(255,210,150,0.040)");
  warm.addColorStop(1,    "rgba(255,210,150,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);

  const cool = ctx.createLinearGradient(0, 0, 0, h * 0.45);
  cool.addColorStop(0,   "rgba(28,30,52,0.20)");
  cool.addColorStop(0.6, "rgba(28,30,52,0.06)");
  cool.addColorStop(1,   "rgba(28,30,52,0)");
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, w, h * 0.5);

  return c;
}

/* ── Vignette overlay ──────────────────────────────────────────────────── */
export function generateVignette(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  const cx = w * 0.5;
  const cy = h * 0.58;
  const inner = Math.min(w, h) * 0.28;
  const outer = Math.max(w, h) * 0.78;
  const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  grad.addColorStop(0,    "rgba(0,0,0,0)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.16)");
  grad.addColorStop(0.85, "rgba(0,0,0,0.50)");
  grad.addColorStop(1,    "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return c;
}

/* Bundle all four into a SceneLayers object. */
export function buildSceneLayers(w: number, h: number): SceneLayers {
  return {
    backdrop:   generateStadiumBackdrop(w, h),
    pitchScene: generatePitchScene(w, h),
    lighting:   generateLightingOverlay(w, h),
    vignette:   generateVignette(w, h),
  };
}
