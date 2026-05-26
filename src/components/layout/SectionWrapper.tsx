"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { cn } from "@/lib/utils";

type Align = "start" | "center" | "end";
type AnimationVariant = "fade-up" | "fade-in" | "slide-left" | "none";

interface FromVars {
  opacity?: number;
  y?: number;
  x?: number;
}

const VARIANTS: Record<Exclude<AnimationVariant, "none">, FromVars> = {
  "fade-up":    { opacity: 0, y: 36 },
  "fade-in":    { opacity: 0 },
  "slide-left": { opacity: 0, x: -40 },
};

const ALIGN: Record<Align, string> = {
  start:  "justify-start",
  center: "justify-center",
  end:    "justify-end",
};

interface SectionWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  /** Vertical alignment of content within the full-screen section */
  align?: Align;
  /** Enter animation applied to every [data-animate] child */
  animation?: AnimationVariant;
  /** Stagger between animated children (seconds) */
  stagger?: number;
  /** ScrollTrigger start offset, e.g. "top 80%" */
  triggerStart?: string;
}

export function SectionWrapper({
  children,
  id,
  className,
  align = "center",
  animation = "fade-up",
  stagger = 0.1,
  triggerStart = "top 78%",
}: SectionWrapperProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (animation === "none") return;

      const targets = gsap.utils.toArray<Element>(
        "[data-animate]",
        sectionRef.current ?? undefined
      );
      if (!targets.length) return;

      gsap.fromTo(
        targets,
        VARIANTS[animation],
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration: 0.85,
          ease: "power3.out",
          stagger,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: triggerStart,
            toggleActions: "play none none none",
          },
        }
      );
    },
    sectionRef,
    []
  );

  return (
    <section
      ref={sectionRef}
      id={id}
      className={cn(
        "relative w-full min-h-screen flex flex-col",
        ALIGN[align],
        className
      )}
    >
      {children}
    </section>
  );
}
