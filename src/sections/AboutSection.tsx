import { SectionWrapper } from "@/components/layout";

export function AboutSection() {
  return (
    <SectionWrapper
      id="about"
      align="center"
      animation="fade-up"
      stagger={0.12}
      className="border-b border-subtle bg-surface"
    >
      <div className="container-wide grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <p
            data-animate
            className="text-sm uppercase tracking-[0.3em] text-muted mb-6"
          >
            About
          </p>
          <h2
            data-animate
            className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-8"
          >
            Crafted with <br /> intention.
          </h2>
        </div>
        <div className="space-y-6 text-muted text-base leading-relaxed">
          <p data-animate>
            Every frame is a deliberate choice. Every word carries weight.
            This is the space where the discipline of filmmaking meets the
            freedom of storytelling.
          </p>
          <p data-animate>
            We believe in the quiet power of restraint — letting the
            silences speak as loudly as the dialogue.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
