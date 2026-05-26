"use client";

import { useRef, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { ChapterLabel } from "@/components/ui/ChapterLabel";

// Confetti-like celebration dots
const DOT_COUNT = 55;

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

export function WorldCupSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView   = useInView(sectionRef, { once: true, margin: "-8%" });

  const dots = useMemo(
    () =>
      Array.from({ length: DOT_COUNT }, (_, i) => ({
        x:    seededRand(i * 3)     * 100,
        y:    seededRand(i * 3 + 1) * 100,
        size: seededRand(i * 3 + 2) * 4 + 1.5,
        dur:  seededRand(i * 3 + 3) * 2.5 + 2.5,
        del:  seededRand(i * 3 + 4) * 1.8,
        blue: i % 3 === 0,
      })),
    []
  );

  useGSAP(() => {
    // "2011" ghost parallax
    gsap.to("[data-year-ghost]", {
      y: -70, ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1.6 },
    });
  }, sectionRef, []);

  return (
    <section
      ref={sectionRef}
      id="world-cup"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(155deg,#050a08 0%,#080808 55%,#060809 100%)" }}
    >
      <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

      {/* Blue-gold ambient glow */}
      <div
        aria-hidden className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 45%,rgba(30,80,160,0.06) 0%,rgba(200,169,126,0.04) 60%,transparent 80%)" }}
      />

      {/* Ghost "2011" watermark */}
      <span
        data-year-ghost
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display leading-none text-white select-none pointer-events-none"
        style={{ fontSize: "clamp(220px,45vw,680px)", opacity: 0.018 }}
      >
        2011
      </span>

      {/* Celebration dots — scattered across section, fade-pop in when revealed */}
      {dots.map((d, i) => (
        <motion.div
          key={i}
          aria-hidden
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: [0, d.blue ? 0.5 : 0.42, 0.18], scale: [0, 1.2, 1] } : {}}
          transition={{ duration: d.dur, delay: d.del, ease: [0.16, 1, 0.3, 1] }}
          className="absolute pointer-events-none rounded-full"
          style={{
            width:      d.size,
            height:     d.size,
            background: d.blue ? "rgba(60,120,220,0.9)" : "rgba(200,169,126,0.9)",
            left:       `${d.x}%`,
            top:        `${d.y}%`,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[56rem] mx-auto">
        <ChapterLabel number="03" title="The World Cup" inView={isInView} />

        {/* Main headline */}
        {["For the", "country.", "For him."].map((line, i) => (
          <div key={i} className="overflow-hidden">
            <motion.h2
              initial={{ y: "112%", opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1], delay: 0.28 + i * 0.22 }}
              className="font-display leading-[1.1]"
              style={{
                fontSize: "clamp(2.4rem,5.5vw,5.2rem)",
                color: i === 2 ? "#c8a97e" : "rgba(255,255,255,0.88)",
              }}
            >
              {line}
            </motion.h2>
          </div>
        ))}

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], delay: 1.2 }}
          className="w-10 h-px bg-accent/22 origin-center my-12"
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 1.4 }}
          className="font-sans font-light text-white/30 leading-[1.75] max-w-[34rem] text-[0.9375rem]"
        >
          Six World Cups. Twenty-two years. He had carried a nation&rsquo;s
          dream for longer than most of his teammates had been alive.
          On April 2, 2011, at Wankhede Stadium in Mumbai — his home —
          India won. The tears on his face said everything.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 1.85 }}
          className="mt-12 font-script italic text-accent/45 leading-[1.65]"
          style={{ fontSize: "clamp(0.95rem,1.4vw,1.1rem)" }}
        >
          &ldquo;We didn&rsquo;t win the World Cup. We lifted Sachin on our shoulders
          and carried him around Wankhede. That was the real moment.&rdquo;
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.0, ease: "easeOut", delay: 2.15 }}
          className="mt-2 text-[10px] uppercase tracking-[0.38em] text-white/20 font-mono"
        >
          — Virat Kohli
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.0, ease: "easeOut", delay: 2.5 }}
          className="mt-14 text-[9px] uppercase tracking-[0.5em] text-white/18 font-mono"
        >
          Wankhede Stadium, Mumbai &nbsp;·&nbsp; April 2, 2011
        </motion.p>
      </div>
    </section>
  );
}
