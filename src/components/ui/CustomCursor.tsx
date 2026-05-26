"use client";

import { useEffect, useRef, useState } from "react";

/* ── Config ──────────────────────────────────────────────────────────────── */

const INTERACTIVE = [
  "a", "button", "label", "input", "select", "textarea",
  "[role='button']", "[data-cursor-hover]",
].join(", ");

const BAT_GOLD          = "#E6C27A";
const BASE_ROTATION_DEG = -30;     // baseline slant
const HOLD_ROTATION_DEG = 20;      // "straight drive" angle at full charge
const HOVER_TILT_DEG    = 4;       // extra rotation on hover (2–5° per spec)
const HOVER_SCALE       = 1.2;
const HOLD_SCALE        = 2.5;
const FOLLOW            = 0.32;    // mouse-follow lerp per frame
const HOVER_LERP        = 0.18;    // hover transition lerp per frame
const REBOUND_LERP      = 0.12;    // charge rebound lerp per frame (smooth cancel)
const HOLD_DURATION_MS  = 3000;
const HIDDEN_POS        = -200;
const RING_RADIUS       = 32;
const RING_CIRCUM       = 2 * Math.PI * RING_RADIUS; // ≈ 201.06

/* Polish constants */
const QUICK_CLICK_MS    = 260;     // below this duration → trigger swing pulse
const SWING_PULSE_MS    = 320;
const SWING_PEAK_DEG    = 28;      // peak forward kick during a quick swing
const IDLE_AFTER_MS     = 3000;    // idle-pulse kicks in after this idle time
const IDLE_FADE_IN_MS   = 1500;    // idle-pulse intensity ramps in over this window
const IDLE_PERIOD_MS    = 1600;    // breathing period

/* ── Component ───────────────────────────────────────────────────────────── */

