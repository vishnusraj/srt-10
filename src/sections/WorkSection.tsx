import { SectionWrapper } from "@/components/layout";
import { MagneticItem } from "@/components/ui/MagneticItem";

const PLACEHOLDER_WORKS = [
  { index: "01", title: "Chapter One",   genre: "Drama"       },
  { index: "02", title: "Chapter Two",   genre: "Thriller"    },
  { index: "03", title: "Chapter Three", genre: "Documentary" },
];

export function WorkSection() {
  return (
    <SectionWrapper
      id="work"
      align="start"
      animation="fade-up"
      stagger={0.08}
    >
      <div className="container-wide py-24 w-full">
        <p
          data-animate
          className="text-sm uppercase tracking-[0.3em] text-muted mb-16"
        >
          Work
        </p>

        <ul className="w-full">
          {PLACEHOLDER_WORKS.map((work) => (
            <li key={work.index} className="border-b border-[var(--border)]">
              <MagneticItem
                data-animate
                data-cursor-hover
                strength={0.25}
                className="flex items-center justify-between py-8 w-full group"
              >
                <span className="text-muted text-sm font-mono select-none">
                  {work.index}
                </span>
                <span className="flex-1 px-8 text-2xl md:text-3xl font-light tracking-tight text-foreground">
                  {work.title}
                </span>
                <span className="text-sm text-muted uppercase tracking-widest select-none">
                  {work.genre}
                </span>
              </MagneticItem>
            </li>
          ))}
        </ul>
      </div>
    </SectionWrapper>
  );
}
