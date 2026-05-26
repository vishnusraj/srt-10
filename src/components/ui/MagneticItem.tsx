"use client";

import { motion } from "framer-motion";
import { useMagnetic } from "@/hooks/useMagnetic";

interface MagneticItemProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  /** Triggers the cursor ring hover state while inside this element. */
  "data-cursor-hover"?: boolean | string;
  /** Opt in to GSAP scroll-entrance animation. */
  "data-animate"?: boolean | string;
}

/**
 * Drop-in wrapper that applies a magnetic pull-toward-cursor effect.
 * Add `data-cursor-hover` to also trigger the cursor ring expansion.
 *
 * Example:
 *   <MagneticItem strength={0.4} data-cursor-hover className="...">
 *     <button>Click</button>
 *   </MagneticItem>
 */
export function MagneticItem({
  children,
  className,
  strength,
  ...dataProps
}: MagneticItemProps) {
  const { ref, x, y } = useMagnetic(strength);

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      className={className}
      {...dataProps}
    >
      {children}
    </motion.div>
  );
}
