/**
 * AudioEngine — MP3-backed ambient score.
 *
 * Implementation: plain HTMLAudioElement with JS-driven volume ramps.
 *
 * Two-stage start so the chant always wakes up at the earliest possible
 * moment without fighting the browser:
 *   1. `init()` creates the element + preloads it (no play attempt — the
 *      element is dormant, no autoplay-policy involvement at all).
 *   2. `resume()` calls audio.play() and lets the volume ramp lift it up.
 *      Some browsers will permit this on the hero-revealed event without
 *      a fresh gesture; on stricter browsers the first INTERACTION_EVENTS
 *      listener calls resume() again and play() succeeds then.
 *
 * Public API is unchanged so AudioProvider needs no refactor.
 */
export class AudioEngine {
  private audio: HTMLAudioElement | null = null;

  /* In-flight rAF id — captured so a new ramp can cancel the previous one.
     The ramp's from/to/start/elapsed values live in closure inside
     startRamp(); no instance fields needed. */
  private rampId: number | null = null;

  /** Whisper-level ambient — audible only in quiet environments. */
  readonly MAX_VOLUME = 0.07;

  init(): void {
    /* Idempotency check looks at the audio element directly, so a
       destroy() followed by init() correctly RE-creates the element. */
    if (this.audio) return;

    const audio    = new Audio("/sound/sachin_sachin_chand.mp3");
    audio.loop     = true;
    audio.preload  = "auto";
    audio.volume   = 0;     // ramp will lift it once play() succeeds
    this.audio     = audio;
  }

  /** Attempts to start playback. Idempotent — safe to call repeatedly. */
  async resume(): Promise<void> {
    if (!this.audio) this.init();
    const a = this.audio;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
      } catch {
        /* Browser blocked autoplay — AudioProvider's INTERACTION_EVENTS
           fallback will retry resume() on the next user gesture. */
      }
    }
  }

  private cancelRamp(): void {
    if (this.rampId !== null) {
      cancelAnimationFrame(this.rampId);
      this.rampId = null;
    }
  }

  private startRamp(target: number, durationSec: number): void {
    const a = this.audio;
    if (!a) return;
    this.cancelRamp();

    const fromVol     = a.volume;
    const toVol       = Math.max(0, Math.min(this.MAX_VOLUME, target));
    const durationMs  = Math.max(1, durationSec * 1000);

    /* Audible-time ramp — only progresses while the element is actually
       playing. If play() was blocked and the element is paused, the ramp
       pauses too instead of silently completing in the background and
       then snapping to MAX_VOLUME the instant the user finally interacts.
       Once playback starts (now or later), the fade-in plays out audibly
       over its full duration. */
    let audibleElapsed = 0;
    let lastFrame      = performance.now();

    const tick = () => {
      const el = this.audio;
      if (!el) { this.rampId = null; return; }
      const now = performance.now();
      const dt  = now - lastFrame;
      lastFrame = now;
      if (!el.paused) audibleElapsed += dt;

      const t = Math.max(0, Math.min(1, audibleElapsed / durationMs));
      el.volume = fromVol + (toVol - fromVol) * t;

      if (t < 1) {
        this.rampId = requestAnimationFrame(tick);
      } else {
        this.rampId = null;
      }
    };
    this.rampId = requestAnimationFrame(tick);
  }

  fadeIn(duration = 2.5): void  { this.startRamp(this.MAX_VOLUME, duration); }
  fadeOut(duration = 1.5): void { this.startRamp(0, duration); }

  setVolume(fraction: number, fadeDuration = 0.8): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    this.startRamp(clamped * this.MAX_VOLUME, fadeDuration);
  }

  destroy(): void {
    this.cancelRamp();
    this.audio?.pause();
    this.audio = null;
  }
}
