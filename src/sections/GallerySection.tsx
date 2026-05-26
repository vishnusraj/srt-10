"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useInView } from "framer-motion";
import { ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { ChapterLabel } from "@/components/ui/ChapterLabel";

/* Minimal shape of the bits of the Lenis instance we use. The real type
   lives in the `lenis` package — we only need .scrollTo here. */
type LenisLike = {
  scrollTo: (target: HTMLElement | number, opts?: {
    duration?: number;
    easing?: (t: number) => number;
    immediate?: boolean;
    lock?: boolean;
  }) => void;
};

/* ── Frame data ──────────────────────────────────────────────────────────────── */

interface Frame {
  year: string;
  event: string;
  location: string;
  note: string;
  gradient: string;
  glow: string;
  glowX: string;
  glowY: string;
  accent: string;
  image: string;
  story: string[];
}

const FRAMES_A: Frame[] = [
  {
    year: "1989",
    event: "The First Step",
    location: "Karachi",
    note: "Test debut · Age 16",
    gradient: "linear-gradient(148deg, #0c0e18 0%, #080810 100%)",
    glow: "rgba(80,100,210,0.18)",
    glowX: "72%", glowY: "22%",
    accent: "#a0afdb",
    image: "/images/debut.png",
    story: [
      "He walked out at sixteen, into a stadium full of men who had spent their lives waiting for someone like him. A short ball from Waqar struck him on the nose. Blood ran down his face onto his white shirt. He waved away the medical team, picked up his bat, and kept batting.",
    ],
  },
  {
    year: "1992",
    event: "World Stage",
    location: "Australia",
    note: "First World Cup",
    gradient: "linear-gradient(148deg, #0e0c14 0%, #08080e 100%)",
    glow: "rgba(120,90,185,0.16)",
    glowX: "30%", glowY: "65%",
    accent: "#b4a4cc",
    /* HQ stroke-play shot at SCG, Jan 2008 — Australia context fits the
       1992 WC venue, 3888×2592 from Wikimedia Commons (CC BY-SA by
       "Privatemusings"). See public/images/gallery/ATTRIBUTIONS.md. */
    image: "/images/gallery/sachin_shot_scg_2008.jpg",
    story: [
      "The first time the world saw him on its biggest stage. He was nineteen, slighter than most of the bowlers he faced, carrying a country's hopes like they weighed nothing. By the end of the tournament he had announced something. Cricket wasn't going to be the same.",
    ],
  },
  {
    year: "1998",
    event: "Desert Storm",
    location: "Sharjah",
    note: "143 & 134 in two days",
    gradient: "linear-gradient(148deg, #140e06 0%, #0a0806 100%)",
    glow: "rgba(200,140,52,0.20)",
    glowX: "62%", glowY: "26%",
    accent: "#d2af6c",
    image: "/images/desert_storm.png",
    story: [
      "Two innings, two days, two centuries — a sandstorm rolling in between them. Australia were the best team in the world. He turned them into spectators. Shane Warne later admitted he dreamed about Tendulkar coming down the wicket at him.",
    ],
  },
  {
    year: "2001",
    event: "Ten Thousand",
    location: "Indore, India",
    note: "10,000 ODI runs",
    gradient: "linear-gradient(148deg, #0e100c 0%, #080a08 100%)",
    glow: "rgba(65,148,85,0.16)",
    glowX: "40%", glowY: "58%",
    accent: "#82c89a",
    /* 14k-Test-runs milestone celebration, Wankhede Oct 2010 — 5120×3544
       (CC BY-SA, Pulkit Sinha). The exact pose for a "milestone reached"
       beat. See ATTRIBUTIONS.md. */
    image: "/images/gallery/sachin_milestone_2010.jpg",
    story: [
      "At Indore the milestone they had been counting toward for a decade arrived almost quietly. A pulled boundary, a flat raise of the bat, a moment that felt like one in a long line of similar moments. Nobody else had been close. Nobody else would be for years.",
    ],
  },
  {
    year: "2010",
    event: "200 Not Out",
    location: "Gwalior",
    note: "First in ODI history",
    gradient: "linear-gradient(148deg, #120d07 0%, #0a0806 100%)",
    glow: "rgba(200,155,65,0.20)",
    glowX: "68%", glowY: "35%",
    accent: "#c8a055",
    /* Pre-delivery focus shot, Wankhede Oct 2010 — 5120×3544
       (CC BY-SA, Pulkit Sinha). See ATTRIBUTIONS.md. */
    image: "/images/gallery/sachin_prepares_2010.jpg",
    story: [
      "Against South Africa, he did what no one in 39 years of ODI cricket had managed. Two hundred not out off 147 balls. The crowd stayed on its feet for the last hour and a half. The number was new. The feeling was the one a billion people had been feeling for twenty years.",
    ],
  },
  {
    year: "2013",
    event: "One Last Time",
    location: "Wankhede",
    note: "200th Test · The farewell",
    gradient: "linear-gradient(148deg, #0e0e0e 0%, #080808 100%)",
    glow: "rgba(220,220,220,0.10)",
    glowX: "50%", glowY: "50%",
    accent: "rgba(255,255,255,0.55)",
    image: "/images/Sachin-Tendulkar-Mumbai-farewell.jpg",
    story: [
      "He walked out at Wankhede one last time, in front of the city that had raised him. Twenty-four years. Forty-seven countries. One bat, a thousand innings, a billion hearts. He cried, and so did everyone watching.",
    ],
  },
];

const FRAMES_B: Frame[] = [
  {
    year: "1994",
    event: "The Wanderer",
    location: "New Zealand",
    note: "Centuries on foreign soil",
    gradient: "linear-gradient(148deg, #0c0e16 0%, #08080e 100%)",
    glow: "rgba(90,110,200,0.14)",
    glowX: "35%", glowY: "42%",
    accent: "#9eacd8",
    /* HQ drive shot, 2010 — 1625×806 (CC BY-SA, Pulkit Sinha). The
       "foreign-soil drive" beat fits the Wanderer story even though year
       doesn't match. See ATTRIBUTIONS.md. */
    image: "/images/gallery/sachin_drives_2010.jpg",
    story: [
      "In New Zealand he opened the innings for the first time in ODIs, made 82 off 49 balls, and changed how India batted forever. Foreign conditions, foreign bowlers, foreign crowds — he treated them all the same way.",
    ],
  },
  {
    year: "1996",
    event: "Eden Gardens",
    location: "Kolkata",
    note: "World Cup semi-final · 65",
    gradient: "linear-gradient(148deg, #0f0c0a 0%, #0a0806 100%)",
    glow: "rgba(185,140,58,0.15)",
    glowX: "72%", glowY: "60%",
    accent: "#c8a060",
    /* HQ generic batting shot, SCG Feb 2012 — 1728×1152 (CC BY, Vijay
       Chennupati). See ATTRIBUTIONS.md. */
    image: "/images/gallery/sachin_batting.jpg",
    story: [
      "He carried the chase on his shoulders. Eden Gardens, ninety thousand people, the heat unbearable. He made 65 off 88 with the weight of a continent on him. When he was bowled, the stadium went silent — and eventually, ugly.",
    ],
  },
  {
    year: "2003",
    event: "98 off 75",
    location: "Centurion",
    note: "World Cup vs Pakistan",
    gradient: "linear-gradient(148deg, #0a0c14 0%, #080809 100%)",
    glow: "rgba(55,100,195,0.18)",
    glowX: "46%", glowY: "28%",
    accent: "#8aaad8",
    image: "/images/centurion.png",
    story: [
      "The biggest game in cricket. India vs Pakistan, World Cup, South Africa. He uncorked one of the most aggressive innings of his career — a six over third-man off Shoaib Akhtar that aged the bowler in real time. That was the day a generation chose cricket as their religion.",
    ],
  },
  {
    year: "2007",
    event: "Two Decades",
    location: "India",
    note: "Still at the crease",
    gradient: "linear-gradient(148deg, #110e0a 0%, #0a0806 100%)",
    glow: "rgba(200,169,126,0.14)",
    glowX: "55%", glowY: "48%",
    accent: "#c8a97e",
    /* Defensive-batting shot, Wankhede Oct 2010 — 1689×741 (CC BY-SA,
       Pulkit Sinha). The composed "still at the crease" pose suits the
       "Two Decades" beat. See ATTRIBUTIONS.md. */
    image: "/images/gallery/sachin_defends_2010.jpg",
    story: [
      "Two decades into a career that nobody had any business sustaining. He was older now, slower, the curls had started to grey. But the eye still saw the ball early, the feet still moved like instinct. And he was still walking out.",
    ],
  },
  {
    year: "2011",
    event: "The Dream",
    location: "Wankhede",
    note: "World Cup won",
    gradient: "linear-gradient(148deg, #130e06 0%, #0a0906 100%)",
    glow: "rgba(200,169,126,0.24)",
    glowX: "50%", glowY: "38%",
    accent: "#c8a97e",
    /* Wankhede during the first innings of the 2011 ICC World Cup Final —
       2048×1536 (CC BY-SA 3.0, G patkar). The actual stadium on the
       actual night. See ATTRIBUTIONS.md. */
    image: "/images/gallery/wankhede_wcf_2011.jpg",
    story: [
      "At his home ground, after twenty-two years of waiting, India lifted the World Cup. He didn't score the runs that won it. He didn't need to. The team carried him on their shoulders around the boundary anyway. A boy's dream finally heavy in his arms.",
    ],
  },
  {
    year: "2012",
    event: "The Hundredth",
    location: "Mirpur",
    note: "Century of centuries",
    gradient: "linear-gradient(148deg, #120e0b 0%, #0a0806 100%)",
    glow: "rgba(200,160,95,0.18)",
    glowX: "60%", glowY: "32%",
    accent: "#c4a070",
    /* HQ generic batting shot, Bangalore Oct 2010 — 1625×806 (CC BY-SA,
       Pulkit Sinha). See ATTRIBUTIONS.md. */
    image: "/images/gallery/batting_2010.jpg",
    story: [
      "In Mirpur he reached a number nobody else has ever reached, or will. One hundred international centuries. It wasn't his most beautiful innings. It was a man dragging a milestone over the line by sheer refusal to leave it incomplete.",
    ],
  },
];

const ALL_FRAMES: Frame[] = [...FRAMES_A, ...FRAMES_B];

/* ── Spatial choreography ─────────────────────────────────────────────────────
   Each scene has an entry vector and an exit vector (in viewport-relative
   units — x is vw, y is vh). They are sequenced so that adjacent scenes
   enter from visually distinct directions and exit roughly opposite to
   their entry, giving the eye a clear "arrived → passed through → left"
   read on each story. */
const DIR_PATTERNS: Array<{
  enter: { x: number; y: number };
  exit:  { x: number; y: number };
}> = [
  { enter: { x: -120, y:  -80 }, exit: { x:  120, y:   80 } }, // 0  top-left  → bottom-right
  { enter: { x:    0, y:  130 }, exit: { x:    0, y: -130 } }, // 1  bottom    → top
  { enter: { x:  130, y:    0 }, exit: { x: -130, y:    0 } }, // 2  right     → left
  { enter: { x: -110, y:   80 }, exit: { x:  110, y:  -80 } }, // 3  bottom-l  → top-right
  { enter: { x:    0, y: -130 }, exit: { x:    0, y:  130 } }, // 4  top       → bottom
  { enter: { x: -130, y:    0 }, exit: { x:  130, y:    0 } }, // 5  left      → right
  { enter: { x:  110, y:  -80 }, exit: { x: -110, y:   80 } }, // 6  top-right → bottom-left
  { enter: { x:    0, y:  130 }, exit: { x:    0, y: -130 } }, // 7  bottom    → top
  { enter: { x:  110, y:   80 }, exit: { x: -110, y:  -80 } }, // 8  bottom-r  → top-left
  { enter: { x: -130, y:    0 }, exit: { x:  130, y:    0 } }, // 9  left      → right
  { enter: { x:    0, y: -130 }, exit: { x:    0, y:  130 } }, // 10 top       → bottom
  { enter: { x:  130, y:    0 }, exit: { x: -130, y:    0 } }, // 11 right     → left
];

/* Vertical scroll budget (in vh) per scene. At default Lenis speed this
   gives each story roughly 2 s of natural scroll time before the next
   one takes over — combined with the dwell warp below, that's ~1.5–1.8 s
   of focal "story is readable" time per memory. */
const SCENE_SCROLL_VH = 120;

/* Window scale: how wide each scene's transition window is, in units of
   1/N progress. >1 = adjacent scenes overlap (crossfade feel); <1 leaves
   a gap. 1.3 gives a gentle overlap without muddying the focal moment. */
const WINDOW_SCALE = 1.30;

/* Dwell warp — power curve applied to |t| so the centred moment lingers.
   Math.pow(|t|, DWELL_EXP) compresses small values toward 0 (image holds
   centre longer) while leaving the transition tails at full speed. Acts
   as a soft "scroll damping" near each story's focal point: scrolling
   while a story is centred barely moves t, so the user feels mild
   resistance and the story has time to register before being released. */
const DWELL_EXP = 1.55;

/* ── Amoeba blob mask system ──────────────────────────────────────────────────
   Each memory fragment is clipped by an SVG <mask> shaped like an irregular,
   asymmetric blob rather than a rectangle (or even an ellipse). The mask
   path is rendered into the SVG <defs> below the section, and a per-mask
   Gaussian blur softens the edge into smoke. An SMIL <animate> morphs the
   path between 4 deterministic variants so the shape breathes / drifts
   between forms — like a living memory rather than a fixed silhouette. */

const PI2 = Math.PI * 2;

/* Smooth deterministic noise from sums of sines — produces ~[-1, 1] values
   that vary continuously in `t` and meaningfully in `seed`. No external
   noise lib needed, and the output is identical on server + client (no
   hydration mismatch). */
function blobNoise(seed: number, t: number): number {
  return (
    Math.sin(seed * 7.13 + t * 2.71) +
    Math.cos(seed * 3.41 + t * 5.19) * 0.72 +
    Math.sin(seed * 11.7 + t * 1.13) * 0.41
  ) / 2.1;
}

/* Generate one closed cubic-Bezier blob path (in 0..1 objectBoundingBox
   coords) by perturbing both the angle and radius of N anchor points
   around a centre, then smoothing through them with a Catmull-Rom-derived
   cubic curve. Same N anchors for every variant of a given seed means
   SMIL can interpolate `d` cleanly across morph states. */
function makeBlobPath(seed: number, phase: number, points = 9): string {
  const cx = 0.5;
  const cy = 0.5;
  const baseR = 0.42;     // ↑ from 0.36 — slightly fuller blob; with radJitter
                          //   the most-extreme anchors reach ~0.54 from centre
                          //   (0.04 past the box edge), gently clipped by the
                          //   image bounds — keeps the silhouette feeling solid.
  const radJitter = 0.12;
  const angJitter = 0.14;

  const pts: { x: number; y: number }[] = [];
  for (let p = 0; p < points; p++) {
    const baseAngle = (p / points) * PI2;
    const ang = baseAngle + blobNoise(seed, p * 0.41 + phase * 1.7) * angJitter;
    const r   = baseR + blobNoise(seed * 1.83 + 3.7, p * 1.13 + phase * 2.3) * radJitter;
    pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
  }

  const T = 0.21; // curve tension
  let d = `M${pts[0].x.toFixed(4)},${pts[0].y.toFixed(4)} `;
  for (let p = 0; p < points; p++) {
    const cur   = pts[p];
    const next  = pts[(p + 1) % points];
    const prev  = pts[(p - 1 + points) % points];
    const nnext = pts[(p + 2) % points];
    const c1x = cur.x + (next.x  - prev.x) * T;
    const c1y = cur.y + (next.y  - prev.y) * T;
    const c2x = next.x - (nnext.x - cur.x) * T;
    const c2y = next.y - (nnext.y - cur.y) * T;
    d +=
      `C${c1x.toFixed(4)},${c1y.toFixed(4)} ` +
      `${c2x.toFixed(4)},${c2y.toFixed(4)} ` +
      `${next.x.toFixed(4)},${next.y.toFixed(4)} `;
  }
  d += "Z";
  return d;
}

/* Per-scene blob system — 4 morph states + loop back to the first, plus
   independent timing for the SMIL morph and the CSS float keyframe so no
   two memories share a rhythm. */
const SCENE_BLOBS = Array.from({ length: ALL_FRAMES.length }, (_, i) => {
  const seed = i + 1;
  const phases = [0, 1, 2, 3, 0]; // last == first so the loop is seamless
  return {
    paths:        phases.map((ph) => makeBlobPath(seed, ph * 0.83)),
    morphDur:     11 + ((i * 1.7) % 6),   // 11 – 17 s
    floatVariant: i % 4,                  // 0..3 — picks one of 4 keyframes
    floatDur:     9  + ((i * 1.31) % 6),  // 9 – 15 s
    /* Negative delay so each scene starts mid-cycle instead of every memory
       drifting in unison from t=0. */
    floatDelay:   -((i * 0.83) % 6),
    /* Subtle per-scene blur amount so the smokiness varies slightly. */
    smokeBlur:    0.030 + ((i * 0.007) % 0.020), // 0.030 – 0.050 (objectBoundingBox units)
  };
});

/* ── Section ─────────────────────────────────────────────────────────────────── */

export function GallerySection() {
  const sectionRef     = useRef<HTMLElement>(null);
  const stageRef       = useRef<HTMLDivElement>(null);
  const sceneRefs      = useRef<Array<HTMLDivElement | null>>([]);
  const narrativeRefs  = useRef<Array<HTMLParagraphElement | null>>([]);
  const hintRef        = useRef<HTMLDivElement>(null);

  const isInView = useInView(sectionRef, { once: true, margin: "-10%" });
  const N = ALL_FRAMES.length;

  /* Active scene drives the corner counter + ambient tint. We track it in
     a ref to avoid React re-renders inside the scroll callback, only
     promoting to state when the value actually changes. */
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);

  /* ── Skip-to-next-section state ──────────────────────────────────────
     `skipMode` is true while the mouse is over the gallery section AND
     the section is currently in the viewport. While true, the brand
     cursor is hidden (via cursor:hide) and a "SKIP →" indicator follows
     the pointer; clicking anywhere in the section jumps Lenis to the
     next sibling section. */
  const [skipMode, setSkipMode]       = useState(false);
  const skipIndicatorRef              = useRef<HTMLDivElement>(null);
  const skipHintRef                   = useRef<HTMLDivElement>(null);
  const skipActiveRef                 = useRef(false);  // mirror of skipMode for the mousemove handler
  const skippingRef                   = useRef(false);  // guard against double-skip during the scroll-to animation

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;

    /* Motion intensity: full on desktop, halved on mobile, near-zero for
       users requesting reduced motion (we keep fades but drop translation). */
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const reduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionScale = reduced ? 0.0 : isMobile ? 0.6 : 1.0;

    /* Bias vertical motion on mobile — horizontal off-screen distance is
       visually heavier on narrow viewports. */
    const yBias = isMobile ? 1.0 : 1.0;
    const xBias = isMobile ? 0.65 : 1.0;

    const update = (progress: number) => {
      let bestIdx = 0;
      let bestAbs = Infinity;

      for (let i = 0; i < N; i++) {
        const el = sceneRefs.current[i];
        if (!el) continue;

        const center = (i + 0.5) / N;
        const tRaw = (progress - center) * N * WINDOW_SCALE;

        /* Dwell warp — compress |t| near 0 so the focal moment holds.
           Preserves sign (still drives entry/exit direction) and is
           monotonic, so scene-distance ordering is unchanged. */
        const sign = tRaw < 0 ? -1 : 1;
        const absRaw = Math.abs(tRaw);
        const t = absRaw <= 1
          ? sign * Math.pow(absRaw, DWELL_EXP)
          : tRaw;
        const abs = Math.abs(t);

        if (abs < bestAbs) { bestAbs = abs; bestIdx = i; }

        if (abs > 1.5) {
          if (el.style.visibility !== "hidden") {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.zIndex = "0";
          }
          continue;
        }
        if (el.style.visibility === "hidden") el.style.visibility = "visible";

        /* Smoothstep on |t| so the offset eases out as the scene approaches
           dead-centre — feels like deceleration into focus, not linear drift. */
        const eased = abs * abs * (3 - 2 * abs);
        const dir   = t < 0 ? DIR_PATTERNS[i].enter : DIR_PATTERNS[i].exit;

        const x = dir.x * eased * motionScale * xBias;
        const y = dir.y * eased * motionScale * yBias;

        /* Slight camera-zoom feel: peaks at 1.05 dead-centre, recedes to
           ~0.86 at the edges of the window. */
        const scale   = 1.05 - abs * 0.20;
        /* Steeper-than-linear opacity falloff so out-of-focus scenes
           genuinely recede instead of just dimming. */
        const opacity = Math.max(0, 1 - Math.pow(abs, 1.5));
        const blur    = abs * 6.5;
        const z       = Math.round((1 - abs) * 100);

        /* Active-state clarity boost — the centred memory sits up to 9%
           brighter than the receding ones, applied via the same filter
           so we don't add a second compositing pass. Combines cleanly
           with the existing blur on out-of-focus scenes. */
        const brightness = 1 + (1 - abs) * 0.09;

        el.style.transform = `translate3d(${x.toFixed(2)}vw, ${y.toFixed(2)}vh, 0) scale(${scale.toFixed(3)})`;
        el.style.opacity   = opacity.toFixed(3);
        el.style.filter    = abs > 0.04
          ? `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)})`
          : `brightness(${brightness.toFixed(3)})`;
        el.style.zIndex    = String(z);

        /* The narrative excerpt has a tighter activation curve — it only
           shows when the scene is right at the focal point. Slight upward
           drift on entry for the "expand slightly" feel. */
        const nEl = narrativeRefs.current[i];
        if (nEl) {
          const nAlpha = Math.max(0, 1 - Math.pow(abs * 3.2, 2));
          nEl.style.opacity   = nAlpha.toFixed(3);
          nEl.style.transform = `translateY(${((1 - nAlpha) * 14).toFixed(1)}px)`;
        }
      }

      if (activeIdxRef.current !== bestIdx) {
        activeIdxRef.current = bestIdx;
        setActiveIdx(bestIdx);
      }

      /* Scroll-to-explore hint: visible while scene 1 is centred, gone by
         the time scene 2 takes over. */
      const hint = hintRef.current;
      if (hint) {
        const hintAlpha = Math.max(0, 1 - progress * N * 0.9);
        hint.style.opacity = hintAlpha.toFixed(3);
      }
    };

    update(0);

    const trig = ScrollTrigger.create({
      trigger: section,
      start:   "top top",
      end:     "bottom bottom",
      scrub:   0.5,
      onUpdate: (self) => update(self.progress),
    });

    /* Refresh once images settle so end positions are correct. */
    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 250);

    return () => {
      window.clearTimeout(refreshId);
      trig.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, sectionRef, []);

  /* ── Skip mode: cursor watcher ──────────────────────────────────────
     A single global mousemove handler checks whether the pointer is
     currently inside the gallery section's bounds (which scrolls under
     a fixed pointer, so we re-test every move). Entering toggles
     `skipMode` on and dispatches `cursor:hide` (the brand cursor's
     existing event — fades the cricket-ball AND gates its own click
     handler so the skip click below has no conflict). Leaving reverses
     both. While active, the SKIP indicator is positioned directly via
     transform writes — no React state for cursor position. */
  useEffect(() => {
    let raf = 0;
    let lastX = -200;
    let lastY = -200;

    const apply = () => {
      raf = 0;
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const isOver =
        lastX >= rect.left && lastX <= rect.right &&
        lastY >= rect.top  && lastY <= rect.bottom;

      if (isOver && !skipActiveRef.current) {
        skipActiveRef.current = true;
        setSkipMode(true);
        window.dispatchEvent(new CustomEvent("cursor:hide"));
      } else if (!isOver && skipActiveRef.current) {
        skipActiveRef.current = false;
        setSkipMode(false);
        window.dispatchEvent(new CustomEvent("cursor:show"));
      }

      if (skipActiveRef.current && skipIndicatorRef.current) {
        skipIndicatorRef.current.style.transform =
          `translate3d(${lastX + 28}px, ${lastY + 18}px, 0)`;
      }
    };

    const onMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    /* Scrolling moves the section under a stationary mouse; re-evaluate
       hit-test on every scroll too so the cursor swap happens as the
       section enters/leaves the viewport even without mouse movement. */
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll",    onScroll, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll",    onScroll);
      if (raf) cancelAnimationFrame(raf);
      /* Belt-and-braces: if we unmount while in skip mode, hand the
         brand cursor back so the next page doesn't render with no
         visible pointer. */
      if (skipActiveRef.current) {
        skipActiveRef.current = false;
        window.dispatchEvent(new CustomEvent("cursor:show"));
      }
    };
  }, []);

  /* ── Click → smooth-scroll to next section ──────────────────────────
     Use the global Lenis instance (exposed by useLenis) so the jump
     plays through the same smooth-scroll engine as everything else;
     fall back to a manual ease-out cubic rAF if Lenis isn't ready yet
     (e.g. SSR/hydration edge). Duration is ~2× a normal Lenis tween. */
  const onSkipClick = useCallback(() => {
    if (skippingRef.current) return;
    const section = sectionRef.current;
    const next = section?.nextElementSibling as HTMLElement | null;
    if (!next) return;
    skippingRef.current = true;

    /* Hand the brand cursor back BEFORE we leave the section — the
       mousemove watcher would do this once we scroll past, but the
       scroll animation runs for ~1 s and the cursor stays hidden the
       whole time without this. */
    skipActiveRef.current = false;
    setSkipMode(false);
    window.dispatchEvent(new CustomEvent("cursor:show"));

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;

    if (lenis?.scrollTo) {
      lenis.scrollTo(next, { duration: 0.9, easing: easeOutCubic, lock: true });
      window.setTimeout(() => { skippingRef.current = false; }, 1100);
    } else {
      const targetY = next.getBoundingClientRect().top + window.scrollY;
      const startY  = window.scrollY;
      const dist    = targetY - startY;
      const dur     = 900;
      const start   = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        window.scrollTo(0, startY + dist * easeOutCubic(t));
        if (t < 1) requestAnimationFrame(step);
        else skippingRef.current = false;
      };
      requestAnimationFrame(step);
    }
  }, []);

  /* Fade the "click anywhere to skip" hint in 1.4 s after entering skip
     mode (optional polish from the spec). The hint element is rendered
     unconditionally and just lives at opacity 0 until this kicks in. */
  useEffect(() => {
    if (!skipMode) {
      if (skipHintRef.current) skipHintRef.current.style.opacity = "0";
      return;
    }
    const id = window.setTimeout(() => {
      if (skipHintRef.current) skipHintRef.current.style.opacity = "1";
    }, 1400);
    return () => window.clearTimeout(id);
  }, [skipMode]);

  const active = ALL_FRAMES[activeIdx];

  return (
    <section
      ref={sectionRef}
      id="gallery"
      className="relative w-full"
      style={{
        /* Total scroll-room = one viewport (the sticky stage's height) +
           one slot per scene. With N = 12 and SCENE_SCROLL_VH = 120 this
           is 1540 vh of section — generous, but the skip-to-next
           interaction below is the relief valve. */
        height: `${100 + N * SCENE_SCROLL_VH}vh`,
        background: "linear-gradient(160deg, #080808 0%, #090807 50%, #080808 100%)",
        /* The brand cursor is hidden in skip mode, so during that mode
           we let the native pointer back through (`cursor: pointer`)
           rather than the global `cursor: none` rule — keeps the
           skip-affordance unambiguous to users with `prefers-reduced
           -motion` or no JS-cursor at all. */
        cursor: skipMode ? "pointer" : undefined,
      }}
      onClick={onSkipClick}
    >
      {/* ── Sticky cinematic stage ────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {/* Grain */}
        <div aria-hidden className="grain-overlay absolute inset-0 z-0 pointer-events-none" />

        {/* Ambient bloom — tinted to active scene's accent glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(ellipse 65% 55% at 50% 50%, ${active.glow} 0%, transparent 72%)`,
            transition: "background 1200ms ease-out",
          }}
        />

        {/* Vignette — pulls focus to centre */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "radial-gradient(ellipse 110% 75% at 50% 50%, transparent 38%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Side fades */}
        <div
          aria-hidden
          className="absolute left-0 top-0 bottom-0 pointer-events-none z-10"
          style={{
            width: "8%",
            background: "linear-gradient(to right, #080808 0%, transparent 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 pointer-events-none z-10"
          style={{
            width: "8%",
            background: "linear-gradient(to left, #080808 0%, transparent 100%)",
          }}
        />

        {/* Chapter label — top-left */}
        <div className="absolute top-8 left-8 md:top-10 md:left-12 z-30">
          <ChapterLabel
            number="—"
            title="The Gallery"
            inView={isInView}
            className="mb-0"
          />
        </div>

        {/* Scene counter — bottom-centre, sits just below the "Click
            anywhere to skip" hint so it's always visible while the user
            scrolls through the section. Lives inside the sticky stage,
            so it appears with the gallery and disappears once the user
            scrolls past it — no extra fixed-overlay coordination needed. */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none font-mono text-[10px] uppercase tracking-[0.45em] flex items-baseline gap-1">
          <span
            style={{ color: active.accent, transition: "color 700ms ease-out" }}
            className="tabular-nums"
          >
            {String(activeIdx + 1).padStart(2, "0")}
          </span>
          <span className="text-white/35">/&nbsp;{String(N).padStart(2, "0")}</span>
        </div>

        {/* ── SVG mask library ────────────────────────────────────────────
            One <mask> per scene, each clipping its image to a unique
            irregular blob. <feGaussianBlur> blurs the alpha so the mask
            edge is smoky rather than crisp. <animate> morphs the blob
            path between 4 deterministic variants over 11–17s for the
            "living shape" feel. SMIL is well-supported in current
            Chrome / Firefox / Safari and runs entirely on the
            compositor — no JS in the hot path. */}
        <svg
          aria-hidden
          className="absolute"
          style={{ width: 0, height: 0, position: "absolute", overflow: "hidden" }}
        >
          <defs>
            {SCENE_BLOBS.map((blob, i) => (
              <Fragment key={i}>
                <filter
                  id={`gallery-smoke-${i}`}
                  x="-30%" y="-30%" width="160%" height="160%"
                  primitiveUnits="objectBoundingBox"
                  filterUnits="objectBoundingBox"
                >
                  <feGaussianBlur stdDeviation={blob.smokeBlur.toFixed(4)} />
                </filter>
                <mask
                  id={`gallery-mask-${i}`}
                  maskUnits="objectBoundingBox"
                  maskContentUnits="objectBoundingBox"
                >
                  <path
                    d={blob.paths[0]}
                    fill="white"
                    filter={`url(#gallery-smoke-${i})`}
                  >
                    <animate
                      attributeName="d"
                      values={blob.paths.join(";")}
                      dur={`${blob.morphDur}s`}
                      calcMode="spline"
                      keySplines={blob.paths
                        .slice(0, -1)
                        .map(() => "0.45 0 0.55 1")
                        .join(";")}
                      repeatCount="indefinite"
                    />
                  </path>
                </mask>
              </Fragment>
            ))}
          </defs>
        </svg>

        {/* ── Scene stack ─────────────────────────────────────────────────
            All 12 memory fragments live here, absolutely stacked at
            viewport centre. Each scene is two nested wrappers:

              outer (sceneRefs[i])  — scroll-driven transform / opacity /
                                       blur / brightness / z-index. Written
                                       by the scroll callback above. Do NOT
                                       attach CSS animation here — it would
                                       fight the JS transform writes.

              inner (gallery-float) — slow CSS keyframe drift + rotation,
                                       infinite. Stacks on top of the
                                       scroll transform via the natural
                                       parent/child transform combination,
                                       so the memory both drifts AND
                                       arrives/exits cleanly.

            Inside the float wrapper:
              · Diffuse accent halo (no shape, just lit air)
              · Image clipped by SVG blob mask, with drop-shadow that
                respects the alpha — shadow follows the blob outline
              · Unmasked text layer over the lower region */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          {ALL_FRAMES.map((frame, i) => {
            const blob = SCENE_BLOBS[i];
            const maskRef = `url(#gallery-mask-${i})`;
            return (
              <div
                key={i}
                ref={(el) => { sceneRefs.current[i] = el; }}
                className="absolute"
                style={{
                  width: "clamp(320px, 56vw, 880px)",
                  aspectRatio: "3 / 2",
                  willChange: "transform, opacity, filter",
                  transformOrigin: "center center",
                  /* Initial off-screen state — scroll callback writes the
                     real values on first frame, but this prevents a flash
                     of all-scenes-stacked-at-centre before hydration. */
                  opacity: 0,
                  visibility: "hidden",
                }}
              >
                <div
                  className="gallery-float relative w-full h-full"
                  style={{
                    animationName:           `gallery-float-${blob.floatVariant}`,
                    animationDuration:       `${blob.floatDur.toFixed(2)}s`,
                    animationDelay:          `${blob.floatDelay.toFixed(2)}s`,
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease-in-out",
                    willChange: "transform",
                  }}
                >
                  {/* Diffuse accent halo — large, very soft, no shape.
                      Reads as "the air around the memory is lit", not as
                      a glow framing a card. */}
                  <div
                    aria-hidden
                    className="absolute -inset-20 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse 70% 65% at 50% 50%, ${frame.glow} 0%, transparent 64%)`,
                      filter: "blur(48px)",
                    }}
                  />

                  {/* Image clipped to organic blob, with smoky edges from
                      the in-mask Gaussian blur, and a drop-shadow that
                      respects the mask alpha (so the shadow follows the
                      blob, not a rectangle). */}
                  <div
                    className="absolute inset-0"
                    style={{
                      WebkitMaskImage: maskRef,
                      maskImage:       maskRef,
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat:       "no-repeat",
                      WebkitMaskSize:  "100% 100%",
                      maskSize:        "100% 100%",
                      filter: "drop-shadow(0 50px 70px rgba(0,0,0,0.55))",
                    }}
                  >
                    <Image
                      src={frame.image}
                      alt={`${frame.event}, ${frame.year}`}
                      fill
                      sizes="(max-width: 768px) 90vw, 880px"
                      className="object-cover"
                      style={{ opacity: 0.95 }}
                      priority={i === 0}
                    />

                    {/* Era color bloom — tints the focal area */}
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at ${frame.glowX} ${frame.glowY}, ${frame.glow} 0%, transparent 60%)`,
                      }}
                    />
                  </div>

                  {/* Unmasked text — sits over the lower portion of the
                      blob where the mask has already faded toward
                      transparent. text-shadow carries legibility. */}
                  <div
                    className="absolute inset-x-0 bottom-0 px-6 md:px-10 pb-5 md:pb-7 pt-12 z-10 pointer-events-none"
                    style={{
                      textShadow:
                        "0 2px 18px rgba(0,0,0,0.92), 0 0 4px rgba(0,0,0,0.7)",
                    }}
                  >
                    <p
                      className="font-mono uppercase mb-3"
                      style={{
                        color: frame.accent,
                        opacity: 0.9,
                        fontSize: "clamp(0.62rem, 0.85vw, 0.75rem)",
                        letterSpacing: "0.45em",
                      }}
                    >
                      {frame.year}&nbsp;&nbsp;·&nbsp;&nbsp;{frame.location}
                    </p>

                    <h3
                      className="font-display text-white/94 leading-[1.05] mb-3"
                      style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.8rem)" }}
                    >
                      {frame.event}
                    </h3>

                    <p
                      className="font-mono uppercase mb-4"
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        fontSize: "clamp(0.58rem, 0.7vw, 0.68rem)",
                        letterSpacing: "0.38em",
                      }}
                    >
                      {frame.note}
                    </p>

                    {/* Narrative excerpt — revealed only when scene is
                        centred. The scroll callback writes opacity +
                        translateY on this element via narrativeRefs[i]
                        for a stricter activation curve than the rest of
                        the scene. */}
                    <p
                      ref={(el) => { narrativeRefs.current[i] = el; }}
                      className="font-sans font-light text-white/75 leading-[1.65] max-w-[42rem]"
                      style={{
                        fontSize: "clamp(0.82rem, 1.05vw, 0.95rem)",
                        opacity: 0,
                        willChange: "transform, opacity",
                      }}
                    >
                      {frame.story[0]}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll-to-explore hint — fades after the first scene */}
        <div
          ref={hintRef}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.55em] text-white/40">
            Scroll to explore
          </span>
          <span
            aria-hidden
            className="block w-px h-10 bg-gradient-to-b from-white/35 to-transparent"
          />
        </div>
      </div>

      {/* ── SKIP indicator (cursor replacement) ─────────────────────────
          Mounted only while the pointer is inside the section. The
          mousemove watcher above writes `transform: translate3d(x, y, 0)`
          directly; we set the initial off-screen position so there's no
          one-frame flicker at (0, 0) before the first mousemove. */}
      {skipMode && (
        <div
          ref={skipIndicatorRef}
          aria-hidden
          className="fixed top-0 left-0 z-[9999] pointer-events-none"
          style={{
            transform: "translate3d(-200px, -200px, 0)",
            willChange: "transform",
          }}
        >
          <span
            className="font-mono uppercase select-none"
            style={{
              fontSize: 11,
              letterSpacing: "0.42em",
              color: "rgba(230, 194, 122, 0.92)",
              textShadow:
                "0 0 14px rgba(230,194,122,0.45), 0 1px 4px rgba(0,0,0,0.85)",
              whiteSpace: "nowrap",
            }}
          >
            Skip&nbsp;&nbsp;→
          </span>
        </div>
      )}

      {/* ── Bottom hint — "Click anywhere to skip" ──────────────────────
          Always mounted (so the opacity transition has somewhere to
          land), but only ramps to visible 1.4 s after entering skip
          mode. Sits above the section content but below the SKIP cursor. */}
      <div
        ref={skipHintRef}
        aria-hidden
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none font-mono uppercase select-none"
        style={{
          fontSize: 9,
          letterSpacing: "0.55em",
          color: "rgba(255, 255, 255, 0.45)",
          opacity: 0,
          transition: "opacity 1200ms ease-out",
          textShadow: "0 1px 6px rgba(0,0,0,0.85)",
        }}
      >
        Click anywhere to skip
      </div>
    </section>
  );
}
