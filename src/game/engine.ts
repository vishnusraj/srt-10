/* ── Cricket game: engine ──────────────────────────────────────────────────
   Owns the rAF loop, resize, keyboard input, and the completeDelivery state
   machine. The React component instantiates one engine per active session
   via startEngine(canvas, hooks); cleanup is via the returned stop() which
   cancels rAF and removes ALL listeners (no leaks).

   Separation of concerns:
     • state.ts    — pure game logic (createGameState, spawnBall, …)
     • render.ts   — pure draw (renderFrame)
     • engine.ts   — orchestration (this file)
     • audio.ts    — SFX synthesis
     • scene.ts    — offscreen layer generators                              */

import type { GameState, Phase, Shot } from "./types";
import {
  INITIAL_BALL_SPEED,
  SPEED_INCREMENT,
  MAX_BALL_SPEED,
  BALL_RESET_MS,
  TOTAL_BALLS,
  MAX_WICKETS,
  SHAKE_BY_SHOT,
  BALL_GLOW_MS,
  BURST_INTENSITY_BY_SHOT,
  PERFECT_RANGE,
  IMPACT_Y_FRAC,
  GRAVITY,
  STUMPS_Y_FRAC,
  KEY_TO_SHOT,
  BAT_SWING_MS,
  SWING_DELAY_MS,
  SWING_MS_BY_SHOT,
  ZONE_BY_SHOT,
  BALL_ACCEL,
  IMPACT_POP_MS,
  CROWD_FLASH_4_MS,
  CROWD_FLASH_6_MS,
  CROWD_FLASH_WICKET_MS,
  BALL_BOUNCE_DAMPING,
  POWER_OPTIMAL_BONUS,
  SIX_SHAKE_FLOOR,
  SLOWMO_DURATION_MS,
  SLOWMO_FACTOR,
  IMPACT_FREEZE_MS,
  TRAIL_MAX,
} from "./config";
import {
  createGameState,
  spawnBall,
  applyShotVelocity,
  resolveKeyboardShot,
  timingPower,
  timingLabel,
} from "./state";
import { startBowlerApproach, updateBowler } from "./bowler";
import { buildSceneLayers } from "./scene";
import { renderFrame } from "./render";
import { playBoundarySound, playSixSound, playWicketSound } from "./audio";
import { progression, advanceProgression } from "./progression";

/* ── Hooks the engine reads + writes ──────────────────────────────────────
   The React component owns these refs/setters; the engine reads phase + the
   live counters during the rAF tick, and pushes updates back via the setters
   so React can re-render the scoreboard and end-overlay.                   */
export interface EngineHooks {
  /* Refs (current values readable synchronously from inside the loop) */
  phaseRef:   { current: Phase };
  scoreRef:   { current: number };
  wicketsRef: { current: number };
  ballsRef:   { current: number };
  targetRef:  { current: number };
  gameRef:    { current: GameState | null };

  /* Setters (React state pushes) */
  setScore:      (next: number | ((prev: number) => number)) => void;
  setWickets:    (next: number | ((prev: number) => number)) => void;
  setBalls:      (next: number)                              => void;
  setPhase:      (next: Phase)                               => void;
  setNextTarget: (next: number | null)                       => void;
}

export interface EngineHandle {
  /* Stops the rAF loop and tears down all listeners. Idempotent. */
  stop(): void;
}

