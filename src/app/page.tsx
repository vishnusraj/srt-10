import {
  IntroSection,
  HeroSection,
  TimelineSection,
  PressureSection,
  RecordsSection,
  GallerySection,
  WorldCupSection,
  FarewellSection,
} from "@/sections";

export default function Home() {
  return (
    <>
      {/* Fixed overlay — plays first, then iris-wipes to reveal the site */}
      <IntroSection />

      <main>
        <HeroSection />
        <TimelineSection />
        <PressureSection />
        <RecordsSection />
        <GallerySection />
        <WorldCupSection />
        <FarewellSection />
      </main>
    </>
  );
}
