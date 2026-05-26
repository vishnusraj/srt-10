"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { ChapterLabel } from "@/components/ui/ChapterLabel";

/* ── Scoreboard data ─────────────────────────────────────────────────────────
   Five blocks, each rendered as a printed-scorecard panel: thin bordered
   ledger, dotted-leader rows, monospace tabular values. `highlight: true`
   rows render bigger in gold with a soft glow + animated count-up. */

type ScoreRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

type ScoreboardBlock = {
  title: string;
  rows: ScoreRow[];
};

const BLOCKS: ScoreboardBlock[] = [
  {
    title: "International Cricket",
    rows: [
      { label: "Most international runs",      value: "34,357", highlight: true },
      { label: "Most international centuries", value: "100",    highlight: true },
      { label: "Most international fifties",   value: "164" },
      { label: "Most international matches",   value: "664" },
    ],
  },
  {
    title: "Test Cricket",
    rows: [
      { label: "Most Test runs",       value: "15,921", highlight: true },
      { label: "Most Test centuries",  value: "51" },
      { label: "Most Test matches",    value: "200" },
      { label: "Highest score",        value: "248*" },
      { label: "Batting average",      value: "53.78" },
    ],
  },
  {
    title: "ODI & World Cup",
    rows: [
      { label: "Most ODI runs",             value: "18,426", highlight: true },
      { label: "Most ODI centuries",        value: "49" },
      { label: "First ODI double-century",  value: "200*" },
      { label: "World Cup runs",            value: "2,278" },
      { label: "World Cup centuries",       value: "6" },
    ],
  },
  {
    title: "IPL",
    rows: [
      { label: "Matches (Mumbai Indians)", value: "78" },
      { label: "Total IPL runs",           value: "2,334" },
      { label: "Highest IPL score",        value: "100*" },
      { label: "IPL centuries",            value: "1" },
    ],
  },
  {
    title: "Fun Fact",
    rows: [
      { label: "Debut age",                       value: "16 years" },
      { label: "Career span",                     value: "24 years" },
      { label: "Bharat Ratna conferred",          value: "2014" },
      { label: "Wisden Cricketer of the Year",    value: "1997" },
    ],
  },
];

/* ── Split-flap display ─────────────────────────────────────────────────────
   Renders a string as a stadium-scoreboard flap display: each digit gets
   its own tile (with the mid-fold line); commas / periods / asterisks /
   letters render as plain separators between tiles. */
function FlapValue({ value, large = false }: { value: string; large?: boolean }) {
  return (
    <span className={`flap-display ${large ? "flap-display--lg" : ""}`}>
      {value.split("").map((ch, i) =>
        /[0-9]/.test(ch) ? (
          <span key={i} className="flap-tile">
            <span className="flap-tile__char">{ch}</span>
          </span>
        ) : (
          <span key={i} className="flap-sep">
            {ch === " " ? " " : ch}
          </span>
        )
      )}
    </span>
  );
}

/* ── Count-up ────────────────────────────────────────────────────────────────
   Animates a purely-numeric value from 0 to N over 1.4 s with an ease-out
   cubic, then formats with thousands separators. Any value containing a
   non-digit / non-comma (e.g. "248*", "16 years") is rendered as-is. The
   evolving string is piped straight into FlapValue so digits visibly
   roll on the flap tiles during the count. */
function CountUp({
  value,
  trigger,
  delay = 0,
  large = false,
}: {
  value: string;
  trigger: boolean;
  delay?: number;
  large?: boolean;
}) {
  const isNumeric = /^[\d,]+$/.test(value);
  const [display, setDisplay] = useState<string>(isNumeric ? "0" : value);

  useEffect(() => {
    if (!trigger) return;
    if (!isNumeric) { setDisplay(value); return; }

    const target = parseInt(value.replace(/,/g, ""), 10);
    const dur = 1400;
    let raf = 0;
    let startAt = 0;

    const tick = (now: number) => {
      if (!startAt) startAt = now + delay;
      if (now < startAt) { raf = requestAnimationFrame(tick); return; }
      const t = Math.min(1, (now - startAt) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased).toLocaleString("en-US"));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, value, isNumeric, delay]);

  return <FlapValue value={display} large={large} />;
}

/* ── Section ─────────────────────────────────────────────────────────────── */

