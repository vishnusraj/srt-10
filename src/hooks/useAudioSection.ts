"use client";

import { RefObject, useEffect, useRef } from "react";
import { useAudio } from "./useAudio";

/**
 * Opt-in hook for per-section audio modulation.
 *
 * When the observed section is ≥50% visible, volume ramps to `volume`.
 * When it leaves, volume ramps back to 1 (full).
 *
 * Usage:
 *   const ref = useRef<HTMLElement>(null);
 *   useAudioSection(ref, 0.3); // section feels quieter while in view
 */
export function useAudioSection(
  sectionRef: RefObject<Element | null>,
  volume = 1,
  fadeDuration = 0.9
) {
  const { setVolume, isReady } = useAudio();
  const inView = useRef(false);

  useEffect(() => {
    if (!isReady || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        if (visible === inView.current) return;
        inView.current = visible;
        setVolume(visible ? volume : 1, fadeDuration);
      },
      { threshold: 0.5 }
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isReady, sectionRef, volume, fadeDuration, setVolume]);
}
