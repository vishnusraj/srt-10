"use client";

import { useScroll, useSpring, motion, useTransform } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const smoothed = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.5 });

  // The glowing dot sits at the current progress position
  const dotY = useTransform(smoothed, [0, 1], ["0vh", "100vh"]);

  return (
    <div
      aria-hidden
      className="fixed right-0 top-0 bottom-0 w-[1.5px] z-[200] pointer-events-none"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {/* Fill bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 origin-top"
        style={{
          scaleY: smoothed,
          background: "linear-gradient(to bottom, transparent 0%, rgba(200,169,126,0.4) 30%, rgba(200,169,126,0.62) 100%)",
          height: "100%",
        }}
      />

      {/* Glowing tip */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          y: dotY,
          translateY: "-50%",
          width: 4,
          height: 4,
          background: "rgba(200,169,126,0.95)",
          boxShadow: "0 0 10px 3px rgba(200,169,126,0.55)",
        }}
      />
    </div>
  );
}
