"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AudioEngine } from "@/lib/audioEngine";

interface AudioContextValue {
  isReady: boolean;
  isMuted: boolean;
  toggle: () => void;
  setVolume: (fraction: number, fadeDuration?: number) => void;
}

const AudioCtx = createContext<AudioContextValue>({
  isReady:   false,
  isMuted:   false,
  toggle:    () => {},
  setVolume: () => {},
});

/* Any of these counts as a "user gesture" per browser autoplay policy.
   `wheel` + `touchstart` extend the existing trio so scroll wheels and
   mobile taps unblock audio without an explicit click on the page. */
const INTERACTION_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "wheel",
  "touchstart",
] as const;

/* ── Scroll-based ambient volume curve ────────────────────────────────────
   Hero (top) → full volume; footer (bottom) → deeper subtle reduction.
   The dip kicks in later (75 % scroll progress) and ramps lower (0.32)
   so the chant noticeably recedes only as the user reaches the closing
   sections of the page. */
const FOOTER_ZONE_START = 0.75;     // scroll progress where the dip begins
const FOOTER_ZONE_END   = 1.00;     // scroll progress at full reduction
const HERO_VOLUME       = 1.00;
const FOOTER_VOLUME     = 0.32;

function scrollTargetVolume(progress: number): number {
  if (progress <= FOOTER_ZONE_START) return HERO_VOLUME;
  if (progress >= FOOTER_ZONE_END)   return FOOTER_VOLUME;
  const t     = (progress - FOOTER_ZONE_START) / (FOOTER_ZONE_END - FOOTER_ZONE_START);
  const eased = t * t * (3 - 2 * t);   // smoothstep
  return HERO_VOLUME + (FOOTER_VOLUME - HERO_VOLUME) * eased;
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const engine  = useRef(new AudioEngine());
  const fadedIn = useRef(false); // fadeIn already scheduled
  /* Latest scroll-derived target volume. Drives the scroll-effect ramp and
     is what the game-mode `audio:on` handler restores TO (instead of a
     hard-coded 1.0), so closing the game at the bottom of the page lands
     at the reduced footer volume instead of overshooting back to full. */
  const scrollTargetRef = useRef(HERO_VOLUME);

  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  /**
   * Idempotent engine initialiser — safe to call before any user gesture.
   * Delegates idempotency to engine.init() (which checks `this.audio`),
   * so a destroy()/init() cycle from Strict-Mode double-mount correctly
   * re-creates the element instead of being short-circuited by a stale
   * provider-level flag.
   */
  const initEngine = useCallback(() => {
    engine.current.init();
  }, []);

  /**
   * Attempts to resume + play.  Can be called multiple times safely:
   * - First call: schedules the fade-in ramp and marks isReady.
   * - Subsequent calls: only re-attempts resume (handles the case where
   *   the first call was blocked by the browser's autoplay policy).
   */
  const beginPlayback = useCallback(async () => {
    initEngine();
    await engine.current.resume(); // unmutes + retries play() if blocked
    if (!fadedIn.current) {
      fadedIn.current = true;
      // Fade IN to the current scroll target — handles the case where the
      // user reloads at mid/bottom of the page; ambient comes up at the
      // right level for where they are instead of always at full.
      engine.current.setVolume(scrollTargetRef.current, 2.5);
      setIsReady(true);
    }
  }, [initEngine]);

  /* Kick off the engine on mount so muted autoplay can begin BEFORE the
     hero reveals. The element starts loading + playing silently right
     away; beginPlayback() later just unmutes and ramps up — no audible
     dropouts or "click anywhere to start" gating. */
  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // ── Trigger on hero reveal (dispatched by IntroSection.onExitComplete) ────
  useEffect(() => {
    const onReveal = () => void beginPlayback();
    window.addEventListener("hero-revealed", onReveal);
    return () => window.removeEventListener("hero-revealed", onReveal);
  }, [beginPlayback]);

  // ── Fallback: first user interaction (handles autoplay-blocked browsers) ──
  useEffect(() => {
    const handle = () => void beginPlayback();
    INTERACTION_EVENTS.forEach((e) =>
      window.addEventListener(e, handle, { passive: true, once: true })
    );
    return () =>
      INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, handle));
  }, [beginPlayback]);

  /* Destroy on unmount + reset the fade-in latch so a subsequent remount
     (Strict-Mode in dev, route navigation, etc.) re-runs the entrance ramp
     against the freshly-created element instead of being short-circuited
     by a stale `fadedIn = true` from the previous instance. */
  useEffect(() => () => {
    engine.current.destroy();
    fadedIn.current = false;
  }, []);

  /* ── Scroll-driven ambient volume ──────────────────────────────────────
     Recomputes a target volume from window.scrollY each frame the user
     scrolls (rAF-throttled). Hero zone holds at full; the last ~35 % of
     the page eases down to a subtler footer level.
     Important: scrollTargetRef is updated EVERY scroll regardless of
     mute / ready state, so when the user un-mutes or audio first becomes
     ready, beginPlayback / setVolume can read the correct level. The
     actual engine.setVolume() call is still guarded by ready + mute.    */
  useEffect(() => {
    let rafId: number | null = null;
    let lastApplied = scrollTargetRef.current;

    const update = () => {
      rafId = null;
      const doc      = document.documentElement;
      const totalH   = Math.max(1, (doc?.scrollHeight ?? document.body.scrollHeight) - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / totalH));
      const target   = scrollTargetVolume(progress);
      scrollTargetRef.current = target;
      // Only push to the engine when the change is meaningful — avoids
      // re-scheduling micro-ramps on every scroll tick.
      if (isReady && !isMuted && Math.abs(target - lastApplied) > 0.015) {
        lastApplied = target;
        engine.current.setVolume(target, 0.6);
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Initial pass — handles deep-link / reload at mid-page so the engine
    // (once ready) lands at the right level.
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isReady, isMuted]);

  /* ── Game-mode audio transitions ───────────────────────────────────────
     Decoupled from the cursor + GameOverlay via custom events on window.

     audio:duck → ambient ducks to ~35% during the 3-second cursor hold.
     audio:off  → full fade-out as the game overlay opens (~700ms).
     audio:on   → fade back to full as the game closes / hold cancels (~800ms).

     All helpers respect the user's mute toggle and only fire once the
     engine is ready.                                                       */
  useEffect(() => {
    /* Helper fade functions — wrap engine.setVolume() in a mute/ready guard
       and accept duration in milliseconds for caller convenience.          */
    const fadeOutAudio = (durationMs: number) => {
      if (!isReady || isMuted) return;
      engine.current.setVolume(0, durationMs / 1000);
    };
    // Restore to the CURRENT scroll target — not a hard-coded 1 — so
    // closing the game at the bottom of the page lands at the reduced
    // footer level instead of overshooting back to full ambient.
    const fadeInAudio = (durationMs: number) => {
      if (!isReady || isMuted) return;
      engine.current.setVolume(scrollTargetRef.current, durationMs / 1000);
    };
    // Duck fraction is relative to the current scroll target so the game's
    // 35 % ducking-during-hold stays a 35 % reduction at the footer too.
    const duckAudio = (fraction: number, durationMs: number) => {
      if (!isReady || isMuted) return;
      engine.current.setVolume(scrollTargetRef.current * fraction, durationMs / 1000);
    };

    const onDuck = () => duckAudio(0.35, 2500);   // slow duck across the hold
    const onOff  = () => fadeOutAudio(700);       // game entry
    const onOn   = () => fadeInAudio(800);        // game exit OR hold cancel

    window.addEventListener("audio:duck", onDuck);
    window.addEventListener("audio:off",  onOff);
    window.addEventListener("audio:on",   onOn);
    return () => {
      window.removeEventListener("audio:duck", onDuck);
      window.removeEventListener("audio:off",  onOff);
      window.removeEventListener("audio:on",   onOn);
    };
  }, [isReady, isMuted]);

  const toggle = useCallback(() => {
    if (!isReady) return;
    if (isMuted) {
      // Unmute → ramp up to the current scroll-derived target so the
      // ambient lands at the level matching where the user is on the page.
      engine.current.setVolume(scrollTargetRef.current, 1.2);
      setIsMuted(false);
    } else {
      engine.current.fadeOut(1.2);
      setIsMuted(true);
    }
  }, [isMuted, isReady]);

  const setVolume = useCallback(
    (fraction: number, fadeDuration?: number) => {
      if (!isReady || isMuted) return;
      engine.current.setVolume(fraction, fadeDuration);
    },
    [isReady, isMuted]
  );

  return (
    <AudioCtx.Provider value={{ isReady, isMuted, toggle, setVolume }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudioContext(): AudioContextValue {
  return useContext(AudioCtx);
}
