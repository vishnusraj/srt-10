"use client";

/**
 * StoryModal — fullscreen storytelling popup for the Gallery.
 *
 * Opening flow (FLIP):
 *   1. A gallery card captures its `getBoundingClientRect()` and hands the
 *      index + rect up to GallerySection.
 *   2. This modal mounts at fixed top-left covering 100vw × 100vh, but
 *      starts with `scaleX / scaleY / x / y` that shrink it to the
 *      captured card's rectangle.
 *   3. We animate `scale → 1` and `x/y → 0` — the card visually grows
 *      into the full screen.
 *   4. Inner content (image + story text) fades in AFTER the scale lands
 *      so it doesn't look stretched during the expand.
 *
 * Closing reverses the same animation back to the original card rect.
 * ESC + arrow keys are wired to close / prev / next. Body scroll is
 * locked while open; all listeners + the overflow restore on unmount.
 */

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

export interface Story {
  year:     string;
  event:    string;
  location: string;
  note:     string;
  image:    string;
  accent:   string;
  story:    string[];
}

interface Props {
  stories:    Story[];
  openIndex:  number | null;
  originRect: DOMRect | null;
  onClose:    () => void;
  onPrev:     () => void;
  onNext:     () => void;
}

const EASE      = [0.16, 1, 0.3, 1] as const;
const FLIP_MS   = 580;

