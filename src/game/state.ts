/* ── Cricket game: pure state logic ────────────────────────────────────────
   Everything in this file is side-effect free (no React, no DOM, no audio).
   It operates on the GameState shape and returns mutated state or computed
   classifications. The engine module calls these from inside its rAF loop
   and from its input handlers. */

import type { GameState, Line, Length, Shot, Mismatch, ShotResult } from "./types";
import { createBowlerState, bowlerReleasePoint } from "./bowler";
import {
  INITIAL_BALL_SPEED,
  LINE_OFFSETS,
  PITCH_Y_BY_LENGTH,
  PERFECT_RANGE,
  EARLY_RANGE,
  LATE_RANGE,
  DEFENSIVE_RANGE,
  PITCH_TOP_Y_FRAC,
  PITCH_NARROW_FRAC,
  PITCH_WIDE_FRAC,
  STUMPS_Y_FRAC,
  BALL_SPAWN_VY_FACTOR,
  BALL_SPEED_VARIATION,
  FAST_DELIVERY_CHANCE,
  FAST_DELIVERY_MULT,
  BALL_VY_CAP_HEADROOM,
  BALL_LINE_DRIFT_FRAMES,
  BALL_SWING_RANGE,
  BALL_SWING_CHANCE,
  BALL_PERSPECTIVE_FAR,
  BALL_PERSPECTIVE_NEAR,
  POWER_PERFECT,
  POWER_EARLY,
  POWER_LATE,
  POWER_DEFENSIVE_END,
  BALL_LENGTH_SPEED_MULT,
} from "./config";

/* ── Factory ────────────────────────────────────────────────────────────── */

export function createGameState(initialSpeed: number = INITIAL_BALL_SPEED): GameState {
  return {
    ball: {
      x: 0, y: 0, vx: 0, vy: 0,
      ax: 0,
      state: "settled",
      speed: initialSpeed,
      vyCap: initialSpeed,
      line: "middle",
      length: "good",
      pitchY: 0,
      pitchX: 0,
      pitchedAt: null,
      lastShot: null,
      glowUntil: 0,
      impactPopUntil: 0,
    },
    bat:  { swinging: false, swingStart: 0, chosen: null },
    message: null,
    resetScheduledAt: null,
    hitTrail: [],
    shake: null,
    burst: null,
    contactFlash: null,
    zoneFlash: null,
    perfectFlash: null,
    crowdFlash: null,
    wicketFallAt: null,
    slowMoUntil: 0,
    freezeUntil: 0,
    bowler: createBowlerState(),
  };
}

/* ── Timing → power scalar ─────────────────────────────────────────────────
   Maps the swing's absolute timing error (px from impactY) to a velocity
   multiplier applied to the ball after contact. Tighter the timing, the
   more power — mistimed shots leak energy. Scoring is untouched; only
   the post-hit ball physics change. */
export function timingPower(ady: number): number {
  if (ady <= PERFECT_RANGE) return POWER_PERFECT;
  if (ady <= EARLY_RANGE)   return POWER_EARLY;
  if (ady <= LATE_RANGE)    return POWER_LATE;
  return POWER_DEFENSIVE_END;
}

/* ── Timing → human-readable label + tint ──────────────────────────────────
   Drives the big "PERFECT" / "GOOD" / "MISS" feedback that renders above
   the shot description. Three-bucket so the feedback reads at a glance:
     ≤ PERFECT_RANGE                → PERFECT (bright gold)
     ≤ LATE_RANGE (above perfect)   → GOOD    (cool green)
     anything else                  → MISS    (red) */
export interface TimingLabel {
  label: string;
  tint:  string;
}
export function timingLabel(ady: number): TimingLabel {
  if (ady <= PERFECT_RANGE) return { label: "PERFECT", tint: "rgba(255,235,180,1)" };
  if (ady <= LATE_RANGE)    return { label: "GOOD",    tint: "rgba(150,210,180,0.95)" };
  return                           { label: "MISS",    tint: "rgba(255,120,120,0.95)" };
}

