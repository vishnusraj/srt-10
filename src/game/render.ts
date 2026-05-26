/* ── Cricket game: per-frame renderer ──────────────────────────────────────
   Pure draw function. Reads GameState + viewport + pre-rendered scene
   layers, paints one frame onto the supplied 2D context. No game-logic
   mutation; the only "writes back" are auto-clearing transient effects
   (shake/burst/zoneFlash/perfectFlash/message) whose lifetimes expire
   during the draw call. */

import type { GameState, Zone, SceneLayers } from "./types";
import {
  BATTER_Y_FRAC,
  STUMPS_Y_FRAC,
  STUMPS_HEIGHT,
  STUMP_SPACING,
  IMPACT_Y_FRAC,
  PITCH_TOP_Y_FRAC,
  PERFECT_RANGE,
  EARLY_RANGE,
  LATE_RANGE,
  DEFENSIVE_RANGE,
  BALL_RADIUS,
  BAT_REST_ANGLE,
  BAT_HAND_OFFSET_X,
  SWING_DELAY_MS,
  DEFENSIVE_DROP_PX,
  FOLLOW_BY_SHOT,
  SWING_MS_BY_SHOT,
  EASE_POW_BY_SHOT,
  BAT_SWING_MS,
  SHAKE_MS,
  BURST_MS,
  BALL_GLOW_MS,
  ZONE_FLASH_MS,
  PERFECT_FLASH_MS,
  IMPACT_POP_MS,
  IMPACT_POP_PEAK,
  CONTACT_FLASH_MS,
  WICKET_FALL_MS,
} from "./config";
import { pitchHalfWidthAt, ballPerspectiveScale } from "./state";
import { renderBowler } from "./bowler";

export interface RenderContext {
  ctx:    CanvasRenderingContext2D;
  state:  GameState;
  layers: SceneLayers | null;     // null briefly before first resize finishes
  width:  number;
  height: number;
  now:    number;
}

/* The full per-frame paint. Composition order intentionally matches the
   original implementation so every visual cue lands in the same z-order. */
