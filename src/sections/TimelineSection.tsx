"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";

/* ── Milestones ─────────────────────────────────────────────────────────────── */

const MILESTONES = [
  {
    year: "1989",
    idx: "01",
    title: "The Debut",
    location: "Karachi, Pakistan",
    body: "Sixteen years old. He walked to the crease and never truly left. Waqar Younis split his nose open. He wiped the blood and faced the next ball.",
    meta: "Nov 15, 1989 · First Test · Age 16",
    image: "/images/debut.png",
    glow: "radial-gradient(ellipse 70% 60% at 50% 46%, rgba(80,100,210,0.055) 0%, transparent 70%)",
    dotColor: "#a0afdb",
    dotGlow: "rgba(160,175,215,0.40)",
    labelColor: "rgba(160,175,215,0.52)",
  },
  {
    year: "1998",
    idx: "02",
    title: "Desert Storm",
    location: "Sharjah, UAE",
    body: "143 and 134 in two days. A sandstorm suspended play. When the ground cleared, he walked back out and reduced Australia to spectators.",
    meta: "April 1998 · Coca-Cola Cup · 143 & 134",
    image: "/images/desert_storm.png",
    glow: "radial-gradient(ellipse 70% 60% at 50% 46%, rgba(200,140,55,0.07) 0%, transparent 70%)",
    dotColor: "#d2af6c",
    dotGlow: "rgba(210,175,108,0.45)",
    labelColor: "rgba(210,175,108,0.55)",
  },
  {
    year: "2003",
    idx: "03",
    title: "Centurion",
    location: "Johannesburg, South Africa",
    body: "Pakistan. World Cup. He scored 98 in a chase that no one else could have attempted. India won by six wickets. He walked off alone.",
    meta: "Mar 1, 2003 · World Cup · 98 off 75 balls",
    image: "/images/centurion.png",
    glow: "radial-gradient(ellipse 70% 60% at 50% 46%, rgba(38,120,95,0.055) 0%, transparent 70%)",
    dotColor: "#64c8a0",
    dotGlow: "rgba(100,200,160,0.40)",
    labelColor: "rgba(100,200,160,0.50)",
  },
  {
    year: "2011",
    idx: "04",
    title: "The Dream",
    location: "Wankhede Stadium, Mumbai",
    body: "Six World Cups. Twenty-two years. The night India won, he wept. His teammates lifted him onto their shoulders and carried him around Wankhede.",
    meta: "Apr 2, 2011 · World Cup Final · Home",
    image: "/images/The_Dream.jpg",
    glow: "radial-gradient(ellipse 70% 60% at 50% 46%, rgba(200,169,126,0.09) 0%, transparent 70%)",
    dotColor: "#c8a97e",
    dotGlow: "rgba(200,169,126,0.50)",
    labelColor: "rgba(200,169,126,0.60)",
  },
  {
    year: "2013",
    idx: "05",
    title: "One Last Time",
    location: "Wankhede Stadium, Mumbai",
    body: "Two hundred Tests. The same ground as his first senior match. He walked off an international cricket field for the last time. He was forty years old.",
    meta: "Nov 16, 2013 · 200th Test · Age 40",
    image: "/images/Sachin-Tendulkar-Mumbai-farewell.jpg",
    glow: "radial-gradient(ellipse 55% 50% at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 65%)",
    dotColor: "rgba(255,255,255,0.52)",
    dotGlow: "rgba(255,255,255,0.18)",
    labelColor: "rgba(255,255,255,0.28)",
  },
];

const COUNT = MILESTONES.length;
/* Timeline line sits at 75% of viewport height */
const LINE_TOP = "75%";

/* ── Component ──────────────────────────────────────────────────────────────── */

