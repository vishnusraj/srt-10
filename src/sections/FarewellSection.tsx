"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { ChapterLabel } from "@/components/ui/ChapterLabel";

// Fragments from his retirement speech
const SPEECH_LINES = [
  "India has given me everything.",
  "Cricket has given me everything.",
  "I don't know what I've given back.",
  "Whatever I have, I owe to this country.",
];

const FAREWELL_VIDEO_SRC = "/videos/sachin_farewell.mp4";
const FAREWELL_POSTER    = "/images/Sachin-Tendulkar-Mumbai-farewell.jpg";

export function FarewellSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const isInView   = useInView(sectionRef, { once: true, margin: "-8%" });
  const [modalOpen, setModalOpen] = useState(false);
  // Pre-modal cinematic black-fade phase (briefly veils the page before the modal mounts visually)
  const [transitioning, setTransitioning] = useState(false);

  // ── Body scroll lock + Esc-to-close + ambient-chant ducking ──
  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Pause the ambient Sachin chant so the speech audio is clearly audible.
    window.dispatchEvent(new CustomEvent("audio:off"));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      // Pause + reset the video and fade the ambient chant back in.
      const v = videoRef.current;
      if (v) { v.pause(); v.currentTime = 0; }
      window.dispatchEvent(new CustomEvent("audio:on"));
    };
  }, [modalOpen]);

  // ── Drop the black transition veil once the modal has fully closed ──
  useEffect(() => {
    if (modalOpen) return;
    const t = setTimeout(() => setTransitioning(false), 550);
    return () => clearTimeout(t);
  }, [modalOpen]);

  // ── Open handler — keeps the user-gesture chain so the browser lets the
  //   video play with audio. Calling .play() synchronously here (not from
  //   useEffect) is what prevents the browser from forcing muted playback.
  //   We also stage a brief fade-to-black before the modal visually opens,
  //   so the transition feels cinematic rather than an instant pop.
  function openModal() {
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      v.volume = 1;
      v.currentTime = 0;
      // Best-effort: the click on this handler IS the user gesture.
      void v.play().catch(() => { /* user can press the controls' play */ });
    }
    // Phase 1: fade-to-black veil + page zoom-in begin immediately.
    setTransitioning(true);
    // Phase 2: open the modal after the veil is mostly in (≈ 280ms).
    setTimeout(() => setModalOpen(true), 280);
  }

  useGSAP(() => {
    // Vertical beam of light grows from top
    gsap.fromTo("[data-light-beam]",
      { scaleY: 0, opacity: 0 },
      {
        scaleY: 1, opacity: 1,
        duration: 2.5, ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%", toggleActions: "play none none none" },
      }
    );
    // Beam slowly fades on scroll out
    gsap.to("[data-light-beam]", {
      opacity: 0, ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "bottom 80%", end: "bottom top", scrub: true },
    });
  }, sectionRef, []);

  return (
    <section
      ref={sectionRef}
      id="farewell"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: "#080808",
        paddingTop: "clamp(5rem, 8vw, 8rem)",
        paddingBottom: "clamp(5rem, 8vw, 8rem)",
      }}
    >
      <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

      {/* Vertical light beam from top, very subtle */}
      <div
        data-light-beam
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px origin-top pointer-events-none"
        style={{
          height: "100%",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, transparent 100%)",
        }}
      />

      {/* Soft white glow at base of beam */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "30vw",
          height: "38vh",
          background: "radial-gradient(ellipse 100% 100% at 50% 0%,rgba(255,255,255,0.04) 0%,transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[52rem] mx-auto">
        <ChapterLabel number="04" title="The Farewell" inView={isInView} accent={false} className="mb-16" />

        {/* "One last time." */}
        <div className="overflow-hidden mb-14">
          <motion.h2
            initial={{ y: "112%", opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            className="font-display text-white/82 leading-[1.08]"
            style={{ fontSize: "clamp(2.8rem,6.5vw,6rem)" }}
          >
            One last time.
          </motion.h2>
        </div>

        {/* Speech fragments — each line fades in with generous stagger */}
        <div className="flex flex-col gap-4 mb-14 max-w-[38rem]">
          {SPEECH_LINES.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.8 + i * 0.35 }}
              className="font-handwritten italic leading-[1.55]"
              style={{
                fontSize: "clamp(1.9rem,3.4vw,2.75rem)",
                color: i === SPEECH_LINES.length - 1
                  ? "rgba(200,169,126,0.78)"
                  : "rgba(255,255,255,0.5)",
              }}
            >
              {line}
            </motion.p>
          ))}
        </div>

        {/* ── Cinematic quote above the card — sets the emotional frame ──── */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 1.9 }}
          className="font-fraunces italic text-white/45 leading-snug mb-7 text-center"
          style={{ fontSize: "clamp(1rem, 1.55vw, 1.25rem)" }}
        >
          &ldquo;My life between 22 yards…&rdquo;
        </motion.p>

        {/* ── Watch moment card ─────────────────────────────────────────────── */}
        <motion.button
          type="button"
          onClick={openModal}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 2.1 }}
          className={`watch-card group relative overflow-hidden rounded-xl
                     w-full max-w-[42rem] mb-14
                     border border-white/10 transition-all duration-700 ease-out
                     hover:border-white/25 cursor-pointer
                     ${transitioning ? "scale-[1.025]" : "scale-100"}`}
          style={{ aspectRatio: "16 / 9" }}
          aria-label="Play Sachin Tendulkar's farewell speech"
        >
          {/* Blurred backdrop still — slow infinite zoom for living-photo feel */}
          <div
            aria-hidden
            className="absolute inset-0 farewell-slow-zoom"
          >
            <Image
              src={FAREWELL_POSTER}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 42rem"
              className="object-cover blur-sm opacity-55
                         transition-all duration-700 ease-out
                         group-hover:opacity-70 group-hover:blur-[2px]"
            />
          </div>

          {/* Dark dim overlay */}
          <div
            aria-hidden
            className="absolute inset-0 bg-black/55 transition-colors duration-500 group-hover:bg-black/40"
          />

          {/* Cinematic top + bottom gradient bands (letterbox depth) */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
          />

          {/* Soft warm bloom behind the play button */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none
                       w-72 h-72 rounded-full
                       opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background:
                "radial-gradient(circle, rgba(200,169,126,0.18) 0%, transparent 65%)",
              filter: "blur(20px)",
            }}
          />

          {/* Center stack — play button + label */}
          <div className="relative z-10 h-full w-full flex flex-col items-center justify-center gap-5 px-6">
            <span className="relative flex items-center justify-center">
              {/* Always-on subtle pulse ring */}
              <span
                aria-hidden
                className="farewell-pulse-ring absolute left-1/2 top-1/2 pointer-events-none
                           w-16 h-16 sm:w-20 sm:h-20 rounded-full
                           border border-white/45"
              />
              {/* Hover-only expanding ring (animation gated by .group:hover via CSS) */}
              <span
                aria-hidden
                className="farewell-hover-ring absolute left-1/2 top-1/2 pointer-events-none
                           w-16 h-16 sm:w-20 sm:h-20 rounded-full
                           border border-accent/70 opacity-0"
              />
              {/* The play button itself */}
              <span
                className="relative flex items-center justify-center
                           w-16 h-16 sm:w-20 sm:h-20 rounded-full
                           border border-white/60
                           backdrop-blur-sm bg-white/[0.04]
                           transition-all duration-500
                           group-hover:scale-[1.05] group-hover:border-accent
                           group-hover:bg-accent/10
                           group-hover:shadow-[0_0_40px_-2px_rgba(200,169,126,0.55)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 sm:w-7 sm:h-7 fill-white/85
                             transition-colors duration-500
                             group-hover:fill-accent translate-x-[1px]"
                  aria-hidden
                >
                  <path d="M5 4l14 8-14 8V4z" />
                </svg>
              </span>
            </span>

            <span
              className="font-display text-white/85 uppercase
                         tracking-[0.32em] text-[0.78rem] sm:text-[0.92rem]
                         transition-colors duration-500 group-hover:text-white"
            >
              Watch the Farewell Speech
            </span>

            <span className="text-[9px] uppercase tracking-[0.5em] text-white/35 font-mono">
              Nov 16, 2013 &nbsp;·&nbsp; Wankhede
            </span>
          </div>
        </motion.button>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], delay: 2.4 }}
          className="w-10 h-px bg-white/10 origin-center mb-12"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.4, ease: "easeOut", delay: 2.65 }}
          className="font-sans font-light text-white/26 max-w-[28rem] leading-[1.75] text-[0.9375rem]"
        >
          On November 16, 2013, at Wankhede Stadium — the same ground where
          he played his first senior match — Sachin Tendulkar walked off
          an international cricket field for the last time. He was forty years old.
          He had been doing this since he was sixteen.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.0, ease: "easeOut", delay: 3.1 }}
          className="mt-14 text-[9px] uppercase tracking-[0.5em] text-white/18 font-mono"
        >
          200th Test Match &nbsp;·&nbsp; Wankhede Stadium &nbsp;·&nbsp; Nov 16, 2013
        </motion.p>
      </div>

      {/* ── Cinematic fade-to-black veil ───────────────────────────────────────
        Sits below the modal (z-[290] vs z-[300]) and fades in during the
        brief 280 ms pre-modal phase, so the user sees a deliberate dim-out
        before the video appears. Stays on under the modal while open, so
        closing the modal feels like a slow restoration rather than a cut. */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: transitioning ? 1 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-[290] bg-black pointer-events-none"
      />

      {/* ── Fullscreen video modal ─────────────────────────────────────────────
        Always mounted (not gated behind AnimatePresence) so the <video>
        element exists in the DOM at click time — required for play() to
        inherit the user-gesture token and play with audio. The dim/scale
        chrome animates between closed/open states via framer-motion. */}
      <motion.div
        initial={false}
        animate={modalOpen ? "open" : "closed"}
        variants={{
          closed: { opacity: 0, pointerEvents: "none" },
          open:   { opacity: 1, pointerEvents: "auto" },
        }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        onClick={() => setModalOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-hidden={!modalOpen}
        aria-label="Sachin Tendulkar's farewell speech"
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center
                   gap-6 sm:gap-8 px-6
                   bg-black/92 backdrop-blur-sm"
      >
        {/* ── Emotional headline — appears above the video, sets the moment ── */}
        <motion.h3
          initial={false}
          animate={modalOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.9, delay: modalOpen ? 0.25 : 0, ease: [0.16, 1, 0.3, 1] }}
          className="font-fraunces italic text-white/92 text-center leading-[1.15]
                     max-w-[40rem] pointer-events-none"
          style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.6rem)" }}
        >
          The speech that stopped a nation.
          <motion.span
            aria-hidden
            initial={false}
            animate={modalOpen ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
            transition={{ duration: 1.1, delay: modalOpen ? 0.55 : 0, ease: [0.16, 1, 0.3, 1] }}
            className="block w-14 h-px bg-accent/55 mx-auto mt-4 origin-center"
          />
        </motion.h3>

        {/* Close button — top right */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setModalOpen(false); }}
          aria-label="Close video"
          tabIndex={modalOpen ? 0 : -1}
          className="absolute top-5 right-5 sm:top-7 sm:right-8 z-10
                     flex items-center justify-center
                     w-11 h-11 rounded-full
                     text-white/70 hover:text-white
                     border border-white/15 hover:border-white/40
                     bg-white/[0.03] hover:bg-white/[0.08]
                     backdrop-blur-md
                     transition-all duration-300
                     hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>

        {/* Video shell — stop propagation so clicks inside don't close.
           max-h cap guarantees the headline above stays on-screen on short viewports. */}
        <motion.div
          initial={false}
          animate={modalOpen ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[78rem]
                     aspect-video max-h-[68vh] bg-black
                     rounded-lg overflow-hidden
                     shadow-[0_30px_120px_-20px_rgba(0,0,0,0.9)]"
        >
          <video
            ref={videoRef}
            src={FAREWELL_VIDEO_SRC}
            poster={FAREWELL_POSTER}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full bg-black"
          />

          {/* Soft vignette — sits inside the shell so it darkens the video edges
             without overlapping the native controls (controls render on top). */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background:
                "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
              mixBlendMode: "multiply",
            }}
          />
        </motion.div>

        <p
          className="absolute bottom-6 left-1/2 -translate-x-1/2
                     text-[9px] uppercase tracking-[0.5em] text-white/30 font-mono
                     pointer-events-none"
        >
          Esc to close
        </p>
      </motion.div>
    </section>
  );
}
