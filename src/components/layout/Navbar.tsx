"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAudio } from "@/hooks/useAudio";

const NAV_LINKS = [
  { label: "Timeline",  href: "#timeline",  id: "timeline"  },
  { label: "Records",   href: "#records",   id: "records"   },
  { label: "Gallery",   href: "#gallery",   id: "gallery"   },
  { label: "Farewell",  href: "#farewell",  id: "farewell"  },
];

// ── Single nav link with slide-underline ─────────────────────────────────────

function NavLink({
  href,
  label,
  active,
  delay,
}: {
  href: string;
  label: string;
  active: boolean;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  const showLine = active || hovered;

  return (
    <motion.li
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <a
        href={href}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative inline-flex flex-col gap-[3px] group"
      >
        <span
          className={`text-[10px] uppercase tracking-[0.28em] font-mono transition-colors duration-300 ${
            active ? "text-white/85" : "text-white/42 group-hover:text-white/80"
          }`}
        >
          {label}
        </span>
        {/* Slide-in underline */}
        <motion.span
          className="block h-px bg-accent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: showLine ? 1 : 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          style={{ originX: 0 }}
        />
      </a>
    </motion.li>
  );
}

// ── Audio button ──────────────────────────────────────────────────────────────

function AudioButton() {
  const { isMuted, isReady, toggle } = useAudio();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <motion.button
      onClick={toggle}
      aria-label={isMuted ? "Unmute ambient audio" : "Mute ambient audio"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      whileTap={{ scale: 0.92 }}
      className="flex items-center gap-1.5 text-white/38 hover:text-white/78 transition-colors duration-300 select-none"
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        className="w-[13px] h-[13px]"
        aria-hidden
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {!isReady || isMuted ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )}
      </svg>
      <span className="text-[9px] uppercase tracking-[0.28em] font-mono">
        {!isReady ? "Audio" : isMuted ? "Off" : "On"}
      </span>
    </motion.button>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export function Navbar() {
  const [scrolled,       setScrolled]       = useState(false);
  const [activeSection,  setActiveSection]  = useState("");
  const rafRef = useRef<number>(0);

  // Scroll → background
  useEffect(() => {
    let last = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        if ((y > 60) !== last > 60) setScrolled(y > 60);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rafRef.current); };
  }, []);

  // IntersectionObserver → active section
  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { threshold: 0.35 }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-background/82 backdrop-blur-md border-b border-white/[0.055]"
          : "bg-transparent",
      ].join(" ")}
    >
      <nav className="container-wide flex items-center justify-between h-16">
        {/* Logo */}
        <motion.a
          href="#hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ letterSpacing: "0.22em" }}
          className="font-display text-xl tracking-[0.18em] text-foreground/88 hover:text-accent transition-colors duration-400 select-none"
        >
          ST<span className="text-accent mx-[2px]">—</span>10
        </motion.a>

        {/* Links + Audio */}
        <div className="flex items-center gap-8">
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href, id }, i) => (
              <NavLink
                key={id}
                href={href}
                label={label}
                active={activeSection === id}
                delay={0.28 + i * 0.08}
              />
            ))}
          </ul>

          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="hidden md:block w-px h-4 bg-white/12"
          />

          <AudioButton />
        </div>
      </nav>
    </motion.header>
  );
}
