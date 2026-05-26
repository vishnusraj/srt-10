"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { ChapterLabel } from "@/components/ui/ChapterLabel";

// The Wankhede chant — echoing rows
const CHANT_ROWS = [
  { text: "Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin", op: 0.06, y: "18%" },
  { text: "Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin", op: 0.05, y: "28%" },
  { text: "Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin", op: 0.04, y: "38%" },
  { text: "Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin", op: 0.05, y: "62%" },
  { text: "Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin", op: 0.04, y: "72%" },
  { text: "Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin  Sachin", op: 0.03, y: "82%" },
];

export function LegacySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView   = useInView(sectionRef, { once: true, margin: "-6%" });

  useGSAP(() => {
    // Chant rows drift upward at different speeds (parallax) as user scrolls
    CHANT_ROWS.forEach((_, i) => {
      gsap.to(`[data-chant="${i}"]`, {
        y: i % 2 === 0 ? -55 : -35,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1.4 },
      });
    });

    // Centre glow pulses in on scroll entry
    gsap.fromTo("[data-centre-glow]",
      { opacity: 0, scale: 0.85 },
      {
        opacity: 1, scale: 1, duration: 2.5, ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 68%", toggleActions: "play none none none" },
      }
    );
  }, sectionRef, []);

  return (
    <section
      ref={sectionRef}
      id="legacy"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg,#0a0804 0%,#080808 50%,#08080a 100%)" }}
    >
      <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

      {/* Deep ambient gold */}
      <div
        data-centre-glow
        aria-hidden className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%,rgba(200,169,126,0.07) 0%,transparent 75%)" }}
      />

      {/* Echoing chant rows */}
      {CHANT_ROWS.map((row, i) => (
        <div
          key={i}
          data-chant={i}
          aria-hidden
          className="absolute w-full overflow-hidden pointer-events-none select-none"
          style={{ top: row.y }}
        >
          <p
            className="font-display uppercase whitespace-nowrap text-accent"
            style={{ fontSize: "clamp(0.95rem,2vw,1.65rem)", letterSpacing: "0.35em", opacity: row.op }}
          >
            {row.text}
          </p>
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[58rem] mx-auto">
        <ChapterLabel number="08" title="The Legacy" inView={isInView} />

        {/* Main statement */}
        {["Not a cricketer.", "A religion."].map((line, i) => (
          <div key={i} className="overflow-hidden">
            <motion.h2
              initial={{ y: "112%", opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.3 }}
              className="font-display leading-[1.1]"
              style={{
                fontSize: "clamp(2.4rem,5.5vw,5.2rem)",
                color: i === 1 ? "#c8a97e" : "rgba(255,255,255,0.88)",
              }}
            >
              {line}
            </motion.h2>
          </div>
        ))}

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1], delay: 1.2 }}
          className="w-12 h-px bg-accent/20 origin-center my-14"
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.7, ease: [0.16, 1, 0.3, 1], delay: 1.4 }}
          className="font-sans font-light text-white/30 leading-[1.75] max-w-[36rem] text-[0.9375rem]"
        >
          He wasn&rsquo;t just India&rsquo;s greatest batsman. He was India&rsquo;s
          mirror — the version of itself it wanted to be. Fearless at sixteen,
          humble at forty, sublime throughout. Every record he broke was just
          the shadow of something else: grace, under the weight of everything.
        </motion.p>

        {/* Final quote */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 1.9 }}
          className="mt-14 font-script italic text-accent/50 leading-[1.65]"
          style={{ fontSize: "clamp(0.95rem,1.45vw,1.15rem)" }}
        >
          &ldquo;Even God is a Sachin fan. When he bats, God clears his schedule.&rdquo;
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.0, ease: "easeOut", delay: 2.25 }}
          className="mt-2 text-[10px] uppercase tracking-[0.38em] text-white/20 font-mono"
        >
          — Shahid Afridi
        </motion.p>

        {/* Closing stat summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 2.6 }}
          className="mt-16 flex items-center gap-8 md:gap-14 flex-wrap justify-center"
        >
          {[
            { n: "100", l: "Centuries" },
            { n: "24", l: "Years" },
            { n: "∞", l: "Legacy" },
          ].map(({ n, l }) => (
            <div key={l} className="flex flex-col items-center gap-1">
              <span className="font-display text-accent leading-none" style={{ fontSize: "clamp(2.2rem,5.5vw,4.5rem)" }}>
                {n}
              </span>
              <span className="text-[10px] uppercase tracking-[0.38em] text-white/25 font-mono">{l}</span>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.2, ease: "easeOut", delay: 3.1 }}
          className="mt-16 text-[9px] uppercase tracking-[0.5em] text-white/18 font-mono"
        >
          Sachin Ramesh Tendulkar &nbsp;·&nbsp; 1973 — Forever
        </motion.p>
      </div>
    </section>
  );
}