/* ── Delivery spawn ─────────────────────────────────────────────────────── */

export function spawnBall(g: GameState, w: number, h: number): void {
  // Line variation — off / middle / leg
  const r = Math.random();
  const line: Line = r < 0.34 ? "middle" : r < 0.67 ? "off" : "leg";
  // Length variation — drives the pitch marker the player reads to pick a shot
  const lr = Math.random();
  const length: Length = lr < 0.33 ? "short" : lr < 0.7 ? "good" : "full";

  /* Per-delivery peak velocity:
       base × random variation × optional fast-mult × length multiplier.
     Short balls come faster, full balls a touch slower — combined with
     BALL_BOUNCE_DAMPING on pitch impact this gives each length its own
     read off the bowler's hand. */
  const variation = 1 + (Math.random() * 2 - 1) * BALL_SPEED_VARIATION;
  const fastMult  = Math.random() < FAST_DELIVERY_CHANCE ? FAST_DELIVERY_MULT : 1;
  const lengthMult = BALL_LENGTH_SPEED_MULT[length];
  const peakVy    = g.ball.speed * variation * fastMult * lengthMult;

  /* Lateral drift (pseudo-3D depth):
       Ball spawns at the centre of the pitch — the bowler's release point
       — and drifts laterally to land on the chosen line by the time it
       reaches the batter. vx is computed so the ball arrives at the line
       offset around BALL_LINE_DRIFT_FRAMES into its flight.
     Swing curve:
       Optional small horizontal acceleration; produces a subtle curving
       trajectory on top of the linear line-drift.                          */
  /* Ball now spawns at the bowler's hand position — this lets the ball
     visually leave the bowler instead of dropping from above the viewport.
     Lateral drift still ramps the ball onto the chosen line by the time
     it reaches the batter. */
  const release  = bowlerReleasePoint(w, h);
  const spawnX   = release.x;
  const targetX  = w * 0.5 + LINE_OFFSETS[line];
  const lateralVx = (targetX - spawnX) / BALL_LINE_DRIFT_FRAMES;
  const hasSwing  = Math.random() < BALL_SWING_CHANCE;
  const swingAx   = hasSwing ? (Math.random() * 2 - 1) * BALL_SWING_RANGE : 0;

  g.ball.x  = spawnX;
  g.ball.y  = release.y;
  g.ball.vx = lateralVx;
  g.ball.vy = peakVy * BALL_SPAWN_VY_FACTOR;
  g.ball.ax = swingAx;
  g.ball.vyCap     = peakVy * BALL_VY_CAP_HEADROOM;
  g.ball.state     = "incoming";
  g.ball.line      = line;
  g.ball.length    = length;
  g.ball.pitchY    = h * PITCH_Y_BY_LENGTH[length];
  g.ball.pitchX    = spawnX;     // overwritten when the ball actually pitches
  g.ball.pitchedAt = null;
  g.ball.lastShot  = null;
  g.ball.glowUntil = 0;
  g.resetScheduledAt = null;
  g.hitTrail = [];
  // Fresh delivery — stumps reset upright for the new ball.
  g.wicketFallAt = null;
}

/* ── Shot classification (timing-only fallback) ─────────────────────────── */

export function classifyShot(adx: number): { shot: Shot; runs: number; label: string; tint: string } {
  if (adx <= PERFECT_RANGE)
    return { shot: "straight",  runs: 6,                            label: "STRAIGHT DRIVE",  tint: "rgba(230,194,122,1)"   };
  if (adx <= EARLY_RANGE)
    return { shot: "cover",     runs: 4,                            label: "COVER DRIVE",     tint: "rgba(150,210,180,0.95)" };
  if (adx <= LATE_RANGE)
    return { shot: "pull",      runs: Math.random() < 0.5 ? 4 : 6,  label: "PULL SHOT",       tint: "rgba(220,160,200,0.95)" };
  if (adx <= DEFENSIVE_RANGE)
    return { shot: "defensive", runs: 1,                            label: "DEFENSIVE",       tint: "rgba(200,200,200,0.85)" };
  return   { shot: "miss",      runs: 0,                            label: "MISS",            tint: "rgba(255,120,120,0.92)" };
}

