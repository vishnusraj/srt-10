"use client";

import { useEffect, useState } from "react";
import { useAudio } from "@/hooks/useAudio";
import { cn } from "@/lib/utils";

function IconSpeaker() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconSpeakerMuted() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function IconWaiting() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {/* single short wave — "ready but waiting" */}
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

export function AudioToggle() {
  const { isMuted, isReady, toggle } = useAudio();

  // Prevent SSR/hydration mismatch — render nothing on server.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const label = !isReady ? "Audio will start on interaction" : isMuted ? "Unmute ambient audio" : "Mute ambient audio";

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "fixed top-5 right-5 z-50",
        "flex items-center gap-2",
        "px-3 py-2 rounded-full",
        "bg-white/5 hover:bg-white/10",
        "border border-white/10 hover:border-white/20",
        "text-foreground/60 hover:text-foreground/90",
        "backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "select-none cursor-pointer",
        !isReady && "opacity-40 hover:opacity-60"
      )}
    >
      {!isReady ? (
        <IconWaiting />
      ) : isMuted ? (
        <IconSpeakerMuted />
      ) : (
        <IconSpeaker />
      )}
      <span className="text-[10px] uppercase tracking-[0.2em] font-mono">
        {!isReady ? "Audio" : isMuted ? "Muted" : "Ambient"}
      </span>
    </button>
  );
}
