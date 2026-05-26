"use client";

import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { ChapterLabel } from "@/components/ui/ChapterLabel";

const INNINGS = [
  { runs: "143", label: "Apr 22, 1998", note: "Not out" },
  { runs: "134", label: "Apr 24, 1998", note: "Man of the Series" },
];

export function DesertStormSection() {
  const sectionRef  = useRef<HTMLElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const isInView    = useInView(sectionRef, { once: true, margin: "-6%" });

  /* ── Sand particle canvas ────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type P = { x: number; y: number; r: number; spd: number; op: number; drift: number };

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const pts: P[] = Array.from({ length: 220 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.6 + 0.25,
      spd:   Math.random() * 1.8 + 0.35,
      op:    Math.random() * 0.38 + 0.04,
      drift: (Math.random() - 0.5) * 0.28,
    }));

    let id: number;
    let alive = true;

    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,175,108,${p.op})`;
        ctx.fill();
        p.x += p.spd;
        p.y += p.drift;
        if (p.x > canvas.width + 4) { p.x = -4; p.y = Math.random() * canvas.height; }
        if (p.y < 0 || p.y > canvas.height) p.drift *= -1;
      }
      id = requestAnimationFrame(draw);
    };

    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => { alive = false; cancelAnimationFrame(id); ro.disconnect(); };
  }, []);

  /* ── Scroll-driven intensity: headline scale + headline glow ─────── */
  useGSAP(() => {
    gsap.fromTo("[data-storm-title]",
      { opacity: 0, letterSpacing: "0.18em", scale: 0.94 },
      {
        opacity: 1, letterSpacing: "0.06em", scale: 1,
        duration: 1.6, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 68%", toggleActions: "play none none none" },
      }
    );
    gsap.fromTo("[data-storm-stat]",
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0,
        duration: 1.2, ease: "power3.out", stagger: 0.18,
        scrollTrigger: { trigger: sectionRef.current, start: "top 58%", toggleActions: "play none none none" },
      }
    );
  }, sectionRef, []);

  return (
    <section
      ref={sectionRef}
      id="desert-storm"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(180deg,#090604 0%,#080808 60%,#08060a 100%)" }}
    >
      {/* Sand particle canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
      />

      <div aria-hidden className="grain-overlay absolute inset-0 z-[2] pointer-events-none" style={{ opacity: 0.06 }} />

      {/* Warm desert ambient glow */}
      <div
        aria-hidden className="absolute inset-0 pointer-events-none z-[2]"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 60%,rgba(200,140,60,0.07) 0%,transparent 70%)" }}
      />

      {/* Lightning flash overlay */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0, 0, 0, 0.14, 0, 0, 0, 0, 0, 0.07, 0, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-amber-100 pointer-events-none z-[3]"
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-[64rem] mx-auto">
        <ChapterLabel number="03" title="Desert Storm" inView={isInView} className="mb-10" />

        {/* Headline — GSAP animates opacity+letterSpacing; RevealText adds word reveal on top */}
        <h2
          data-storm-title
          className="font-display text-white uppercase leading-none mb-12"
          style={{ fontSize: "clamp(3.8rem,12vw,11rem)", opacity: 0, letterSpacing: "0.18em" }}
          aria-label="Desert Storm"
        >
          Desert Storm
        </h2>

        {/* Two innings */}
        <div className="flex items-stretch gap-0 mb-14">
          {INNINGS.map((inn, i) => (
            <div
              key={i}
              data-storm-stat
              className="flex flex-col items-center px-10 md:px-16 first:border-r border-white/[0.07]"
              style={{ opacity: 0 }}
            >
              <span
                className="font-display text-accent leading-none"
                style={{ fontSize: "clamp(3.5rem,9vw,8rem)" }}
              >
                {inn.runs}
              </span>
              <span className="text-[10px] uppercase tracking-[0.35em] text-white/32 font-mono mt-2">{inn.label}</span>
              <span className="text-[10px] uppercase tracking-[0.28em] text-accent/50 font-mono mt-1">{inn.note}</span>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 1.0 }}
          className="w-10 h-px bg-accent/20 origin-center mb-12"
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 1.2 }}
          className="font-sans font-light text-white/30 leading-[1.75] max-w-[33rem] text-[0.9375rem]"
        >
          A sandstorm had swept through Sharjah, interrupting play. When the
          ground cleared, Sachin walked back out and hit Australia for 143 runs.
          Two days later, he did it again — 134. Australia were eliminated.
          India were in the final.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.2, ease: "easeOut", delay: 2.0 }}
          className="mt-14 font-script italic text-accent/44"
          style={{ fontSize: "clamp(0.88rem,1.3vw,1.08rem)" }}
        >
          &ldquo;I&rsquo;ve never seen anyone bat like that. He was just in a different zone.&rdquo;
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.0, ease: "easeOut", delay: 2.25 }}
          className="mt-2 text-[10px] uppercase tracking-[0.38em] text-white/20 font-mono"
        >
          — Mark Taylor, Australian captain
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.0, ease: "easeOut", delay: 2.5 }}
          className="mt-14 text-[9px] uppercase tracking-[0.5em] text-white/14 font-mono"
        >
          Coca-Cola Cup, Sharjah &nbsp;·&nbsp; April 1998
        </motion.p>
      </div>
    </section>
  );
}