export function TimelineSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const section = sectionRef.current;
    const track   = trackRef.current;
    if (!section || !track) return;

    /* Main horizontal scroll — pins section and scrubs the track sideways */
    const hScroll = gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${track.scrollWidth - window.innerWidth}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    /* ── Background image crossfade ───────────────────────────────────────
       Images are stacked at section root (not inside the moving track), so
       they stay fixed in the viewport while the track scrolls horizontally.
       A single scrubbed timeline crossfades neighbouring images and adds a
       subtle 1 → 1.05 zoom on the outgoing image for cinematic depth.        */
    const bgImages = section.querySelectorAll<HTMLElement>("[data-tl-bgimage]");
    gsap.set(bgImages, { opacity: 0, scale: 1 });
    gsap.set(bgImages[0], { opacity: 1 });

    const fadeTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${track.scrollWidth - window.innerWidth}`,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    const slot = 1 / (COUNT - 1);              // normalised duration per transition
    for (let i = 0; i < COUNT - 1; i++) {
      const at  = i * slot + slot * 0.30;      // crossfade begins ~30% into each slot
      const dur = slot * 0.40;                 // crossfade window covers ~40% of slot
      fadeTl
        .to(bgImages[i],     { opacity: 0, scale: 1.05, ease: "power1.inOut", duration: dur }, at)
        .to(bgImages[i + 1], { opacity: 1, scale: 1,    ease: "power1.inOut", duration: dur }, at);
    }

    /* Per-panel nested triggers ── all keyed to the horizontal containerAnimation */
    const panels    = section.querySelectorAll<HTMLElement>("[data-tl-panel]");
    const cards     = section.querySelectorAll<HTMLElement>("[data-tl-card]");
    const yearBgs   = section.querySelectorAll<HTMLElement>("[data-tl-year]");
    const dots      = section.querySelectorAll<HTMLElement>("[data-tl-dot]");
    const glows     = section.querySelectorAll<HTMLElement>("[data-tl-glow]");
    const dotLabels = section.querySelectorAll<HTMLElement>("[data-tl-dotlabel]");

    panels.forEach((panel, i) => {
      /* Card: out-of-focus memory → sharp recall */
      gsap.fromTo(cards[i],
        { opacity: 0, filter: "blur(14px)", y: 18 },
        {
          opacity: 1, filter: "blur(0px)", y: 0,
          duration: 1.1, ease: "power2.out",
          scrollTrigger: {
            trigger: panel,
            containerAnimation: hScroll,
            start: "left 72%",
            end: "left 22%",
            toggleActions: "play none none reverse",
          },
        }
      );

      /* Year watermark: subtle parallax — moves slower than the panel */
      gsap.fromTo(yearBgs[i],
        { x: 62 },
        {
          x: -62, ease: "none",
          scrollTrigger: {
            trigger: panel,
            containerAnimation: hScroll,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        }
      );

      /* Dot: spring-pop onto the timeline when panel centers */
      gsap.fromTo(dots[i],
        { scale: 0, opacity: 0 },
        {
          scale: 1, opacity: 1,
          duration: 0.5, ease: "back.out(2.2)",
          scrollTrigger: {
            trigger: panel,
            containerAnimation: hScroll,
            start: "left 62%",
            toggleActions: "play none none reverse",
          },
        }
      );

      /* Era glow: breathes in as the panel enters */
      gsap.fromTo(glows[i],
        { opacity: 0 },
        {
          opacity: 1, duration: 1.2, ease: "power1.out",
          scrollTrigger: {
            trigger: panel,
            containerAnimation: hScroll,
            start: "left 80%",
            end: "left 22%",
            toggleActions: "play none none reverse",
          },
        }
      );

      /* Dot year label */
      gsap.fromTo(dotLabels[i],
        { opacity: 0, y: -5 },
        {
          opacity: 1, y: 0,
          duration: 0.55, ease: "power1.out",
          scrollTrigger: {
            trigger: panel,
            containerAnimation: hScroll,
            start: "left 62%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });
  }, sectionRef, []);

  return (
    <section
      ref={sectionRef}
      id="timeline"
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", background: "#080808" }}
    >
      {/* Static stacked background images — never move with horizontal scroll;
          only opacity (and a subtle scale) is animated during scrub. */}
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
        {MILESTONES.map((m, i) => (
          <div
            key={m.year}
            data-tl-bgimage={i}
            className="absolute inset-0 will-change-[opacity,transform]"
            style={{ opacity: i === 0 ? 1 : 0, transform: "scale(1)" }}
          >
            <Image
              src={m.image}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-cover"
              style={{ filter: "grayscale(45%) brightness(0.78) contrast(1.05)" }}
            />
          </div>
        ))}
        {/* Global dark overlay — keeps imagery cinematic and non-distracting */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.70)" }}
        />
        {/* Global vignette — pulls focus to the centred card */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.95) 100%)",
          }}
        />
      </div>

      {/* Grain */}
      <div aria-hidden className="grain-overlay absolute inset-0 z-[1] pointer-events-none" />

      {/* Section label — stays fixed in viewport while the track moves */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 flex justify-center pt-10 pointer-events-none z-20"
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.55em] text-white/18">
          The Journey &nbsp;·&nbsp; 1989 — 2013
        </p>
      </div>

      {/* Scroll hint — bottom-right corner */}
      <div
        aria-hidden
        className="absolute bottom-9 right-9 pointer-events-none z-20 hidden md:flex flex-col items-center gap-2"
      >
        <span className="font-mono text-[8px] uppercase tracking-[0.38em] text-white/15 [writing-mode:vertical-rl]">
          Scroll
        </span>
        <span
          className="block w-px bg-gradient-to-b from-white/15 to-transparent"
          style={{ height: 28 }}
        />
      </div>

      {/* Horizontal track */}
      <div
        ref={trackRef}
        className="relative z-[2] flex h-full will-change-transform"
        style={{ width: `${COUNT * 100}vw` }}
      >
        {/* Timeline rule — spans every panel inside the track */}
        <div
          aria-hidden
          className="absolute left-0 pointer-events-none z-[1]"
          style={{
            top: LINE_TOP,
            width: "100%",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 4%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 96%, transparent 100%)",
          }}
        />

        {MILESTONES.map((m, i) => (
          <div
            key={m.year}
            data-tl-panel={i}
            className="relative flex-shrink-0 h-full"
            style={{ width: "100vw" }}
          >
            {/* Era ambient glow */}
            <div
              data-tl-glow={i}
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{ background: m.glow, opacity: 0 }}
            />

            {/* Year watermark — parallaxed */}
            <span
              data-tl-year={i}
              aria-hidden
              className="absolute left-1/2 select-none pointer-events-none font-display leading-none"
              style={{
                top: "50%",
                transform: "translate(-50%, -46%)",
                fontSize: "clamp(160px, 38vw, 560px)",
                opacity: 0.025,
                color: m.dotColor,
                letterSpacing: "-0.02em",
              }}
            >
              {m.year}
            </span>

            {/* Card — occupies top 74% of the panel, centered within it */}
            <div
              className="absolute inset-x-0 flex items-center justify-center px-8 md:px-12"
              style={{ top: 0, bottom: "28%" }}
            >
              <div
                data-tl-card={i}
                className="flex flex-col items-center text-center"
                style={{ maxWidth: "min(460px, 88vw)", opacity: 0 }}
              >
                {/* Index + location */}
                <p
                  className="font-mono text-[9px] uppercase tracking-[0.50em] mb-5"
                  style={{ color: m.labelColor }}
                >
                  {m.idx}&nbsp;&nbsp;{m.location}
                </p>

                {/* Year — display type */}
                <p
                  className="font-display leading-none tracking-[0.03em] mb-3"
                  style={{
                    fontSize: "clamp(3rem, 7.5vw, 7rem)",
                    color: m.dotColor,
                  }}
                >
                  {m.year}
                </p>

                {/* Title — script italic */}
                <p
                  className="font-display text-white/86 leading-[1.15] mb-7"
                  style={{ fontSize: "clamp(1.2rem, 2.3vw, 1.95rem)" }}
                >
                  {m.title}
                </p>

                {/* Decorative rule */}
                <div
                  aria-hidden
                  className="mb-7"
                  style={{
                    width: 26,
                    height: "1px",
                    background: m.dotColor,
                    opacity: 0.22,
                  }}
                />

                {/* Body — narrative prose */}
                <p className="font-sans font-light text-white/80 leading-[1.78] text-[0.9rem]">
                  {m.body}
                </p>

                {/* Meta — mono caption */}
                <p
                  className="mt-5 font-mono uppercase text-[9px] tracking-[0.42em]"
                  style={{ color: m.labelColor }}
                >
                  {m.meta}
                </p>
              </div>
            </div>

            {/* Timeline dot group — centred on the timeline rule */}
            <div
              className="absolute left-1/2"
              style={{ top: LINE_TOP, transform: "translate(-50%, -50%)" }}
            >
              {/* Ambient halo behind the dot */}
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  width: 30,
                  height: 30,
                  background: m.dotGlow,
                  filter: "blur(7px)",
                }}
              />

              {/* Core dot */}
              <div
                data-tl-dot={i}
                className="relative rounded-full"
                style={{
                  width: 7,
                  height: 7,
                  background: m.dotColor,
                  boxShadow: `0 0 8px 2px ${m.dotGlow}`,
                  transform: "scale(0)",
                  opacity: 0,
                }}
              />

              {/* Year label below the dot */}
              <p
                data-tl-dotlabel={i}
                aria-hidden
                className="absolute left-1/2 font-mono text-[8px] uppercase tracking-[0.48em] whitespace-nowrap"
                style={{
                  top: "calc(100% + 11px)",
                  transform: "translateX(-50%)",
                  color: m.labelColor,
                  opacity: 0,
                }}
              >
                {m.year}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
