"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { RevealText } from "@/components/ui/RevealText";

export function ArrivalSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-8%" });

  useGSAP(() => {
    gsap.to("[data-age-mark]", {
      y: -90, ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1.8 },
    });
    gsap.to("[data-year-mark]", {
      y: -40, ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1 },
    });
    // Vertical centre line grows in from top on scroll entry
    gsap.fromTo("[data-line]",
      { scaleY: 0 },
      {
        scaleY: 1,
        duration: 1.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%", toggleActions: "play none none none" },
      }
    );
  }, sectionRef, []);

  return (
    <section
      ref={sectionRef}
      id="arrival"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "#060608" }}
    >
      <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

      {/* Cold blue ambient */}
      <div
        aria-hidden className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% 44%,rgba(28,36,72,0.10) 0%,transparent 68%)" }}
      />

      {/* Giant age watermark */}
      <span
        data-age-mark
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display leading-none text-white select-none pointer-events-none"
        style={{ fontSize: "clamp(260px,50vw,760px)", opacity: 0.016 }}
      >
        16
      </span>

      {/* Year top-right */}
      <span
        data-year-mark
        aria-hidden
        className="absolute font-mono text-white select-none pointer-events-none"
        style={{ right: "7%", top: "11%", fontSize: "clamp(0.85rem,1.6vw,1.3rem)", letterSpacing: "0.38em", opacity: 0.038 }}
      >
        1989
      </span>

      {/* Vertical plumb line */}
      <div
        data-line
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 top-0 w-px bg-white/[0.055] origin-top"
        style={{ height: "100%" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[52rem] mx-auto">
        <ChapterLabel number="02" title="The Arrival" inView={isInView} accent={false} className="mb-12" />

        <RevealText
          text="Arrival"
          inView={isInView}
          delay={0.28}
          stagger={0}
          duration={1.85}
          className="font-display text-white uppercase leading-none tracking-[0.05em] mb-6"
          style={{ fontSize: "clamp(4.5rem,13vw,13rem)" }}
          as="h2"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.85 }}
          className="font-sans font-light text-white/32 leading-[1.75] max-w-[30rem] text-[0.9375rem]"
        >
          November 15, 1989. Karachi, Pakistan. He was sixteen years,
          two hundred and five days old. The oldest player on the field
          had eight years on him. No one was told to go easy.
        </motion.p>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 1.3 }}
          className="w-8 h-px bg-white/10 origin-center my-10"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 1.55 }}
          className="font-sans font-light text-white/28 max-w-[27rem] leading-[1.75] text-[0.9375rem]"
        >
          Waqar Younis hit him on the nose. Blood ran down his chin.
          He did not walk off. He stood his ground, wiped his face,
          and faced the next ball.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.2, ease: "easeOut", delay: 2.1 }}
          className="mt-16 text-[9px] uppercase tracking-[0.5em] text-white/18 font-mono"
        >
          National Stadium, Karachi &nbsp;·&nbsp; Nov 15, 1989
        </motion.p>
      </div>
    </section>
  );
}
