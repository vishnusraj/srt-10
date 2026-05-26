/* ── Cricket game: bowler animation ────────────────────────────────────────
   Lightweight bowler module. Three phases drive a run-up → delivery →
   follow-through sequence; updateBowler() is called every engine tick and
   returns true on the single frame the ball should be released. No sprites
   or libraries — pure canvas shapes, transform-only animation.

   Integration points:
     • engine.ts  — owns the BowlerState lifetime via GameState, calls
                    updateBowler() each tick, spawns the ball on release.
     • state.ts   — spawnBall() reads bowlerReleasePoint() for spawn coords.
     • render.ts  — calls renderBowler() between the pitch scene and the
                    foreground game elements (impact zone, batter, ball). */

import { PITCH_TOP_Y_FRAC } from "./config";
import type { BowlerState } from "./types";

/* ── Timings ──────────────────────────────────────────────────────────────
   Sum (approach + delivery) sits inside the existing BALL_RESET_MS budget
   so the total inter-ball cadence is unchanged.                           */
export const BOWLER_APPROACH_MS      = 600;
export const BOWLER_DELIVERY_MS      = 250;
export const BOWLER_FOLLOWTHROUGH_MS = 280;

export function createBowlerState(): BowlerState {
  return { phase: "idle", phaseStart: 0 };
}

/** Begin the approach. Called by the engine when the next ball is due. */
export function startBowlerApproach(b: BowlerState, now: number): void {
  b.phase      = "approaching";
  b.phaseStart = now;
}

/** Advance the bowler. Returns true on the single frame the ball releases. */
export function updateBowler(b: BowlerState, now: number): boolean {
  if (b.phase === "idle") return false;

  let released = false;

  if (b.phase === "approaching") {
    const elapsed = now - b.phaseStart;
    if (elapsed >= BOWLER_APPROACH_MS) {
      b.phase      = "delivering";
      b.phaseStart = now;
    }
  }
  if (b.phase === "delivering") {
    const elapsed = now - b.phaseStart;
    if (elapsed >= BOWLER_DELIVERY_MS) {
      released     = true;
      b.phase      = "followThrough";
      b.phaseStart = now;
    }
  }
  if (b.phase === "followThrough") {
    const elapsed = now - b.phaseStart;
    if (elapsed >= BOWLER_FOLLOWTHROUGH_MS) {
      b.phase = "idle";
    }
  }
  return released;
}

/** Hand position at release frame — used by spawnBall as the ball origin. */
export function bowlerReleasePoint(w: number, h: number): { x: number; y: number } {
  return {
    x: w * 0.5,
    y: h * PITCH_TOP_Y_FRAC - 8,
  };
}

/* ── Render ───────────────────────────────────────────────────────────────
   Minimal silhouette at the far end of the pitch. Forward lean grows
   through the approach; bowling arm rotates over and through during the
   delivery. Tiny because we're at the far end of perspective.             */
