"use client";

import { Component, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { HeroScene } from "./HeroScene";

class CanvasBoundary extends Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

export function HeroCanvas() {
  const mouseX   = useRef<number>(0.5);
  const mouseY   = useRef<number>(0.5);
  const isHover  = useRef<boolean>(false);
  const velocity = useRef<number>(0);
  const prevX    = useRef<number>(0.5);
  const prevY    = useRef<number>(0.5);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx   = (e.clientX - rect.left) / rect.width;
    const ny   = 1.0 - (e.clientY - rect.top) / rect.height;

    const dx = (nx - prevX.current) * rect.width;
    const dy = (ny - prevY.current) * rect.height;
    velocity.current = Math.sqrt(dx * dx + dy * dy);

    prevX.current  = nx;
    prevY.current  = ny;
    mouseX.current = nx;
    mouseY.current = ny;
  }

  function handleMouseEnter() { isHover.current = true; }
  function handleMouseLeave() {
    isHover.current  = false;
    velocity.current = 0;
  }

  return (
    <div
      className="absolute inset-0"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CanvasBoundary>
        <Canvas
          gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={["#080808"]} />
          <HeroScene
            mouseX={mouseX}
            mouseY={mouseY}
            isHover={isHover}
            velocity={velocity}
          />
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
