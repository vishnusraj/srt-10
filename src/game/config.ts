/* ── Cricket game: configuration constants ────────────────────────────────
   All tunable numbers in one place. Grouped by concern; values unchanged
   from the original monolithic GameOverlay implementation. */

import type { Line, Length, Shot, Zone } from "./types";

/* ── Cinematic transition ─────────────────────────────────────────────────── */
export const EASE              = "cubic-bezier(0.16, 1, 0.3, 1)";
export const PAGE_TRANS_MS     = 700;
export const OVERLAY_FADE_MS   = 600;
export const PAGE_BLUR_PX      = 10;
export const PAGE_ZOOM_SCALE   = 1.08;
export const APP_CONTENT_ID    = "app-content";

/* ── Scoring + timing windows ─────────────────────────────────────────────── */
/* Perfect window tightened so a clean hit feels earned — rewards precision. */
export const PERFECT_RANGE      = 14;
export const EARLY_RANGE        = 50;
export const LATE_RANGE         = 80;
export const DEFENSIVE_RANGE    = 130;
/* `INITIAL_BALL_SPEED` and `MAX_BALL_SPEED` define the *peak* velocity a
   delivery will reach after acceleration — not the spawn velocity.        */
export const INITIAL_BALL_SPEED = 7.5;
export const MAX_BALL_SPEED     = 14;
export const SPEED_INCREMENT    = 0.30;
export const GRAVITY            = 0.55;
export const BAT_SWING_MS       = 220;
/* Brief pause after a delivery completes BEFORE the bowler begins their
   next run-up. The bowler animation itself (~850 ms) supplies the rest of
   the inter-ball cadence, so total cycle ≈ same as the pre-bowler 900 ms. */
export const BALL_RESET_MS      = 80;
export const BALL_RADIUS        = 8;

/* ── Ball flight physics (acceleration + variation) ───────────────────────
   - Each frame the ball.vy grows by BALL_ACCEL while the ball is in flight,
     so it starts slow off the bowler's hand and is fastest near the batter.
   - BALL_SPAWN_VY_FACTOR sets the initial vy as a fraction of that
     delivery's peak; lower = slower start, longer "reading window".
   - BALL_SPEED_VARIATION jitters each delivery's peak by ±this fraction so
     no two balls feel identical.
   - FAST_DELIVERY_CHANCE / _MULT add an occasional surprise quick ball.
   - BALL_VY_CAP_HEADROOM is a safety margin above the computed peak so a
     rare long flight can't run away with itself.                            */
export const BALL_ACCEL              = 0.14;
export const BALL_SPAWN_VY_FACTOR    = 0.55;
export const BALL_SPEED_VARIATION    = 0.18;
export const FAST_DELIVERY_CHANCE    = 0.18;
export const FAST_DELIVERY_MULT      = 1.30;
export const BALL_VY_CAP_HEADROOM    = 1.10;

/* ── Lateral movement (pseudo-3D depth) ───────────────────────────────────
   Ball spawns at the centre of the pitch and drifts laterally toward its
   line by the time it reaches the batter. BALL_LINE_DRIFT_FRAMES is the
   approximate number of frames a delivery is in flight — used to compute
   per-frame vx so the ball arrives at the line offset roughly on time.
   Swing adds a small horizontal acceleration on top for a subtle curve. */
/* Frames over which the ball drifts to its target line. Tuned for the
   shorter flight path now that the ball spawns from the bowler's hand
   instead of above the viewport. */
export const BALL_LINE_DRIFT_FRAMES  = 60;
export const BALL_SWING_RANGE        = 0.013;
export const BALL_SWING_CHANCE       = 0.55;

/* ── Perspective scale (pseudo-3D depth) ──────────────────────────────────
   Ball radius is multiplied by ballPerspectiveScale(y, h) each frame.
   FAR is the multiplier at the far end of the pitch (top of screen), NEAR
   at the batter's end. A wider gap = stronger depth illusion.            */
export const BALL_PERSPECTIVE_FAR    = 0.30;
export const BALL_PERSPECTIVE_NEAR   = 1.70;

/* ── Match format ─────────────────────────────────────────────────────────── */
export const TOTAL_OVERS    = 3;
export const BALLS_PER_OVER = 6;
export const TOTAL_BALLS    = TOTAL_OVERS * BALLS_PER_OVER;
export const MAX_WICKETS    = 3;

/* ── AI progression ───────────────────────────────────────────────────────── */
export const STARTING_TARGET      = 30;
export const TARGET_BUMP_MIN      = 10;
export const TARGET_BUMP_MAX      = 20;
export const SPEED_BUMP_PER_LEVEL = 0.5;

/* ── Behind-the-stumps geometry (fractions of viewport height) ────────────── */
export const BATTER_Y_FRAC      = 0.84;
export const STUMPS_Y_FRAC      = 0.96;
export const STUMPS_HEIGHT      = 52;
export const STUMP_SPACING      = 13;
export const IMPACT_Y_FRAC      = 0.72;
export const PITCH_TOP_Y_FRAC   = 0.20;
export const PITCH_NARROW_FRAC  = 0.05;
export const PITCH_WIDE_FRAC    = 0.22;

/* ── Visual polish + effect durations ─────────────────────────────────────── */
export const TRAIL_MAX         = 38;
export const SHAKE_MS          = 280;
export const BURST_MS          = 560;
export const BALL_GLOW_MS      = 720;
export const ZONE_FLASH_MS     = 800;
export const PERFECT_FLASH_MS  = 320;