export function StoryModal({
  stories,
  openIndex,
  originRect,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const open  = openIndex !== null && originRect !== null;
  const story = openIndex !== null ? stories[openIndex] : null;

  /* Body scroll lock + keyboard handlers ─────────────────────────────────
     Re-registers per open instance so the latest callback closures are in
     scope. Cleanup restores everything — no leaks. */
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")          onClose();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft")  onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, onPrev, onNext]);

  /* FLIP: the modal mounts at full-screen position but starts scaled
     down + translated to match the captured card rect. Inner content
     is opacity-gated separately so it doesn't read as a stretched card
     during the scale animation. */
  return (
    <AnimatePresence>
      {open && story && originRect && (
        <motion.div
          key="story-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${story.event} — ${story.year}`}
          className="fixed top-0 left-0 z-[400] overflow-hidden"
          style={{
            width:           "100vw",
            height:          "100vh",
            transformOrigin: "top left",
            background:      "linear-gradient(180deg, #0a0808 0%, #050505 100%)",
          }}
          initial={{
            scaleX:  originRect.width  / Math.max(1, window.innerWidth),
            scaleY:  originRect.height / Math.max(1, window.innerHeight),
            x:       originRect.left,
            y:       originRect.top,
            opacity: 0.85,
          }}
          animate={{ scaleX: 1, scaleY: 1, x: 0, y: 0, opacity: 1 }}
          exit={{
            scaleX:  originRect.width  / Math.max(1, window.innerWidth),
            scaleY:  originRect.height / Math.max(1, window.innerHeight),
            x:       originRect.left,
            y:       originRect.top,
            opacity: 0,
          }}
          transition={{ duration: FLIP_MS / 1000, ease: EASE }}
        >
          {/* Grain overlay matches the rest of the site */}
          <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

          {/* ── Inner content (fades in after the FLIP scale lands) ─── */}
          <motion.div
            className="absolute inset-0 z-10 flex flex-col md:flex-row"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.5, delay: 0.28, ease: EASE }}
          >
            {/* ── Image side ── */}
            <div className="relative w-full md:w-3/5 h-[44vh] md:h-full bg-black overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`img-${openIndex}`}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <Image
                    src={story.image}
                    alt={story.event}
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-cover"
                    priority
                  />
                  {/* Inner vignette + right-edge fade into the text panel */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,0) 65%, rgba(8,6,4,0.55) 100%), radial-gradient(ellipse 80% 75% at 50% 55%, transparent 55%, rgba(0,0,0,0.55) 100%)",
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Story side ── */}
            <div className="relative w-full md:w-2/5 h-[56vh] md:h-full overflow-y-auto story-scroll">
              <AnimatePresence mode="wait">
                <motion.article
                  key={`text-${openIndex}`}
                  className="px-7 md:px-12 lg:px-16 py-12 md:py-20 max-w-[40rem]"
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -22 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  {/* Year + location chip */}
                  <div
                    className="font-mono text-[10px] uppercase tracking-[0.50em] mb-5"
                    style={{ color: story.accent }}
                  >
                    {story.year}&nbsp;·&nbsp;{story.location}
                  </div>

                  {/* Title */}
                  <h2
                    className="font-display text-white/95 leading-[1.05] mb-4"
                    style={{ fontSize: "clamp(2.2rem, 4.2vw, 3.6rem)" }}
                  >
                    {story.event}
                  </h2>

                  {/* Subtitle / note */}
                  <div
                    className="font-mono text-[10.5px] uppercase tracking-[0.42em] text-white/45 mb-10 pb-7 border-b border-white/8"
                  >
                    {story.note}
                  </div>

                  {/* Story paragraphs */}
                  {story.story.map((para, i) => (
                    <p
                      key={i}
                      className="font-sans font-light text-white/72 leading-[1.85] mb-5 last:mb-0"
                      style={{ fontSize: "clamp(0.95rem, 1.05vw, 1.05rem)" }}
                    >
                      {para}
                    </p>
                  ))}

                  {/* Footer ornament */}
                  <div
                    aria-hidden
                    className="mt-10 w-10 h-px"
                    style={{ background: story.accent, opacity: 0.45 }}
                  />
                </motion.article>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Close button (top-right) ──────────────────────────────── */}
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close story"
            className="absolute top-5 right-5 sm:top-7 sm:right-8 z-20
                       flex items-center justify-center
                       w-11 h-11 rounded-full
                       text-white/70 hover:text-white
                       border border-white/15 hover:border-white/40
                       bg-white/[0.04] hover:bg-white/[0.10]
                       backdrop-blur-md
                       transition-all duration-300 hover:scale-105"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.42, ease: EASE }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </motion.button>

          {/* ── Previous arrow (left edge) ────────────────────────────── */}
          <motion.button
            type="button"
            onClick={onPrev}
            aria-label="Previous story"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20
                       flex items-center justify-center
                       w-11 h-11 rounded-full
                       text-white/60 hover:text-white
                       border border-white/12 hover:border-white/35
                       bg-black/30 hover:bg-black/55
                       backdrop-blur-sm
                       transition-all duration-300 hover:scale-105"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.45, delay: 0.50, ease: EASE }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </motion.button>

          {/* ── Next arrow (right edge) ───────────────────────────────── */}
          <motion.button
            type="button"
            onClick={onNext}
            aria-label="Next story"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20
                       flex items-center justify-center
                       w-11 h-11 rounded-full
                       text-white/60 hover:text-white
                       border border-white/12 hover:border-white/35
                       bg-black/30 hover:bg-black/55
                       backdrop-blur-sm
                       transition-all duration-300 hover:scale-105"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.45, delay: 0.50, ease: EASE }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </motion.button>

          {/* ── Keyboard hint (bottom-left, tiny) ─────────────────────── */}
          <motion.div
            className="absolute bottom-5 left-6 z-20 font-mono text-[9px] uppercase tracking-[0.40em] text-white/30
                       hidden md:block pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.6, ease: EASE }}
          >
            ← → Navigate &nbsp;·&nbsp; Esc to close
          </motion.div>

          {/* ── Counter (bottom-right) ─────────────────────────────────── */}
          {openIndex !== null && (
            <motion.div
              className="absolute bottom-5 right-6 z-20 font-mono text-[9px] uppercase tracking-[0.40em] text-white/30 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.6, ease: EASE }}
            >
              {String(openIndex + 1).padStart(2, "0")}&nbsp;/&nbsp;{String(stories.length).padStart(2, "0")}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