export function renderBowler(
  ctx: CanvasRenderingContext2D,
  b: BowlerState,
  now: number,
  w: number,
  h: number,
): void {
  if (b.phase === "idle") return;

  const baseX   = w * 0.5;
  const startY  = h * PITCH_TOP_Y_FRAC - 28;   // off-screen-ish (above the pitch)
  const creaseY = h * PITCH_TOP_Y_FRAC + 6;    // bowler's crease (just past the far stumps)

  let bodyY     = creaseY;
  let strideT   = 0;             // -1..1 sine for leg stride
  let leanAngle = 0;              // forward lean (radians)
  let armAngle  = 0;              // 0 = overhead, π = released down/forward
  let opacity   = 1;

  if (b.phase === "approaching") {
    const elapsed = now - b.phaseStart;
    const t = Math.min(elapsed / BOWLER_APPROACH_MS, 1);
    const eased = 1 - Math.pow(1 - t, 2);     // ease-out
    bodyY     = startY + (creaseY - startY) * eased;
    strideT   = Math.sin(elapsed * 0.030);
    leanAngle = 0.14 * eased;
    opacity   = Math.min(1, t * 2);           // fade in over first half
  } else if (b.phase === "delivering") {
    const elapsed = now - b.phaseStart;
    const t = Math.min(elapsed / BOWLER_DELIVERY_MS, 1);
    // Tiny vertical hop at the bound stride
    bodyY     = creaseY - Math.sin(t * Math.PI) * 3;
    leanAngle = 0.22 + t * 0.10;
    armAngle  = Math.PI * t;                  // 0 → π over the delivery
  } else if (b.phase === "followThrough") {
    const elapsed = now - b.phaseStart;
    const t = Math.min(elapsed / BOWLER_FOLLOWTHROUGH_MS, 1);
    bodyY     = creaseY + t * 4;
    leanAngle = 0.34 - t * 0.34;
    armAngle  = Math.PI;
    opacity   = 1 - t;                        // fade out smoothly
  }

  // Proportions — small because the bowler is at the far end of perspective.
  const HEAD_R   = 4;
  const TORSO_H  = 14;
  const TORSO_HW = 4;
  const LEG_H    = 12;
  const ARM_LEN  = 14;

  const playerColor = `rgba(245,236,212,${0.92 * opacity})`;
  const playerEdge  = `rgba(0,0,0,${0.35 * opacity})`;

  // Ground shadow
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.45 * opacity})`;
  ctx.beginPath();
  ctx.ellipse(baseX, bodyY + 2, 9, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(baseX, bodyY);
  ctx.rotate(leanAngle * 0.4);                // forward lean
  ctx.lineCap  = "round";
  ctx.lineJoin = "round";

  // Legs — stride animation (alternating advance / settle)
  ctx.strokeStyle = playerColor;
  ctx.lineWidth   = 3.5;
  const footOffset = strideT * 3;
  // Front leg
  ctx.beginPath();
  ctx.moveTo(-2, -TORSO_H);
  ctx.lineTo(-3, -LEG_H / 2 - strideT);
  ctx.lineTo(-4 + footOffset, 0);
  ctx.stroke();
  // Back leg
  ctx.beginPath();
  ctx.moveTo( 2, -TORSO_H);
  ctx.lineTo( 3, -LEG_H / 2 + strideT);
  ctx.lineTo( 4 - footOffset, 0);
  ctx.stroke();

  // Torso (filled, narrowing toward the waist)
  ctx.fillStyle = playerColor;
  const torsoTopY = -(LEG_H + TORSO_H);
  const torsoBotY = -LEG_H;
  ctx.beginPath();
  ctx.moveTo(-TORSO_HW - 0.5, torsoTopY);
  ctx.lineTo( TORSO_HW + 0.5, torsoTopY);
  ctx.lineTo( TORSO_HW - 1.5, torsoBotY);
  ctx.lineTo(-TORSO_HW + 1.5, torsoBotY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = playerEdge;
  ctx.lineWidth   = 0.6;
  ctx.stroke();

  // Head
  ctx.fillStyle = playerColor;
  ctx.beginPath();
  ctx.arc(0, torsoTopY - HEAD_R, HEAD_R, 0, Math.PI * 2);
  ctx.fill();

  // Non-bowling arm — hangs slightly to the side
  ctx.strokeStyle = playerColor;
  ctx.lineWidth   = 2.4;
  ctx.beginPath();
  ctx.moveTo(-2.5, torsoTopY + 2);
  ctx.lineTo(-5,   torsoBotY - 1);
  ctx.stroke();

  // Bowling arm — windmill rotation around the shoulder.
  //   armAngle = 0     → arm points straight UP (overhead, pre-delivery)
  //   armAngle = π/2   → arm horizontal (passing-through frame)
  //   armAngle = π     → arm points DOWN (released / follow-through)
  const shoulderX = 2.5;
  const shoulderY = torsoTopY + 2;
  const handX = shoulderX + Math.sin(armAngle) * ARM_LEN;
  const handY = shoulderY - Math.cos(armAngle) * ARM_LEN;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  ctx.restore();
}