export function RecordsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView   = useInView(sectionRef, { once: true, margin: "-8%" });

  return (
    <section
      ref={sectionRef}
      id="records"
      className="relative w-full"
      /* No section background — the global body bg shows through for a
         seamless transition into and out of this section. The grain
         overlay below is the only texture; it sits at 4% opacity over
         whatever's behind.

         NOTE: do NOT add `overflow-hidden` here — it kills the sticky
         right-column figure. Any `overflow: hidden | auto | scroll | clip`
         on an ancestor breaks `position: sticky`. */
    >
      <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

      {/* ── Two-column layout — stacks on mobile (image first), splits 60/40 from lg ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[60%_40%]">

        {/* ── LEFT — Records content (60% on desktop) ─────────────────── */}
        <div className="order-2 lg:order-1 px-6 sm:px-10 lg:px-16 py-20 lg:py-28">
          <ChapterLabel number="02" title="The Records" inView={isInView} />

          {/* Headline — same split clip-reveal pattern as PressureSection */}
          <div className="mb-10">
            {["Numbers that rewrote", "what was thought possible."].map((line, i) => (
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
          </div>

          {/* Intro paragraph */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.95 }}
            className="font-sans font-light text-white/58 leading-[1.85] max-w-[42rem] mb-16"
            style={{ fontSize: "clamp(0.98rem, 1.15vw, 1.08rem)" }}
          >
            Sachin Tendulkar is widely regarded as one of the greatest batters
            in cricket history. Across twenty-four years, three formats, and
            forty-seven countries, he assembled a record sheet so complete it
            no longer reads like statistics — it reads like an era.
          </motion.p>

          {/* ── Scorecard blocks ───────────────────────────────────────── */}
          <div className="space-y-7 lg:space-y-9">
            {BLOCKS.map((block, blockIdx) => {
              const blockDelayS  = 1.10 + blockIdx * 0.14;
              const countDelayMs = (blockDelayS + 0.25) * 1000;
              const total = BLOCKS.length;

              return (
                <motion.div
                  key={block.title}
                  initial={{ opacity: 0, y: 26 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: blockDelayS }}
                  /* Stadium scoreboard panel — dark matte chassis with a
                     subtle top bezel, glossy bottom shadow, and a yellow
                     divider separating the title strip from the data
                     rows. All styling lives in globals.css under the
                     .scoreboard-panel class. */
                  className="scoreboard-panel"
                >
                  {/* Title strip — yellow uppercase block name on the left,
                      scoreboard counter on the right. */}
                  <div className="px-6 sm:px-8 pt-5 pb-4 flex items-baseline justify-between gap-4">
                    <h3
                      className="font-display uppercase tracking-[0.34em] text-[0.85rem] sm:text-[0.95rem]"
                      style={{ color: "#f5c451" }}
                    >
                      {block.title}
                    </h3>
                    <span
                      className="font-mono text-[9.5px] uppercase tracking-[0.42em] tabular-nums"
                      style={{ color: "rgba(245,196,81,0.55)" }}
                    >
                      {String(blockIdx + 1).padStart(2, "0")}&nbsp;/&nbsp;{String(total).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Yellow divider — scoreboard section separator */}
                  <div className="mx-6 sm:mx-8 scoreboard-panel__divider" />

                  {/* Rows — yellow label on the left, split-flap value on
                      the right. CountUp renders a FlapValue under the
                      hood so the digits visibly roll during the count. */}
                  <ul className="px-6 sm:px-8 py-5 space-y-4 sm:space-y-5">
                    {block.rows.map((row) => (
                      <li
                        key={row.label}
                        className="flex items-center justify-between gap-4"
                      >
                        <span
                          className="font-mono uppercase tracking-[0.20em] text-[0.7rem] sm:text-[0.75rem] leading-tight"
                          style={{ color: "rgba(245, 196, 81, 0.82)" }}
                        >
                          {row.label}
                        </span>
                        <span
                          className="leading-none whitespace-nowrap"
                          style={{
                            fontSize: row.highlight
                              ? "clamp(1.30rem, 1.9vw, 1.65rem)"
                              : "clamp(0.95rem, 1.20vw, 1.15rem)",
                          }}
                        >
                          <CountUp
                            value={row.value}
                            trigger={isInView}
                            delay={countDelayMs}
                            large={row.highlight}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          {/* Closing prose */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 2.2 }}
            className="mt-20 font-sans font-light text-white/35 max-w-[34rem] leading-[1.75] text-[0.9375rem]"
          >
            The numbers are a monument. But the reason people still weep
            when they hear his name has nothing to do with numbers.
          </motion.p>
        </div>

        {/* ── RIGHT — Sticky figure (40% on desktop) ───────────────────────
            Transparent PNG, no cropping. object-contain keeps the full
            figure in frame at any viewport size; the sticky container
            holds the image at viewport centre while the records column
            scrolls past on its left. No overlays / fades — the PNG sits
            directly on the page bg for the seamless feel. */}
        <div className="order-1 lg:order-2 relative">
          <div className="lg:sticky lg:top-0 h-[60vh] sm:h-[70vh] lg:h-screen w-full flex items-center justify-center">
            <div className="records-slow-zoom relative w-full h-full">
              <Image
                src="/images/records.png"
                alt="Sachin Tendulkar"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-contain object-center"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