export function renderFrame(rc: RenderContext): void {
  const { ctx, state: g, layers, width: w, height: h, now } = rc;

  const cx        = w * 0.5;
  const batterX   = cx;
  const batterY   = h * BATTER_Y_FRAC;
  const impactY   = h * IMPACT_Y_FRAC;
  const stumpsY   = h * STUMPS_Y_FRAC;
  const pitchTopY = h * PITCH_TOP_Y_FRAC;

  ctx.clearRect(0, 0, w, h);

  /* Stadium backdrop — static at rest. The crowd no longer moves between
     deliveries; energy is now event-driven via the crowdFlash overlay
     below (4 / 6 / wicket). */
  if (layers) ctx.drawImage(layers.backdrop, 0, 0);

  /* Crowd flash — tinted glow over the upper stadium band on events. Two
     summed sines give it a "throbbing roar" feel during the fade rather
     than a single linear ramp-down. */
  if (g.crowdFlash) {
    const cfElapsed = now - g.crowdFlash.startTime;
    if (cfElapsed < g.crowdFlash.durationMs) {
      const ct       = cfElapsed / g.crowdFlash.durationMs;
      const decay    = 1 - ct;
      const pulse    = 1 + 0.35 * (Math.sin(cfElapsed * 0.045) * 0.6 + Math.sin(cfElapsed * 0.082) * 0.4);
      const base     = decay * decay * g.crowdFlash.intensity * pulse;
      const tint     = g.crowdFlash.tint;
      const bandH    = h * 0.40;
      const cfGrad   = ctx.createLinearGradient(0, 0, 0, bandH);
      cfGrad.addColorStop(0,    `rgba(${tint},${Math.max(0, base * 0.85)})`);
      cfGrad.addColorStop(0.55, `rgba(${tint},${Math.max(0, base * 0.35)})`);
      cfGrad.addColorStop(1,    `rgba(${tint},0)`);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = cfGrad;
      ctx.fillRect(0, 0, w, bandH);
      ctx.restore();
    } else {
      g.crowdFlash = null;
    }
  }

  /* Camera shake — applied to world layer only. */
  let shakeX = 0, shakeY = 0;
  if (g.shake) {
    const elapsed = now - g.shake.startTime;
    if (elapsed < SHAKE_MS) {
      const decay = 1 - elapsed / SHAKE_MS;
      const seed  = elapsed / 8;
      shakeX = Math.sin(seed * 1.7) * g.shake.intensity * decay;
      shakeY = Math.cos(seed * 2.3) * g.shake.intensity * decay * 0.7;
    } else {
      g.shake = null;
    }
  }

  ctx.save();
  // World layer: camera shake only — ground stays fully anchored.
  ctx.translate(shakeX, shakeY);

  /* 1. Pitch scene (pre-rendered). */
  if (layers) ctx.drawImage(layers.pitchScene, 0, 0);

  /* 1a. Bowler — drawn just after the pitch so the silhouette sits on top
        of the far stumps but behind the field-zone wedges + impact zone.
        Idle phase short-circuits inside renderBowler. */
  renderBowler(ctx, g.bowler, now, w, h);

  /* 1b. Field zones. */
  const zoneOriginX = cx;
  const zoneOriginY = batterY + 22;
  const zoneRadius  = h * 0.72;
  const zoneDefs: Array<{ zone: Zone; from: number; to: number; rgb: string }> = [
    { zone: "off",      from: (-150 * Math.PI) / 180, to: (-100 * Math.PI) / 180, rgb: "150,210,180" },
    { zone: "straight", from: (-100 * Math.PI) / 180, to: ( -80 * Math.PI) / 180, rgb: "230,194,122" },
    { zone: "leg",      from: ( -80 * Math.PI) / 180, to: ( -30 * Math.PI) / 180, rgb: "220,160,200" },
  ];
  zoneDefs.forEach((zd) => {
    let alpha = 0.045;
    if (g.zoneFlash && g.zoneFlash.zone === zd.zone) {
      const elapsed = now - g.zoneFlash.startTime;
      if (elapsed < ZONE_FLASH_MS) {
        const flashT = 1 - elapsed / ZONE_FLASH_MS;
        alpha += 0.22 * flashT * flashT;
      } else {
        g.zoneFlash = null;
      }
    }
    const wedgeGrad = ctx.createRadialGradient(
      zoneOriginX, zoneOriginY, zoneRadius * 0.10,
      zoneOriginX, zoneOriginY, zoneRadius
    );
    wedgeGrad.addColorStop(0,    `rgba(${zd.rgb},0)`);
    wedgeGrad.addColorStop(0.35, `rgba(${zd.rgb},${alpha})`);
    wedgeGrad.addColorStop(0.85, `rgba(${zd.rgb},${alpha * 0.55})`);
    wedgeGrad.addColorStop(1,    `rgba(${zd.rgb},0)`);
    ctx.fillStyle = wedgeGrad;
    ctx.beginPath();
    ctx.moveTo(zoneOriginX, zoneOriginY);
    ctx.arc(zoneOriginX, zoneOriginY, zoneRadius, zd.from, zd.to);
    ctx.closePath();
    ctx.fill();
  });

  /* 2. Impact zone — concentric horizontal bands around impactY. */
  const impactHalfWidth = pitchHalfWidthAt(impactY, w, h);
  const tiers = [
    { range: DEFENSIVE_RANGE, color: "rgba(210,210,210,0.06)" },
    { range: LATE_RANGE,      color: "rgba(220,160,200,0.10)" },
    { range: EARLY_RANGE,     color: "rgba(150,210,180,0.13)" },
    { range: PERFECT_RANGE,   color: "rgba(230,194,122,0.24)" },
  ];
  tiers.forEach(({ range, color }) => {
    ctx.fillStyle = color;
    ctx.fillRect(cx - impactHalfWidth, impactY - range, impactHalfWidth * 2, range * 2);
  });
  const ballInPerfect = g.ball.state === "incoming" &&
                        Math.abs(g.ball.y - impactY) <= PERFECT_RANGE;
  ctx.strokeStyle = ballInPerfect
    ? "rgba(255,238,190,0.95)"
    : "rgba(230,194,122,0.55)";
  ctx.lineWidth = ballInPerfect ? 1.8 : 1;
  ctx.beginPath();
  ctx.moveTo(cx - impactHalfWidth, impactY);
  ctx.lineTo(cx + impactHalfWidth, impactY);
  ctx.stroke();
  ctx.strokeStyle = "rgba(230,194,122,0.45)";
  ctx.lineWidth = 1;
  [-PERFECT_RANGE, PERFECT_RANGE].forEach((dy) => {
    ctx.beginPath();
    ctx.moveTo(cx - impactHalfWidth, impactY + dy);
    ctx.lineTo(cx - impactHalfWidth + 14, impactY + dy);
    ctx.moveTo(cx + impactHalfWidth, impactY + dy);
    ctx.lineTo(cx + impactHalfWidth - 14, impactY + dy);
    ctx.stroke();
  });

  /* 3. Glow burst — drawn before batter/ball. */
  if (g.burst) {
    const elapsed = now - g.burst.startTime;
    if (elapsed < BURST_MS) {
      const t       = elapsed / BURST_MS;
      const eOut    = 1 - Math.pow(1 - t, 2);
      const intens  = g.burst.intensity;
      const radius  = (30 + eOut * 230) * intens;
      const alpha   = (1 - t) * 0.78 * intens;
      const burstGrad = ctx.createRadialGradient(
        g.burst.x, g.burst.y, 0,
        g.burst.x, g.burst.y, radius
      );
      burstGrad.addColorStop(0,   `rgba(255,235,180,${alpha})`);
      burstGrad.addColorStop(0.3, `rgba(230,194,122,${alpha * 0.65})`);
      burstGrad.addColorStop(0.7, `rgba(230,194,122,${alpha * 0.18})`);
      burstGrad.addColorStop(1,   "rgba(230,194,122,0)");
      ctx.fillStyle = burstGrad;
      ctx.beginPath();
      ctx.arc(g.burst.x, g.burst.y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (intens >= 0.9) {
        ctx.strokeStyle = `rgba(255,235,180,${(1 - t) * 0.6})`;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(g.burst.x, g.burst.y, radius * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,235,180,${(1 - t) * 0.45})`;
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const inner = radius * 0.18;
          const outer = radius * 0.95;
          ctx.beginPath();
          ctx.moveTo(g.burst.x + Math.cos(ang) * inner, g.burst.y + Math.sin(ang) * inner);
          ctx.lineTo(g.burst.x + Math.cos(ang) * outer, g.burst.y + Math.sin(ang) * outer);
          ctx.stroke();
        }
      }
    } else {
      g.burst = null;
    }
  }

  /* 4. Trail. */
  if (g.ball.state === "hit" && g.hitTrail.length > 1) {
    const trailRGB =
      g.ball.lastShot === "cover"     ? "150,210,180" :
      g.ball.lastShot === "pull"      ? "220,160,200" :
      g.ball.lastShot === "defensive" ? "200,200,200" :
                                        "244,219,166";
    ctx.lineCap = "round";
    for (let i = 1; i < g.hitTrail.length; i++) {
      const t  = i / g.hitTrail.length;
      const p1 = g.hitTrail[i - 1];
      const p2 = g.hitTrail[i];
      ctx.strokeStyle = `rgba(${trailRGB},${0.55 * t})`;
      ctx.lineWidth = BALL_RADIUS * 1.5 * t + 0.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  /* ── 5 + 6. Batsman + bat — semi-realistic, modern sports-UI style ──────
        Draw order is back-to-front so closer limbs naturally overlap the
        farther ones (depth without z-buffering):
          shadow → back leg + back pad → front leg + front pad → torso →
          back arm → helmet + grill → front arm → gloves → bat
        Front shapes use the brighter `KIT` tone; back shapes use the
        slightly desaturated `KIT_BACK` so the silhouette reads dimensional.

        Motion:
          • Wind-up  (0 → SWING_DELAY_MS): bat lifts ~9° farther back,
            torso leans a hair back too — anticipation.
          • Swing    (+ swingMs): shot-specific eased arc to follow angle;
            torso + shoulders rotate ~18 % of the bat-angle delta.
          • Follow-through (FOLLOW_THROUGH_MS): bat eases back to rest, body
            un-rotates — no abrupt stop.
        Game logic isn't affected (hit detection uses ady / time, not the
        bat's pixel angle), so this is a purely visual rewrite.            */
  const chosen        = g.bat.chosen ?? "straight";
  const followAngle   = FOLLOW_BY_SHOT[chosen];
  const swingMsBat    = SWING_MS_BY_SHOT[chosen] ?? BAT_SWING_MS;
  const easePow       = EASE_POW_BY_SHOT[chosen];
  const swingElapsed  = now - g.bat.swingStart;

  const FOLLOW_THROUGH_MS = 280;
  const WIND_UP_LIFT      = 0.16;   // ~9° extra back-lift during the wind-up

  const isInMotion =
    g.bat.swinging ||
    (g.bat.chosen !== null &&
     swingElapsed >= 0 &&
     swingElapsed < SWING_DELAY_MS + swingMsBat + FOLLOW_THROUGH_MS);

  const tDelay  = isInMotion ? Math.max(0, Math.min(swingElapsed / SWING_DELAY_MS, 1)) : 0;
  const tSwing  = isInMotion ? Math.max(0, Math.min((swingElapsed - SWING_DELAY_MS) / swingMsBat, 1)) : 0;
  const tFollow = isInMotion ? Math.max(0, Math.min((swingElapsed - SWING_DELAY_MS - swingMsBat) / FOLLOW_THROUGH_MS, 1)) : 0;

  const windUpEase = 1 - Math.pow(1 - tDelay, 2);
  const swingEase  = 1 - Math.pow(1 - tSwing, easePow);
  const followEase = 1 - Math.pow(1 - tFollow, 3);

  const peakBackLift = BAT_REST_ANGLE + WIND_UP_LIFT * windUpEase;
  const swungAngle   = peakBackLift + (followAngle - peakBackLift) * swingEase;
  const angle        = swungAngle  + (BAT_REST_ANGLE - swungAngle) * followEase;
  const bodyRot      = (angle - BAT_REST_ANGLE) * 0.18;
  const dropY        = chosen === "defensive" && isInMotion ? swingEase * DEFENSIVE_DROP_PX : 0;

  const armOriginY = batterY - 28;

  /* Palette — modern team-coloured cricket kit (red shirt, black pants,
     black helmet with a red cap stripe), matching the reference style.
     The colour split is what does most of the visual work: shirt vs.
     pants vs. pads gives a clear silhouette read at a distance. */
  const SHIRT      = "rgba(214, 38, 38, 0.97)";   // bright red shirt
  const SHIRT_BACK = "rgba(168, 26, 26, 0.95)";   // shaded red (back-side)
  const PANTS      = "rgba(26, 26, 32, 0.97)";    // near-black trousers
  const PANTS_BACK = "rgba(16, 16, 22, 0.95)";    // shaded pants (back leg)
  const PAD        = "rgba(248, 244, 230, 0.97)"; // off-white pad
  const PAD_DARK   = "rgba(214, 206, 184, 0.95)"; // shaded pad (back leg)
  const PAD_LINE   = "rgba(60, 46, 24, 0.35)";
  const HELMET     = "rgba(20, 20, 26, 0.97)";    // black shell
  const HELMET_CAP = "rgba(214, 38, 38, 0.95)";   // red top stripe / cap peak
  const HELMET_HI  = "rgba(95, 95, 105, 0.55)";   // soft top-left specular
  const GRILL      = "rgba(230, 220, 190, 0.75)";
  const GLOVE      = "rgba(30, 30, 36, 0.95)";    // dark gloves
  const GLOVE_HI   = "rgba(214, 38, 38, 0.55)";   // tiny red knuckle accent
  const SKIN       = "rgba(208, 168, 122, 0.92)"; // face behind grill
  const KIT_EDGE   = "rgba(20, 16, 10, 0.42)";    // outline

  ctx.lineCap  = "round";
  ctx.lineJoin = "round";

  // 5.1 — Ground shadow
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  ctx.beginPath();
  ctx.ellipse(batterX, batterY + 44, 32, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* Cricket-ready stance:
       • Feet planted at the SAME Y so weight reads as balanced (no stride).
       • Knees inset toward body centreline relative to the feet → visible
         bend that suggests the knee jutting forward (depth cue we can't
         draw directly, only imply via the inset).
       • Hip/waist lowered 2 px vs. an upright pose → slight crouch.
       Stance width is a touch wider than the previous version so the legs
       splay outward from knee to foot — a natural athletic squat shape. */
  // 5.2 — BACK leg (right, planted) — drawn first so front leg overlaps.
  //       Trousers are black; the shoe at the bottom is even darker so it
  //       reads as a separate boot.
  const backHipX = batterX + 5;
  const backHipY = batterY + 6;
  const backKneeX = batterX + 9;
  const backKneeY = batterY + 26;
  const backFootX = batterX + 14;
  const backFootY = batterY + 42;
  ctx.strokeStyle = PANTS_BACK;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(backHipX, backHipY);
  ctx.quadraticCurveTo(backHipX + 4, (backHipY + backKneeY) * 0.55, backKneeX, backKneeY);
  ctx.quadraticCurveTo(backKneeX + 4, (backKneeY + backFootY) * 0.5, backFootX, backFootY);
  ctx.stroke();
  // Back shoe — dark wedge
  ctx.fillStyle = "rgba(10,10,14,0.95)";
  ctx.beginPath();
  ctx.ellipse(backFootX + 2, backFootY + 2, 6, 2.6, 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Back pad — quadrilateral over the shin; outer edge curves to match
  // the shin's outward arc from inset knee to wider foot.
  ctx.fillStyle = PAD_DARK;
  ctx.beginPath();
  ctx.moveTo(backKneeX - 3.5, backKneeY - 3);
  ctx.lineTo(backKneeX + 4.5, backKneeY - 3);
  ctx.quadraticCurveTo(backFootX + 5, (backKneeY + backFootY) * 0.5, backFootX + 4, backFootY - 1);
  ctx.lineTo(backFootX - 4, backFootY - 1);
  ctx.quadraticCurveTo(backKneeX - 4, (backKneeY + backFootY) * 0.5, backKneeX - 3.5, backKneeY - 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PAD_LINE;
  ctx.lineWidth = 0.5;
  // Three pad straps — spaced down the shin
  [4, 9, 14].forEach((dy) => {
    ctx.beginPath();
    ctx.moveTo(backKneeX - 3 + dy * 0.10, backKneeY + dy - 1);
    ctx.lineTo(backFootX  + 3 + dy * 0.10, backKneeY + dy - 1);
    ctx.stroke();
  });

  // 5.3 — FRONT leg (left, planted) — black trousers + dark shoe, slightly
  //       brighter than the back leg as front-of-body lighting cue.
  const frontHipX = batterX - 6;
  const frontHipY = batterY + 6;
  const frontKneeX = batterX - 9;
  const frontKneeY = batterY + 26;
  const frontFootX = batterX - 16;
  const frontFootY = batterY + 42;
  ctx.strokeStyle = PANTS;
  ctx.lineWidth = 5.7;
  ctx.beginPath();
  ctx.moveTo(frontHipX, frontHipY);
  ctx.quadraticCurveTo(frontHipX - 4, (frontHipY + frontKneeY) * 0.55, frontKneeX, frontKneeY);
  ctx.quadraticCurveTo(frontKneeX - 4, (frontKneeY + frontFootY) * 0.5, frontFootX, frontFootY);
  ctx.stroke();
  // Front shoe
  ctx.fillStyle = "rgba(14,14,18,0.96)";
  ctx.beginPath();
  ctx.ellipse(frontFootX - 2, frontFootY + 2, 6, 2.6, -0.05, 0, Math.PI * 2);
  ctx.fill();
  // Front pad — mirror of the back pad geometry; brighter so it pops as
  // the front-most limb (depth cue).
  ctx.fillStyle = PAD;
  ctx.beginPath();
  ctx.moveTo(frontKneeX + 3.5, frontKneeY - 3);
  ctx.lineTo(frontKneeX - 4.5, frontKneeY - 3);
  ctx.quadraticCurveTo(frontFootX - 5, (frontKneeY + frontFootY) * 0.5, frontFootX - 4, frontFootY - 1);
  ctx.lineTo(frontFootX + 4, frontFootY - 1);
  ctx.quadraticCurveTo(frontKneeX + 4, (frontKneeY + frontFootY) * 0.5, frontKneeX + 3.5, frontKneeY - 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PAD_LINE;
  ctx.lineWidth = 0.5;
  [4, 9, 14].forEach((dy) => {
    ctx.beginPath();
    ctx.moveTo(frontKneeX + 3 - dy * 0.10, frontKneeY + dy - 1);
    ctx.lineTo(frontFootX  - 3 - dy * 0.10, frontKneeY + dy - 1);
    ctx.stroke();
  });

  // 5.4 — Upper body group — torso, arms, helmet, gloves, bat.
  //       Rotates around the hip pivot by `bodyRot`; the bat rotation is
  //       composed so the world-space bat angle equals `angle` exactly.
  //       Hip pivot lowered 2 px to match the deeper crouch of the new
  //       leg geometry — torso bottom sits flush on top of the hips.
  const hipX = batterX;
  const hipY = batterY + 6;
  ctx.save();
  ctx.translate(hipX, hipY + dropY);
  ctx.rotate(bodyRot);
  ctx.translate(-hipX, -hipY);

  /* Torso — narrow SIDE-profile silhouette. The front (face side, LEFT)
     is tucked inward; the back (RIGHT, closer to camera in this profile)
     extends slightly further so the silhouette reads as "we see the right
     side of the batter", not the full back. */
  const shoulderL = batterX - 9;      // narrower front shoulder (face side)
  const shoulderR = batterX + 12;     // back shoulder closer to camera
  const shoulderY = batterY - 33;
  const waistL    = batterX - 6;      // narrow front waist
  const waistR    = batterX + 8;      // back waist
  const waistY    = batterY + 6;
  const chestY    = batterY - 9;

  // Torso — RED shirt fill with subtle back-side shading + thin dark outline
  // so the silhouette pops cleanly against the pitch.
  ctx.fillStyle = SHIRT;
  ctx.beginPath();
  ctx.moveTo(shoulderL, shoulderY + 2);
  ctx.quadraticCurveTo(shoulderL - 1, chestY, waistL, waistY);
  ctx.lineTo(waistR, waistY);
  ctx.quadraticCurveTo(shoulderR + 1, chestY, shoulderR, shoulderY + 1);
  ctx.quadraticCurveTo((shoulderL + shoulderR) / 2, shoulderY - 4, shoulderL, shoulderY + 2);
  ctx.closePath();
  ctx.fill();
  // Back-side shading band
  ctx.fillStyle = SHIRT_BACK;
  ctx.beginPath();
  ctx.moveTo(batterX + 3, shoulderY);
  ctx.quadraticCurveTo(shoulderR + 1, chestY, waistR - 0.5, waistY);
  ctx.lineTo(batterX + 3, waistY);
  ctx.closePath();
  ctx.fill();
  // Dark silhouette outline
  ctx.strokeStyle = KIT_EDGE;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(shoulderL, shoulderY + 2);
  ctx.quadraticCurveTo(shoulderL - 1, chestY, waistL, waistY);
  ctx.moveTo(shoulderR, shoulderY + 1);
  ctx.quadraticCurveTo(shoulderR + 1, chestY, waistR, waistY);
  ctx.stroke();
  // Waist line — subtle horizontal where the shirt tucks into the pants
  ctx.strokeStyle = "rgba(20,16,10,0.45)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(waistL, waistY);
  ctx.lineTo(waistR, waistY);
  ctx.stroke();
  // Collar/neckline — small dark V at the top
  ctx.strokeStyle = "rgba(140,28,28,0.7)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(shoulderL + 4, shoulderY + 3);
  ctx.quadraticCurveTo(batterX - 2, shoulderY + 7, batterX + 2, shoulderY + 5);
  ctx.quadraticCurveTo(shoulderR - 1, shoulderY + 4, shoulderR - 3, shoulderY + 3);
  ctx.stroke();

  // Back arm — curves from back shoulder to the grip (long red sleeve).
  const gripX = batterX + BAT_HAND_OFFSET_X;
  const gripY = armOriginY;
  ctx.strokeStyle = SHIRT_BACK;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(shoulderR - 2, shoulderY + 2);
  ctx.quadraticCurveTo(shoulderR + 2, (shoulderY + gripY) / 2 + 3, gripX + 1.5, gripY + 1);
  ctx.stroke();

  /* Helmet — SIDE profile (we see the batter from their right side, so the
     face + grill are visible on the LEFT edge of the helmet and the back
     of the head curves out to the RIGHT). The dome is an asymmetric oval
     — narrower on the face side, fuller behind the head — so it reads as
     a turned profile, not a front-on circle. */
  const headCX  = batterX - 1;
  const headCY  = batterY - 50;
  const helmetR = 11;

  // Black helmet dome — egg-shape favouring back-of-head (right side)
  ctx.fillStyle = HELMET;
  ctx.beginPath();
  ctx.ellipse(headCX + 1.5, headCY, helmetR + 1, helmetR, 0, 0, Math.PI * 2);
  ctx.fill();
  // Red cap stripe across the top (wraps the upper arc of the dome)
  ctx.fillStyle = HELMET_CAP;
  ctx.beginPath();
  ctx.ellipse(headCX + 1.5, headCY, helmetR + 1, helmetR, 0, Math.PI * 1.04, Math.PI * 1.96);
  ctx.ellipse(headCX + 1.5, headCY, helmetR - 2.6, helmetR - 3.4, 0, Math.PI * 1.96, Math.PI * 1.04, true);
  ctx.closePath();
  ctx.fill();
  // Dome outline for crisp silhouette
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth   = 0.6;
  ctx.beginPath();
  ctx.ellipse(headCX + 1.5, headCY, helmetR + 1, helmetR, 0, 0, Math.PI * 2);
  ctx.stroke();

  // FACE — visible chin / jaw area on the LEFT edge of the helmet
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(headCX - 6, headCY + 2, 3.6, 5.0, 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Jaw outline (subtle)
  ctx.strokeStyle = "rgba(80,55,30,0.45)";
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.arc(headCX - 6, headCY + 2, 4.4, Math.PI * 0.40, Math.PI * 0.95);
  ctx.stroke();

  // GRILL — vertical bars on the LEFT side of the face area (profile)
  ctx.strokeStyle = GRILL;
  ctx.lineWidth   = 0.85;
  const grillX = headCX - 8;
  const grillTop = headCY - 3.5;
  const grillBot = headCY + 5;
  // Three vertical bars stacked tightly — profile grill silhouette
  for (let i = 0; i < 3; i++) {
    const dy = (grillBot - grillTop) * (0.18 + i * 0.32);
    ctx.beginPath();
    ctx.moveTo(grillX,     grillTop + dy);
    ctx.lineTo(grillX - 1, grillTop + dy);
    ctx.stroke();
  }
  // Frame line connecting the grill bars (curves around the front of the face)
  ctx.beginPath();
  ctx.moveTo(grillX, grillTop);
  ctx.quadraticCurveTo(grillX - 2.4, headCY + 1, grillX, grillBot);
  ctx.stroke();

  // Red cap specular highlight on the top
  ctx.fillStyle = "rgba(255,130,130,0.55)";
  ctx.beginPath();
  ctx.ellipse(headCX - 1, headCY - 6.5, 3.2, 1.4, -0.20, 0, Math.PI * 2);
  ctx.fill();
  // Soft black-dome highlight on the upper-back side
  ctx.fillStyle = HELMET_HI;
  ctx.beginPath();
  ctx.ellipse(headCX + 6, headCY - 4, 2.2, 1.3, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Neck profile — thin skin slice from the back-bottom of helmet to collar
  ctx.fillStyle = "rgba(174,134,96,0.92)";
  ctx.beginPath();
  ctx.moveTo(headCX - 2, headCY + 10);
  ctx.lineTo(headCX + 5, headCY + 10);
  ctx.lineTo(headCX + 4, headCY + 13);
  ctx.lineTo(headCX - 1, headCY + 13);
  ctx.closePath();
  ctx.fill();

  // Front arm — drawn AFTER helmet so it overlaps the helmet shadow,
  // selling "arms in front" depth. Bright red sleeve.
  ctx.strokeStyle = SHIRT;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(shoulderL + 2, shoulderY + 2);
  ctx.quadraticCurveTo(shoulderL - 1, (shoulderY + gripY) / 2 + 8, gripX - 1.5, gripY - 1);
  ctx.stroke();
  // Sleeve cuff — thin dark ring at the wrist where sleeve meets glove
  ctx.strokeStyle = "rgba(20,16,10,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(gripX - 4, gripY - 3);
  ctx.quadraticCurveTo(gripX, gripY - 1, gripX + 2, gripY - 2);
  ctx.stroke();

  // Gloves — dark overlapping bulbs at the grip (team-colour kit gloves).
  ctx.fillStyle = GLOVE;
  ctx.beginPath();
  ctx.ellipse(gripX - 1.5, gripY + 1, 4.4, 5.4,  0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.fillStyle = GLOVE;
  ctx.beginPath();
  ctx.ellipse(gripX + 2,   gripY - 1, 3.8, 4.7, -0.20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Red knuckle accent line (team-colour tape) — keeps gloves on-brand
  ctx.strokeStyle = GLOVE_HI;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(gripX - 3.5, gripY + 3.5);
  ctx.quadraticCurveTo(gripX, gripY + 1.5, gripX + 3.5, gripY + 1.5);
  ctx.stroke();

  /* ── Bat ── drawn inside the upper-body rotation so the grip stays
        attached to the gloves; counter-rotate by `bodyRot` first so the
        world-space bat angle equals exactly `angle`. */
  ctx.save();
  ctx.translate(gripX, gripY);
  ctx.rotate(angle - bodyRot);

  const handleLen = 18;
  const bladeLen  = 40;
  const bladeWHalf = 4;

  // Handle — leather wrap brown with a paler binding ring at the top
  ctx.fillStyle = "#6f5638";
  ctx.beginPath();
  ctx.rect(-2.3, -handleLen, 4.6, handleLen);
  ctx.fill();
  // Grip texture — thin diagonal cross-hatch lines
  ctx.strokeStyle = "rgba(40,28,12,0.55)";
  ctx.lineWidth = 0.4;
  for (let i = -handleLen + 2; i < 0; i += 3) {
    ctx.beginPath();
    ctx.moveTo(-2.0, i);
    ctx.lineTo(+2.0, i + 2);
    ctx.stroke();
  }
  // Top binding (splice between handle and blade)
  ctx.fillStyle = "rgba(60,42,22,0.85)";
  ctx.fillRect(-2.6, -handleLen - 1, 5.2, 1.4);

  // Blade — willow gold with subtle vertical-grain shading. Tapered
  // slightly toward the toe for a more bat-like silhouette.
  const swingPeak  = isInMotion ? Math.max(0, 1 - Math.abs(tSwing - 0.5) * 2.4) : 0;
  const bladeBlur  = 4 + swingPeak * 18;
  const bladeAlpha = 0.45 + swingPeak * 0.35;
  ctx.shadowColor  = `rgba(230,194,122,${bladeAlpha})`;
  ctx.shadowBlur   = bladeBlur;
  ctx.fillStyle    = "#E6C27A";
  ctx.beginPath();
  ctx.moveTo(-bladeWHalf,   -handleLen);
  ctx.lineTo(+bladeWHalf,   -handleLen);
  ctx.lineTo(+bladeWHalf - 0.5, -(handleLen + bladeLen) + 2);
  ctx.quadraticCurveTo(0, -(handleLen + bladeLen) + 3,
                       -bladeWHalf + 0.5, -(handleLen + bladeLen) + 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Edge bevels — soft willow grain
  ctx.strokeStyle = "rgba(140,100,55,0.30)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-bladeWHalf + 1.0, -handleLen);
  ctx.lineTo(-bladeWHalf + 0.7, -(handleLen + bladeLen) + 4);
  ctx.moveTo(+bladeWHalf - 1.0, -handleLen);
  ctx.lineTo(+bladeWHalf - 0.7, -(handleLen + bladeLen) + 4);
  ctx.stroke();
  // Centre spine
  ctx.strokeStyle = "rgba(160,118,68,0.45)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -(handleLen + 2));
  ctx.lineTo(0, -(handleLen + bladeLen - 4));
  ctx.stroke();
  // Toe seal
  ctx.strokeStyle = "rgba(80,55,25,0.45)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-bladeWHalf + 0.5, -(handleLen + bladeLen) + 2.5);
  ctx.quadraticCurveTo(0, -(handleLen + bladeLen) + 3.5,
                       +bladeWHalf - 0.5, -(handleLen + bladeLen) + 2.5);
  ctx.stroke();

  ctx.restore();   // restore bat transform
  ctx.restore();   // restore upper-body rotation

  /* 6b. Pitch target marker. */
  const b = g.ball;
  if (b.state === "incoming") {
    if (b.pitchedAt === null) {
      const tint =
        b.length === "short" ? "rgba(220,160,200,0.55)" :
        b.length === "full"  ? "rgba(150,210,180,0.55)" :
                               "rgba(230,194,122,0.55)";
      ctx.save();
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(b.x, b.pitchY, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else {
      const elapsed = now - b.pitchedAt;
      if (elapsed < 520) {
        const t = elapsed / 520;
        const r = 12 + t * 26;
        const alpha = (1 - t) * 0.7;
        const tint =
          b.length === "short" ? `rgba(220,160,200,${alpha})` :
          b.length === "full"  ? `rgba(150,210,180,${alpha})` :
                                 `rgba(230,194,122,${alpha})`;
        ctx.strokeStyle = tint;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        // pitchX is the *frozen* x at the moment of pitching — keeps the
        // expanding ring anchored at the actual impact point even though
        // the ball continues drifting laterally toward the batter.
        ctx.arc(b.pitchX, b.pitchY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /* 7. Ball — adds a brief scale-pop on impact (decays linearly to 1× over
        IMPACT_POP_MS) so contact lands with a visible "thud" of size. */
  if (b.state !== "settled") {
    let popScale = 1;
    if (b.impactPopUntil > now) {
      const remaining = (b.impactPopUntil - now) / IMPACT_POP_MS; // 1 → 0
      popScale = 1 + (IMPACT_POP_PEAK - 1) * remaining;
    }
    const r = BALL_RADIUS * ballPerspectiveScale(b.y, h) * popScale;

    // Baseline warm halo during flight — very subtle (alpha 0.10) so the
    // ball never reads as a hard arcade circle. Suppressed during the
    // post-impact halo window so the two don't stack and over-glow.
    if ((b.state === "incoming" || b.state === "hit") && now >= b.glowUntil) {
      const haloR = r * 2.0;
      const baseHaloGrad = ctx.createRadialGradient(b.x, b.y, r * 0.4, b.x, b.y, haloR);
      baseHaloGrad.addColorStop(0,    "rgba(255,225,170,0.10)");
      baseHaloGrad.addColorStop(0.6,  "rgba(255,210,150,0.040)");
      baseHaloGrad.addColorStop(1,    "rgba(255,210,150,0)");
      ctx.fillStyle = baseHaloGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (b.glowUntil > 0 && now < b.glowUntil) {
      const gt    = (b.glowUntil - now) / BALL_GLOW_MS;
      const haloR = r * (2.2 + 1.2 * (1 - gt));
      const haloA = 0.55 * gt;
      const haloGrad = ctx.createRadialGradient(b.x, b.y, r * 0.4, b.x, b.y, haloR);
      haloGrad.addColorStop(0,   `rgba(255,225,170,${haloA})`);
      haloGrad.addColorStop(0.6, `rgba(255,210,150,${haloA * 0.45})`);
      haloGrad.addColorStop(1,   "rgba(255,210,150,0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    const ballGrad = ctx.createRadialGradient(b.x - r * 0.25, b.y - r * 0.25, 1, b.x, b.y, r);
    ballGrad.addColorStop(0,   "#f4dba6");
    ballGrad.addColorStop(0.6, "#d4ad75");
    ballGrad.addColorStop(1,   "#8a6841");
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(b.x - r * 0.6, b.y);
    ctx.lineTo(b.x + r * 0.6, b.y);
    ctx.stroke();
    if (b.state === "incoming" && b.y > pitchTopY && b.y < stumpsY) {
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath();
      ctx.ellipse(b.x, Math.min(b.y + r * 1.5, stumpsY - 4), r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* 7b. Contact flash — bright white sparkle at the contact point, very
        short lifetime so it reads as the "thwock" of impact without
        polluting the longer-lived burst glow. Scales with timing power. */
  if (g.contactFlash) {
    const elapsed = now - g.contactFlash.startTime;
    if (elapsed < CONTACT_FLASH_MS) {
      const t = elapsed / CONTACT_FLASH_MS;
      const intensity = g.contactFlash.intensity;
      const alpha = (1 - t) * 0.9 * intensity;
      const radius = (10 + t * 30) * intensity;
      const fgrad = ctx.createRadialGradient(
        g.contactFlash.x, g.contactFlash.y, 0,
        g.contactFlash.x, g.contactFlash.y, radius
      );
      fgrad.addColorStop(0,    `rgba(255,255,255,${alpha})`);
      fgrad.addColorStop(0.35, `rgba(255,248,220,${alpha * 0.55})`);
      fgrad.addColorStop(1,    "rgba(255,248,220,0)");
      ctx.fillStyle = fgrad;
      ctx.beginPath();
      ctx.arc(g.contactFlash.x, g.contactFlash.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      g.contactFlash = null;
    }
  }

  /* 8. Stumps (foreground). When wicketFallAt is set, the stumps tip from
        their bases (eased over WICKET_FALL_MS) and the bails fly off with
        a gravity-driven arc + spin. */
  const stumpsTopY = stumpsY - STUMPS_HEIGHT;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(batterX - (STUMP_SPACING + 8), stumpsY - 2, (STUMP_SPACING + 8) * 2, 4);
  const stumpColor = "rgba(245,225,180,0.92)";
  ctx.strokeStyle = stumpColor;
  ctx.lineCap = "round";

  if (g.wicketFallAt !== null) {
    const wfElapsed = now - g.wicketFallAt;
    const wfT = Math.min(wfElapsed / WICKET_FALL_MS, 1);
    const wfEase = 1 - Math.pow(1 - wfT, 2);    // ease-out quadratic
    // Final angles in radians — outer stumps splay out, middle tips slightly
    // forward. Rotation is around each stump's base on the crease line.
    const finalAngles = [-0.85, 0.45, 0.95];
    ctx.lineWidth = 3.5;
    for (let i = -1; i <= 1; i++) {
      const sx = batterX + i * STUMP_SPACING;
      const angle = finalAngles[i + 1] * wfEase;
      ctx.save();
      ctx.translate(sx, stumpsY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -STUMPS_HEIGHT);
      ctx.stroke();
      ctx.restore();
    }
    // Bails — two of them, midpoint position evolves under gravity, spin
    // continues until they hit the ground (clamped). Angle freezes when
    // they settle so they don't keep spinning on the floor.
    const bails = [
      { x0: batterX - STUMP_SPACING / 2 - 1, y0: stumpsTopY,
        vx: -0.10, vy: -0.18, gravity: 0.00075, angVel: -0.008,
        len: STUMP_SPACING + 2 },
      { x0: batterX + STUMP_SPACING / 2 + 1, y0: stumpsTopY,
        vx: +0.10, vy: -0.18, gravity: 0.00075, angVel: +0.008,
        len: STUMP_SPACING + 2 },
    ];
    const groundY = stumpsY - 1;
    ctx.lineWidth = 2;
    for (const b of bails) {
      const t  = wfElapsed;
      let bx   = b.x0 + b.vx * t;
      let by   = b.y0 + b.vy * t + 0.5 * b.gravity * t * t;
      let landed = false;
      if (by > groundY) { by = groundY; landed = true; }
      // Once the bail hits the ground, stop accumulating spin.
      const angT = landed ? Math.min(t, WICKET_FALL_MS) : t;
      const ba   = b.angVel * angT;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ba);
      ctx.beginPath();
      ctx.moveTo(-b.len / 2, 0);
      ctx.lineTo(+b.len / 2, 0);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // Normal upright stumps + bails
    ctx.lineWidth = 3.5;
    for (let i = -1; i <= 1; i++) {
      const sx = batterX + i * STUMP_SPACING;
      ctx.beginPath();
      ctx.moveTo(sx, stumpsY);
      ctx.lineTo(sx, stumpsTopY);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(batterX - STUMP_SPACING - 2, stumpsTopY);
    ctx.lineTo(batterX,                     stumpsTopY);
    ctx.moveTo(batterX,                     stumpsTopY);
    ctx.lineTo(batterX + STUMP_SPACING + 2, stumpsTopY);
    ctx.stroke();
  }

  ctx.restore(); // end shake

  /* Lighting + vignette overlays — outside shake, stable lens. */
  if (layers) {
    ctx.drawImage(layers.lighting, 0, 0);
    ctx.drawImage(layers.vignette, 0, 0);
  }

  /* Perfect-shot screen flash. */
  if (g.perfectFlash) {
    const fElapsed = now - g.perfectFlash.startTime;
    if (fElapsed < PERFECT_FLASH_MS) {
      const fT = fElapsed / PERFECT_FLASH_MS;
      const fAlpha = Math.pow(1 - fT, 2) * 0.22;
      ctx.fillStyle = `rgba(255,235,180,${fAlpha})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      g.perfectFlash = null;
    }
  }

  /* Shot message — overlay, not shaken. Two stacked lines when a `timing`
     label is present: the timing reads as the primary signal (large), with
     the shot description sitting smaller underneath.
     Eased scale-in (cubic) + eased fade-out (quadratic) — removes the
     sharp pop of the previous linear curves. */
  if (g.message) {
    const elapsed = now - g.message.setAt;
    const t = elapsed / g.message.duration;
    if (t < 1) {
      // Scale-in: 1.18 → 1.00 over first 22%, eased with cubic ease-out
      // (much gentler than the prior 1.32 → 1.00 linear in 18%).
      let sIn = 1;
      if (t < 0.22) {
        const p = t / 0.22;
        const e = 1 - Math.pow(1 - p, 3);
        sIn = 1.18 - 0.18 * e;
      }
      // Fade-out: ease-in quadratic over last 24%, so the text "drifts off"
      // instead of clipping at a hard linear ramp.
      let fade = 1;
      if (t > 0.76) {
        const p = (t - 0.76) / 0.24;
        fade = 1 - p * p;
      }
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.translate(w / 2, h * 0.20);
      ctx.scale(sIn, sIn);

      // Timing primary — "PERFECT" / "GOOD" / "MISS"
      if (g.message.timing) {
        const tTint = g.message.timingTint || g.message.tint;
        ctx.fillStyle  = tTint;
        ctx.shadowColor = tTint;
        ctx.shadowBlur = 30;
        ctx.font = "700 60px ui-monospace, monospace";
        ctx.fillText(g.message.timing, 0, 0);
      }

      // Shot description — smaller, sits below the timing label.
      ctx.fillStyle  = g.message.tint;
      ctx.shadowColor = g.message.tint;
      ctx.shadowBlur = 18;
      ctx.font = "700 26px ui-monospace, monospace";
      const descY = g.message.timing ? 38 : 0;
      ctx.fillText(g.message.text, 0, descY);

      ctx.restore();
    } else {
      g.message = null;
    }
  }
}
