import { createFileRoute } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Hero } from "@/components/landing/Hero";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { Features } from "@/components/landing/Features";
import { CTA } from "@/components/landing/CTA";
import "@/components/landing/landing.css";
import ParticleText from "@/components/ParticleText";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ToolThread | Find your next technology" },
      {
        name: "description",
        content:
          "Discover technologies, understand how they connect, and build a roadmap that fits your path.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <main>
        <Hero />
        <ProductShowcase />
        <Features />
        <CTA />
      </main>
      <footer className="landing-footer">
        <div className="landing-footer-links" aria-label="Footer navigation">
          <a href="#about">About</a>
          <a href="#workspace">Product</a>
          <a href="#team">Team</a>
          <a href="mailto:hello@toolthread.com">Contact</a>
        </div>

        <div className="landing-footer-particle-text">
          <ParticleText
            text="ToolThread"
            particleSize={1.3}
            density={3.15}
            color="#f8fafc"
            highlightColor="#ffffff"
            scatter={290}
            gatherDuration={1600}
            stagger={660}
            pointerRepel={62}
            repelRadius={120}
            idleDrift={0}
            trigger="mount"
            fontSize={300}
            fontWeight={500}
            fontFamily="inherit"
            glow={false}
          />
        </div>
      </footer>
    </div>
  );
}