export function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [isFine,  setIsFine]  = useState(false);

  // All visual state lives in refs — never re-render during mouse activity
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const innerRef    = useRef<HTMLDivElement>(null);
  const ringRef     = useRef<HTMLDivElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);
  const hintRef     = useRef<HTMLDivElement>(null);

  const target  = useRef({ x: HIDDEN_POS, y: HIDDEN_POS });
  const current = useRef({ x: HIDDEN_POS, y: HIDDEN_POS });
  const hoverNow    = useRef(0);            // lerped hover (0→1)
  const hoverTarget = useRef(0);            // hover target (0 or 1)
  const charge      = useRef(0);            // current hold progress (0→1)
  const holdStart   = useRef<number | null>(null);
  const triggered   = useRef(false);
  const rafId       = useRef<number | null>(null);

  /* Polish refs */
  const lastMove   = useRef(performance.now()); // for idle pulse
  const swingStart = useRef<number | null>(null); // quick-click swing animation
  const gameActive = useRef(false);              // hide hint while game is open

  /* Hint phase machine — one-time reveal then settle at the bottom
     0 = hidden (before first mouse move)
     1 = attached to cursor, prominent
     2 = animating from cursor → bottom
     3 = settled at bottom, gentle pulse                                     */
  const hintPhase           = useRef<0 | 1 | 2 | 3>(0);
  const hintPhaseStart      = useRef<number>(0);
  const hintTransitFrom     = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const HINT_ATTACH_MS      = 1700;
  const HINT_TRANSIT_MS     = 900;
  const HINT_ATTACH_OFFSET  = 36;   // px below cursor in attached phase

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(pointer: fine)");
    setIsFine(mq.matches);
    if (!mq.matches) return;

    /* Listeners — only update refs, never the DOM directly */
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      lastMove.current = performance.now();   // reset idle timer
      const el = e.target as Element | null;
      hoverTarget.current = el?.closest(INTERACTIVE) ? 1 : 0;
      // Kick off the one-time hint reveal at first mouse move.
      if (hintPhase.current === 0) {
        hintPhase.current  = 1;
        hintPhaseStart.current = performance.now();
      }
    };
    const onLeave = () => {
      target.current.x = HIDDEN_POS;
      target.current.y = HIDDEN_POS;
      holdStart.current = null;            // cancel any in-progress hold
    };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;          // primary button only
      // While the game overlay is open the cursor's hold/charge logic and
      // audio ducking must be silent — clicks inside the game must NOT
      // bring the ambient chant back. The game owns audio state until it
      // dispatches cursor:show on exit.
      if (gameActive.current) return;
      holdStart.current = performance.now();
      triggered.current = false;
      // Start ducking the ambient chant for the duration of the hold.
      window.dispatchEvent(new CustomEvent("audio:duck"));
    };
    const onUp = () => {
      // Same gate as onDown — no swing pulse, no audio events during game mode.
      if (gameActive.current) return;
      // Quick-click feedback: fire a brief swing animation independently of charge
      const now  = performance.now();
      const held = holdStart.current ? now - holdStart.current : Infinity;
      if (held < QUICK_CLICK_MS && !triggered.current) {
        swingStart.current = now;
      }
      // If the hold was active but did NOT complete, restore the ambient.
      // (If it completed, the game-open path owns the audio handoff.)
      if (holdStart.current !== null && !triggered.current) {
        window.dispatchEvent(new CustomEvent("audio:on"));
      }
      holdStart.current = null;            // rebound handled in tick
    };

    /* Single rAF loop drives ALL visuals — one write per layer per frame */
    const tick = () => {
      const now = performance.now();

      /* 1. Position follow */
      current.current.x += (target.current.x - current.current.x) * FOLLOW;
      current.current.y += (target.current.y - current.current.y) * FOLLOW;

      /* 2. Charge update — climbs while held, rebounds when released */
      if (holdStart.current !== null) {
        const elapsed = now - holdStart.current;
        charge.current = Math.min(elapsed / HOLD_DURATION_MS, 1);
        if (charge.current >= 1 && !triggered.current) {
          triggered.current = true;
          fireImpact(current.current.x, current.current.y);
          holdStart.current = null;        // auto-release on successful trigger
        }
      } else if (charge.current > 0) {
        // Exponential decay back to 0 (smooth cancellation or post-impact reset)
        charge.current += (0 - charge.current) * REBOUND_LERP;
        if (charge.current < 0.002) charge.current = 0;
      }

      /* 3. Hover lerp */
      hoverNow.current += (hoverTarget.current - hoverNow.current) * HOVER_LERP;

      /* 4. Compose visuals — charge dominates hover when active */
      const c = charge.current;
      const h = c > 0 ? 0 : hoverNow.current;

      /* 4a. Swing pulse (quick-click feedback) — adds a brief forward kick */
      let swingDeg = 0;
      if (swingStart.current !== null) {
        const sElapsed = now - swingStart.current;
        if (sElapsed < SWING_PULSE_MS) {
          // sin(πt) → 0 → 1 → 0 across the pulse window, natural ease both sides
          swingDeg = Math.sin((sElapsed / SWING_PULSE_MS) * Math.PI) * SWING_PEAK_DEG;
        } else {
          swingStart.current = null;
        }
      }

      /* 4b. Idle pulse — kicks in after a few seconds of no mouse movement.
              Adds a gentle breathing scale + glow. Suppressed while charging. */
      const idle    = now - lastMove.current;
      const idleAmt = c > 0 ? 0 : Math.max(0, Math.min(1, (idle - IDLE_AFTER_MS) / IDLE_FADE_IN_MS));
      const idlePhase = ((idle - IDLE_AFTER_MS) / IDLE_PERIOD_MS) * Math.PI * 2;
      const idleWave  = (1 + Math.sin(idlePhase)) * 0.5;   // 0..1
      const idleScale = idleAmt * 0.06 * idleWave;
      const idleGlow  = idleAmt * 0.20 * idleWave;

      const rot = BASE_ROTATION_DEG
                + c * (HOLD_ROTATION_DEG - BASE_ROTATION_DEG)
                + h * HOVER_TILT_DEG
                + swingDeg;
      const sc  = 1
                + c * (HOLD_SCALE - 1)
                + h * (HOVER_SCALE - 1)
                + idleScale;

      // Glow ramps with charge; hover and idle give a baseline lift
      const lift       = Math.max(c, h * 0.5, idleGlow);
      const innerAlpha = 0.45 + lift * 0.35;
      const outerAlpha = 0.16 + lift * 0.55;
      const innerBlur  = 6  + lift * 6;
      const outerBlur  = 14 + lift * 22;
      const glow = `drop-shadow(0 0 ${innerBlur}px rgba(230,194,122,${innerAlpha})) drop-shadow(0 0 ${outerBlur}px rgba(230,194,122,${outerAlpha}))`;

      /* 4c. Hint phase machine — one-time cursor reveal, then settle at bottom.
              Phase 1: attached just below the cursor, big + bright (eye-catch).
              Phase 2: animates from cursor → bottom-center over 900ms.
              Phase 3: settled, gentle pulse (the original behaviour).        */
      if (hintRef.current) {
        const phase = hintPhase.current;
        const bottomX = window.innerWidth / 2;
        const bottomY = window.innerHeight - 28;
        let hx = bottomX;
        let hy = bottomY;
        let hOpacity = 0;
        let hScale = 1;
        const playSuppress = gameActive.current ? 0 : (1 - c);

        if (phase === 1) {
          const e = now - hintPhaseStart.current;
          hx = current.current.x;
          hy = current.current.y + HINT_ATTACH_OFFSET;
          hOpacity = Math.min(e / 220, 1) * 0.92 * playSuppress;
          hScale = 1.25;
          if (e > HINT_ATTACH_MS) {
            hintPhase.current   = 2;
            hintPhaseStart.current = now;
            hintTransitFrom.current = { x: hx, y: hy };
          }
        } else if (phase === 2) {
          const e = now - hintPhaseStart.current;
          const t = Math.min(e / HINT_TRANSIT_MS, 1);
          const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
          const fx = hintTransitFrom.current.x;
          const fy = hintTransitFrom.current.y;
          hx = fx + (bottomX - fx) * ease;
          hy = fy + (bottomY - fy) * ease;
          hOpacity = (0.92 - 0.55 * ease) * playSuppress;
          hScale = 1.25 - 0.25 * ease;
          if (t >= 1) hintPhase.current = 3;
        } else if (phase === 3) {
          const hintBase = 0.20 + 0.30 * Math.abs(Math.sin(now / 1400));
          hOpacity = hintBase * playSuppress;
        }

        if (phase > 0) {
          hintRef.current.style.left      = `${hx}px`;
          hintRef.current.style.top       = `${hy}px`;
          hintRef.current.style.opacity   = String(hOpacity);
          hintRef.current.style.transform = `translate(-50%, -50%) scale(${hScale})`;
        }
      }

      /* 5. DOM writes — one transform/filter per layer per frame */
      if (wrapperRef.current) {
        wrapperRef.current.style.transform =
          `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
      }
      if (innerRef.current) {
        innerRef.current.style.transform =
          `translate(-50%, -50%) rotate(${rot}deg) scale(${sc})`;
        innerRef.current.style.filter = glow;
      }
      if (ringRef.current) {
        ringRef.current.style.opacity   = String(c);
        ringRef.current.style.transform = `translate(-50%, -50%) scale(${1 + c * 0.4})`;
      }
      if (progressRef.current) {
        progressRef.current.style.strokeDashoffset = String(RING_CIRCUM * (1 - c));
      }

      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    /* Game-mode visibility — fade out while game overlay is active */
    const onGameHide = () => {
      gameActive.current = true;
      if (wrapperRef.current) {
        wrapperRef.current.style.transition = "opacity 380ms cubic-bezier(0.16, 1, 0.3, 1)";
        wrapperRef.current.style.opacity = "0";
      }
    };
    const onGameShow = () => {
      gameActive.current = false;
      if (wrapperRef.current) {
        wrapperRef.current.style.transition = "opacity 380ms cubic-bezier(0.16, 1, 0.3, 1)";
        wrapperRef.current.style.opacity = "1";
      }
    };

    window.addEventListener("mousemove",  onMove,  { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });
    window.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",    onUp);
    window.addEventListener("blur",       onUp);   // tab/window blur cancels hold
    window.addEventListener("cursor:hide", onGameHide);
    window.addEventListener("cursor:show", onGameShow);

    return () => {
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",    onUp);
      window.removeEventListener("blur",       onUp);
      window.removeEventListener("cursor:hide", onGameHide);
      window.removeEventListener("cursor:show", onGameShow);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  if (!mounted || !isFine) return null;

  return (
    <>
    {/* "Hold to play" hint — position, opacity, scale all rAF-driven through
        a 3-phase lifecycle: attached-to-cursor → animates down → settled. */}
    <div
      ref={hintRef}
      aria-hidden
      className="pointer-events-none fixed z-[9995]"
      style={{
        left: 0,
        top: 0,
        transform: "translate(-50%, -50%)",
        fontFamily: "ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: "0.42em",
        color: "rgba(230,194,122,0.95)",
        textTransform: "uppercase",
        textShadow: "0 0 10px rgba(230,194,122,0.30)",
        opacity: 0,
        whiteSpace: "nowrap",
        willChange: "transform, opacity, left, top",
      }}
    >
      Hold to play
    </div>

    <div
      ref={wrapperRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      style={{
        willChange: "transform",
        transform: `translate3d(${HIDDEN_POS}px, ${HIDDEN_POS}px, 0)`,
      }}
    >
      {/* Circular progress ring — opacity = charge, scales subtly during hold */}
      <div
        ref={ringRef}
        style={{
          position: "absolute",
          left: 0, top: 0,
          opacity: 0,
          transform: "translate(-50%, -50%) scale(1)",
          willChange: "transform, opacity",
        }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
          {/* Background track */}
          <circle
            cx="40" cy="40" r={RING_RADIUS}
            fill="none"
            stroke="rgba(230,194,122,0.14)"
            strokeWidth="1.5"
          />
          {/* Progress fill — dashoffset animated in rAF */}
          <circle
            ref={progressRef}
            cx="40" cy="40" r={RING_RADIUS}
            fill="none"
            stroke={BAT_GOLD}
            strokeWidth="2.5"
            strokeDasharray={RING_CIRCUM}
            strokeDashoffset={RING_CIRCUM}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ filter: "drop-shadow(0 0 6px rgba(230,194,122,0.55))" }}
          />
        </svg>
      </div>

      {/* Bat — rotation/scale/glow driven by rAF */}
      <div
        ref={innerRef}
        style={{
          transform: `translate(-50%, -50%) rotate(${BASE_ROTATION_DEG}deg) scale(1)`,
          willChange: "transform, filter",
          filter: "drop-shadow(0 0 6px rgba(230,194,122,0.45)) drop-shadow(0 0 14px rgba(230,194,122,0.16))",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            {/* Radial body shading — bright top-left, deepening to dark red edge */}
            <radialGradient id="cb-grad" cx="35%" cy="30%" r="70%">
              <stop offset="0%"   stopColor="#cf3d3d" />
              <stop offset="55%"  stopColor="#9b1c1c" />
              <stop offset="100%" stopColor="#560d0d" />
            </radialGradient>
          </defs>

          {/* Ball body — slight black outline for definition on dark backgrounds */}
          <circle cx="12" cy="12" r="10.2" fill="url(#cb-grad)" stroke="rgba(0,0,0,0.45)" strokeWidth="0.5" />

          {/* Specular highlight (top-left) — two-stop ellipse for a softer look */}
          <ellipse cx="8" cy="7.4" rx="3.6" ry="2.4" fill="rgba(255,215,195,0.32)" />
          <ellipse cx="7" cy="6.8" rx="1.5" ry="1.0" fill="rgba(255,238,222,0.45)" />

          {/* Curved white seam — gentle arc across the middle */}
          <path d="M3,12 Q12,7.4 21,12"  fill="none" stroke="#f1e6d6" strokeWidth="0.9" strokeLinecap="round" />
          {/* Lower seam shadow — gives the seam a slight 3D ribbon feel */}
          <path d="M3,12 Q12,16.6 21,12" fill="none" stroke="#cab5a0" strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />

          {/* Stitch marks — short ticks crossing the upper seam */}
          <g stroke="#3a0808" strokeWidth="0.5" strokeLinecap="round">
            <line x1="5"  y1="11.0" x2="5"  y2="12.0" />
            <line x1="8"  y1="9.7"  x2="8"  y2="10.7" />
            <line x1="12" y1="9.2"  x2="12" y2="10.2" />
            <line x1="16" y1="9.7"  x2="16" y2="10.7" />
            <line x1="19" y1="11.0" x2="19" y2="12.0" />
          </g>
          {/* Stitch marks on the lower seam shadow side (slightly fainter) */}
          <g stroke="#3a0808" strokeWidth="0.4" strokeLinecap="round" opacity="0.7">
            <line x1="5"  y1="12.0" x2="5"  y2="13.0" />
            <line x1="8"  y1="13.4" x2="8"  y2="14.4" />
            <line x1="12" y1="13.8" x2="12" y2="14.8" />
            <line x1="16" y1="13.4" x2="16" y2="14.4" />
            <line x1="19" y1="12.0" x2="19" y2="13.0" />
          </g>

          {/* Subtle rim light along the top edge — improves visibility on
              dark backgrounds without needing extra drop-shadows */}
          <path d="M5,6.5 Q12,3.6 19,6.5" fill="none" stroke="rgba(255,180,160,0.20)" strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </div>
    </div>
    </>
  );
}

/* ── Impact SFX (whoosh) ────────────────────────────────────────────────
   Placeholder Web Audio synthesis — two layered oscillators (airy sweep +
   low thump). Lives at module scope so the same AudioContext is reused
   across firings. Volumes are kept under 0.15 so the effect reads as a
   transient cue, not an overpowering hit. Swap in a sample file later by
   replacing the body of playImpactWhoosh().                              */

let _impactCtx: AudioContext | null = null;
function getImpactCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_impactCtx) {
    const Ctor = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    _impactCtx = new Ctor();
  }
  if (_impactCtx.state === "suspended") _impactCtx.resume().catch(() => {});
  return _impactCtx;
}

function playImpactWhoosh() {
  const ctx = getImpactCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Shared master to keep both layers balanced and easy to retune.
  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  /* Layer 1 — airy high→low sweep (the "whoosh") */
  const sweep      = ctx.createOscillator();
  const sweepGain  = ctx.createGain();
  sweep.type = "triangle";
  sweep.frequency.setValueAtTime(900, t);
  sweep.frequency.exponentialRampToValueAtTime(140, t + 0.30);
  sweepGain.gain.setValueAtTime(0, t);
  sweepGain.gain.linearRampToValueAtTime(0.12, t + 0.020);
  sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
  sweep.connect(sweepGain).connect(master);
  sweep.start(t);
  sweep.stop(t + 0.36);

  /* Layer 2 — low thump for the impact body */
  const thump     = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(70, t);
  thump.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  thumpGain.gain.setValueAtTime(0, t);
  thumpGain.gain.linearRampToValueAtTime(0.14, t + 0.010);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  thump.connect(thumpGain).connect(master);
  thump.start(t);
  thump.stop(t + 0.20);
}

/* ── Impact moment ────────────────────────────────────────────────────────
   Fired once when hold completes at 3s. Three short-lived effects appended
   to <body> and torn down after their animation finishes.                  */
function fireImpact(x: number, y: number) {
  if (typeof window === "undefined") return;

  /* 0a. Whoosh SFX — synthesised exactly at the transition frame */
  playImpactWhoosh();

  /* 0b. Begin the chant fade-out at the SAME instant so the ambient is
         already heading toward silence under the whoosh. GameOverlay will
         redispatch audio:off when it mounts (~220ms later) — the engine
         cancels any in-flight ramp and continues from current gain, so
         the double dispatch is safe.                                       */
  window.dispatchEvent(new CustomEvent("audio:off"));

  /* 1. Quick flash — radial bloom centred on cursor */
  const flash = document.createElement("div");
  flash.style.cssText = `
    position: fixed; inset: 0; z-index: 9997; pointer-events: none;
    background: radial-gradient(circle at ${x}px ${y}px,
      rgba(230,194,122,0.55) 0%, rgba(255,255,255,0.18) 22%, transparent 60%);
    opacity: 1;
    transition: opacity 380ms cubic-bezier(0.16, 1, 0.3, 1);
  `;
  document.body.appendChild(flash);
  requestAnimationFrame(() => { flash.style.opacity = "0"; });
  setTimeout(() => flash.remove(), 420);

  /* 2. Cricket ball — shoots forward (up-and-right) from cursor */
  const size = 14;
  const ball = document.createElement("div");
  ball.style.cssText = `
    position: fixed; left: ${x - size / 2}px; top: ${y - size / 2}px;
    width: ${size}px; height: ${size}px; border-radius: 50%;
    background: radial-gradient(circle at 32% 32%, #f4dba6 0%, #d4ad75 55%, #8a6841 100%);
    box-shadow: 0 0 14px 3px rgba(230,194,122,0.6), inset -2px -2px 3px rgba(0,0,0,0.4);
    z-index: 9998; pointer-events: none;
    will-change: transform, opacity;
  `;
  document.body.appendChild(ball);

  // Launch direction: up-and-right (~-72° where 0° = right, -90° = straight up)
  const distance = 420;
  const angleRad = (-72) * Math.PI / 180;
  const dx = Math.cos(angleRad) * distance;
  const dy = Math.sin(angleRad) * distance;

  ball.animate(
    [
      { transform: "translate(0, 0) scale(1)",                              opacity: 1                 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(0.92)`, opacity: 0.92, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.55)`,               opacity: 0                 },
    ],
    { duration: 720, easing: "cubic-bezier(0.15, 0.55, 0.4, 1)" }
  );
  setTimeout(() => ball.remove(), 760);

  /* 3. Subtle screen shake — Web Animations on <body> for impact thud.
        composite: "add" so any existing body transform is preserved.       */
  document.body.animate(
    [
      { transform: "translate(0, 0)"     },
      { transform: "translate(-5px, 2px)" },
      { transform: "translate(4px, -3px)" },
      { transform: "translate(-3px, 2px)" },
      { transform: "translate(2px, -1px)" },
      { transform: "translate(0, 0)"     },
    ],
    { duration: 420, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)", composite: "add" }
  );

  /* 4. Transition into game mode — let the impact effects read for ~220ms first,
        then hand off to the GameOverlay component via a custom event.        */
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("game:open"));
  }, 220);
}
