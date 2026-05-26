"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { ChapterLabel } from "@/components/ui/ChapterLabel";

const QUOTE = ["He didn't play cricket.", "Cricket played him."];

const FLOATERS = [
  { id: "1973", x: "6%",  top: "13%", size: "clamp(3.8rem,7.5vw,6.5rem)", depth: -55, rot: -8,  op: 0.052 },
  { id: "16",   x: "76%", top: "8%",  size: "clamp(4.8rem,9.5vw,8.5rem)", depth: -85, rot:  4,  op: 0.042 },
  { id: "1989", x: "80%", top: "64%", size: "clamp(3.2rem,5.8vw,5.2rem)", depth: -40, rot: -4,  op: 0.058 },
  { id: "100",  x: "4%",  top: "70%", size: "clamp(4.2rem,8.5vw,7.5rem)", depth: -70, rot:  6,  op: 0.048 },
];

export function ChildhoodDreamsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-8%" });

  useGSAP(() => {
    FLOATERS.forEach((f) => {
      gsap.to(`[data-floater="${f.id}"]`, {
        y: f.depth,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1.5 },
      });
    });
    gsap.to("[data-cricket-ball]", {
      y: -48, rotate: 165, ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 2 },
    });
  }, sectionRef, []);

  return (
    <section
      ref={sectionRef}
      id="childhood"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(155deg,#0d0a07 0%,#080808 55%,#07090b 100%)" }}
    >
      <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />
      <div
        aria-hidden className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 65% 55% at 50% 50%,rgba(200,169,126,0.065) 0%,transparent 72%)" }}
      />

      {/* Floating handwritten numbers */}
      {FLOATERS.map((f) => (
        <span
          key={f.id}
          data-floater={f.id}
          aria-hidden
          className="absolute font-script italic select-none pointer-events-none"
          style={{ left: f.x, top: f.top, fontSize: f.size, opacity: f.op, color: "#c8a97e", lineHeight: 1, transform: `rotate(${f.rot}deg)` }}
        >
          {f.id}
        </span>
      ))}

      {/* Cricket ball */}
      <div
        data-cricket-ball
        aria-hidden
        className="absolute pointer-events-none select-none"
        style={{ right: "9%", top: "32%", width: "clamp(70px,9vw,128px)", opacity: 0.12 }}
      >
        <svg viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="47" stroke="#c8a97e" strokeWidth="1.2" />
          <path d="M18 28 C30 50,30 50,18 72" stroke="#c8a97e" strokeWidth="1" fill="none" />
          <path d="M82 28 C70 50,70 50,82 72" stroke="#c8a97e" strokeWidth="1" fill="none" />
          {[34, 40, 46, 52, 58, 64].map((y) => (
            <line key={y}    x1="22" y1={y}   x2="28" y2={y - 3} stroke="#c8a97e" strokeWidth="0.6" />
          ))}
          {[34, 40, 46, 52, 58, 64].map((y) => (
            <line key={y + "r"} x1="78" y1={y} x2="72" y2={y - 3} stroke="#c8a97e" strokeWidth="0.6" />
          ))}
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[56rem] mx-auto">
        <ChapterLabel number="01" title="Childhood Dreams" inView={isInView} />

        <blockquote className="mb-12">
          {QUOTE.map((line, i) => (
            <div key={i} className="overflow-hidden">
              <motion.p
                initial={{ y: "108%", opacity: 0 }}
                animate={isInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1], delay: 0.35 + i * 0.3 }}
                className="font-display text-white/90 leading-[1.12]"
                style={{ fontSize: "clamp(2.2rem,5vw,4.8rem)" }}
              >
                {line}
              </motion.p>
            </div>
          ))}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 1.6, ease: "easeOut", delay: 1.15 }}
            className="mt-7 font-script italic text-accent/50"
            style={{ fontSize: "clamp(0.85rem,1.4vw,1.15rem)" }}
          >
            — Ramakant Achrekar, his coach
          </motion.footer>
        </blockquote>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], delay: 1.45 }}
          className="w-10 h-px bg-accent/22 origin-center mb-12"
        />

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.7, ease: [0.16, 1, 0.3, 1], delay: 1.65 }}
          className="font-sans font-light text-white/32 leading-[1.75] max-w-[34rem] text-[0.9375rem]"
        >
          At eleven, Ramakant Achrekar found a boy at Shivaji Park who would bat
          until the nets closed. Until dark. Until no one remained to bowl at him.
          He placed a one-rupee coin on the stumps — if a bowler dismissed Sachin,
          the coin was theirs. Sachin kept every coin.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.2, ease: "easeOut", delay: 2.1 }}
          className="mt-16 text-[9px] uppercase tracking-[0.5em] text-white/20 font-mono"
        >
          Bandra, Bombay &nbsp;·&nbsp; 1973
        </motion.p>
      </div>
    </section>
  );
}