/* Classify how well the chosen shot fits the delivery.
     - "severe" : length mismatch — drive on short, pull on full → wicket risk
     - "mild"   : line mismatch (cover on leg, pull on off)     → edge risk
     - "optimal": correct length-shot AND correct line-shot     → premium read
     - null     : compatible (defensive, or natural play)
   "severe" outranks all others; "optimal" requires both axes to be ideal. */
export function detectMismatch(chosen: Shot, length: Length, line: Line): Mismatch {
  if (chosen === "defensive") return null;

  // Severe (length-based) — keeps the existing wicket-risk pairings.
  if (length === "short" && (chosen === "straight" || chosen === "cover")) return "severe";
  if (length === "full"  && chosen === "pull") return "severe";

  // Mild (line-based) — wrong side of the wicket for the shot picked.
  const lineMismatch =
    (chosen === "cover" && line === "leg") ||
    (chosen === "pull"  && line === "off");

  // Optimal: shot matches length intent AND line intent.
  const lengthIdeal =
    (length === "short" && chosen === "pull") ||
    (length === "full"  && (chosen === "straight" || chosen === "cover"));
  const lineIdeal =
    (chosen === "straight" && line === "middle") ||
    (chosen === "cover"    && line === "off")    ||
    (chosen === "pull"     && line === "leg");

  if (lengthIdeal && lineIdeal) return "optimal";
  if (lineMismatch)             return "mild";
  return null;
}

/* Resolve a keyboard-chosen shot against ball length, line, AND timing.
   Decision tiers (in evaluation order):
     1. ady > DEFENSIVE_RANGE          → MISS
     2. severe mismatch (length)       → BOWLED on bad timing, JAMMED on perfect
     3. ady > LATE_RANGE               → MIS-HIT (forced defensive)
     4. mild mismatch + non-perfect    → EDGED   (forced defensive)
     5. optimal read (length + line)   → premium label + brighter tint + bonus
     6. natural play                   → standard label + runs                */
