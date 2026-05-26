"use client";

import { motion } from "framer-motion";

interface ChapterLabelProps {
  number: string;
  title: string;
  inView: boolean;
  /** Extra Tailwind classes on the wrapper (e.g. "mb-14") */
  className?: string;
  /** Light colour override — defaults to accent */
  accent?: boolean;
}

/**
 * Animated chapter marker used across all story sections.
 * A short horizontal line grows from the left, then the label fades in.
 */
export function ChapterLabel({
  number,
  title,
  inView,
  className = "mb-14",
  accent = true,
}: ChapterLabelProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Growing line */}
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className={`block h-px origin-left ${accent ? "bg-accent/40" : "bg-white/18"}`}
        style={{ width: 28 }}
      />

      {/* Label */}
      <motion.p
        initial={{ opacity: 0, x: -6 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
        className={`text-[10px] uppercase tracking-[0.48em] font-mono ${accent ? "text-accent/48" : "text-white/28"}`}
      >
        {number}&nbsp;&nbsp;{title}
      </motion.p>
    </div>
  );
}
