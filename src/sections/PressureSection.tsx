"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { ChapterLabel } from "@/components/ui/ChapterLabel";

/* Concentric pressure rings — each ring index maps to its animation delay */
const RINGS = [
  { size: 160,  dur: 3.4, delay: 0 },
  { size: 280,  dur: 3.4, delay: 0.6 },
  { size: 420,  dur: 3.4, delay: 1.2 },
  { size: 580,  dur: 3.4, delay: 1.8 },
  { size: 760,  dur: 3.4, delay: 2.4 },
];

const FRAGMENTS = [
  { text: "When Sachin gets out,",  x: "7%",  y: "16%", size: "clamp(0.7rem,1.2vw,0.95rem)", op: 0.12, rot: -2 },
  { text: "India gets out.",        x: "9%",  y: "20%", size: "clamp(0.7rem,1.2vw,0.95rem)", op: 0.10, rot: -2 },
  { text: "a billion hearts",       x: "72%", y: "13%", size: "clamp(0.65rem,1.1vw,0.9rem)",  op: 0.09, rot:  3 },
  { text: "one pair of hands",      x: "74%", y: "17%", size: "clamp(0.65rem,1.1vw,0.9rem)",  op: 0.07, rot:  3 },
  { text: "carry us home",          x: "5%",  y: "75%", size: "clamp(0.7rem,1.1vw,0.88rem)", op: 0.08, rot:  1 },
  { text: "please",                 x: "78%", y: "72%", size: "clamp(0.65rem,1vw,0.85rem)",   op: 0.10, rot: -3 },
];

export function PressureSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView   = useInView(sectionRef, { once: true, margin: "-8%" });

  useGSAP(() => {
    // Fragments drift on scroll
    FRAGMENTS.forEach((_, i) => {
      gsap.to(`[data-frag="${i}"]`, {
        y: i % 2 === 0 ? -45 : -30,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1.2 },
      });
    });
  }, sectionRef, []);

  return (
    <section
      ref={sectionRef}
      id="pressure"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg,#060609 0%,#080808 50%,#06060a 100%)" }}
    >
      <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

      {/* Dark centre vignette — reinforces the claustrophobic weight */}
      <div
        aria-hidden className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%,transparent 30%,rgba(0,0,0,0.55) 100%)" }}
      />

      {/* Scattered text fragments */}
      {FRAGMENTS.map((f, i) => (
        <span
          key={i}
          data-frag={i}
          aria-hidden
          className="absolute font-script italic select-none pointer-events-none text-white"
          style={{ left: f.x, top: f.y, fontSize: f.size, opacity: f.op, transform: `rotate(${f.rot}deg)`, lineHeight: 1.2 }}
        >
          {f.text}
        </span>
      ))}

      {/* Pulsing concentric rings — pressure waves radiating outward */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
        {RINGS.map((ring, i) => (
          <motion.div
            key={i}
            animate={{ scale: [0.85, 1.18, 1.4], opacity: [0.18, 0.08, 0] }}
            transition={{ duration: ring.dur, delay: ring.delay, repeat: Infinity, ease: "easeOut" }}
            className="absolute rounded-full border border-white/20"
            style={{ width: ring.size, height: ring.size }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[54rem] mx-auto">
        <ChapterLabel number="01" title="The Burden" inView={isInView} accent={false} />

        {/* Split headline: two lines, each revealed from below */}
        {["A billion hearts.", "One pair of hands."].map((line, i) => (
          <div key={i} className="overflow-hidden">
            <motion.h2
              initial={{ y: "110%", opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.26 }}
              className="font-display text-white/85 leading-[1.14]"
              style={{ fontSize: "clamp(2rem,4.8vw,4.4rem)" }}
            >
              {line}
            </motion.h2>
          </div>
        ))}

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], delay: 1.1 }}
          className="w-10 h-px bg-white/10 origin-center my-12"
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 1.3 }}
          className="font-sans font-light text-white/28 leading-[1.75] max-w-[34rem] text-[0.9375rem]"
        >
          Every time he walked to the crease, a nation held its breath.
          Not one nation — one billion people, each carrying the same silent prayer.
          He never asked for it. But he never once put it down.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 1.7 }}
          className="mt-12 font-script italic text-white/22 max-w-[28rem] leading-[1.65]"
          style={{ fontSize: "clamp(0.95rem,1.4vw,1.1rem)" }}
        >
          &ldquo;Sachin doesn&rsquo;t get nervous. We get nervous for him.&rdquo;
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.0, ease: "easeOut", delay: 2.05 }}
          className="mt-2 text-[10px] uppercase tracking-[0.38em] text-white/20 font-mono"
        >
          — Navjot Singh Sidhu
        </motion.p>
      </div>
    </section>
  );
}