export function resolveKeyboardShot(
  chosen: Shot,
  length: Length,
  line: Line,
  ady: number
): ShotResult {
  const MISS    = "rgba(255,120,120,0.92)";
  const GRAY    = "rgba(200,200,200,0.85)";
  const GOLD    = "rgba(230,194,122,1)";
  const GREEN   = "rgba(150,210,180,0.95)";
  const PINK    = "rgba(220,160,200,0.95)";
  const RED     = "rgba(255,90,90,0.95)";
  // Brighter tints reserved for optimal reads — kept distinct from the
  // baseline so the player can tell "I picked the right shot" at a glance.
  const GOLD_HI  = "rgba(255,232,168,1)";
  const GREEN_HI = "rgba(190,235,210,1)";
  const PINK_HI  = "rgba(238,190,220,1)";

  if (ady > DEFENSIVE_RANGE) {
    return { shot: "miss", runs: 0, label: "MISS", tint: MISS, wicket: false, optimal: false };
  }

  const mismatch = detectMismatch(chosen, length, line);

  // Length mismatch: drive on short / pull on full. High wicket risk; only
  // perfect timing rescues it into a defensive jam.
  if (mismatch === "severe") {
    if (ady > PERFECT_RANGE) {
      return { shot: "miss", runs: 0, label: "BOWLED!", tint: RED, wicket: true, optimal: false };
    }
    return { shot: "defensive", runs: 1, label: "JAMMED · DEFENSIVE", tint: GRAY, wicket: false, optimal: false };
  }

  // Timing outside the late window — the shot still connects but the body
  // shape collapses into a defensive prod regardless of intent.
  if (ady > LATE_RANGE) {
    return { shot: "defensive", runs: 1, label: "MIS-HIT", tint: GRAY, wicket: false, optimal: false };
  }

  // Line mismatch + non-perfect timing — thin edge.
  if (mismatch === "mild" && ady > EARLY_RANGE) {
    return { shot: "defensive", runs: 1, label: "EDGED", tint: GRAY, wicket: false, optimal: false };
  }

  // Optimal: chosen shot fits BOTH length and line, with timing within the
  // EARLY window. Premium label + brighter tint; runs are unchanged so the
  // scoring system isn't touched — the reward is the read, not the maths.
  const isOptimal = mismatch === "optimal" && ady <= EARLY_RANGE;

  switch (chosen) {
    case "straight":
      return {
        shot: "straight",
        runs: 6,
        label: isOptimal ? "CLASSIC STRAIGHT DRIVE" : "STRAIGHT DRIVE",
        tint:  isOptimal ? GOLD_HI : GOLD,
        wicket: false,
        optimal: isOptimal,
      };
    case "cover":
      return {
        shot: "cover",
        runs: 4,
        label: isOptimal ? "TEXTBOOK COVER DRIVE" : "COVER DRIVE",
        tint:  isOptimal ? GREEN_HI : GREEN,
        wicket: false,
        optimal: isOptimal,
      };
    case "pull":
      return {
        shot: "pull",
        runs: Math.random() < 0.5 ? 4 : 6,
        label: isOptimal ? "MUSCULAR PULL" : "PULL SHOT",
        tint:  isOptimal ? PINK_HI : PINK,
        wicket: false,
        optimal: isOptimal,
      };
    case "defensive":
      return {
        shot: "defensive",
        runs: 1,
        label: "DEFENSIVE",
        tint: GRAY,
        wicket: false,
        optimal: false,    // defensive is never "optimal" — always a holding shot
      };
    default:
      return { shot: "miss", runs: 0, label: "MISS", tint: MISS, wicket: false, optimal: false };
  }
}

/* Apply shot velocity to the ball, scaled by a power multiplier derived
   from the swing's timing quality (see timingPower). The base direction
   per shot is unchanged from the original — only magnitude scales. */
export function applyShotVelocity(g: GameState, shot: Shot, power: number = 1): void {
  switch (shot) {
    case "straight":  g.ball.vx = 0;             g.ball.vy = (-22 - g.ball.speed * 0.3) * power; break;
    case "cover":     g.ball.vx = -18 * power;   g.ball.vy = -14 * power;                       break;
    case "pull":      g.ball.vx = +16 * power;   g.ball.vy = -14 * power;                       break;
    case "defensive": g.ball.vx = 0;             g.ball.vy = -4  * power;                       break;
    case "miss":                                                                                 break;
  }
}

/* ── Perspective helpers ────────────────────────────────────────────────── */

/* Linear interpolation of pitch width at any y (top-narrow → bottom-wide). */
export function pitchHalfWidthAt(y: number, w: number, h: number): number {
  const topY = h * PITCH_TOP_Y_FRAC;
  const botY = h * STUMPS_Y_FRAC;
  const t = Math.max(0, Math.min(1, (y - topY) / (botY - topY)));
  const halfTop = w * PITCH_NARROW_FRAC;
  const halfBot = w * PITCH_WIDE_FRAC;
  return halfTop + (halfBot - halfTop) * t;
}

/* Ball perspective scale — small far away, large close to camera. The wider
   FAR → NEAR gap sells the pseudo-3D depth: the ball reads as a distant
   speck at release and balloons toward the batter as it travels. */
export function ballPerspectiveScale(y: number, h: number): number {
  const topY = h * PITCH_TOP_Y_FRAC;
  const botY = h * STUMPS_Y_FRAC;
  const t = Math.max(0, Math.min(1, (y - topY) / (botY - topY)));
  return BALL_PERSPECTIVE_FAR + (BALL_PERSPECTIVE_NEAR - BALL_PERSPECTIVE_FAR) * t;
}
