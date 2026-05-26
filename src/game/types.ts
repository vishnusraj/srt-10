/* ── Cricket game: shared types ────────────────────────────────────────────
   Pure type definitions. No runtime code, no React, no DOM. */

export type Shot      = "straight" | "cover" | "pull" | "defensive" | "miss";
export type BallState = "incoming" | "hit" | "settled";
export type Length    = "short" | "good" | "full";
export type Line      = "off" | "middle" | "leg";
export type Zone      = "off" | "straight" | "leg";

/* Phase machine — explicit "idle" represents pre-mount, before game:open.
   Once the overlay is mounted it begins at "ready" (Start Game button
   visible) and transitions ready → countdown → playing → ended. */
export type Phase = "idle" | "ready" | "countdown" | "playing" | "ended";

/* Mismatch severity from shot vs. delivery line/length.
   - "optimal": shot is correct for BOTH length and line (premium read)
   - null    : compatible (defensive, or natural play within timing window)
   - "mild"  : line mismatch — edge risk on bad timing
   - "severe": length mismatch (drive-on-short / pull-on-full) — wicket risk */
export type Mismatch = "optimal" | "severe" | "mild" | null;

/* Bowler animation state lives alongside the ball; engine ticks both. */
export type BowlerPhase = "idle" | "approaching" | "delivering" | "followThrough";
export interface BowlerState {
  phase:      BowlerPhase;
  phaseStart: number;
}

/* The mutable game state owned by the engine and read by render + input. */
export interface GameState {
  ball: {
    x: number; y: number;
    vx: number; vy: number;
    ax: number;                 // horizontal acceleration (swing curve, incoming only)
    state: BallState;
    speed: number;              // baseline peak velocity (grows per delivery / per level)
    vyCap: number;              // hard cap on incoming vy for THIS delivery
    line: Line;
    length: Length;
    pitchY: number;             // y position where the ball is destined to pitch (px)
    pitchX: number;             // x position at the moment of pitching (frozen)
    pitchedAt: number | null;   // timestamp at which the ball reached pitchY
    lastShot: Shot | null;      // tints the trail per shot type
    glowUntil: number;          // ms timestamp; ball wears a halo while now < this
    impactPopUntil: number;     // ms timestamp; ball scales up briefly while now < this
  };
  bat:  { swinging: boolean; swingStart: number; chosen: Shot | null };
  /* `text` is the shot description (e.g. "STRAIGHT DRIVE · +6"). `timing`
     is an optional short label rendered larger above the description —
     "PERFECT" / "GOOD" / "MISS" depending on swing quality. */
  message: {
    text: string;
    tint: string;
    setAt: number;
    duration: number;
    timing?: string;
    timingTint?: string;
  } | null;
  resetScheduledAt: number | null;
  hitTrail: Array<{ x: number; y: number }>;
  shake:        { intensity: number; startTime: number } | null;
  burst:        { x: number; y: number; startTime: number; intensity: number } | null;
  contactFlash: { x: number; y: number; startTime: number; intensity: number } | null;
  zoneFlash:    { zone: Zone; startTime: number } | null;
  perfectFlash: { startTime: number } | null;
  /* Tinted glow on the upper crowd band — fired on 4 / 6 / wicket events. */
  crowdFlash:   { startTime: number; durationMs: number; tint: string; intensity: number } | null;
  /* Set when a wicket lands; null between deliveries (cleared by spawnBall).
     Render uses elapsed-since to animate stumps tipping over + bails
     scattering. */
  wicketFallAt: number | null;
  /* While now < this timestamp the engine multiplies per-frame physics
     deltas by SLOWMO_FACTOR — brief cinematic slow-mo on perfect timing. */
  slowMoUntil:  number;
  /* Brief total-freeze (timeScale = 0) on the contact frame for every
     connecting shot — adds tactile weight to the moment of impact. */
  freezeUntil:  number;
  /* Bowler animation state — engine ticks it each frame, spawns the ball
     on the release event. */
  bowler:       BowlerState;
}

/* Result emitted by resolveKeyboardShot — describes the outcome of a swing. */
export interface ShotResult {
  shot:    Shot;
  runs:    number;
  label:   string;
  tint:    string;
  wicket:  boolean;
  optimal: boolean;   // true when shot was the correct read of length AND line
}

/* Pre-rendered offscreen layers — generated once per resize, blitted every frame. */
export interface SceneLayers {
  backdrop:   HTMLCanvasElement;
  pitchScene: HTMLCanvasElement;
  lighting:   HTMLCanvasElement;
  vignette:   HTMLCanvasElement;
}
