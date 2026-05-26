"use client";

import React from "react";
import { motion } from "framer-motion";

interface RevealTextProps {
  /** Text to split and reveal word-by-word */
  text: string;
  /** Whether the parent section is in view */
  inView: boolean;
  /** Base delay before first word */
  delay?: number;
  /** Seconds between each word */
  stagger?: number;
  /** Duration of each word's slide */
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: "p" | "h2" | "h3" | "span" | "div";
}

/**
 * Splits text into words and reveals each one by sliding up out of a
 * clip-path container — the canonical "cinematic text reveal" pattern.
 */
export function RevealText({
  text,
  inView,
  delay = 0,
  stagger = 0.07,
  duration = 0.85,
  className = "",
  style,
  as: Tag = "p",
}: RevealTextProps) {
  const words = text.split(" ");

  return (
    <Tag className={className} style={style} aria-label={text}>
      {words.map((word, i) => (
        /* overflow-hidden clips the word while it slides up */
        <span key={i} className="inline-block overflow-hidden align-bottom leading-[1.1]">
          <motion.span
            className="inline-block"
            initial={{ y: "102%", opacity: 0 }}
            animate={inView ? { y: "0%", opacity: 1 } : {}}
            transition={{
              duration,
              delay: delay + i * stagger,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
          {/* Non-breaking space between words */}
          {i < words.length - 1 && (
            <span className="inline-block">&nbsp;</span>
          )}
        </span>
      ))}
    </Tag>
  );
}
