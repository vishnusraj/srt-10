"use client";

/* ── GameOverlay: thin React shell ─────────────────────────────────────────
   Owns React UI state (score, wickets, balls, phase, level, target,
   nextTarget, displayedScore), the open/close lifecycle, and the JSX.
   All game logic, rendering, audio, and input handling lives under
   src/game/* — wired together by startEngine() from src/game/engine.ts. */

import { useEffect, useRef, useState } from "react";
import {
  EASE,
  PAGE_TRANS_MS,
  OVERLAY_FADE_MS,
  PAGE_BLUR_PX,
  PAGE_ZOOM_SCALE,
  APP_CONTENT_ID,
  INITIAL_BALL_SPEED,
  BALLS_PER_OVER,
  TOTAL_OVERS,
  TOTAL_BALLS,
  MAX_WICKETS,
} from "@/game/config";
import type { GameState, Phase } from "@/game/types";
import { progression } from "@/game/progression";
import { createGameState } from "@/game/state";
import { startBowlerApproach } from "@/game/bowler";
import { startEngine, type EngineHandle } from "@/game/engine";

/* ── Helpers: page transition + scroll lock ─────────────────────────────── */

function applyPageTransition(blur: boolean) {
  const app = document.getElementById(APP_CONTENT_ID);
  if (!app) return;
  app.style.transition = `filter ${PAGE_TRANS_MS}ms ${EASE}, transform ${PAGE_TRANS_MS}ms ${EASE}`;
  app.style.filter     = blur ? `blur(${PAGE_BLUR_PX}px)` : "blur(0px)";
  app.style.transform  = blur ? `scale(${PAGE_ZOOM_SCALE})` : "scale(1)";
  app.style.transformOrigin = "center center";
}

function clearPageTransition() {
  const app = document.getElementById(APP_CONTENT_ID);
  if (!app) return;
  app.style.transition = "";
  app.style.filter     = "";
  app.style.transform  = "";
  app.style.transformOrigin = "";
}

function lockBodyScroll(lock: boolean) {
  document.documentElement.classList.toggle("game-active", lock);
  document.body.style.overflow = lock ? "hidden" : "";
}

/* ── Inline styles (scoreboard + HUD) ───────────────────────────────────── */

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 6px",
  border: "1px solid rgba(230,194,122,0.32)",
  borderRadius: 4,
  background: "rgba(230,194,122,0.06)",
  color: "rgba(230,194,122,0.85)",
  fontSize: 11,
  lineHeight: 1,
  letterSpacing: 0,
  minWidth: 14,
  textAlign: "center",
};

const scoreboardSegmentStyle: React.CSSProperties = {
  padding: "0 18px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  minWidth: 64,
};
const scoreboardLabelStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.36em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.42)",
  fontWeight: 500,
  lineHeight: 1,
};
const scoreboardValueStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "#fff",
  lineHeight: 1.05,
  display: "flex",
  alignItems: "center",
};
const scoreboardDividerStyle: React.CSSProperties = {
  width: 1,
  alignSelf: "stretch",
  background:
    "linear-gradient(to bottom, rgba(230,194,122,0) 0%, rgba(230,194,122,0.28) 50%, rgba(230,194,122,0) 100%)",
  margin: "2px 0",
};

/* ── Component ──────────────────────────────────────────────────────────── */

