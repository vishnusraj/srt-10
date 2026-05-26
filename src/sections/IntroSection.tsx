"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = [
  "A", "boy", "from", "Mumbai", "became",
  "the", "heartbeat", "of", "a", "billion", "people.",
];

const WORD_DELAY = (i: number) => 0.9 + i * 0.17;
const LAST_DONE  = WORD_DELAY(WORDS.length - 1) + 1.1;
const DASH_DELAY = LAST_DONE + 0.25;
const EXIT_AFTER = (LAST_DONE + 1.5) * 1000; // ms

export function IntroSection() {
  const [visible, setVisible] = useState(true);
  const revealedRef = useRef(false);

  /* Fire `hero-revealed` at the START of the exit animation (not after it
     completes) so the audio engine can begin its 2.5 s fade-in DURING the
     visual transition — the chant rises with the blur instead of after it.
     Idempotent via revealedRef so the skip handler + auto-exit timer can't
     double-dispatch if they race. */
  function notifyHeroRevealing() {
    if (revealedRef.current) return;
    revealedRef.current = true;
    window.dispatchEvent(new CustomEvent("hero-revealed"));
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      notifyHeroRevealing();
      setVisible(false);
    }, EXIT_AFTER);
    return () => clearTimeout(t);
  }, []);

  function handleExitComplete() {
    document.body.style.overflow = "";
  }

  function skip() {
    notifyHeroRevealing();
    setVisible(false);
  }

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        // ── Outer shell: dissolves via blur + opacity, revealing the hero
        //   already alive behind it. No clip-path — a clean cross-dissolve
        //   with a gentle bloom for cinematic feel.
        <motion.div
          key="intro"
          initial={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{   opacity: 0, filter: "blur(36px)", scale: 1.04 }}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
          onClick={skip}
          className="fixed inset-0 z-[200] bg-[#050505] flex items-center justify-center select-none overflow-hidden"
          style={{ cursor: "default" }}
        >
          {/* Grain */}
          <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

          {/* Radial vignette */}
          <div
            aria-hidden
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 75% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.78) 100%)",
            }}
          />

          {/* ── Quote — fades out quickly so the dark blur dissolves cleanly ── */}
          <motion.div
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.45, ease: "easeIn" }}
            className="relative z-[2] flex flex-col items-center gap-9 px-8 text-center max-w-2xl mx-auto pointer-events-none"
          >
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-8 h-px bg-accent/35 origin-center"
            />

            <p
              className="font-fraunces font-normal text-white/92 leading-[1.7]"
              style={{ fontSize: "clamp(1.05rem, 2.2vw, 2rem)" }}
              aria-label={WORDS.join(" ")}
            >
              {WORDS.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{
                    opacity: 0,
                    y: 14,
                    filter: "blur(14px)",
                    textShadow: "0 0 40px rgba(200,169,126,0.95), 0 0 80px rgba(200,169,126,0.5)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    textShadow: "0 0 14px rgba(200,169,126,0.22)",
                  }}
                  transition={{ duration: 1.2, delay: WORD_DELAY(i), ease: [0.16, 1, 0.3, 1] }}
                  className={`inline-block${i < WORDS.length - 1 ? " mr-[0.32em]" : ""}`}
                >
                  {word}
                </motion.span>
              ))}
            </p>

            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.4, delay: DASH_DELAY, ease: [0.16, 1, 0.3, 1] }}
              className="w-8 h-px bg-accent/35 origin-center"
            />
          </motion.div>

          {/* Skip hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: DASH_DELAY + 0.8 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.4em] text-white/18 font-mono pointer-events-none"
          >
            Click anywhere to skip
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