/* Contact-flash intensity per shot type. */
export const BURST_INTENSITY_BY_SHOT: Record<Shot, number> = {
  straight:  1.00,
  pull:      0.70,
  cover:     0.62,
  defensive: 0.30,
  miss:      0,
};

/* Where each ball type pitches on the strip (fraction of viewport height). */
export const PITCH_Y_BY_LENGTH: Record<Length, number> = {
  short: 0.36,
  good:  0.55,
  full:  0.66,
};

/* Per-length peak-velocity multipliers — short balls come faster off the
   hand, full balls a touch slower, good length is the baseline. */
export const BALL_LENGTH_SPEED_MULT: Record<Length, number> = {
  short: 1.12,
  good:  1.00,
  full:  0.92,
};

/* One-shot vy multiplier applied the frame the ball pitches. Lower = bigger
   "bounce" (vy collapses more, so the ball hangs longer before BALL_ACCEL
   ramps it back to the batter). Short balls bounce dramatically and sit
   up for the pull; full balls barely bounce.                              */
export const BALL_BOUNCE_DAMPING: Record<Length, number> = {
  short: 0.62,
  good:  0.80,
  full:  0.92,
};

/* Line offset from centre, in pixels (right-handed batsman view). */
export const LINE_OFFSETS: Record<Line, number> = {
  off:    -44,
  middle:   0,
  leg:    +44,
};

/* Shake intensity per shot type. */
export const SHAKE_BY_SHOT: Record<Shot, number> = {
  straight:  6,
  cover:     4,
  pull:      4.5,
  defensive: 1.5,
  miss:      0,
};

/* ── Bat orientation (right-handed) ───────────────────────────────────────── */
export const BAT_REST_ANGLE    = 0.42;
export const BAT_HAND_OFFSET_X = 7;
/* Reaction delay before the bat starts moving on a key press. Carries
   enough "wind-up" weight to read as human while staying under the
   ~60 ms latency-perception threshold. */
export const SWING_DELAY_MS    = 28;
export const DEFENSIVE_DROP_PX = 5;

/* ── Impact-moment feedback ───────────────────────────────────────────────
   Timing-quality power scalar applied to the post-contact ball velocity:
   perfect strikes get a boost ( > 1 ), mistimed ones bleed power ( < 1 ).
   Visual cues: ball scale-pop + bright white contact flash at impact. */
export const POWER_PERFECT       = 1.20;
export const POWER_EARLY         = 0.85;
export const POWER_LATE          = 0.70;
export const POWER_DEFENSIVE_END = 0.55;
/* Multiplicative bonus when the chosen shot is the optimal read of both
   length AND line — rewards skill on top of the timing power scalar. */
export const POWER_OPTIMAL_BONUS = 1.10;
export const IMPACT_POP_MS       = 160;
export const IMPACT_POP_PEAK     = 1.55;
export const CONTACT_FLASH_MS    = 120;

/* ── Event-driven crowd flashes ───────────────────────────────────────────
   Crowd backdrop is static at rest. On a 4 / 6 / wicket the upper band of
   the stadium briefly lights up with an event-tinted glow ("the crowd
   roars / cheers / gasps"). Durations + tints below; intensity is set at
   dispatch time. */
export const CROWD_FLASH_4_MS      = 700;
export const CROWD_FLASH_6_MS      = 1000;
export const CROWD_FLASH_WICKET_MS = 950;

/* ── Bowled wicket — physical stumps falling animation ─────────────────── */
export const WICKET_FALL_MS = 700;

/* ── Cinematic camera behaviour ───────────────────────────────────────────
   Six-shake floors the per-shot intensity so maximums always rumble.
   Slow-mo fires on a perfect-timed connecting shot; engine multiplies
   per-frame deltas by SLOWMO_FACTOR while now < slowMoUntil. */
export const SIX_SHAKE_FLOOR   = 7.5;
export const SLOWMO_DURATION_MS = 180;
export const SLOWMO_FACTOR     = 0.5;
/* Hard time-freeze on the contact frame for every connecting shot. A
   short pause emphasises the moment of impact without veering arcadey.
   Engine multiplies physics deltas by 0 while now < freezeUntil. */
export const IMPACT_FREEZE_MS  = 35;

export const FOLLOW_BY_SHOT: Record<Shot, number> = {
  straight:  -0.20,
  cover:     -1.05,
  pull:      +1.40,
  defensive: -0.10,
  miss:      -0.20,
};
export const SWING_MS_BY_SHOT: Record<Shot, number> = {
  straight:  220,
  cover:     260,
  pull:      180,
  defensive: 130,
  miss:      220,
};
export const EASE_POW_BY_SHOT: Record<Shot, number> = {
  straight:  2.4,
  cover:     1.8,
  pull:      3.6,
  defensive: 2.0,
  miss:      2.4,
};

/* Maps a played shot to the field zone it targets (for the zone-flash). */
export const ZONE_BY_SHOT: Record<Shot, Zone | null> = {
  straight:  "straight",
  cover:     "off",
  pull:      "leg",
  defensive: "straight",
  miss:      null,
};

/* Arrow key → shot binding. */
export const KEY_TO_SHOT: Record<string, Shot> = {
  ArrowUp:    "straight",
  ArrowLeft:  "cover",
  ArrowRight: "pull",
  ArrowDown:  "defensive",
};
