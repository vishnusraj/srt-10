"use client";

import { DependencyList, RefObject, useEffect } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Scoped GSAP hook. Runs `callback` inside a gsap.context() bound to
 * `scope`, so all animations and ScrollTriggers created inside are
 * automatically reverted on unmount — no manual cleanup needed.
 */
export function useGSAP(
  callback: () => void,
  scope: RefObject<Element | null>,
  deps: DependencyList = []
) {
  useEffect(() => {
    const ctx = gsap.context(callback, scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
