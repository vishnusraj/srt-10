"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { HeroCanvas } from "@/components/canvas/HeroCanvas";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";

const D = 0.6; // base entrance delay after intro clears

const STATS = [
  { end: 100,    suffix: "",     label: "International centuries" },
  { end: 34357,  suffix: "",     label: "International runs"      },
  { end: 664,    suffix: "",     label: "Matches played"          },
];

// ── Stat pill — count-up on mount + hover lift ────────────────────────────────

function Stat({
  end,
  suffix,
  label,
  delay,
}: {
  end: number;
  suffix: string;
  label: string;
  delay: number;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = spanRef.current;
    if (!el) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: end,
      duration: end > 1000 ? 2.2 : 1.6,
      ease: "power2.out",
      delay,
      onUpdate() {
        el.textContent = Math.round(obj.val).toLocaleString() + suffix;
      },
    });
  }, wrapRef, []);

  return (
    <motion.div
      ref={wrapRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
      className="flex flex-col gap-1 px-6 first:pl-0 last:pr-0 group"
    >
      <span
        ref={spanRef}
        className="font-display text-[2.2rem] md:text-[2.75rem] leading-none tracking-wider text-white/90 transition-colors duration-300 group-hover:text-accent"
      >
        0
      </span>
      <motion.span
        className="text-[10px] uppercase tracking-[0.30em] text-white/28 font-mono whitespace-nowrap transition-colors duration-300 group-hover:text-white/52"
      >
        {label}
      </motion.span>
    </motion.div>
  );
}

// ── Hero section ──────────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative w-full min-h-screen overflow-hidden border-b border-subtle"
    >
      {/* ── WebGL canvas ── */}
      <HeroCanvas />

      {/* Ghost "10" — subtle centre anchor, kept faint so the image reads first */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2] select-none"
      >
        <span
          className="font-display leading-none text-white/[0.016]"
          style={{ fontSize: "clamp(260px, 52vw, 740px)" }}
        >
          10
        </span>
      </div>

      {/* ── Subject spotlight ring — one-time entrance pulse ── */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: [0, 0.18, 0], scale: [0.88, 1.02, 1.08] }}
        transition={{ duration: 2.8, delay: D + 1.2, ease: "easeOut" }}
        className="absolute pointer-events-none z-[4] rounded-full border border-white/40"
        style={{
          left: "50%", top: "46%",
          transform: "translate(-50%, -50%)",
          width: "38vmin", height: "50vmin",
        }}
      />

      {/* ── Gradient scrims ── */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[60vh] bg-gradient-to-t from-background via-background/55 to-transparent pointer-events-none z-[5]" />
      <div aria-hidden className="absolute inset-y-0 left-0  w-32 bg-gradient-to-r from-background/60 to-transparent pointer-events-none z-[5]" />
      <div aria-hidden className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background/60 to-transparent pointer-events-none z-[5]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-[38vh] bg-gradient-to-b from-background/65 via-background/20 to-transparent pointer-events-none z-[6]" />

      {/* ── TOP ZONE — corner wordmark, not a canvas overlay ── */}
      <div className="absolute inset-x-0 top-0 pointer-events-none z-10">
        <div className="container-wide pt-[76px] md:pt-[80px]">

          {/* Full-width rule just below navbar */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: D + 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-px bg-white/[0.07] origin-left mb-5"
          />

          {/* Left wordmark — right metadata */}
          <div className="flex items-start justify-between">

            {/* NAME as compact wordmark */}
            <div>
              <div className="overflow-hidden">
                <motion.h1
                  initial={{ y: "108%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: D + 0.10 }}
                  className="font-display text-white uppercase leading-[0.84] tracking-[0.04em]"
                  style={{ fontSize: "clamp(1.9rem, 3.4vw, 4rem)" }}
                >
                  Sachin
                </motion.h1>
              </div>
              <div className="overflow-hidden">
                <motion.h1
                  initial={{ y: "108%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: D + 0.17 }}
                  className="font-display text-accent uppercase leading-[0.84] tracking-[0.04em]"
                  style={{ fontSize: "clamp(1.9rem, 3.4vw, 4rem)" }}
                >
                  Tendulkar
                </motion.h1>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: D + 0.36 }}
                className="mt-2 text-[9px] uppercase tracking-[0.48em] text-white/22 font-mono"
              >
                God of Cricket
              </motion.p>
            </div>

            {/* Right — era labels */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: D }}
              className="hidden md:flex flex-col items-end gap-1.5"
            >
              <span className="text-[10px] uppercase tracking-[0.48em] text-accent/70 font-mono inline-flex items-center">
                Cricket&nbsp;·&nbsp;
                {/* Small Indian flag — three bands + chakra hint. Decorative
                   border + drop-shadow define its edge against dark hero. */}
                <span
                  role="img"
                  aria-label="India"
                  style={{
                    display: "inline-flex",
                    width: 16,
                    height: 11,
                    marginRight: 5,
                    borderRadius: 1.5,
                    overflow: "hidden",
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.45)",
                    verticalAlign: "middle",
                  }}
                >
                  <svg width="16" height="11" viewBox="0 0 30 20" aria-hidden>
                    <rect width="30" height="6.667" y="0"       fill="#FF9933" />
                    <rect width="30" height="6.666" y="6.667"   fill="#FFFFFF" />
                    <rect width="30" height="6.667" y="13.333"  fill="#138808" />
                    {/* Ashoka chakra — tiny ring + cross spokes (legible at this scale) */}
                    <circle cx="15" cy="10" r="1.8"
                            fill="none" stroke="#000080" strokeWidth="0.45" />
                    <line x1="13.2" y1="10" x2="16.8" y2="10"
                          stroke="#000080" strokeWidth="0.3" />
                    <line x1="15"   y1="8.2" x2="15"  y2="11.8"
                          stroke="#000080" strokeWidth="0.3" />
                  </svg>
                </span>
                India
              </span>
              <span className="text-[10px] uppercase tracking-[0.32em] text-white/22 font-mono">
                1989 — 2013
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ZONE ── */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none z-10">
        <div className="container-wide pb-10 md:pb-14">

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.1, delay: D + 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-px bg-white/[0.07] origin-left mb-6"
          />

          <div className="flex items-end justify-between">
            {/* Stats row */}
            <div className="flex items-stretch pointer-events-auto">
              {STATS.map((stat, i) => (
                <div key={stat.label} className="flex items-stretch">
                  {i > 0 && <div className="w-px bg-white/[0.08] mx-1 self-stretch" />}
                  <Stat
                    end={stat.end}
                    suffix={stat.suffix}
                    label={stat.label}
                    delay={D + 0.44 + i * 0.06}
                  />
                </div>
              ))}
            </div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: D + 0.72 }}
              className="hidden md:flex flex-col items-center gap-2 pb-1"
            >
              <span className="text-[8px] uppercase tracking-[0.32em] text-white/18 font-mono [writing-mode:vertical-rl]">
                Scroll
              </span>
              {/* Animated scroll line */}
              <div className="relative w-px h-8 overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 w-full bg-gradient-to-b from-white/20 to-transparent"
                  animate={{ y: ["0%", "100%"], opacity: [1, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeIn", repeatDelay: 0.3 }}
                  style={{ height: "100%" }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
