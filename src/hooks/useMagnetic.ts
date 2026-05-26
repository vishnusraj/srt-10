"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";

/**
 * Attaches mousemove/mouseleave listeners to the returned ref's element and
 * moves it toward the cursor by `strength` × distance-from-center.
 * Spring values snap back to 0 on leave.
 *
 * Usage:
 *   const { ref, x, y } = useMagnetic();
 *   return <motion.button ref={ref} style={{ x, y }}>...</motion.button>;
 */
export function useMagnetic(strength = 0.35) {
  const ref  = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x    = useSpring(rawX, { stiffness: 280, damping: 22, mass: 0.5 });
  const y    = useSpring(rawY, { stiffness: 280, damping: 22, mass: 0.5 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      rawX.set((e.clientX - (left + width  / 2)) * strength);
      rawY.set((e.clientY - (top  + height / 2)) * strength);
    };

    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    el.addEventListener("mousemove",  onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove",  onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [rawX, rawY, strength]);

  return { ref, x, y };
}
