import type { Metadata } from "next";
import localFont from "next/font/local";
import { Saira, Saira_Stencil_One, Cormorant_Garamond, Cinzel, Fraunces, Just_Another_Hand } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/layout";
import { AudioProvider } from "@/context/AudioProvider";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { GameOverlay } from "@/components/ui/GameOverlay";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { Navbar } from "@/components/layout/Navbar";

const saira = Saira({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-saira",
  display: "swap",
});

const sairaStencil = Saira_Stencil_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-saira-stencil",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const cinzel = Cinzel({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const fraunces = Fraunces({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const justAnotherHand = Just_Another_Hand({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-just-another-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SRT10 — Cinematic Storytelling",
  description:
    "A premium cinematic storytelling platform. Where stories come alive.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${saira.variable} ${sairaStencil.variable} ${geistMono.variable} ${cormorant.variable} ${cinzel.variable} ${fraunces.variable} ${justAnotherHand.variable} antialiased`}>
        <AudioProvider>
          <div id="app-content">
            <Navbar />
            <ScrollProgress />
            <SmoothScrollProvider>{children}</SmoothScrollProvider>
          </div>
          <GameOverlay />
          <CustomCursor />
        </AudioProvider>
      </body>
    </html>
  );
}