/* Start the engine: create state, install listeners, kick off the loop. */
export function startEngine(canvas: HTMLCanvasElement, hooks: EngineHooks): EngineHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // No 2D context → no game. Return a no-op stop so callers can
    // unconditionally call it.
    return { stop: () => {} };
  }

  // Allocate the initial GameState and publish it through the hooks so
  // React-side handlers (e.g. handleStart) can read/write it too.
  hooks.gameRef.current = createGameState(INITIAL_BALL_SPEED + progression.speedBonus);

  let layers: ReturnType<typeof buildSceneLayers> | null = null;
  let stopped = false;
  let rafId   = 0;

  /* ── Resize ─────────────────────────────────────────────────────────── */
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layers = buildSceneLayers(w, h);
  };
  resize();
  window.addEventListener("resize", resize);

  /* ── Delivery completion ────────────────────────────────────────────── */
  const completeDelivery = (now: number, extraDelay = 0) => {
    const g = hooks.gameRef.current;
    if (!g) return;
    hooks.ballsRef.current += 1;
    hooks.setBalls(hooks.ballsRef.current);
    g.ball.speed = Math.min(g.ball.speed + SPEED_INCREMENT, MAX_BALL_SPEED);

    const won           = hooks.scoreRef.current   >= hooks.targetRef.current;
    const allOut        = hooks.wicketsRef.current >= MAX_WICKETS;
    const oversComplete = hooks.ballsRef.current   >= TOTAL_BALLS;

    if (won || allOut || oversComplete) {
      hooks.phaseRef.current = "ended";
      hooks.setPhase("ended");
      g.resetScheduledAt = null;
      if (won) {
        advanceProgression();
        hooks.setNextTarget(progression.target);
      }
    } else {
      g.resetScheduledAt = now + BALL_RESET_MS + extraDelay;
    }
  };

  /* ── Input: arrow keys → shot selection ──────────────────────────────── */
  const onKeyDown = (e: KeyboardEvent) => {
    const chosen: Shot | undefined = KEY_TO_SHOT[e.key];
    if (!chosen) return;
    e.preventDefault();
    const g = hooks.gameRef.current;
    if (!g) return;
    if (hooks.phaseRef.current !== "playing") return;
    if (g.bat.swinging) return;
    if (g.ball.state !== "incoming") return;

    const now = performance.now();
    g.bat.swinging   = true;
    g.bat.swingStart = now;
    g.bat.chosen     = chosen;

    const h = window.innerHeight;
    const impactY = h * IMPACT_Y_FRAC;
    const dy  = g.ball.y - impactY;
    const ady = Math.abs(dy);

    const { shot, runs, label, tint, wicket, optimal } =
      resolveKeyboardShot(chosen, g.ball.length, g.ball.line, ady);

    if (wicket) {
      g.ball.state = "settled";
      g.shake = { intensity: 9, startTime: now };
      hooks.wicketsRef.current += 1;
      hooks.setWickets((w) => w + 1);
      playWicketSound();
      // Stumps physically tip + bails scatter; tinted crowd "gasp" overhead.
      g.wicketFallAt = now;
      g.crowdFlash   = {
        startTime: now,
        durationMs: CROWD_FLASH_WICKET_MS,
        tint:       "255,140,90",
        intensity:  0.75,
      };
      completeDelivery(now, 400);
    } else if (shot !== "miss") {
      // Power scalar from timing quality, multiplied by an optimal-read
      // bonus when the chosen shot is correct for BOTH length and line.
      // Drives velocity (clean vs. mistimed) and feedback intensity.
      // Scoring is untouched — the bonus only affects feel.
      const power = timingPower(ady) * (optimal ? POWER_OPTIMAL_BONUS : 1);

      g.ball.state          = "hit";
      g.ball.lastShot       = shot;
      g.ball.glowUntil      = now + BALL_GLOW_MS;
      g.ball.impactPopUntil = now + IMPACT_POP_MS;
      // Cinematic contact-frame freeze — applies to every connecting shot.
      // Engine update() pauses physics deltas (timeScale = 0) while active.
      g.freezeUntil         = now + IMPACT_FREEZE_MS;
      applyShotVelocity(g, shot, power);
      if (runs > 0) {
        hooks.scoreRef.current += runs;
        hooks.setScore((s) => s + runs);
        if (runs === 6) {
          playSixSound();
          g.crowdFlash = {
            startTime: now,
            durationMs: CROWD_FLASH_6_MS,
            tint:       "255,235,180",
            intensity:  0.85,
          };
          // Cinematic six rumble — floor the shake intensity so even a
          // pull-six (lower per-shot value) carries a proper jolt.
          if (g.shake && g.shake.intensity < SIX_SHAKE_FLOOR) {
            g.shake.intensity = SIX_SHAKE_FLOOR;
          }
        } else if (runs === 4) {
          playBoundarySound();
          g.crowdFlash = {
            startTime: now,
            durationMs: CROWD_FLASH_4_MS,
            tint:       "230,194,122",
            intensity:  0.55,
          };
        }
      }
      g.shake = { intensity: SHAKE_BY_SHOT[shot] * power, startTime: now };
      const baseIntensity = BURST_INTENSITY_BY_SHOT[shot];
      const perfectBonus  = ady <= PERFECT_RANGE ? 0.22 : 0;
      const intensity     = Math.min(1, baseIntensity + perfectBonus);
      if (intensity > 0) {
        g.burst = { x: g.ball.x, y: g.ball.y, startTime: now, intensity };
      }
      // Bright white sparkle at the contact point — short, punchy.
      g.contactFlash = {
        x: g.ball.x,
        y: g.ball.y,
        startTime: now,
        intensity: power,
      };
      if (shot === "straight" && ady <= PERFECT_RANGE) {
        g.perfectFlash = { startTime: now };
      }
      // Slight slow-mo on a perfect-timed connecting shot — starts AFTER
      // the impact freeze so the cinematic beats land in order:
      //   1. freeze (~35 ms) — emphasises contact
      //   2. slow-mo (~180 ms) — exit-velocity bloom
      //   3. normal time
      if (ady <= PERFECT_RANGE) {
        g.slowMoUntil = now + IMPACT_FREEZE_MS + SLOWMO_DURATION_MS;
      }
      const zone = ZONE_BY_SHOT[shot];
      if (zone) g.zoneFlash = { zone, startTime: now };
    }

    // Timing label for the keyboard-swing path: wickets always read as MISS
    // (the *shot* failed regardless of timing), everything else gets the
    // tier-based label from timingLabel(ady).
    const tLabel = wicket
      ? { label: "MISS", tint: "rgba(255,120,120,0.95)" }
      : timingLabel(ady);
    g.message = {
      text:       runs > 0 ? `${label} · +${runs}` : label,
      tint,
      setAt:      now,
      duration:   wicket ? 1600 : runs > 0 ? 1400 : 950,
      timing:     tLabel.label,
      timingTint: tLabel.tint,
    };
  };
  window.addEventListener("keydown", onKeyDown);

  /* ── Update: ball physics + delivery scheduling ──────────────────────── */
  const update = (now: number) => {
    const g = hooks.gameRef.current;
    if (!g) return;
    // Game logic is only active during the "playing" phase. The draw still
    // runs every frame so the static scene is visible in other phases.
    if (hooks.phaseRef.current !== "playing") return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const swingMs = g.bat.chosen ? SWING_MS_BY_SHOT[g.bat.chosen] : BAT_SWING_MS;
    if (g.bat.swinging && now - g.bat.swingStart > SWING_DELAY_MS + swingMs) {
      g.bat.swinging = false;
    }

    // Time scaling chain — freeze takes precedence over slow-mo, which
    // takes precedence over normal time. Both are set on contact:
    //   freezeUntil  (every hit, ~35 ms)
    //   slowMoUntil  (perfect-timed hits only, ~180 ms after the freeze)
    const timeScale = now < g.freezeUntil  ? 0
                    : now < g.slowMoUntil  ? SLOWMO_FACTOR
                                           : 1;

    if (g.ball.state === "incoming") {
      // Vertical: accelerate (slow off the hand → fastest near the batter),
      // capped at the per-delivery peak so a long flight stays bounded.
      if (g.ball.vy < g.ball.vyCap) {
        g.ball.vy = Math.min(g.ball.vy + BALL_ACCEL * timeScale, g.ball.vyCap);
      }
      // Horizontal: lateral drift toward the chosen line + per-delivery
      // swing curve (ax). Together these give the ball a 3-D feel —
      // it moves laterally as it approaches, not just straight down.
      g.ball.vx += g.ball.ax * timeScale;
      g.ball.x  += g.ball.vx * timeScale;
      g.ball.y  += g.ball.vy * timeScale;
      if (g.ball.pitchedAt === null && g.ball.y >= g.ball.pitchY) {
        g.ball.pitchedAt = now;
        g.ball.pitchX    = g.ball.x;   // freeze for the post-pitch ring
        // Bounce: one-shot vy dampening on the pitch frame. Short balls
        // get a bigger collapse → longer hang time / higher sit-up before
        // BALL_ACCEL ramps the ball back toward the batter. Full balls
        // barely bounce. No extra per-frame physics — just one multiply.
        g.ball.vy *= BALL_BOUNCE_DAMPING[g.ball.length];
      }
      if (g.ball.y > h * STUMPS_Y_FRAC + 40) {
        g.ball.state = "settled";
        g.message = {
          text: "Ball through",
          tint: "rgba(255,120,120,0.92)",
          setAt: now,
          duration: 950,
          timing: "MISS",
          timingTint: "rgba(255,120,120,0.95)",
        };
        completeDelivery(now);
      }
    } else if (g.ball.state === "hit") {
      g.ball.x  += g.ball.vx * timeScale;
      g.ball.y  += g.ball.vy * timeScale;
      g.ball.vy += GRAVITY * timeScale;
      g.hitTrail.push({ x: g.ball.x, y: g.ball.y });
      if (g.hitTrail.length > TRAIL_MAX) g.hitTrail.shift();
      if (
        g.ball.y < -100 ||
        g.ball.y > h + 100 ||
        g.ball.x < -100 ||
        g.ball.x > w + 100
      ) {
        g.ball.state = "settled";
        completeDelivery(now);
      }
    }

    // resetScheduledAt now means "start the bowler approach at this time".
    // The bowler animation then handles the visible delay, and spawnBall
    // is called below when updateBowler() reports the release frame.
    if (g.resetScheduledAt !== null && now >= g.resetScheduledAt) {
      startBowlerApproach(g.bowler, now);
      g.resetScheduledAt = null;
    }

    // Drive the bowler each frame. A `true` return = the ball releases this
    // frame — spawn it from the bowler's hand position.
    if (updateBowler(g.bowler, now)) {
      spawnBall(g, w, h);
    }
  };

  /* ── Loop ────────────────────────────────────────────────────────────── */
  const loop = () => {
    if (stopped) return;
    const now = performance.now();
    update(now);
    const g = hooks.gameRef.current;
    if (g) {
      renderFrame({
        ctx,
        state:  g,
        layers,
        width:  window.innerWidth,
        height: window.innerHeight,
        now,
      });
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  /* ── Lifecycle ──────────────────────────────────────────────────────── */
  return {
    stop() {
      if (stopped) return;          // idempotent
      stopped = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", resize);
      hooks.gameRef.current = null;
      layers = null;
    },
  };
}