export function GameOverlay() {
  const [mounted, setMounted]                 = useState(false);
  const [active,  setActive]                  = useState(false);
  const [score,   setScore]                   = useState(0);
  const [displayedScore, setDisplayedScore]   = useState(0);
  const [wickets, setWickets]                 = useState(0);
  const [balls,   setBalls]                   = useState(0);
  const [phase,     setPhase]                 = useState<Phase>("ready");
  const [countdown, setCountdown]             = useState<number>(3);
  const [target,     setTarget]               = useState(progression.target);
  const [level,      setLevel]                = useState(progression.level);
  const [nextTarget, setNextTarget]           = useState<number | null>(null);

  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const gameRef         = useRef<GameState | null>(null);
  const scoreSpanRef    = useRef<HTMLSpanElement>(null);
  const wicketSpanRef   = useRef<HTMLSpanElement>(null);
  const floatRunRef     = useRef<HTMLSpanElement>(null);
  const overDotRefs     = useRef<Array<HTMLSpanElement | null>>([]);
  const prevScoreRef    = useRef(0);
  const prevWicketsRef  = useRef(0);
  const prevBallsRef    = useRef(0);

  /* Game-loop mirrors of the React counters so the rAF tick reads them sync */
  const ballsRef       = useRef(0);
  const wicketsRef     = useRef(0);
  const phaseRef       = useRef<Phase>("ready");
  const scoreRef       = useRef(0);
  const targetRef      = useRef(progression.target);

  /* Close-flow guards */
  const closingRef          = useRef(false);
  const closeTimeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimersRef  = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  /* Single source of truth for reset. Note: `displayedScore` is intentionally
     NOT snapped to 0 here — the existing score-tween useEffect will roll it
     down smoothly from the final match value to 0 over 600 ms, which reads
     as a clean "scoreboard reset" between deliveries / matches. */
  const resetMatchState = () => {
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];

    setScore(0);
    setWickets(0);
    setBalls(0);
    setPhase("ready");
    setCountdown(3);
    setNextTarget(null);
    setTarget(progression.target);
    setLevel(progression.level);
    prevScoreRef.current   = 0;
    prevWicketsRef.current = 0;
    prevBallsRef.current   = 0;
    ballsRef.current       = 0;
    wicketsRef.current     = 0;
    phaseRef.current       = "ready";
    scoreRef.current       = 0;
    targetRef.current      = progression.target;
  };

  /* Start-button handler — transitions ready → countdown → playing. */
  const handleStart = () => {
    if (phaseRef.current !== "ready") return;
    phaseRef.current = "countdown";
    setPhase("countdown");
    setCountdown(3);

    countdownTimersRef.current.push(
      setTimeout(() => setCountdown(2), 1000),
      setTimeout(() => setCountdown(1), 2000),
      setTimeout(() => {
        phaseRef.current = "playing";
        setPhase("playing");
        // Kick off the bowler animation instead of spawning the ball
        // directly. The engine drives the run-up + delivery each tick and
        // calls spawnBall on the release frame.
        if (gameRef.current) {
          startBowlerApproach(gameRef.current.bowler, performance.now());
        }
        countdownTimersRef.current = [];
      }, 3000),
    );
  };

  /* Play-again handler — for both win ("Next Game") and loss ("Restart"). */
  const handlePlayAgain = () => {
    if (phaseRef.current !== "ended") return;
    resetMatchState();
    if (gameRef.current) {
      gameRef.current = createGameState(INITIAL_BALL_SPEED + progression.speedBonus);
    }
  };

  /* Open handler */
  useEffect(() => {
    const onOpen = () => {
      if (mounted) return;
      if (closeTimeoutRef.current !== null) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      closingRef.current = false;
      applyPageTransition(true);
      lockBodyScroll(true);
      window.dispatchEvent(new CustomEvent("cursor:hide"));
      window.dispatchEvent(new CustomEvent("audio:off"));
      resetMatchState();
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
    };
    window.addEventListener("game:open", onOpen);
    return () => window.removeEventListener("game:open", onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  /* Close handler — idempotent. */
  const close = () => {
    if (!active || closingRef.current) return;
    closingRef.current = true;
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setActive(false);
    applyPageTransition(false);
    window.dispatchEvent(new CustomEvent("audio:on"));
    const wait = Math.max(PAGE_TRANS_MS, OVERLAY_FADE_MS);
    closeTimeoutRef.current = setTimeout(() => {
      setMounted(false);
      clearPageTransition();
      lockBodyScroll(false);
      window.dispatchEvent(new CustomEvent("cursor:show"));
      resetMatchState();
      closeTimeoutRef.current = null;
      closingRef.current      = false;
    }, wait);
  };

  /* Final unmount guard. */
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      clearPageTransition();
      lockBodyScroll(false);
      window.dispatchEvent(new CustomEvent("cursor:show"));
      window.dispatchEvent(new CustomEvent("audio:on"));
    };
  }, []);

  /* Esc to close */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /* Smooth score tween */
  useEffect(() => {
    if (score === displayedScore) return;
    const start    = displayedScore;
    const target   = score;
    const duration = 600;
    const startT   = performance.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min((performance.now() - startT) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplayedScore(Math.round(start + (target - start) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  /* Score pop — value scale + floating "+N" indicator rising above the chip. */
  useEffect(() => {
    const delta = score - prevScoreRef.current;
    if (delta > 0 && scoreSpanRef.current) {
      // Softer peak + longer arc so the pop reads as graceful rather than
      // hyperactive. Lower peak (1.25) keeps the impact without bouncing.
      scoreSpanRef.current.animate(
        [
          { transform: "scale(1)",    color: "#ffffff" },
          { transform: "scale(1.25)", color: "#E6C27A", offset: 0.38 },
          { transform: "scale(1)",    color: "#ffffff" },
        ],
        { duration: 580, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      );
      // Floating "+4" / "+6" rises above the score and fades. Built each
      // change so the keyframes carry the current delta.
      if (floatRunRef.current) {
        floatRunRef.current.textContent = `+${delta}`;
        const tint = delta >= 6 ? "rgba(255,235,180,1)"
                   : delta >= 4 ? "rgba(230,194,122,1)"
                                : "rgba(255,255,255,0.85)";
        floatRunRef.current.style.color = tint;
        floatRunRef.current.style.textShadow = `0 0 10px ${tint}`;
        floatRunRef.current.animate(
          [
            { opacity: 0, transform: "translate(-50%, 0) scale(0.7)" },
            { opacity: 1, transform: "translate(-50%, -14px) scale(1.18)", offset: 0.2 },
            { opacity: 1, transform: "translate(-50%, -28px) scale(1.00)", offset: 0.55 },
            { opacity: 0, transform: "translate(-50%, -48px) scale(0.95)" },
          ],
          { duration: 1100, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
        );
      }
    }
    prevScoreRef.current = score;
  }, [score]);

  /* Over-dot pop — small bounce when a new ball lands in the current over.  */
  useEffect(() => {
    if (balls > prevBallsRef.current) {
      // The dot that just lit corresponds to the (just-landed) ball index
      // within the over: (balls - 1) % BALLS_PER_OVER. If balls is a fresh
      // multiple of 6, the over rolled over — pop the LAST dot of the prior
      // over before resetting.
      const idxJustLit = ((balls - 1) % BALLS_PER_OVER + BALLS_PER_OVER) % BALLS_PER_OVER;
      const el = overDotRefs.current[idxJustLit];
      if (el) {
        el.animate(
          [
            { transform: "scale(0.4)",  opacity: 0 },
            { transform: "scale(1.55)", opacity: 1, offset: 0.4 },
            { transform: "scale(1.00)", opacity: 1 },
          ],
          { duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
        );
      }
    }
    prevBallsRef.current = balls;
  }, [balls]);

  /* Wicket pop — softer peak (1.30) and longer arc; the wicket sting +
     stumps-fall animation already carries the weight, so the counter pop
     can be more graceful. */
  useEffect(() => {
    if (wickets > prevWicketsRef.current && wicketSpanRef.current) {
      wicketSpanRef.current.animate(
        [
          { transform: "scale(1)",    color: "#ffffff" },
          { transform: "scale(1.30)", color: "#ff7878", offset: 0.33 },
          { transform: "scale(1)",    color: "#ffffff" },
        ],
        { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      );
    }
    prevWicketsRef.current = wickets;
  }, [wickets]);

  /* Engine lifecycle — startEngine on activate, stop() on cleanup. */
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const handle: EngineHandle = startEngine(canvasRef.current, {
      phaseRef,
      scoreRef,
      wicketsRef,
      ballsRef,
      targetRef,
      gameRef,
      setScore,
      setWickets,
      setBalls,
      setPhase,
      setNextTarget,
    });
    return () => handle.stop();
  }, [active]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!active}
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        opacity: active ? 1 : 0,
        transition: `opacity ${OVERLAY_FADE_MS}ms ${EASE}`,
        background:
          "radial-gradient(ellipse at center, rgba(12,12,12,0.96) 0%, rgba(4,4,4,0.99) 70%, #000 100%)",
        cursor: "auto",
        willChange: "opacity",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: "contrast(1.06) saturate(1.05)",
        }}
      />

      {/* Broadcast scoreboard */}
      <div
        aria-label="Match scoreboard"
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "stretch",
          background: "rgba(10,10,12,0.74)",
          border: "1px solid rgba(230,194,122,0.22)",
          borderRadius: 14,
          padding: "10px 4px",
          fontFamily: "ui-monospace, monospace",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow:
            "0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(0,0,0,0.4)",
          pointerEvents: "none",
        }}
      >
        <div style={scoreboardSegmentStyle}>
          <div style={scoreboardLabelStyle}>Level</div>
          <div style={{ ...scoreboardValueStyle, color: "rgba(230,194,122,0.95)" }}>
            {String(level).padStart(2, "0")}
          </div>
        </div>

        <div style={scoreboardDividerStyle} />

        <div style={{ ...scoreboardSegmentStyle, position: "relative" }}>
          <div style={scoreboardLabelStyle}>Score</div>
          <div style={scoreboardValueStyle}>
            <span
              ref={scoreSpanRef}
              style={{
                color: "#fff",
                display: "inline-block",
                transformOrigin: "left center",
                minWidth: "2ch",
                willChange: "transform, color",
              }}
            >
              {String(displayedScore).padStart(2, "0")}
            </span>
            <span style={{ color: "rgba(255,255,255,0.35)", margin: "0 4px" }}>/</span>
            <span
              ref={wicketSpanRef}
              style={{
                color: "rgba(255,120,120,0.95)",
                display: "inline-block",
                transformOrigin: "left center",
                minWidth: "1ch",
                willChange: "transform, color",
              }}
            >
              {wickets}
            </span>
          </div>
          {/* Floating "+N" indicator — Web-Animations driven per score change.
             Positioned above the score chip; absolute so it doesn't reflow. */}
          <span
            ref={floatRunRef}
            aria-hidden
            style={{
              position: "absolute",
              top: 4,
              left: "50%",
              transform: "translate(-50%, 0) scale(0.7)",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.06em",
              pointerEvents: "none",
              opacity: 0,
              willChange: "transform, opacity",
            }}
          />
        </div>

        <div style={scoreboardDividerStyle} />

        <div style={scoreboardSegmentStyle}>
          <div style={scoreboardLabelStyle}>Overs</div>
          <div style={scoreboardValueStyle}>
            <span style={{ color: "#fff" }}>
              {Math.floor(balls / BALLS_PER_OVER)}.{balls % BALLS_PER_OVER}
            </span>
            <span style={{ color: "rgba(255,255,255,0.35)", margin: "0 4px" }}>/</span>
            <span style={{ color: "rgba(255,255,255,0.55)" }}>{TOTAL_OVERS}.0</span>
          </div>
          {/* Per-ball dots — six dots representing the current over. Filled
             as each ball lands; resets visually at the start of a new over. */}
          <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
            {Array.from({ length: BALLS_PER_OVER }).map((_, i) => {
              const completedInOver = balls % BALLS_PER_OVER;
              const isLit = i < completedInOver;
              return (
                <span
                  key={i}
                  ref={(el) => { overDotRefs.current[i] = el; }}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    display: "inline-block",
                    background: isLit
                      ? "rgba(230,194,122,0.85)"
                      : "rgba(255,255,255,0.14)",
                    boxShadow: isLit
                      ? "0 0 6px rgba(230,194,122,0.45)"
                      : "none",
                    transformOrigin: "center",
                    transition: "background-color 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div style={scoreboardDividerStyle} />

        <div style={scoreboardSegmentStyle}>
          <div style={scoreboardLabelStyle}>Target</div>
          <div style={{ ...scoreboardValueStyle, color: "rgba(230,194,122,0.95)" }}>
            {target}
          </div>
        </div>

        {phase === "playing" && displayedScore < target && (() => {
          /* Required-runs / required-rate display with graduated pressure
             colour. Pressure ramps in continuously with the asking rate:
             at ≤ 0.5 rpb it's a calm green; past 1.0 it tilts amber; past
             1.7 it goes red + pulses. Pure visual tier mapping — no logic
             change to the match itself.                                    */
          const runsNeeded = Math.max(0, target - displayedScore);
          const ballsLeft  = Math.max(0, TOTAL_BALLS - balls);
          const rrr        = ballsLeft > 0 ? runsNeeded / ballsLeft : 0;
          // 0 (calm) → 1 (max pressure). Anchors: 0.5 rpb = 0, 1.7 rpb = 1.
          const pressure = Math.min(1, Math.max(0, (rrr - 0.5) / 1.2));
          // Lerp colour: green (calm) → amber (mid) → red (high pressure).
          const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
          const tR = pressure < 0.5
            ? lerp(150, 240, pressure / 0.5)
            : lerp(240, 255, (pressure - 0.5) / 0.5);
          const tG = pressure < 0.5
            ? lerp(210, 190, pressure / 0.5)
            : lerp(190, 110, (pressure - 0.5) / 0.5);
          const tB = pressure < 0.5
            ? lerp(180, 120, pressure / 0.5)
            : lerp(120,  95, (pressure - 0.5) / 0.5);
          const needColor = `rgb(${tR | 0}, ${tG | 0}, ${tB | 0})`;
          const isHighPressure = pressure >= 0.55;
          return (
            <>
              <div style={scoreboardDividerStyle} />
              <div style={scoreboardSegmentStyle}>
                <div style={scoreboardLabelStyle}>Need</div>
                <div
                  style={{
                    ...scoreboardValueStyle,
                    color: needColor,
                    textShadow: isHighPressure
                      ? "0 0 12px rgba(255,120,120,0.45)"
                      : "none",
                    animation: isHighPressure
                      ? "need-pressure-pulse 1100ms cubic-bezier(0.16, 1, 0.3, 1) infinite"
                      : "none",
                    transformOrigin: "center",
                    willChange: "transform, text-shadow",
                  }}
                >
                  <span style={{ color: needColor, fontWeight: 700 }}>{runsNeeded}</span>
                  <span style={{
                    color: "rgba(255,255,255,0.4)",
                    margin: "0 6px",
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    fontWeight: 500,
                  }}>
                    OFF
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>{ballsLeft}</span>
                </div>
                {/* Required run rate sub-line — small, monochrome, informative. */}
                <div style={{
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  color: isHighPressure
                    ? "rgba(255,150,150,0.75)"
                    : "rgba(255,255,255,0.35)",
                  fontWeight: 500,
                  marginTop: 2,
                  lineHeight: 1,
                  textTransform: "uppercase",
                }}>
                  RRR&nbsp;{rrr.toFixed(2)}
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={close}
        aria-label="Close game"
        style={{
          position: "absolute",
          top: 16, right: 18,
          width: 40, height: 40,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(230,194,122,0.25)",
          borderRadius: "50%",
          color: "rgba(230,194,122,0.85)",
          cursor: "pointer",
          transition: `background-color 220ms ${EASE}, border-color 220ms ${EASE}, transform 220ms ${EASE}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(230,194,122,0.10)";
          e.currentTarget.style.borderColor = "rgba(230,194,122,0.55)";
          e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.borderColor = "rgba(230,194,122,0.25)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path
            d="M2 2 L12 12 M12 2 L2 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Controls hint */}
      <div
        style={{
          position: "absolute",
          bottom: 22, left: 0, right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.34)",
          fontFamily: "ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: "0.38em",
          textTransform: "uppercase",
          pointerEvents: "none",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 18,
        }}
      >
        <span><kbd style={kbdStyle}>↑</kbd>&nbsp;Straight</span>
        <span><kbd style={kbdStyle}>←</kbd>&nbsp;Cover</span>
        <span><kbd style={kbdStyle}>→</kbd>&nbsp;Pull</span>
        <span><kbd style={kbdStyle}>↓</kbd>&nbsp;Defend</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span><kbd style={kbdStyle}>Esc</kbd>&nbsp;Exit</span>
      </div>

      {/* READY phase — always mounted, opacity-gated so it can cross-fade
         with the ended overlay on restart. Delayed fade-IN (240 ms) lets
         the ended overlay clear first; fast fade-OUT (260 ms) when the
         countdown begins so the "3" lands on an empty canvas. */}
      <button
        type="button"
        onClick={handleStart}
        aria-label="Start game"
        disabled={phase !== "ready"}
        aria-hidden={phase !== "ready"}
        style={{
          position: "absolute",
          left: "50%",
          top:  "50%",
          transform: "translate(-50%, -50%)",
          padding: "16px 42px",
          background: "rgba(230,194,122,0.05)",
          border: "1px solid rgba(230,194,122,0.45)",
          borderRadius: 8,
          color: "rgba(230,194,122,0.95)",
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          cursor: phase === "ready" ? "pointer" : "default",
          boxShadow: "0 0 32px rgba(230,194,122,0.10)",
          backdropFilter: "blur(4px)",
          opacity: phase === "ready" ? 1 : 0,
          pointerEvents: phase === "ready" ? "auto" : "none",
          willChange: "opacity, transform",
          transition: phase === "ready"
            ? `opacity 500ms ${EASE} 240ms, background-color 240ms ${EASE}, border-color 240ms ${EASE}, transform 240ms ${EASE}, box-shadow 240ms ${EASE}`
            : `opacity 260ms ${EASE}, background-color 240ms ${EASE}, border-color 240ms ${EASE}, transform 240ms ${EASE}, box-shadow 240ms ${EASE}`,
        }}
        onMouseEnter={(e) => {
          if (phase !== "ready") return;
          e.currentTarget.style.background    = "rgba(230,194,122,0.12)";
          e.currentTarget.style.borderColor   = "rgba(230,194,122,0.85)";
          e.currentTarget.style.boxShadow     = "0 0 44px rgba(230,194,122,0.22)";
          e.currentTarget.style.transform     = "translate(-50%, -50%) scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background    = "rgba(230,194,122,0.05)";
          e.currentTarget.style.borderColor   = "rgba(230,194,122,0.45)";
          e.currentTarget.style.boxShadow     = "0 0 32px rgba(230,194,122,0.10)";
          e.currentTarget.style.transform     = "translate(-50%, -50%) scale(1)";
        }}
      >
        Start Game
      </button>

      {/* COUNTDOWN phase */}
      {phase === "countdown" && (
        <div
          key={countdown}
          aria-live="polite"
          style={{
            position: "absolute",
            left: "50%",
            top:  "50%",
            fontFamily: "var(--font-saira-stencil), Impact, sans-serif",
            fontSize: "clamp(140px, 22vw, 260px)",
            fontWeight: 700,
            color: "rgba(230,194,122,0.95)",
            letterSpacing: "0.06em",
            textShadow: "0 0 48px rgba(230,194,122,0.45)",
            pointerEvents: "none",
            animation: "countdown-pop 1000ms cubic-bezier(0.16, 1, 0.3, 1) both",
            willChange: "transform, opacity",
          }}
        >
          {countdown}
        </div>
      )}

      {/* MATCH OVER overlay — short fade so it clears before the next
         Start button finishes its delayed entrance (Start button fade-in
         delay = 240 ms, end overlay fade-out = 380 ms → no overlap). */}
      <div
        aria-hidden={phase !== "ended"}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at center, rgba(8,8,8,0.85) 0%, rgba(0,0,0,0.95) 70%, #000 100%)",
          opacity: phase === "ended" ? 1 : 0,
          transition: `opacity 380ms ${EASE}`,
          pointerEvents: phase === "ended" ? "auto" : "none",
          willChange: "opacity",
        }}
      >
        {phase === "ended" && (() => {
          const won  = score >= target;
          const lost = !won;
          const headline = won
            ? "VICTORY"
            : wickets >= MAX_WICKETS
              ? "ALL OUT"
              : "MATCH OVER";
          const tint = won
            ? "rgba(150,210,180,0.95)"
            : wickets >= MAX_WICKETS
              ? "rgba(255,120,120,0.95)"
              : "rgba(230,194,122,0.95)";
          const shadow = won
            ? "0 0 28px rgba(150,210,180,0.45)"
            : wickets >= MAX_WICKETS
              ? "0 0 24px rgba(255,90,90,0.45)"
              : "0 0 24px rgba(230,194,122,0.35)";
          return (
            <>
              <div
                style={{
                  fontFamily: "var(--font-saira-stencil), Impact, sans-serif",
                  fontSize: "clamp(48px, 8vw, 96px)",
                  fontWeight: 700,
                  color: tint,
                  letterSpacing: "0.06em",
                  textShadow: shadow,
                }}
              >
                {headline}
              </div>

              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 18,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                <span style={{ color: "#fff", fontSize: 56, fontWeight: 700 }}>
                  {displayedScore}
                </span>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 28 }}>/</span>
                <span style={{ color: "rgba(255,120,120,0.85)", fontSize: 56, fontWeight: 700 }}>
                  {wickets}
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 13,
                  letterSpacing: "0.45em",
                  textTransform: "uppercase",
                  color: "rgba(230,194,122,0.78)",
                }}
              >
                {Math.floor(balls / BALLS_PER_OVER)}.{balls % BALLS_PER_OVER}&nbsp;
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Overs</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>&nbsp;·&nbsp;</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>Target&nbsp;{target}</span>
              </div>

              {won && nextTarget !== null && (
                <div
                  style={{
                    marginTop: 32,
                    padding: "10px 22px",
                    border: "1px solid rgba(150,210,180,0.35)",
                    borderRadius: 999,
                    background: "rgba(150,210,180,0.06)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    color: "rgba(150,210,180,0.92)",
                  }}
                >
                  Level&nbsp;{level + 1}&nbsp;·&nbsp;Next Target&nbsp;
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{nextTarget}</span>
                </div>
              )}

              {lost && (
                <div
                  style={{
                    marginTop: 32,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 11,
                    letterSpacing: "0.42em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  Same target on retry
                </div>
              )}

              {won ? (
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  aria-label="Continue to the next match"
                  style={{
                    marginTop: 28,
                    padding: "14px 38px",
                    background: "rgba(150,210,180,0.06)",
                    border: "1px solid rgba(150,210,180,0.50)",
                    borderRadius: 8,
                    color: "rgba(150,210,180,0.95)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 13,
                    letterSpacing: "0.46em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 0 28px rgba(150,210,180,0.14)",
                    transition: `background-color 240ms ${EASE}, border-color 240ms ${EASE}, transform 240ms ${EASE}, box-shadow 240ms ${EASE}`,
                    animation: "result-button-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both",
                    backdropFilter: "blur(4px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background  = "rgba(150,210,180,0.16)";
                    e.currentTarget.style.borderColor = "rgba(150,210,180,0.90)";
                    e.currentTarget.style.boxShadow   = "0 0 44px rgba(150,210,180,0.30)";
                    e.currentTarget.style.transform   = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background  = "rgba(150,210,180,0.06)";
                    e.currentTarget.style.borderColor = "rgba(150,210,180,0.50)";
                    e.currentTarget.style.boxShadow   = "0 0 28px rgba(150,210,180,0.14)";
                    e.currentTarget.style.transform   = "scale(1)";
                  }}
                >
                  Next Game
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  aria-label="Restart the match"
                  style={{
                    marginTop: 28,
                    padding: "14px 38px",
                    background: "rgba(230,194,122,0.05)",
                    border: "1px solid rgba(230,194,122,0.45)",
                    borderRadius: 8,
                    color: "rgba(230,194,122,0.95)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 13,
                    letterSpacing: "0.46em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 0 28px rgba(230,194,122,0.10)",
                    transition: `background-color 240ms ${EASE}, border-color 240ms ${EASE}, transform 240ms ${EASE}, box-shadow 240ms ${EASE}`,
                    animation: "result-button-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both",
                    backdropFilter: "blur(4px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background  = "rgba(230,194,122,0.14)";
                    e.currentTarget.style.borderColor = "rgba(230,194,122,0.85)";
                    e.currentTarget.style.boxShadow   = "0 0 44px rgba(230,194,122,0.26)";
                    e.currentTarget.style.transform   = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background  = "rgba(230,194,122,0.05)";
                    e.currentTarget.style.borderColor = "rgba(230,194,122,0.45)";
                    e.currentTarget.style.boxShadow   = "0 0 28px rgba(230,194,122,0.10)";
                    e.currentTarget.style.transform   = "scale(1)";
                  }}
                >
                  Restart
                </button>
              )}

              <div
                style={{
                  marginTop: 40,
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 10,
                  letterSpacing: "0.42em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.40)",
                }}
              >
                Press&nbsp;<kbd style={kbdStyle}>Esc</kbd>&nbsp;to exit
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
